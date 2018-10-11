'use strict'

const BaseRelation = require('@adonisjs/lucid/src/Lucid/Relations/BaseRelation')
const CE = require('@adonisjs/lucid/src/Exceptions')
const util = require('@adonisjs/lucid/lib/util')
const _ = require('lodash')

const getRelatedModel = (relatedModels, morphType) => {
  return relatedModels.find(RelatedModel => {
    return RelatedModel.morphType === morphType || RelatedModel.table === morphType
  })
}

class MorphTo extends BaseRelation {
  constructor (parentInstance, relatedModels, primaryKey, foreignKey, morphIdKey, morphTypeKey) {
    const RelatedModel = getRelatedModel(relatedModels, parentInstance[morphTypeKey]) || relatedModels[0]
    super(parentInstance, RelatedModel, primaryKey, foreignKey)

    this.relatedModels = relatedModels
    this.morphIdKey = morphIdKey
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
    this._eagerLoadFn = function (query, fk, values) {
      query.whereIn(fk, values)
    }

    /**
     * Storing relation meta-data on the
     * query builder.
     */
    this.relatedQuery.$relation.morphIdKey = this.morphIdKey
    this.relatedQuery.$relation.morphTypeKey = this.morphTypeKey
  }

  /**
   * Returns the value for the morph key set on
   * the relationship
   *
   * @attribute $morphIdKeyValue
   *
   * @return {Mixed}
   */
  get $morphIdKeyValue () {
    return this.parentInstance[this.morphIdKey]
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
    this.relatedQuery.where(this.foreignKey, this.$morphIdKeyValue)
  }

  /**
   * Returns the first row for the related model
   *
   * @method first
   *
   * @return {Object|Null}
   */
  first () {
    if (!this.parentInstance.$persisted) {
      throw CE.RuntimeException.unSavedModel(this.parentInstance.constructor.name)
    }

    if (!util.existy(this.$primaryKeyValue)) {
      return null
    }

    if (!util.existy(this.$morphIdKeyValue)) {
      return null
    }

    this._decorateQuery()
    return this.relatedQuery.first()
  }

  /**
   * Map values from model instances to an array. It is required
   * to make `whereIn` query when eagerloading results.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.transform(modelInstances, (result, modelInstance) => {
      if (util.existy(modelInstance[this.morphIdKey])) {
        result.push(modelInstance[this.morphIdKey])
      }
      return result
    }, [])
  }

  /**
   * Groups related instances with their foriegn keys
   *
   * @method group
   *
   * @param  {Array} relatedInstances
   *
   * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
   */
  group (relatedInstances) {
    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance[this.foreignKey]
      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])

    return { key: this.morphIdKey, values: transformedValues, defaultValue: null }
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
    this._eagerLoadFn(this.relatedQuery, this.foreignKey, mappedRows)
    const relatedInstances = await this.relatedQuery.fetch()
    return this.group(relatedInstances.rows)
  }

  /**
   * Overriding fetch to call first, since belongsTo
   * can never have many rows
   *
   * @method fetch
   * @async
   *
   * @return {Object}
   */
  fetch () {
    return this.first()
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   * @param  {Integer}     counter
   *
   * @return {Object}
   */
  relatedWhere (count, counter) {
    /**
     * When we are making self joins, we should alias the current
     * table with the counter, which is sent by the consumer of
     * this method.
     *
     * Also the counter should be incremented by the consumer itself.
     */
    if (this.$primaryTable === this.$foreignTable) {
      this.relatedTableAlias = `sj_${counter}`
      this.relatedQuery.table(`${this.$foreignTable} AS ${this.relatedTableAlias}`)
    }

    const tableAlias = this.relatedTableAlias || this.$foreignTable

    const lhs = this.columnize(`${this.$primaryTable}.${this.morphIdKey}`)
    const rhs = this.columnize(`${tableAlias}.${this.foreignKey}`)
    this.relatedQuery.whereRaw(`${lhs} = ${rhs}`)

    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }

  /* istanbul ignore next */
  create () {
    throw CE.ModelRelationException.unSupportedMethod('create', 'morphTo')
  }

  /* istanbul ignore next */
  save () {
    throw CE.ModelRelationException.unSupportedMethod('save', 'morphTo')
  }

  /* istanbul ignore next */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'morphTo')
  }

  /* istanbul ignore next */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'morphTo')
  }

  _getMorphType (relatedInstance) {
    const Model = this.relatedModels.find(RelatedModel => {
      return relatedInstance instanceof RelatedModel
    })
    return Model.morphType || Model.table
  }

  /**
   * Associate 2 models together, also this method will save
   * the related model if not already persisted
   *
   * @method associate
   * @async
   *
   * @param  {Object}  relatedInstance
   * @param  {Object}  [trx]
   *
   * @return {Promise}
   */
  async associate (relatedInstance, trx) {
    const morphType = this._getMorphType(relatedInstance)
    if (!morphType) {
      throw CE.ModelRelationException.relationMisMatch(`Method associate accepts only an instance one of: ${this.relatedModels}`)
    }
    if (relatedInstance.isNew) {
      await relatedInstance.save(trx)
    }

    this.parentInstance[this.morphIdKey] = relatedInstance[this.primaryKey]
    this.parentInstance[this.morphTypeKey] = morphType
    return this.parentInstance.save(trx)
  }

  /**
   * Dissociate relationship from database by setting `foriegnKey` and `typeKey` to null
   *
   * @method dissociate
   * @async
   *
   * @param  {Object}  [trx]
   *
   * @return {Promise}
   */
  async dissociate (trx) {
    if (this.parentInstance.isNew) {
      throw CE.ModelRelationException.unsavedModelInstance('Cannot dissociate relationship since model instance is not persisted')
    }

    this.parentInstance[this.morphIdKey] = null
    this.parentInstance[this.morphTypeKey] = null
    return this.parentInstance.save(trx)
  }
}

module.exports = MorphTo
