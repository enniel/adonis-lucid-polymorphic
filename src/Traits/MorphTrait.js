'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const MorphMany = require('../Relations/MorphMany')

class MorpthTrait {
  static register (Model) {
    Model.prototype.morphMany = function (related, determiner, primaryKey) {
      return new MorphMany(this, related, determiner, primaryKey)
    }
  }
}

module.exports = MorpthTrait
