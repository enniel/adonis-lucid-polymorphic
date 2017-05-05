'use strict'

/**
 * adonis-lucid-morphs
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const ServiceProvider = require('adonis-fold').ServiceProvider

class MorphsProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Lucid/MorphTrait', function () {
      return require('../src/Traits/MorphTrait')
    })
  }
}

module.exports = MorphsProvider
