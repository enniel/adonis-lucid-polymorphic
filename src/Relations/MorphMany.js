'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const MorphOneOrMany = require('./MorphOneOrMany')
const { ioc } = require('@adonisjs/fold')
const helpers = ioc.use('Helpers')

class MorphMany extends MorphOneOrMany {
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
  async eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = await this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .whereIn(this.toKey, values)
      .fetch()
    return results.groupBy((item) => {
      return item[this.toKey]
    }).mapValues(function (value) {
      return helpers.toCollection(value)
    })
    .value()
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
  async eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = await this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .where(this.toKey, value)
      .fetch()
    const response = {}
    response[value] = results
    return response
  }
}

module.exports = MorphMany
