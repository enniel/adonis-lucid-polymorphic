'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const ServiceProvider = require('adonis-fold').ServiceProvider

class RelationProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Src/Relation', function () {
      return require('../src/Relations/Relation')
    })
  }
}

module.exports = RelationProvider
