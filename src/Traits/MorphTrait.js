'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const MorphMany = require('../Relations/MorphMany')
const MorphOne = require('../Relations/MorphOne')
const MorphTo = require('../Relations/MorphTo')

class MorpthTrait {
  static register (Model) {
    Model.prototype.morphMany = function (related, determiner, primaryKey) {
      return new MorphMany(this, related, determiner, primaryKey)
    }
    Model.prototype.morphOne = function (related, determiner, primaryKey) {
      return new MorphOne(this, related, determiner, primaryKey)
    }
    Model.prototype.morphTo = function (determiner, primaryKey) {
      return new MorphTo(this, determiner, primaryKey)
    }
  }
}

module.exports = MorpthTrait
