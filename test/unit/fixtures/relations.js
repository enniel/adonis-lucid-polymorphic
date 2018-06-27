'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const bluebird = require('bluebird')
const files = require('./files')

module.exports = {
  setupTables: function (knex) {
    const tables = [
      knex.schema.createTable('videos', function (table) {
        table.increments()
        table.timestamps()
        table.string('title')
        table.string('uri')
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('tags', function (table) {
        table.increments()
        table.string('title')
        table.integer('taggable_id')
        table.string('taggable_type')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('places', function (table) {
        table.increments()
        table.timestamps()
        table.string('title')
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('locations', function (table) {
        table.increments()
        table.decimal('lat', 8, 5)
        table.decimal('lng', 8, 5)
        table.integer('locationable_id')
        table.string('locationable_type')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('reactions', function (table) {
        table.increments()
        table.string('reaction')
        table.integer('reactionable_id')
        table.string('reactionable_type')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('issues', function (table) {
        table.increments()
        table.string('title')
        table.string('description')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      })
    ]
    return bluebird.all(tables)
  },
  dropTables: function (knex) {
    const tables = [
      knex.schema.dropTable('videos'),
      knex.schema.dropTable('tags'),
      knex.schema.dropTable('locations'),
      knex.schema.dropTable('places'),
      knex.schema.dropTable('reactions'),
      knex.schema.dropTable('issues')
    ]
    return bluebird.all(tables)
  },
  createRecords: async function (knex, table, values) {
    return knex.table(table).insert(values).returning('id')
  },
  truncate: async function (knex, table) {
    await knex.table(table).truncate()
  },
  up: async function (knex) {
    await files.createDir()
    await this.setupTables(knex)
  },
  down: async function (knex) {
    await this.dropTables(knex)
  }
}
