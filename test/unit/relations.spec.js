'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const Model = require('adonis-lucid/src/Lucid/Model')
const Database = require('adonis-lucid/src/Database')
const chai = require('chai')
chai.use(require('dirty-chai'))
const Ioc = require('adonis-fold').Ioc
const expect = chai.expect
const filesFixtures = require('./fixtures/files')
const relationFixtures = require('./fixtures/relations')
const config = require('./helpers/config')
const MorphMany = require('../../src/Relations/MorphMany')
const MorphOne = require('../../src/Relations/MorphOne')
const MorphTo = require('../../src/Relations/MorphTo')
const MorphTrait = require('../../src/Traits/MorphTrait')
const queryHelpers = require('./helpers/query')
require('co-mocha')

describe('Relations', function () {
  before(function * () {
    Database._setConfigProvider(config)
    Ioc.bind('Adonis/Src/Database', function () {
      return Database
    })
    Ioc.bind('Adonis/Src/Helpers', function () {
      return {
        makeNameSpace: function (hook) {
          return `App/${hook}`
        }
      }
    })
    Ioc.bind('Adonis/Lucid/MorphTrait', function () {
      return new MorphTrait()
    })
    yield filesFixtures.createDir()
    yield relationFixtures.up(Database)
  })

  after(function * () {
    yield relationFixtures.down(Database)
    Database.close()
  })

  context('MorphMany', function () {
    it('should return an instance of MorphMany when relation method has been called', function () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = new Video()
      expect(video.tags() instanceof MorphMany).to.equal(true)
    })

    it('should be able to access query builder of related model', function () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = new Video()
      const relatedQuery = video.tags().where('is_draft', false).toSQL()
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "tags" where "is_draft" = ?'))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([false]))
    })

    it('should be able to fetch results from related model', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', {title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'})
      let tagsQuery = null
      class Tag extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            tagsQuery = query
          })
        }
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Tag.bootIfNotBooted()
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      const tags = yield video.tags().fetch()
      expect(queryHelpers.formatQuery(tagsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "tags" where "taggable_type" = ? and "taggable_id" = ?'))
      expect(tagsQuery.bindings).deep.equal(queryHelpers.formatBindings(['videos', 1]))
      expect(tags.toJSON()).to.be.an('array')
      expect(tags.first() instanceof Tag).to.equal(true)
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to paginate results from related model', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', {title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'})
      let tagsQuery = null
      class Tag extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            tagsQuery = query
          })
        }
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Tag.bootIfNotBooted()
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      const tags = yield video.tags().paginate(1)
      expect(queryHelpers.formatQuery(tagsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "tags" where "taggable_type" = ? and "taggable_id" = ? limit ?'))
      expect(tagsQuery.bindings).deep.equal(['videos', 1, 20])
      expect(tags.toJSON().data).to.be.an('array')
      expect(tags.toJSON()).to.contain.any.keys('total', 'perPage', 'currentPage', 'lastPage')
      expect(tags.first() instanceof Tag).to.equal(true)
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to eagerLoad results from related model', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', {title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'})
      let tagsQuery = null
      class Tag extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            tagsQuery = query
          })
        }
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Tag.bootIfNotBooted()
      Video.bootIfNotBooted()
      const video = yield Video.query().with('tags').first()
      expect(queryHelpers.formatQuery(tagsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "tags" where "taggable_type" = ? and "taggable_id" in (?)'))
      expect(tagsQuery.bindings).deep.equal(['videos', 1])
      expect(video.toJSON().tags).to.be.an('array')
      expect(video.toJSON().tags[0].taggable_id).to.equal(video.toJSON().id)
      expect(video.toJSON().tags[0].taggable_type).to.equal('videos')
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to eagerLoad results from related model instance', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', {title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'})
      let tagsQuery = null
      class Tag extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            tagsQuery = query
          })
        }
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Tag.bootIfNotBooted()
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      yield video.related('tags').load()
      expect(queryHelpers.formatQuery(tagsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "tags" where "taggable_type" = ? and "taggable_id" = ?'))
      expect(tagsQuery.bindings).deep.equal(['videos', 1])
      const tags = video.get('tags')
      expect(tags.toJSON()).to.be.an('array')
      expect(tags.first() instanceof Tag).to.equal(true)
      expect(tags.toJSON()[0].taggable_id).to.equal(video.id)
      expect(tags.toJSON()[0].taggable_type).to.equal('videos')
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to eagerLoad multiple results for related model', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', [{title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'}, {title: 'lucid', taggable_id: savedVideo[0], taggable_type: 'videos'}])
      let tagsQuery = null
      class Tag extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            tagsQuery = query
          })
        }
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Tag.bootIfNotBooted()
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      yield video.related('tags').load()
      expect(queryHelpers.formatQuery(tagsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "tags" where "taggable_type" = ? and "taggable_id" = ?'))
      expect(tagsQuery.bindings).deep.equal(['videos', 1])
      const tags = video.get('tags')
      expect(tags.toJSON()).to.be.an('array')
      expect(tags.size()).to.equal(2)
      expect(tags.value()[0] instanceof Tag).to.equal(true)
      expect(tags.value()[1] instanceof Tag).to.equal(true)
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to save related model instance with proper foriegnKey', function * () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = new Video()
      video.title = 'Musical Routes (AdonisJs)'
      video.uri = 'https://youtu.be/w7LD7E53w3w'
      yield video.save()
      expect(video.id).not.to.equal(undefined)
      const tag = new Tag()
      tag.title = 'adonis'
      yield video.tags().save(tag)
      expect(tag.taggable_id).to.equal(video.id)
      expect(tag.taggable_type).to.equal('videos')
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to create related model instance with proper foriegnKey', function * () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = new Video()
      video.title = 'Musical Routes (AdonisJs)'
      video.uri = 'https://youtu.be/w7LD7E53w3w'
      yield video.save()
      expect(video.id).not.to.equal(undefined)
      const tag = yield video.tags().create({title: 'adonis'})
      expect(tag.taggable_id).to.equal(video.id)
      expect(tag.taggable_type).to.equal('videos')
      expect(tag.title).to.equal('adonis')
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to create many related model instances with createMany', function * () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = new Video()
      video.title = 'Musical Routes (AdonisJs)'
      video.uri = 'https://youtu.be/w7LD7E53w3w'
      yield video.save()
      expect(video.id).not.to.equal(undefined)
      const tags = yield video.tags().createMany([{title: 'adonis'}, {title: 'lucid'}])
      expect(tags).to.be.an('array')
      expect(tags.length).to.equal(2)
      tags.forEach(function (tag) {
        expect(tag.taggable_id).to.equal(video.id)
        expect(tag.taggable_type).to.equal('videos')
      })
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to save many related model instances with saveMany', function * () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = new Video()
      video.title = 'Musical Routes (AdonisJs)'
      video.uri = 'https://youtu.be/w7LD7E53w3w'
      yield video.save()
      expect(video.id).not.to.equal(undefined)
      const tag1 = new Tag()
      tag1.title = 'adonis'
      const tag2 = new Tag()
      tag1.title = 'lucid'
      yield video.tags().saveMany([tag1, tag2])
      expect(tag1.taggable_id).to.equal(video.id)
      expect(tag1.taggable_type).to.equal('videos')
      expect(tag2.taggable_id).to.equal(video.id)
      expect(tag1.taggable_type).to.equal('videos')
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to count the number of related rows', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', [{title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'}, {title: 'lucid', taggable_id: savedVideo[0], taggable_type: 'videos'}])
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      const query = yield video.tags().count('* as total').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select count(*) as "total" from "tags" where "taggable_type" = ? and "taggable_id" = ?'))
      expect(query.bindings).deep.equal(['videos', 1])
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to fetch ids from the relationship', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', [{title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'}, {title: 'lucid', taggable_id: savedVideo[0], taggable_type: 'videos'}])
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      const query = yield video.tags().ids().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select "id", "id" from "tags" where "taggable_type" = ? and "taggable_id" = ?'))
      expect(query.bindings).deep.equal(['videos', 1])
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to fetch key/value pair of two fields from the relationship', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', [{title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'}, {title: 'lucid', taggable_id: savedVideo[0], taggable_type: 'videos'}])
      let tagsQuery = null
      class Tag extends Model {
        static boot () {
          super.boot()
          this.onQuery((query) => {
            tagsQuery = query
          })
        }
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Tag.bootIfNotBooted()
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      const tags = yield video.tags().pair('id', 'title')
      expect(tags).deep.equal({'1': 'adonis', 2: 'lucid'})
      expect(queryHelpers.formatQuery(tagsQuery.sql)).to.equal(queryHelpers.formatQuery('select "id", "title" from "tags" where "taggable_type" = ? and "taggable_id" = ?'))
      expect(tagsQuery.bindings).deep.equal(['videos', 1])
      yield relationFixtures.truncate(Database, 'tags')
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should return the correct query for existence of relationship records', function () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const tagsRelation = new Video().tags()
      const relationQuery = tagsRelation.exists()
      expect(queryHelpers.formatQuery(relationQuery.toSQL().sql)).to.equal(queryHelpers.formatQuery(`select * from "tags" where tags.taggable_type = 'videos' and tags.taggable_id = videos.id`))
    })

    it('should return the correct counts query for existence of relationship records', function () {
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const tagsRelation = new Video().tags()
      const relationQuery = tagsRelation.counts()
      expect(queryHelpers.formatQuery(relationQuery.toSQL().sql)).to.equal(queryHelpers.formatQuery(`select count(*) from "tags" where tags.taggable_type = 'videos' and tags.taggable_id = videos.id`))
    })

    it('should return zero records when related rows are empty', function * () {
      yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const videos = yield Video.query().has('tags').fetch()
      expect(videos.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should return all records when related rows exists', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', {title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'})
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const videos = yield Video.query().has('tags').fetch()
      expect(videos.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'videos')
      yield relationFixtures.truncate(Database, 'tags')
    })

    it('should return zero records when count for related rows does not match', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', {title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'})
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const videos = yield Video.query().has('tags', 2).fetch()
      expect(videos.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'videos')
      yield relationFixtures.truncate(Database, 'tags')
    })

    it('should return zero records when count for related rows does not match', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', [{title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'}, {title: 'lucid', taggable_id: savedVideo[0], taggable_type: 'videos'}])
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const videos = yield Video.query().has('tags', 2).fetch()
      expect(videos.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'videos')
      yield relationFixtures.truncate(Database, 'tags')
    })

    it('should return counts for the related models', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', [{title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'}, {title: 'lucid', taggable_id: savedVideo[0], taggable_type: 'videos'}])
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const videos = yield Video.query().withCount('tags').fetch()
      expect(parseInt(videos.first().tags_count)).to.equal(2)
      yield relationFixtures.truncate(Database, 'videos')
      yield relationFixtures.truncate(Database, 'tags')
    })

    it('should return counts for the related models by applying a filter on withCount method', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      yield relationFixtures.createRecords(Database, 'tags', [{title: 'adonis', taggable_id: savedVideo[0], taggable_type: 'videos'}, {title: 'lucid', taggable_id: savedVideo[0], taggable_type: 'videos'}])
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const videos = yield Video.query().withCount('tags', (builder) => {
        builder.where('title', 'adonis')
      }).fetch()
      expect(parseInt(videos.first().tags_count)).to.equal(1)
      yield relationFixtures.truncate(Database, 'videos')
      yield relationFixtures.truncate(Database, 'tags')
    })
  })

  context('MorphOne', function () {
    it('should return an instance of MorphOne when relation method has been called', function () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = new Place()
      expect(place.location() instanceof MorphOne).to.equal(true)
    })

    it('should return an instance of MorphOne when relation is a namespace', function () {
      class Location extends Model {
      }
      Ioc.bind('App/Location', function () {
        return Location
      })
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne('App/Location', 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = new Place()
      expect(place.location() instanceof MorphOne).to.equal(true)
    })

    it('should be able to call methods on related model', function () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = new Place()
      expect(place.location().where).to.be.a('function')
    })

    it('should be able to fetch results from related model', function () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = new Place()
      const sql = place.location().where('lat', 59.93428).toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "lat" = ?'))
      expect(sql.bindings).deep.equal([59.93428])
    })

    it('should be able to define query methods inside the relation defination', function () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable').where('lat', 59.93428)
        }
      }
      Place.bootIfNotBooted()
      const place = new Place()
      const sql = place.location().toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "lat" = ?'))
      expect(sql.bindings).deep.equal([59.93428])
    })

    it('should be able to extend query methods defined inside the relation defination', function () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable').where('lat', 59.93428)
        }
      }
      Place.bootIfNotBooted()
      const place = new Place()
      const sql = place.location().where('lng', 30.33509).toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "lat" = ? and "lng" = ?'))
      expect(sql.bindings).deep.equal(queryHelpers.formatBindings([59.93428, 30.33509]))
    })

    it('should throw an error when target model has not been saved and calling fetch on related model', function * () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable').where('lat', 59.93428)
        }
      }
      Place.bootIfNotBooted()
      const place = new Place()
      try {
        yield place.location().where('lng', 30.33509).fetch()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_UNSAVED_MODEL_INSTANCE: Cannot perform fetch on Location model since Place instance is unsaved')
      }
    })

    it('should be able to fetch related model from a saved instance', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: savedPlace[0], locationable_type: 'places'})
      let relatedQuery = null
      let parentQuery = null
      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
      }
      Place.bootIfNotBooted()
      Location.bootIfNotBooted()
      const place = yield Place.find(savedPlace[0])
      expect(place instanceof Place).to.equal(true)
      const location = yield place.location().fetch()
      expect(location instanceof Location).to.equal(true)
      expect(location.locationable_id).to.equal(place.id)
      expect(location.locationable_type).to.equal('places')
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "places" where "id" = ? limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" = ? limit ?'))
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([1, 1]))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1, 1]))
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should be able to eager load relation', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: savedPlace[0], locationable_type: 'places'})
      let relatedQuery = null
      let parentQuery = null
      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
      }
      Place.bootIfNotBooted()
      Location.bootIfNotBooted()
      const location = yield Place.prototype.location().eagerLoad(savedPlace[0])
      expect(location).to.be.an('object')
      expect(location['1']).to.be.an('object')
      expect(location['1'].locationable_id).to.equal(savedPlace[0])
      expect(location['1'].locationable_type).to.equal('places')
      expect(parentQuery).to.equal(null)
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" in (?)'))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1]))
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should be able to eager load relation for multiple values', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: savedPlace[0], locationable_type: 'places'})
      let relatedQuery = null
      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const location = yield Place.prototype.location().eagerLoad([savedPlace[0], 2, 3])
      expect(location).to.be.an('object')
      expect(location['1']).to.be.an('object')
      expect(location['1'].locationable_id).to.equal(savedPlace[0])
      expect(location['1'].locationable_type).to.equal('places')
      expect(location['2']).to.equal(undefined)
      expect(location['3']).to.equal(undefined)
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" in (?, ?, ?)'))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1, 2, 3]))
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should be able to eager load relation using static with method', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: savedPlace[0], locationable_type: 'places'})
      let parentQuery = null
      let relatedQuery = null
      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      let place = yield Place.query().with('location').first()
      place = place.toJSON()
      expect(place.location).to.be.an('object')
      expect(place.location.locationable_id).to.equal(place.id)
      expect(place.location.locationable_type).to.equal('places')
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "places" limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" in (?)'))
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([1]))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1]))
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return null when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      let place = yield Place.query().with('location').first()
      place = place.toJSON()
      expect(place.location).to.equal(null)
      yield relationFixtures.truncate(Database, 'places')
    })

    it('should be able to resolve relations for multiple rows', function * () {
      yield relationFixtures.createRecords(Database, 'places', [
        {title: 'Saint-Petersburg'},
        {title: 'New York City'},
        {title: 'Tokyo'}
      ])
      yield relationFixtures.createRecords(Database, 'locations', [
        {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'},
        {lat: 40.71278, lng: -74.00594, locationable_id: 2, locationable_type: 'places'},
        {lat: 35.68948, lng: 139.69170, locationable_id: 3, locationable_type: 'places'}
      ])
      let relatedQuery = null
      let parentQuery = null
      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const places = yield Place.query().with('location').fetch()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "places"'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" in (?, ?, ?)'))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1, 2, 3]))
      places.each(function (place) {
        expect(place.id).to.equal(place.get('location').locationable_id)
        expect('places').to.equal(place.get('location').locationable_type)
      })
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should be able to paginate when eagerLoading relations', function * () {
      yield relationFixtures.createRecords(Database, 'places', [
        {title: 'Saint-Petersburg'},
        {title: 'New York City'},
        {title: 'Tokyo'}
      ])
      yield relationFixtures.createRecords(Database, 'locations', [
        {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'},
        {lat: 40.71278, lng: -74.00594, locationable_id: 2, locationable_type: 'places'},
        {lat: 35.68948, lng: 139.69170, locationable_id: 3, locationable_type: 'places'}
      ])
      let relatedQuery = null
      let parentQuery = null
      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            relatedQuery = query
          })
        }
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            parentQuery = query
          })
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const places = yield Place.query().with('location').paginate(1, 3)
      const placesJSON = places.toJSON()
      expect(queryHelpers.formatQuery(parentQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "places" limit ?'))
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" in (?, ?, ?)'))
      expect(parentQuery.bindings).deep.equal(queryHelpers.formatBindings([3]))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1, 2, 3]))
      places.each(function (place) {
        expect(place.id).to.equal(place.get('location').locationable_id)
        expect('places').to.equal(place.get('location').locationable_type)
      })
      expect(placesJSON.data).to.have.length.below(4)
      expect(placesJSON).has.property('total')
      expect(placesJSON).has.property('perPage')
      expect(placesJSON).has.property('lastPage')
      expect(placesJSON).has.property('currentPage')
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should throw error when trying to saveMany model instances', function * () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locations')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = new Place({title: 'Saint-Petersburg'})
      yield place.save()
      expect(place.id).not.to.equal(undefined)
      const location = new Location({lat: 59.93428, lng: 30.33509})
      try {
        yield place.location().saveMany([location])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: saveMany is not supported by MorphOne relationship')
      } finally {
        yield relationFixtures.truncate(Database, 'places')
      }
    })

    it('should throw error when trying to createMany model instances', function * () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locations')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = new Place({title: 'Saint-Petersburg'})
      yield place.save()
      expect(place.id).not.to.equal(undefined)
      const location = new Location({lat: 59.93428, lng: 30.33509})
      try {
        yield place.location().createMany([location])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: createMany is not supported by MorphOne relationship')
      } finally {
        yield relationFixtures.truncate(Database, 'places')
      }
    })

    it('should throw an when save object is not an instance of related model', function * () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locations')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = new Place({title: 'Saint-Petersburg'})
      yield place.save()
      expect(place.id).not.to.equal(undefined)
      try {
        yield place.location().save({lat: 59.93428, lng: 30.33509})
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_INSTANCE: save accepts an instance of related model')
      }
      yield relationFixtures.truncate(Database, 'places')
    })

    it('should throw an error when actual model has not be saved', function * () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locations')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = new Place({title: 'Saint-Petersburg'})
      const location = new Location({lat: 59.93428, lng: 30.33509})
      try {
        yield place.location().save(location)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_UNSAVED_MODEL_INSTANCE: Cannot perform save on Location model since Place instance is unsaved')
      }
    })

    it('should be able to create related model using create method', function * () {
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = new Place({title: 'Saint-Petersburg'})
      yield place.save()
      const location = yield place.location().create({lat: 59.93428, lng: 30.33509})
      expect(location instanceof Location)
      expect(location.locationable_id).to.equal(place.id)
      expect(location.locationable_type).to.equal('places')

      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should be able to eagerLoad relations for a model instance', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      let locationQuery = null

      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            locationQuery = query
          })
        }
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = yield Place.find(savedPlace[0])
      yield place.related('location').load()
      expect(queryHelpers.formatQuery(locationQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" = ? limit ?'))
      expect(locationQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1, 1]))
      expect(place.get('location') instanceof Location).to.equal(true)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should be able to eagerLoad relations for a model instance by passing an array of relations', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      let locationQuery = null

      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            locationQuery = query
          })
        }
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = yield Place.find(savedPlace[0])
      yield place.related(['location']).load()
      expect(queryHelpers.formatQuery(locationQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "locationable_type" = ? and "locationable_id" = ? limit ?'))
      expect(locationQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1, 1]))
      expect(place.get('location') instanceof Location).to.equal(true)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should be able to define eagerLoad scope using model instance', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      let locationQuery = null

      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery(function (query) {
            locationQuery = query
          })
        }
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = yield Place.find(savedPlace[0])
      yield place.related('location').scope('location', function (builder) {
        builder.whereNull('created_at')
      }).load()
      expect(queryHelpers.formatQuery(locationQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "locations" where "created_at" is null and "locationable_type" = ? and "locationable_id" = ? limit ?'))
      expect(locationQuery.bindings).deep.equal(queryHelpers.formatBindings(['places', 1, 1]))
      expect(place.get('location') instanceof Location).to.equal(true)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should clean the eagerLoad chain for a given model instance', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})

      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.find(savedPlace[0])
      yield place.related('location').load()
      expect(place.eagerLoad.withRelations).deep.equal([])
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should set relations to the final object when toJSON is called', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})

      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.find(savedPlace[0])
      yield place.related('location').load()
      const jsoned = place.toJSON()
      expect(jsoned.location).to.be.an('object')
      expect(jsoned.location.locationable_id).to.equal(jsoned.id)
      expect(jsoned.location.locationable_type).to.equal('places')
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return the correct query for existence of relationship records', function () {
      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const locationRelation = new Place().location()
      const relationQuery = locationRelation.exists()
      expect(queryHelpers.formatQuery(relationQuery.toSQL().sql)).to.equal(queryHelpers.formatQuery(`select * from "locations" where locations.locationable_type = 'places' and locations.locationable_id = places.id`))
    })

    it('should return the correct counts query for existence of relationship records', function () {
      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const locationRelation = new Place().location()
      const relationQuery = locationRelation.counts()
      expect(queryHelpers.formatQuery(relationQuery.toSQL().sql)).to.equal(queryHelpers.formatQuery(`select count(*) from "locations" where locations.locationable_type = 'places' and locations.locationable_id = places.id`))
    })

    it('should return zero records when related rows are empty', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().has('location').fetch()
      expect(place.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'places')
    })

    it('should return all records when related rows exists', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})

      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().has('location').fetch()
      expect(place.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return zero records when related rows exists but where clause fails', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().whereHas('location', function (builder) {
        builder
          .where('lat', 40.71278)
          .where('lng', -74.00594)
      }).fetch()
      expect(place.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return all records when related rows exists and where clause passed', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().whereHas('location', function (builder) {
        builder
          .where('lat', 59.93428)
          .where('lng', 30.33509)
      }).fetch()
      expect(place.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return zero records when count for related rows does not match', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      class Location extends Model {
      }

      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().has('location', '>', 2).fetch()
      expect(place.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return all records when count for related rows matches', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().has('location', 1).fetch()
      expect(place.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return counts for the related models', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().withCount('location').fetch()
      expect(parseInt(place.first().location_count)).to.equal(2)
      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })

    it('should return counts for the related models by applying a filter on withCount method', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93429, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().withCount('location', function (builder) {
        builder.where('lat', 59.93429)
      }).fetch()
      expect(parseInt(place.first().location_count)).to.equal(1)
      yield relationFixtures.truncate(Database, 'locations')
      yield relationFixtures.truncate(Database, 'places')
    })

    it('update existing related model', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93428, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      yield relationFixtures.createRecords(Database, 'locations', {lat: 59.93429, lng: 30.33509, locationable_id: 1, locationable_type: 'places'})
      let query = null
      class Location extends Model {
        static boot () {
          super.boot()
          this.onQuery((q) => {
            query = q
          })
        }
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Location.bootIfNotBooted()
      Place.bootIfNotBooted()
      const place = yield Place.find(savedPlace[0])
      const location = place.location()
      yield location.update({lat: 59.93429})
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('update "locations" set "lat" = ?, "updated_at" = ? where "locationable_type" = ? and "locationable_id" = ?'))
      expect(queryHelpers.formatBindings(query.bindings)).contains(savedPlace[0])

      yield relationFixtures.truncate(Database, 'places')
      yield relationFixtures.truncate(Database, 'locations')
    })
  })

  context('MorphTo', function () {
    it('should return an instance of MorphTo when relation method has been called', function () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = new Reaction()
      expect(reaction.reactionable() instanceof MorphTo).to.equal(true)
    })

    it('should have proper foriegn and primary keys from the related model', function () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = new Reaction()
      expect(reaction.reactionable().toKey).to.equal('id')
      expect(reaction.reactionable().fromKey).to.equal('reactionable_id')
      expect(reaction.reactionable().typeKey).to.equal('reactionable_type')
    })

    it('should be able to access query builder of related model', function () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = new Reaction()
      const relatedQuery = reaction.reactionable().where('is_draft', false).toSQL()
      expect(queryHelpers.formatQuery(relatedQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "reactions" where "is_draft" = ?'))
      expect(relatedQuery.bindings).deep.equal(queryHelpers.formatBindings([false]))
    })

    it('should be able to fetch results from related model', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      const savedReaction = yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.find(savedReaction[0])
      const reactionable = yield reaction.reactionable().fetch()
      expect(reactionable instanceof Issue).to.equal(true)
      expect(reaction.reactionable_id).to.equal(reactionable.id)
      expect(reaction.reactionable_type).to.equal('issues')
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should be able to eagerLoad results from related model', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      const savedReaction = yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.query().where('id', savedReaction[0]).with('reactionable').first()
      expect(reaction instanceof Reaction).to.equal(true)
      expect(reaction.get('reactionable') instanceof Issue).to.equal(true)
      expect(reaction.get('reactionable').id).to.equal(reaction.reactionable_id).to.equal(savedIssue[0])
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should be able to eagerLoad results from related model instance', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      const savedReaction = yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.find(savedReaction[0])
      expect(reaction instanceof Reaction).to.equal(true)
      yield reaction.related('reactionable').load()
      expect(reaction.get('reactionable') instanceof Issue).to.equal(true)
      expect(reaction.get('reactionable').id).to.equal(reaction.reactionable_id).to.equal(savedIssue[0])
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should be able to define query constraints when eagerLoading via model instance', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      const savedReaction = yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.find(savedReaction[0])
      expect(reaction instanceof Reaction).to.equal(true)
      yield reaction.related('reactionable').scope('reactionable', function (builder) {
        builder.whereNull('issues.created_at')
      }).load()
      expect(reaction.get('reactionable') instanceof Issue).to.equal(true)
      expect(reaction.get('reactionable').id).to.equal(reaction.reactionable_id).to.equal(savedIssue[0])
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should entertain query constraints defined with model relation defination', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      const savedReaction = yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.find(savedReaction[0])
      expect(reaction instanceof Reaction).to.equal(true)
      const reactionable = yield reaction.reactionable().fetch()
      // expect(queryHelpers.formatQuery(postsQuery.sql)).to.equal(queryHelpers.formatQuery('select * from "issues" where "created_at" is null and "id" = ? limit ?'))
      // expect(postsQuery.bindings).deep.equal(queryHelpers.formatBindings(savedIssue.concat([1])))
      expect(reactionable instanceof Issue).to.equal(true)
      expect(reactionable.id).to.equal(reaction.reactionable_id).to.equal(savedIssue[0])
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should be able to eagerLoad multiple results from related model', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs down', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      let reactions = yield Reaction.query().with('reactionable').fetch()
      reactions = reactions.toJSON()
      expect(reactions[0].reactionable_id).to.equal(reactions[0].reactionable.id)
      expect(reactions[0].reactionable_id).to.equal(reactions[1].reactionable_id)
      expect(reactions[1].reactionable_id).to.equal(reactions[1].reactionable.id)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should be able to eagerLoad multiple results with multiple parent model', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description', id: 26})
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_type: 'issues', reactionable_id: savedIssue[0]})
      const savedIssue1 = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue 1 title', description: 'issue 1 description', id: 66})
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs down', reactionable_type: 'issues', reactionable_id: savedIssue1[0]})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      let reactions = yield Reaction.query().with('reactionable').fetch()
      reactions = reactions.toJSON()
      expect(reactions[0].reactionable_id).to.equal(reactions[0].reactionable.id)
      expect(reactions[0].reactionable_id).not.to.equal(reactions[1].reactionable_id)
      expect(reactions[1].reactionable_id).to.equal(reactions[1].reactionable.id)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should be able to associate a related model', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reactionable = new Issue()
      reactionable.title = 'issue title'
      reactionable.description = 'issue description'
      reactionable.id = 66
      yield reactionable.save()
      const reaction = new Reaction()
      reaction.reaction = 'thumbs up'
      reaction.reactionable().associate(reactionable)
      yield reaction.save()
      expect(reaction.id).not.to.equal(undefined)
      expect(reaction.reactionable_id).to.equal(reactionable.id)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should throw an error when associate value is not an instance of related model', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reactionable = {}
      reactionable.title = 'issue title'
      reactionable.description = 'issue description'
      reactionable.id = 66
      const reaction = new Reaction()
      reaction.reaction = 'thumbs up'
      const fn = function () {
        return reaction.reactionable().associate(reactionable)
      }
      expect(fn).to.throw('E_INVALID_RELATION_INSTANCE: associate accepts an instance one of: Issue')
    })

    it('should throw an error when trying to associate a related model which is unsaved', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reactionable = new Issue()
      reactionable.title = 'issue title'
      reactionable.description = 'issue description'
      const reaction = new Reaction()
      reaction.reaction = 'thumbs up'
      const fn = function () {
        return reaction.reactionable().associate(reactionable)
      }
      expect(fn).to.throw('E_UNSAVED_MODEL_INSTANCE: Cannot perform associate on Issue model since Reaction instance is unsaved')
    })

    it('should throw an error when trying to call save method on a morphTo relation', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reactionable = new Issue()
      reactionable.title = 'issue title'
      reactionable.description = 'issue description'
      const reaction = new Reaction()
      reaction.reaction = 'thumbs up'
      try {
        yield reaction.reactionable().save(reactionable)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: save is not supported by MorphTo relationship')
      }
    })

    it('should throw an error when trying to call saveMany method on a morphTo relation', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reactionable = new Issue()
      reactionable.title = 'issue title'
      reactionable.description = 'issue description'
      const reaction = new Reaction()
      reaction.reaction = 'thumbs up'
      try {
        yield reaction.reactionable().saveMany([reactionable])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: saveMany is not supported by MorphTo relationship')
      }
    })

    it('should throw an error when trying to call create method on a morphTo relation', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reactionable = new Issue()
      reactionable.title = 'issue title'
      reactionable.description = 'issue description'
      const reaction = new Reaction()
      reaction.reaction = 'thumbs up'
      try {
        yield reaction.reactionable().create(reactionable)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: create is not supported by MorphTo relationship')
      }
    })

    it('should throw an error when trying to call createMany method on a morphTo relation', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reactionable = new Issue()
      reactionable.title = 'issue title'
      reactionable.description = 'issue description'
      const reaction = new Reaction()
      reaction.reaction = 'thumbs up'
      try {
        yield reaction.reactionable().createMany([reactionable])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: createMany is not supported by MorphTo relationship')
      }
    })

    it('should throw an error when trying to call delete method on a morphTo relation', function * () {
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = new Reaction()
      try {
        yield reaction.reactionable().delete()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelRelationException')
        expect(e.message).to.equal('E_INVALID_RELATION_METHOD: delete is not supported by MorphTo relationship')
      }
    })

    it('should be able to dissociate a related model', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      const savedReaction = yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.find(savedReaction[0])
      reaction.reactionable().dissociate()
      yield reaction.save()
      expect(reaction.reactionable_id).to.equal(null)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should return zero records when related rows are empty', function * () {
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: null, reactionable_type: null})

      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()

      const reactions = yield Reaction.query().has('reactionable').fetch()
      expect(reactions.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should return all records when related rows exists', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})

      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()

      const reactions = yield Reaction.query().has('reactionable').fetch()
      expect(reactions.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should return zero records when related rows exists but where clause fails', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})

      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()

      const reactions = yield Reaction.query().whereHas('reactionable', function (builder) {
        builder.where('issues.title', 'Hey')
      }).fetch()
      expect(reactions.size()).to.equal(0)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should return all records when related rows exists but where clause passed', function * () {
      const savedIssue = yield relationFixtures.createRecords(Database, 'issues', {title: 'issue title', description: 'issue description'})
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: savedIssue[0], reactionable_type: 'issues'})

      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()

      const reactions = yield Reaction.query().whereHas('reactionable', function (builder) {
        builder.where('issues.title', 'issue title')
      }).fetch()
      expect(reactions.size()).to.equal(1)
      yield relationFixtures.truncate(Database, 'issues')
      yield relationFixtures.truncate(Database, 'reactions')
    })
  })

  context('Regression:MorphMany', function () {
    it('should return an empty array when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = yield Video.query().with('tags').first()
      expect(video.toJSON().tags).deep.equal([])
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should return an empty array when unable to fetch related results of model instance', function * () {
      yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = yield Video.query().first()
      const tags = yield video.tags().fetch()
      expect(tags.toJSON()).deep.equal([])
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should return an empty array when unable to fetch related results via lazy eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = yield Video.query().first()
      yield video.related('tags').load()
      expect(video.toJSON().tags).deep.equal([])
      yield relationFixtures.truncate(Database, 'videos')
    })

    it('should be able to delete the related records', function * () {
      const savedVideo = yield relationFixtures.createRecords(Database, 'videos', {title: 'Musical Routes (AdonisJs)', uri: 'https://youtu.be/w7LD7E53w3w'})
      class Tag extends Model {
      }
      class Video extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        tags () {
          return this.morphMany(Tag, 'taggable')
        }
      }
      Video.bootIfNotBooted()
      const video = yield Video.find(savedVideo[0])
      const query = video.tags().delete().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('delete from "tags" where "taggable_type" = ? and "taggable_id" = ?'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(['videos', 1])
      yield relationFixtures.truncate(Database, 'videos')
    })
  })

  context('Regression:MorphTo', function () {
    it('should return null when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: 1, reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.query().with('reactionable').first()
      expect(reaction.toJSON().reactionable).to.equal(null)
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should return null when unable to fetch related results of model instance', function * () {
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: 1, reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.query().first()
      const reactionable = yield reaction.reactionable().first()
      expect(reactionable).to.equal(null)
      yield relationFixtures.truncate(Database, 'reactions')
    })

    it('should return null when unable to fetch related results via lazy eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'reactions', {reaction: 'thumbs up', reactionable_id: 1, reactionable_type: 'issues'})
      class Issue extends Model {
      }
      class Reaction extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        reactionable () {
          return this.morphTo('reactionable', [
            Issue
          ])
        }
      }
      Reaction.bootIfNotBooted()
      const reaction = yield Reaction.query().first()
      yield reaction.related('reactionable').load()
      expect(reaction.toJSON().reactionable).to.equal(null)
      yield relationFixtures.truncate(Database, 'reactions')
    })
  })

  context('Regression:MorphOne', function () {
    it('should return null when unable to fetch related results via eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.query().with('location').first()
      expect(place.toJSON().location).to.equal(null)
      yield relationFixtures.truncate(Database, 'places')
    })

    it('should return null when unable to fetch related results of the model instance', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.find(1)
      const location = yield place.location().first()
      expect(location).to.equal(null)
      yield relationFixtures.truncate(Database, 'places')
    })

    it('should return null when unable to fetch related results via lazy eager loading', function * () {
      yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.find(1)
      yield place.related('location').load()
      expect(place.toJSON().location).to.equal(null)
      yield relationFixtures.truncate(Database, 'places')
    })

    it('should be able to delete related records', function * () {
      const savedPlace = yield relationFixtures.createRecords(Database, 'places', {title: 'Saint-Petersburg'})
      class Location extends Model {
      }
      class Place extends Model {
        static get traits () {
          return ['Adonis/Lucid/MorphTrait']
        }
        location () {
          return this.morphOne(Location, 'locationable')
        }
      }
      Place.bootIfNotBooted()
      const place = yield Place.find(1)
      const query = place.location().delete().toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('delete from "locations" where "locationable_type" = ? and "locationable_id" = ?'))
      expect(queryHelpers.formatBindings(query.bindings)).deep.equal(queryHelpers.formatBindings(['places', savedPlace[0]]))
      yield relationFixtures.truncate(Database, 'places')
    })
  })
})
