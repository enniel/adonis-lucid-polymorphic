'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

/* global describe, it, after, before, context */
const chai = require('chai')
chai.use(require('dirty-chai'))
const Ioc = require('adonis-fold').Ioc
const use = Ioc.use
const expect = chai.expect
const moment = require('moment')
const filesFixtures = require('./fixtures/files')
const relationFixtures = require('./fixtures/relations')
const setup = require('./setup')
const MorphMany = require('../../src/Relations/MorphMany')
const MorphOne = require('../../src/Relations/MorphOne')
const MorphTo = require('../../src/Relations/MorphTo')
const queryHelpers = require('./helpers/query')
require('co-mocha')

describe('Relations', function () {
  before(function * () {
    yield setup.loadProviders()
    yield filesFixtures.createDir()
    this.Database = use('Adonis/Src/Database')
    this.Helpers = use('Adonis/Src/Helpers')
    this.Lucid = use('Adonis/Src/Lucid')
    this.Relation = use('Adonis/Src/Relation')
    // yield relationFixtures.up(this.Database)
  })

  after(function * () {
    // yield relationFixtures.down(this.Database)
    yield filesFixtures.cleanStorage()
  })

  context('MorphMany', function () {
    it('should return an instance of MorphMany when relation method has been called', function () {
      const Lucid = this.Lucid
      class Comment extends Lucid {

      }
      class Post extends Lucid {
        static get traits () {
          return [
            'Adonis/Lucid/MorphTrait'
          ]
        }

        comments () {
          return this.morphMany(Comment, 'commentable')
        }
      }
      this.Relation.morphMap({
        posts: Post
      })
      Post.bootIfNotBooted()
      const post = new Post()
      expect(post.comments() instanceof MorphMany).to.equal(true)
    })
  })

  context('MorphOne', function () {
    it('should return an instance of MorphOne when relation method has been called', function () {
      const Lucid = this.Lucid
      class Account extends Lucid {
      }
      class Supplier extends Lucid {
        static get traits () {
          return [
            'Adonis/Lucid/MorphTrait'
          ]
        }

        account () {
          return this.morphOne(Account, 'accountable')
        }
      }
      this.Relation.morphMap({
        suppliers: Supplier
      })
      Supplier.bootIfNotBooted()
      const supplier = new Supplier()
      expect(supplier.account() instanceof MorphOne).to.equal(true)
    })
  })

  context('MorphTo', function () {
    it('should return an instance of MorphTo when relation method has been called', function () {
      const Lucid = this.Lucid
      class Comment extends Lucid {
        static get traits () {
          return [
            'Adonis/Lucid/MorphTrait'
          ]
        }

        commentable () {
          return this.morphTo('commentable')
        }
      }
      Comment.bootIfNotBooted()
      const comment = new Comment()
      expect(comment.commentable() instanceof MorphTo).to.equal(true)
    })
  })
})
