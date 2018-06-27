'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const MorphOneOrMany = require('./MorphOneOrMany')
const CE = require('@adonisjs/lucid/src/Exceptions')

class MorphOne extends MorphOneOrMany {
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
  async eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = await this.relatedQuery
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
  async eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = await this.relatedQuery
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
  async createMany () {
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
  async saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', this.constructor.name)
  }
}

module.exports = MorphOne
