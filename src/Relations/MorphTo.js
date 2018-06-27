'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const BaseRelation = require('@adonisjs/lucid/src/Lucid/Relations/BaseRelation')
const CE = require('@adonisjs/lucid/src/Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')
const _ = require('lodash')

function createMorphMap (morphMap) {
  if (_.isArray(morphMap)) {
    morphMap = _.reduce(morphMap, (result, model) => {
      result[model.table] = model
      return result
    }, {})
  }
  if (_.isObject(morphMap)) {
    morphMap = _.reduce(morphMap, (result, model, key) => {
      result[key] = model
      return result
    }, {})
  }
  return morphMap
}

class MorphTo extends BaseRelation {
  constructor (parent, determiner, morphMap, primaryKey) {
    super(parent, parent.constructor)
    this.toKey = primaryKey || this.parent.constructor.primaryKey
    this.fromKey = determiner ? `${determiner}_id` : 'parent_id'
    this.typeKey = determiner ? `${determiner}_type` : 'parent_type'
    this.morphMap = createMorphMap(morphMap) || {}
    this.morphPrefix = '_morph_'
  }

  /**
   * empty placeholder to be used when unable to eagerload
   * relations. It needs to be an array of many to many
   * relationships.
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
   * Get the morph key.
   *
   * @param  {Object}  instance
   *
   * @return {String|null}
   */
  morphKey (instance) {
    return _.findKey(this.morphMap, (model) => {
      return instance instanceof model
    })
  }

  /**
   * Get the morph model.
   *
   * @param  {String}  key
   *
   * @return {Object|null}
   */
  morphModel (key) {
    return _.get(this.morphMap, key)
  }

  /**
   * Returns the query builder instance for related model.
   *
   * @return {Object}
   */
  getRelatedQuery () {
    this._makeJoinQuery()
    return this.relatedQuery
  }

  /**
   * decorates the current query chain before execution
   */
  _decorateRead () {
    this._makeJoinQuery()
    _.each(this.morphMap, (model, typeKey) => {
      this.relatedQuery.orWhere(`${model.table}.${this.toKey}`, this.parent[this.fromKey])
    })
  }

  /**
   * makes the join query to be used by other
   * methods.
   *
   * @param {Boolean} ignoreSelect
   *
   * @public
   */
  _makeJoinQuery (ignoreSelect) {
    const selectionKeys = [
      `${this.related.table}.${this.toKey} as ${this.morphPrefix}${this.toKey}`,
      `${this.related.table}.${this.typeKey} as ${this.morphPrefix}${this.typeKey}`,
      `${this.related.table}.${this.fromKey} as ${this.morphPrefix}${this.fromKey}`
    ]
    const raw = this.relatedQuery.queryBuilder.raw
    const self = this
    _.each(this.morphMap, (model, key) => {
      selectionKeys.push(`${model.table}.*`)
      this.relatedQuery.innerJoin(`${model.table}`, function () {
        this
          .on(`${self.related.table}.${self.fromKey}`, `${model.table}.${self.toKey}`)
          .on(`${self.related.table}.${self.typeKey}`, raw('?', [key]))
      })
    })
    if (!ignoreSelect) {
      this.relatedQuery.select.apply(this.relatedQuery, selectionKeys)
    }
  }

  /**
   * Returns the existence query to be used when main
   * query is dependent upon childs.
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  exists (callback) {
    this._makeJoinQuery(true)
    if (typeof (callback) === 'function') {
      callback(this.relatedQuery)
    }
    return this.relatedQuery.modelQueryBuilder
  }

  /**
   * Returns the existence query to be used when main
   * query is dependent upon childs.
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  counts (callback) {
    this._makeJoinQuery(true)
    if (typeof (callback) === 'function') {
      callback(this.relatedQuery)
    }
    return this.relatedQuery.modelQueryBuilder
  }

  /**
   * transform value
   */
  _transformer (value) {
    if (value) {
      const typeKey = value[`${this.morphPrefix}${this.typeKey}`]
      const ModelClass = this.morphModel(typeKey)
      const modelInstance = new ModelClass()
      const attributes = _.omit(value.attributes, [
        `${this.morphPrefix}${this.toKey}`,
        `${this.morphPrefix}${this.typeKey}`,
        `${this.morphPrefix}${this.fromKey}`
      ])
      modelInstance.attributes = attributes
      modelInstance.exists = true
      modelInstance.original = _.clone(modelInstance.attributes)
      return modelInstance
    }
    return value
  }

