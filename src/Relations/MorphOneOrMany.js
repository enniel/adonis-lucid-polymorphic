'use strict'

const BaseRelation = require('@adonisjs/lucid/src/Lucid/Relations/BaseRelation')
const util = require('@adonisjs/lucid/lib/util')
const _ = require('lodash')

class MorphOneOrMany extends BaseRelation {
  constructor (parentInstance, relatedModel, primaryKey, foreignKey, morphTypeKey) {
    super(parentInstance, relatedModel, primaryKey, foreignKey)

    this.morphTypeKey = morphTypeKey

    /**
     * this is default value to eagerload data, but users
     * can pass their custom function by calling
     * `eagerLoadQuery` method and pass a
     * closure to it.
     *
     * @method _eagerLoadFn
     *
     * @param  {Object} query
     * @param  {String} fk
     * @param  {Array} rows
     * @param  {String} typeKey
     * @param  {String} typeKeyValue
     *
     * @return {void}
     */
    this._eagerLoadFn = function (query, fk, values, morphTypeKey, morphType) {
      query
        .whereIn(`${this.RelatedModel.table}.${fk}`, values)
        .where(`${this.RelatedModel.table}.${morphTypeKey}`, morphType)
    }

    /**
     * Storing relation meta-data on the
     * query builder.
     */
    this.relatedQuery.$relation.morphTypeKey = this.morphTypeKey
  }

  /**
   * Returns the value for the type key set on
   * the relationship
   *
   * @attribute $morphTypeKeyValue
   *
   * @return {Mixed}
   */
  get $morphTypeKeyValue () {
    return this.parentInstance.constructor.morphKey || this.$primaryTable
  }

  /**
   * Decorates the query instance with the required where
   * clause. This method should be called internally by
   * all read/update methods.
   *
   * @method _decorateQuery
   *
   * @return {void}
   *
   * @private
   */
  _decorateQuery () {
    this.relatedQuery
      .where(this.foreignKey, this.$primaryKeyValue)
      .where(this.morphTypeKey, this.$morphTypeKeyValue)
  }

  /**
   * Persists the parent model instance if it's not
   * persisted already. This is done before saving
   * the related instance
   *
   * @method _persistParentIfRequired
   *
   * @param {Object} [trx]
   *
   * @return {void}
   *
   * @private
   */
  async _persistParentIfRequired (trx) {
    if (this.parentInstance.isNew) {
      await this.parentInstance.save(trx)
    }
  }

  /**
   * Returns an array of values to be used for running
   * whereIn query when eagerloading relationships.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances - An array of model instances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.transform(modelInstances, (result, modelInstance) => {
      if (util.existy(modelInstance[this.primaryKey])) {
        result.push(modelInstance[this.primaryKey])
      }
      return result
    }, [])
  }

  /**
   * Returns the eagerLoad query for the relationship
   *
   * @method eagerLoad
   * @async
   *
   * @param  {Array}          rows
   *
   * @return {Object}
   */
  async eagerLoad (rows) {
    const mappedRows = this.mapValues(rows)
    if (!mappedRows || !mappedRows.length) {
      return this.group([])
    }
    this._eagerLoadFn(this.relatedQuery, this.foreignKey, mappedRows, this.morphTypeKey, this.$morphTypeKeyValue)
    const relatedInstances = await this.relatedQuery.fetch()
    return this.group(relatedInstances.rows)
  }

  /**
   * Adds `on` clause to the innerjoin context. This
   * method is mainly used by HasManyThrough
   *
   * @method addWhereOn
   *
   * @param  {Object}   context
   */
  addWhereOn (context) {
    context
      .on(`${this.$primaryTable}.${this.primaryKey}`, '=', `${this.$foreignTable}.${this.foreignKey}`)
      .on(`${this.$foreignTable}.${this.morphTypeKey}`, '=', this.$morphTypeKeyValue)
  }

  /**
   * Saves the related instance to the database. Foreign
   * key is set automatically.
   *
   * NOTE: This method will persist the parent model if
   * not persisted already.
   *
   * @method save
   *
   * @param  {Object}  relatedInstance
   * @param  {Object}  [trx]
   *
   * @return {Promise}
   */
  async save (relatedInstance, trx) {
    await this._persistParentIfRequired(trx)
    relatedInstance[this.foreignKey] = this.$primaryKeyValue
    relatedInstance[this.morphTypeKey] = this.$morphTypeKeyValue
    return relatedInstance.save(trx)
  }

  /**
   * Creates the new related instance model and persist
   * it to database. Foreign key is set automatically.
   *
   * NOTE: This method will persist the parent model if
   * not persisted already.
   *
   * @method create
   * @param  {Object}  [trx]
   *
   * @param  {Object} payload
   *
   * @return {Promise}
   */
  async create (payload, trx) {
    await this._persistParentIfRequired(trx)
    payload[this.foreignKey] = this.$primaryKeyValue
    payload[this.morphTypeKey] = this.$morphTypeKeyValue
    return this.RelatedModel.create(payload, trx)
  }
}

module.exports = MorphOneOrMany
