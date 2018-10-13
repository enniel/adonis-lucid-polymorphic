'use strict'

const { ServiceProvider } = require('@adonisjs/fold')

class PolymorphicProvider extends ServiceProvider {
  register () {
    this.app.bind('Adonis/Traits/Morphable', () => {
      const Morphable = require('../src/Traits/Morphable')
      return new Morphable()
    })
    this.app.alias('Adonis/Traits/Morphable', 'Morphable')
  }
}

module.exports = PolymorphicProvider
