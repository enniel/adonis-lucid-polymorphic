'use strict'

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

module.exports = {
  get migrationsTable () {
    return 'adonis_migrations'
  },

  get connection () {
    return process.env.DB || 'sqlite'
  },

  get sqlite () {
    return {
      client: 'sqlite',
      connection: {
        filename: path.join(__dirname, './tmp/test.sqlite3')
      }
    }
  },

  get mysql () {
    return {
      client: 'mysql',
      version: '5.7',
      connection: {
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'root',
        database: process.env.MYSQL_DATABASE || 'default'
      }
    }
  },

  get pg () {
    return {
      client: 'pg',
      connection: {
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSSWORD || 'postgres',
        database: process.env.PG_DATABASE || 'default'
      }
    }
  }
}
