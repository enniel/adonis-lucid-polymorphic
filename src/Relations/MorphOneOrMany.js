'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const Relation = require('adonis-lucid/src/Lucid/Relations/Relation')
const CE = require('adonis-lucid/src/Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class MorphOneOrMany extends Relation {
  constructor (parent, related, determiner, primaryKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = determiner ? `${determiner}_id` : 'parent_id'
    this.typeKey = determiner ? `${determiner}_type` : 'parent_type'
    this.typeValue = this.parent.constructor.morphKey || this.parent.table || this.parent.constructor.table
  }

  /**
   * decorates the current query chain before execution
   */
  _decorateRead () {
    this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .where(this.toKey, this.parent[this.fromKey])
  }

  /**
   * Returns the existence query to be used when main
   * query is dependent upon childs.
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  exists (callback) {
    const relatedQuery = this.relatedQuery
      .whereRaw(`${this.related.table}.${this.typeKey} = '${this.typeValue}'`)
      .whereRaw(`${this.related.table}.${this.toKey} = ${this.parent.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(relatedQuery)
    }
    return relatedQuery.modelQueryBuilder
  }

  /**
   * Returns the counts query for a given relation
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  counts (callback) {
    const relatedQuery = this.relatedQuery
      .count('*')
      .whereRaw(`${this.related.table}.${this.typeKey} = '${this.typeValue}'`)
      .whereRaw(`${this.related.table}.${this.toKey} = ${this.parent.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(relatedQuery)
    }
    return relatedQuery.modelQueryBuilder
  }

  /**
   * saves a related model in reference to the parent model
   * and sets up foriegn key automatically.
   *
   * @param  {Object} relatedInstance
   * @return {Number}
   *
   * @public
   */
  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw CE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('save', this.parent.constructor.name, this.related.name)
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to save relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    relatedInstance[this.toKey] = this.parent[this.fromKey]
    relatedInstance[this.typeKey] = this.typeValue
    return yield relatedInstance.save()
  }
}

module.exports = MorphOneOrMany
