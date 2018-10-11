'use strict'

module.exports = {
  setupTables (knex) {
    const tables = [
      knex.schema.createTable('videos', function (table) {
        table.increments()
        table.timestamps()
        table.integer('vid')
        table.string('title')
        table.string('uri')
        table.integer('category_id')
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('posts', function (table) {
        table.increments()
        table.timestamps()
        table.string('title')
        table.string('uri')
        table.integer('category_id')
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('images', function (table) {
        table.increments()
        table.timestamps()
        table.string('uri')
        table.integer('imageable_id')
        table.string('imageable_type')
        table.string('storage_path')
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('categories', function (table) {
        table.increments()
        table.timestamps()
        table.string('title')
        table.integer('all_views')
        table.integer('categorizable_id')
        table.string('categorizable_type')
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('comments', function (table) {
        table.increments()
        table.timestamps()
        table.string('text')
        table.integer('commentable_id')
        table.string('commentable_type')
        table.integer('responsible_id')
        table.string('responsible_type')
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('tags', function (table) {
        table.increments()
        table.string('title')
        table.string('color').nullable()
        table.integer('taggable_id')
        table.string('taggable_type')
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
    return Promise.all(tables)
  },
  dropTables (knex) {
    const tables = [
      knex.schema.dropTable('videos'),
      knex.schema.dropTable('posts'),
      knex.schema.dropTable('comments'),
      knex.schema.dropTable('tags'),
      knex.schema.dropTable('images'),
      knex.schema.dropTable('reactions'),
      knex.schema.dropTable('issues'),
      knex.schema.dropTable('categories')
    ]
    return Promise.all(tables)
  },
  createRecords (knex, table, values) {
    return knex.table(table).insert(values).returning('id')
  },
  truncate (knex, table) {
    return knex.table(table).truncate()
  },
  up (knex) {
    return this.setupTables(knex)
  },
  down (knex) {
    return this.dropTables(knex)
  }
}
