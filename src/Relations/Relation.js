'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const BaseRelation = require('adonis-lucid/src/Lucid/Relations/Relation')
const Model = require('adonis-lucid/src/Lucid/Model')
const CE = require('adonis-lucid/src/Exceptions')
const _ = require('lodash')

let morphMap = {}

class Relation extends BaseRelation {
  constructor (parent, related) {
    // monkey patch
    related = related || {
      query: () => {}
    }
    super(parent, related)
  }

  static morphMap (map = {}, merge = true) {
    if (merge) {
      _.assignInWith(morphMap, map, (objValue, srcValue, key) => {
        if (!srcValue instanceof Model) {
          throw new CE.ModelRelationException(`Value with ${key} passed to morph map object must be instance of ${Model.name}.`)
        }
        return srcValue
      })
    }
    return morphMap
  }

  static buildTableKeyedMorphMap () {
    return _.reduce(morphMap, (result, value) => {
      result[value.table] = value
      return result
    }, {})
  }

  static morphKey (model) {
    return _.findKey(morphMap, (value) => {
      return model instanceof value
    })
  }

  static morphValue (key) {
    return _.get(morphMap, key)
  }
}

module.exports = Relation
