'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const { ServiceProvider } = require('@adonisjs/fold')

class PolymorphicProvider extends ServiceProvider {
  async register () {
    const MorphTrait = require('../src/Traits/MorphTrait')
    this.app.bind('Adonis/Traits/Morphable', () => new MorphTrait())
    this.app.alias('Adonis/Traits/Morphable', 'Morphable')
  }
}

module.exports = PolymorphicProvider
