'use strict'

const _ = require('lodash')
const GE = require('@adonisjs/generic-exceptions')
const MorphOneOrMany = require('./MorphOneOrMany')

class MorphMany extends MorphOneOrMany {
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
    const Serializer = this.RelatedModel.resolveSerializer()

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
        existingRelation.value.addRow(relatedInstance)
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: new Serializer([relatedInstance])
      })
      return result
    }, [])

    return { key: this.primaryKey, values: transformedValues, defaultValue: new Serializer([]) }
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   * @param  {Number}      counter
   *
   * @return {Object}
   */
  relatedWhere (count, counter) {
    /**
     * When we are making self joins, we should alias the current
     * table with the counter, which is sent by the consumer of
     * this method.
     *
     * Also the counter should be incremented by the consumer itself.
     */
    if (this.$primaryTable === this.$foreignTable) {
      this.relatedTableAlias = `sj_${counter}`
      this.relatedQuery.table(`${this.$foreignTable} AS ${this.relatedTableAlias}`)
    }

    const tableAlias = this.relatedTableAlias || this.$foreignTable

    const lhs = this.columnize(`${this.$primaryTable}.${this.primaryKey}`)
    const rhs = this.columnize(`${tableAlias}.${this.foreignKey}`)
    this.relatedQuery
      .whereRaw(`${lhs} = ${rhs}`)
      .where(`${tableAlias}.${this.morphTypeKey}`, this.$morphTypeKeyValue)

    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfPayload
   * @param  {Object}  [trx]
   *
   * @return {Array}
   */
  async createMany (arrayOfPayload, trx) {
    if (!Array.isArray(arrayOfPayload)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('morphMany.createMany expects an array of values', arrayOfPayload)
    }

    await this._persistParentIfRequired(trx)

    const savedRows = []
    for (let payload of arrayOfPayload) {
      const row = await this.create(payload, trx)
      savedRows.push(row)
    }

    return savedRows
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfRelatedInstances
   * @param  {Object}  [trx]
   *
   * @return {Array}
   */
  async saveMany (arrayOfRelatedInstances, trx) {
    if (!Array.isArray(arrayOfRelatedInstances)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('morphMany.saveMany expects an array of related model instances', arrayOfRelatedInstances)
    }

    await this._persistParentIfRequired(trx)

    const savedRows = []
    for (let relatedInstance of arrayOfRelatedInstances) {
      const row = await this.save(relatedInstance, trx)
      savedRows.push(row)
    }

    return savedRows
  }
}

module.exports = MorphMany
