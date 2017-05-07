'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

module.exports = {
  formatQuery: function (query) {
    if (process.env.DB === 'mysql') {
      return query.replace(/"/g, '`')
    }
    return query
  },

  formatBindings: function (bindings) {
    return bindings
  }
}
