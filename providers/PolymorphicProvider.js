'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const ServiceProvider = require('adonis-fold').ServiceProvider

class PolymorphicProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Lucid/MorphTrait', function () {
      const MorphTrait = require('../src/Traits/MorphTrait')
      return new MorphTrait()
    })
  }
}

module.exports = PolymorphicProvider
