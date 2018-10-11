'use strict'

const _ = require('lodash')
const { ioc } = require('@adonisjs/lucid/lib/iocResolver')
const Relations = require('../Relations')
const QueryBuilder = require('../QueryBuilder')

class Morpthable {
  register (Model) {
    /**
     * Get fresh instance of query builder for
     * this model.
     *
     * @method query
     *
     * @return {LucidQueryBuilder}
     *
     * @static
     */
    Model.query = function query () {
      const query = new (this.QueryBuilder || QueryBuilder)(this, this.connection)

      /**
       * Listening for query event and executing
       * listeners if any
       */
      query.on('query', (builder) => {
        _(this.$queryListeners)
          .filter((listener) => typeof (listener) === 'function')
          .each((listener) => listener(builder))
      })

      return query
    }

    /**
     * Define a query macro to be added to query builder.
     *
     * @method queryMacro
     *
     * @param  {String}   name
     * @param  {Function} fn
     *
     * @chainable
     */
    Model.queryMacro = function queryMacro (name, fn) {
      /**
       * Someone wished to add methods to query builder but just for
       * this model. First get a unique copy of query builder and
       * then add methods to it's prototype.
       */
      if (!this.QueryBuilder) {
        this.QueryBuilder = class ExtendedQueryBuilder extends QueryBuilder {}
      }

      this.QueryBuilder.prototype[name] = fn
      return this
    }

    /**
     * Returns an instance of @ref('MorphMany') relation
     *
     * @method morphMany
     *
     * @param  {String|Class}  relatedModel
     * @param  {String}        primaryKey
     * @param  {String}        foreignKey
     * @param  {String}        typeKey
     *
     * @return {MorphMany}
     */
    Model.prototype.morphMany = function (relatedModel, primaryKey, foreignKey, typeKey) {
      relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

      primaryKey = primaryKey || this.constructor.primaryKey
      foreignKey = foreignKey || this.constructor.foreignKey
      typeKey = typeKey || this.constructor.typeKey

      return new Relations.MorphMany(this, relatedModel, primaryKey, foreignKey, typeKey)
    }

    /**
     * Returns an instance of @ref('MorphOne') relation
     *
     * @method morphOne
     *
     * @param  {String|Class}  relatedModel
     * @param  {String}        primaryKey
     * @param  {String}        foreignKey
     * @param  {String}        typeKey
     *
     * @return {MorphOne}
     */
    Model.prototype.morphOne = function (relatedModel, primaryKey, foreignKey, typeKey) {
      relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

      primaryKey = primaryKey || this.constructor.primaryKey
      foreignKey = foreignKey || this.constructor.foreignKey
      typeKey = typeKey || this.constructor.typeKey

      return new Relations.MorphOne(this, relatedModel, primaryKey, foreignKey, typeKey)
    }

    /**
     * Returns an instance of @ref('MorphTo') relation
     *
     * @method morphTo
     *
     * @param  {Array}         relatedModels
     * @param  {String}        primaryKey
     * @param  {String}        foreignKey
     * @param  {String}        morphKey
     * @param  {String}        morphType
     *
     * @return {MorphTo}
     */
    Model.prototype.morphTo = function (relatedModels, primaryKey, foreignKey, morphKey, morphType) {
      relatedModels = relatedModels.map(relatedModel => {
        return typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel
      })

      primaryKey = primaryKey || this.constructor.primaryKey
      foreignKey = foreignKey || this.constructor.foreignKey
      morphKey = morphKey || this.constructor.morphKey
      morphType = morphType || this.constructor.morphType

      return new Relations.MorphTo(this, relatedModels, primaryKey, foreignKey, morphKey, morphType)
    }
  }
}

module.exports = Morpthable
