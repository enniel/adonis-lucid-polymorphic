'use strict'

const { ServiceProvider } = require('@adonisjs/fold')

class PolymorphicProvider extends ServiceProvider {
  async register () {
    const Morphable = require('../src/Traits/Morphable')
    this.app.bind('Adonis/Traits/Morphable', () => new Morphable())
    this.app.alias('Adonis/Traits/Morphable', 'Morphable')
  }
}

module.exports = PolymorphicProvider
