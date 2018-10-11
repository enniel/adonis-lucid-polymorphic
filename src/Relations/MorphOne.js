'use strict'

const CE = require('@adonisjs/lucid/src/Exceptions')
const _ = require('lodash')
const MorphOneOrMany = require('./MorphOneOrMany')

class MorphOne extends MorphOneOrMany {
  /**
   * Takes an array of related instances and returns an array
   * for each parent record.
   *
   * @method group
   *
   * @param  {Array} relatedInstances
   *
   * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
   */
  group (relatedInstances) {
    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance[this.foreignKey]
      const existingRelation = _.find(result, (row) => row.identity === foreignKeyValue)

      /**
       * If there is already an existing instance for same parent
       * record. We should override the value and do WARN the
       * user since hasOne should never have multiple
       * related instance.
       */
      if (existingRelation) {
        existingRelation.value = relatedInstance
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])
    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  /**
   * Fetch related rows for a relationship
   *
   * @method fetch
   *
   * @alias first
   *
   * @return {Model}
   */
  fetch () {
    return this.first()
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   *
   * @return {Object}
   */
  relatedWhere (count) {
    const lhs = this.columnize(`${this.$primaryTable}.${this.primaryKey}`)
    const rhs = this.columnize(`${this.$foreignTable}.${this.foreignKey}`)
    this.relatedQuery
      .whereRaw(`${lhs} = ${rhs}`)
      .where(`${this.$foreignTable}.${this.morphTypeKey}`, this.$morphTypeKeyValue)

    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }

  /* istanbul ignore next */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'morphOne')
  }

  /* istanbul ignore next */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'morphOne')
  }
}

module.exports = MorphOne
