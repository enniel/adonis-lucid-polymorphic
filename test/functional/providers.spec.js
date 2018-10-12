'use strict'

const path = require('path')
const { ioc, registrar } = require('@adonisjs/fold')
const test = require('japa')

test.group('Providers', (group) => {
  test('PolymorphicProvider', async (assert) => {
    await registrar
      .providers([path.join(__dirname, '../../providers/PolymorphicProvider')])
      .registerAndBoot()

    const Morphable = require('../../src/Traits/Morphable')

    assert.isDefined(ioc.use('Adonis/Traits/Morphable'))
    assert.isFalse(ioc._bindings['Adonis/Traits/Morphable'].singleton)
    assert.equal(ioc._aliases['Morphable'], 'Adonis/Traits/Morphable')
    assert.instanceOf(ioc.use('Adonis/Traits/Morphable'), Morphable)
    assert.instanceOf(ioc.use('Morphable'), Morphable)
    assert.deepEqual(ioc.use('Adonis/Traits/Morphable'), ioc.use('Morphable'))
  })
})
