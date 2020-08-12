'use strict'

const _ = require('lodash')
const BaseEagerLoad = require('@adonisjs/lucid/src/Lucid/EagerLoad')
const RelationsParser = require('@adonisjs/lucid/src/Lucid/Relations/Parser')

class EagerLoad extends BaseEagerLoad {
  /**
   * Load relationships for all the model instances and set
   * relationships on the model instances using @ref('Model.setRelated')
   *
   * @method load
   *
   * @param  {Array} modelInstances
   *
   * @return {void}
   */
  async load (modelInstances) {
    const groupedRelations = _.reduce(modelInstances, (result, modelInstance) => {
      _.each(this._relations, (attributes, relation) => {
        RelationsParser.validateRelationExistence(modelInstance, relation)
        const relationInstance = RelationsParser.getRelatedInstance(modelInstance, relation)
        this._applyRuntimeConstraints(relationInstance, attributes.callback)
        this._chainNested(relationInstance, attributes.nested)
        const RelatedModel = relationInstance.RelatedModel
        const groupName = RelatedModel.name ? RelatedModel.name : ""
        if (!result[groupName]) {
          result[groupName] = {
            relation,
            relationInstance: null,
            modelInstances: []
          }
        }
        result[groupName].relationInstance = relationInstance
        result[groupName].modelInstances.push(modelInstance)
      })
      return result
    }, {})

    /**
     * An array of queries to be executed queries parallel
     */
    const queries = _.map(groupedRelations, (group) => {
      return group.relationInstance.eagerLoad(group.modelInstances)
    })

    const relatedModelsGroup = await Promise.all(queries)

    /**
     * Here we have an array of different relations for multiple parent
     * records. What we need is to fetch the parent level record and
     * set relationships for each relation on it. Same is done
     * for all parent records.
     */
    _.each(Object.keys(groupedRelations), (groupName, index) => {
      const { relation, modelInstances } = groupedRelations[groupName]
      const relationGroups = relatedModelsGroup[index]

      /**
       * We should loop over actual data set and not the resolved relations.
       * There are chances when actual relation set will have more rows
       * than relations, in that case we need to set relations to
       * `null` or whatever the default value is.
       */
      _.each(modelInstances, (modelInstance) => {
        /**
         * Find the actual value of the relationship for that model instances
         */
        const value = relationGroups.values.find((group) => {
          return group.identity === modelInstance[relationGroups.key]
        }) || { value: relationGroups.defaultValue }

        /**
         * Setting relationship on the parent model instance
         */
        modelInstance.setRelated(relation, value.value)
      })
    })
  }
}

module.exports = EagerLoad
