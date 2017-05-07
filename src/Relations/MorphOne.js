'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const Relation = require('./Relation')
const helpers = require('adonis-lucid/src/Lucid/QueryBuilder/helpers')
const CE = require('adonis-lucid/src/Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class MorphOne extends Relation {
  constructor (parent, related, determiner, primaryKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = determiner ? `${determiner}_id` : 'parent_id'
    this.typeKey = determiner ? `${determiner}_type` : 'parent_type'
    this.typeValue = Relation.morphKey(parent)
    if (!this.typeValue) {
      throw new CE.ModelRelationException(`For using morph many relation add ${parent.constructor.name} model to morph map.`)
    }
  }

  /**
   * empty placeholder to be used when unable to eagerload
   * relations.
   *
   * @method eagerLoadFallbackValue
   *
   * @return {Null}
   */
  get eagerLoadFallbackValue () {
    return null
  }

  /**
   * returns result of this.first
   *
   * @see this.first()
   * @return {Object}
   *
   * @public
   */
  fetch () {
    return this.first()
  }

  /**
   * morphOne cannot have paginate
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  paginate () {
    throw CE.ModelRelationException.unSupportedMethod('paginate', this.constructor.name)
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .whereIn(this.toKey, values)
      .fetch()
    return results.keyBy((item) => {
      return item[this.toKey]
    }).value()
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key. It is equivalent to eagerLoad but query defination
   * is little different.
   *
   * @param  {Mixed} value
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .where(this.toKey, value)
      .first()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * morphOne cannot have createMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', this.constructor.name)
  }

  /**
   * morphOne cannot have saveMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', this.constructor.name)
  }
}

module.exports = MorphOne
