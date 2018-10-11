'use strict'

const _ = require('lodash')
const QueryBuilder = require('@adonisjs/lucid/src/Lucid/QueryBuilder')
const EagerLoad = require('../EagerLoad')

/**
 * Eagerload relations for all model instances
 *
 * @method _eagerLoad
 *
 * @param  {Array}   modelInstance
 *
 * @return {void}
 *
 * @private
 */
QueryBuilder.prototype._eagerLoad = async function _eagerLoad (modelInstances) {
  if (_.size(modelInstances)) {
    await new EagerLoad(this._eagerLoads).load(modelInstances)
  }
}

/**
 * Access of query formatter
 *
 * @method formatter
 *
 * @return {Object}
 */
QueryBuilder.prototype.formatter = function formatter () {
  return this.query.client.formatter(this.query)
}

module.exports = QueryBuilder