  /**
   * morphTo cannot have delete, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  delete () {
    throw CE.ModelRelationException.unSupportedMethod('delete', this.constructor.name)
  }

  /**
   * morphTo cannot have paginate, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  paginate () {
    throw CE.ModelRelationException.unSupportedMethod('paginate', this.constructor.name)
  }

  /**
   * overrides base save method to throw an error, as
   * morphTo does not support save method
   *
   * @public
   */
  async save () {
    throw CE.ModelRelationException.unSupportedMethod('save', this.constructor.name)
  }

  /**
   * overrides base create method to throw an error, as
   * morphTo does not support create method
   *
   * @public
   */
  async create () {
    throw CE.ModelRelationException.unSupportedMethod('create', this.constructor.name)
  }

  /**
   * morphTo cannot have createMany, since it
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
   * morphTo cannot have saveMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  async saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', this.constructor.name)
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
   * @param {Function} [scopeMethod]
   * @return {Object}
   *
   * @public
   *
   */
  async eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    this._makeJoinQuery()
    _.each(this.morphMap, (model, typeKey) => {
      this.relatedQuery.orWhereIn(`${model.table}.${this.toKey}`, values)
    })
    const results = await this.relatedQuery.fetch()
    const self = this
    return results.keyBy((item) => {
      return item[this.toKey]
    }).mapValues((value) => {
      return self._transformer(value)
    }).value()
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key. It is equivalent to eagerLoad but query defination
   * is little different.
   *
   * @param  {Mixed} value
   * @param {Function} [scopeMethod] [description]
   * @return {Object}
   *
   * @public
   *
   */
  async eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    this._makeJoinQuery()
    _.each(this.morphMap, (model, typeKey) => {
      this.relatedQuery.orWhere(`${model.table}.${this.toKey}`, value)
    })
    const result = await this.relatedQuery.first()
    const response = {}
    response[value] = this._transformer(result)
    return response
  }

  /**
   * associates a related model to the parent model by setting
   * up foreignKey value
   *
   * @param  {Object}  relatedInstance
   *
   * @public
   */
  associate (relatedInstance) {
    if (!this.morphKey(relatedInstance)) {
      const morphModels = _.reduce(this.morphMap, (result, value) => {
        result.push(value.name)
        return result
      }, [])
      throw CE.ModelRelationException.relationMisMatch(`associate accepts an instance one of: ${_.join(morphModels, ', ')}`)
    }
    if (relatedInstance.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('associate', this.parent.constructor.name, relatedInstance.constructor.name)
    }
    if (!relatedInstance[this.toKey]) {
      logger.warn(`Trying to associate relationship with ${this.toKey} as foriegnKey, whose value is falsy`)
    }
    this.parent[this.fromKey] = relatedInstance[this.toKey]
    this.parent[this.typeKey] = this.morphKey(relatedInstance)
  }

  /**
   * dissociate a related model from the parent model by setting
   * foreignKey to null
   *
   * @public
   */
  dissociate () {
    this.parent[this.fromKey] = null
    this.parent[this.typeKey] = null
  }

  /**
   * returns the first match item for related model
   *
   * @return {Object}
   *
   * @public
   */
  async first () {
    this._validateRead()
    this._decorateRead()
    const result = await this.relatedQuery.first()
    return this._transformer(result)
  }
}

module.exports = MorphTo
