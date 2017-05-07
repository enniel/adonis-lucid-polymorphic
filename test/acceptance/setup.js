'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const fold = require('adonis-fold')
const filesFixtures = require('./fixtures/files')
const Ace = require('adonis-ace')
const Ioc = fold.Ioc
const Registrar = fold.Registrar
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })
const Env = process.env
const get = require('lodash/get')

const Config = {
  get (key) {
    return get(this, key)
  },

  get database () {
    return {
      migrationsTable: 'adonis_migrations',

      connection: Env.DB_CONNECTION || 'sqlite',

      sqlite: {
        client: 'sqlite3',
        connection: {
          filename: path.join(__dirname, './storage/test.sqlite')
        },
        useNullAsDefault: true
      },

      mysql: {
        client: 'mysql',
        connection: {
          host: Env.DB_HOST || 'localhost',
          port: Env.DB_PORT || 3306,
          user: Env.DB_USER || 'root',
          password: Env.DB_PASSWORD || '',
          database: Env.DB_DATABASE || 'adonis'
        }
      },

      pg: {
        client: 'pg',
        connection: {
          host: Env.DB_HOST || 'localhost',
          port: Env.DB_PORT || 5432,
          user: Env.DB_USER || 'root',
          password: Env.DB_PASSWORD || '',
          database: Env.DB_DATABASE || 'adonis'
        }
      }
    }
  }
}

const Helpers = {
  migrationsPath: function () {
    return path.join(__dirname, './database/migrations')
  },
  seedsPath: function () {
    return path.join(__dirname, './database/seeds')
  },
  databasePath: function (file) {
    return path.join(__dirname, './database', file)
  }
}

const commands = [
  'Adonis/Commands/Migration:Run',
  'Adonis/Commands/Migration:Rollback',
  'Adonis/Commands/Migration:Refresh',
  'Adonis/Commands/Migration:Reset',
  'Adonis/Commands/DB:Seed',
  'Adonis/Commands/Migration:Status'
]

const providers = [
  'adonis-lucid/providers/DatabaseProvider',
  'adonis-lucid/providers/FactoryProvider',
  'adonis-lucid/providers/LucidProvider',
  'adonis-lucid/providers/MigrationsProvider',
  'adonis-lucid/providers/SchemaProvider',
  'adonis-lucid/providers/SeederProvider',
  'adonis-lucid/providers/CommandsProvider',
  'adonis-ace/providers/CommandProvider',
  path.join(__dirname, '../../providers/RelationProvider.js'),
  path.join(__dirname, '../../providers/PolymorphicProvider.js')
]

const setup = exports = module.exports = {}

setup.loadProviders = function () {
  Ioc.bind('Adonis/Src/Helpers', function () {
    return Helpers
  })

  Ioc.bind('Adonis/Src/Config', function () {
    return Config
  })
  return Registrar.register(providers)
}

setup.registerCommands = function () {
  Ace.register(commands)
}

setup.migrate = function * (schemas, direction) {
  const Migrations = Ioc.use('Adonis/Src/Migrations')
  yield new Migrations()[direction](schemas)
  if (direction === 'down') {
    yield new Migrations().database.schema.dropTable('adonis_migrations')
  }
}

setup.seed = function (seeds) {
  const Seeder = Ioc.use('Adonis/Src/Seeder')
  return Seeder.exec(seeds)
}

setup.runCommand = function (command, args = [], options = {}) {
  return Ace.call(command, args, options)
}
