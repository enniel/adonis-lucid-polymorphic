'use strict'

module.exports = {
  formatQuery (query) {
    if (process.env.DB === 'mysql' || process.env.DB === 'sqlite') {
      return query.replace(/"/g, '`')
    }
    return query
  },

  formatBindings (bindings) {
    return bindings
  },

  formatNumber (num) {
    return process.env.DB === 'pg' ? String(num) : num
  },

  addReturningStatement (query, field) {
    return process.env.DB === 'pg' ? `${query} returning "${field}"` : query
  }
}
