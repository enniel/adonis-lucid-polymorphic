'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const Relations = require('../Relations')

class MorpthTrait {
  register (Model) {
    /**
     * returns morphMany instance for a given model. Later
     * returned instance will be responsible for
     * resolving relations
     *
     * @param  {Object}  related
     * @param  {String}  [determiner]
     * @param  {String}  [primaryKey]
     * @return {Object}
     *
     * @public
     */
    Model.prototype.morphMany = function (related, determiner, primaryKey) {
      return new Relations.MorphMany(this, related, determiner, primaryKey)
    }

    /**
     * returns morphOne instance for a given model. Later
     * returned instance will be responsible for
     * resolving relations
     *
     * @param  {Object}  related
     * @param  {String}  [determiner]
     * @param  {String}  [primaryKey]
     * @return {Object}
     *
     * @public
     */
    Model.prototype.morphOne = function (related, determiner, primaryKey) {
      return new Relations.MorphOne(this, related, determiner, primaryKey)
    }

    /**
     * returns morphTo instance for a given model. Later
     * returned instance will be responsible for
     * resolving relations
     *
     * @param  {String}        [determiner]
     * @param  {Object|Array}  [morphMap]
     * @param  {String}        [primaryKey]
     * @return {Object}
     *
     * @public
     */
    Model.prototype.morphTo = function (determiner, morphMap, primaryKey) {
      return new Relations.MorphTo(this, determiner, morphMap, primaryKey)
    }
  }
}

module.exports = MorpthTrait
