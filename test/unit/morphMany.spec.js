'use strict'

require('@adonisjs/lucid/lib/iocResolver').setFold(require('@adonisjs/fold'))
const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const Model = require('@adonisjs/lucid/src/Lucid/Model')
const DatabaseManager = require('@adonisjs/lucid/src/Database/Manager')
const VanillaSerializer = require('@adonisjs/lucid/src/Lucid/Serializers/Vanilla')
const { ioc } = require('@adonisjs/fold')
const { Config, setupResolver } = require('@adonisjs/sink')
const fixtures = require('../fixtures')
const Morphable = require('../../src/Traits/Morphable')
const queryHelpers = require('../queryHelpers')

test.group('Relation | MorphMany', (group) => {
  group.before(async function () {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', require('../config'))
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')
    ioc.bind('Adonis/Src/Model', () => Model)
    ioc.alias('Adonis/Src/Model', 'Model')
    ioc.bind('Adonis/Traits/Morphable', function () {
      return new Morphable()
    })
    ioc.alias('Adonis/Traits/Morphable', 'Morphable')
    await fs.ensureDir(path.join(__dirname, '../tmp'))
    const Database = use('Database')
    await fixtures.up(Database)
    setupResolver()
  })

  group.beforeEach(() => {
    ioc.restore()
  })

  group.after(async function () {
    const Database = use('Database')
    await fixtures.down(Database)
    Database.close()

    try {
      await fs.remove(path.join(__dirname, '../tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  group.afterEach(async function () {
    const Database = use('Database')
    await fixtures.truncate(Database, 'videos')
    await fixtures.truncate(Database, 'tags')
    await fixtures.truncate(Database, 'comments')
    await fixtures.truncate(Database, 'reactions')
    await fixtures.truncate(Database, 'issues')
  })

  test('morphMany relation should make right query', async assert => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagsQuery = null
    Tag.onQuery((query) => (tagsQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })

    const video = await Video.find(1)
    const tags = await video.tags().load()

    assert.instanceOf(tags.rows[0], Tag)
    assert.instanceOf(tags.rows[1], Tag)
    assert.equal(tags.size(), 2)
    assert.equal(tagsQuery.sql, queryHelpers.formatQuery('select * from "tags" where "taggable_id" = ? and "taggable_type" = ?'))
    assert.deepEqual(tagsQuery.bindings, queryHelpers.formatBindings([1, 'videos']))
  })

  test('get first instance of related model', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })

    const video = await Video.find(1)
    const tag = await video.tags().first()

    assert.instanceOf(tag, Tag)
    assert.equal(tag.title, 'adonis')
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select * from "tags" where "taggable_id" = ? and "taggable_type" = ? limit ?'))
    assert.deepEqual(tagQuery.bindings, queryHelpers.formatBindings([1, 'videos', 1]))
  })

  test('eagerload relation', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })

    const video = await Video.query().with('tags').first()

    assert.instanceOf(video.getRelated('tags'), VanillaSerializer)
    assert.equal(video.getRelated('tags').size(), 2)
    assert.deepEqual(video.getRelated('tags').rows.map((tag) => tag.$parent), ['Video', 'Video'])
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select * from "tags" where "tags"."taggable_id" in (?) and "tags"."taggable_type" = ?'))
    assert.deepEqual(tagQuery.bindings, queryHelpers.formatBindings([1, 'videos']))
  })

  test('add constraints when eagerloading', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos', color: 'red'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos', color: 'blue'
    })

    const videos = await Video.query().with('tags', (builder) => {
      builder.where('color', 'red')
    }).fetch()
    const video = videos.first()

    assert.equal(video.getRelated('tags').size(), 1)
    assert.equal(video.getRelated('tags').rows[0].title, 'adonis')
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select * from "tags" where "color" = ? and "tags"."taggable_id" in (?) and "tags"."taggable_type" = ?'))
    assert.deepEqual(tagQuery.bindings, queryHelpers.formatBindings(['red', 1, 'videos']))
  })

  test('return serailizer instance when nothing exists', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    const videos = await Video.query().with('tags').fetch()
    const video = videos.first()
    assert.equal(video.getRelated('tags').size(), 0)
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select * from "tags" where "tags"."taggable_id" in (?) and "tags"."taggable_type" = ?'))
    assert.deepEqual(tagQuery.bindings, queryHelpers.formatBindings([1, 'videos']))
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    class Issue extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()
    Issue._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('issues').insert({
      title: 'Update to work with Adonis 4'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'vue', taggable_id: 2, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'help wanted', taggable_id: 1, taggable_type: 'issues'
    })

    const videos = await Video.query().with('tags').fetch()
    const videosJSON = videos.toJSON()
    assert.equal(videosJSON[0].tags[0].title, 'routing')
    assert.equal(videosJSON[1].tags[0].title, 'vue')
    const issues = await Issue.query().with('tags').fetch()
    const issuesJSON = issues.toJSON()
    assert.equal(issuesJSON[0].tags[0].title, 'help wanted')
  })

  test('should work with nested relations', async (assert) => {
    class Reaction extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      reactions () {
        return this.morphMany(Reaction, 'id', 'reactionable_id', 'reactionable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      comments () {
        return this.morphMany(Comment, 'id', 'commentable_id', 'commentable_type')
      }
    }

    Reaction._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()

    let reactionQuery = null
    let commentQuery = null
    Reaction.onQuery((query) => (reactionQuery = query))
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('comments').insert({
      commentable_id: 1,
      commentable_type: 'videos',
      text: 'Awesome tutorial! Coming from Laravel and loving Adonis so far!'
    })
    await ioc.use('Database').table('comments').insert({
      commentable_id: 1,
      commentable_type: 'videos',
      text: 'Thanks guys!'
    })
    await ioc.use('Database').table('reactions').insert([
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'like' },
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'like' },
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'dislike' },
      { reactionable_id: 2, reactionable_type: 'comments', reaction: 'dislike' },
      { reactionable_id: 2, reactionable_type: 'comments', reaction: 'like' }
    ])

    const video = await Video.query().with('comments.reactions').first()
    assert.equal(video.getRelated('comments').size(), 2)
    assert.equal(video.getRelated('comments').first().getRelated('reactions').size(), 3)
    assert.equal(video.getRelated('comments').last().getRelated('reactions').size(), 2)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select * from "comments" where "comments"."commentable_id" in (?) and "comments"."commentable_type" = ?'))
    assert.equal(reactionQuery.sql, queryHelpers.formatQuery('select * from "reactions" where "reactions"."reactionable_id" in (?, ?) and "reactions"."reactionable_type" = ?'))
  })

  test('add query constraint to nested query', async (assert) => {
    class Reaction extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      reactions () {
        return this.morphMany(Reaction, 'id', 'reactionable_id', 'reactionable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      comments () {
        return this.morphMany(Comment, 'id', 'commentable_id', 'commentable_type')
      }
    }

    Reaction._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()

    let reactionQuery = null
    let commentQuery = null
    Reaction.onQuery((query) => (reactionQuery = query))
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('comments').insert({
      commentable_id: 1,
      commentable_type: 'videos',
      text: 'Awesome tutorial! Coming from Laravel and loving Adonis so far!'
    })
    await ioc.use('Database').table('comments').insert({
      commentable_id: 1,
      commentable_type: 'videos',
      text: 'Thanks guys!'
    })
    await ioc.use('Database').table('reactions').insert([
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'like' },
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'like' },
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'dislike' },
      { reactionable_id: 2, reactionable_type: 'comments', reaction: 'dislike' },
      { reactionable_id: 2, reactionable_type: 'comments', reaction: 'like' }
    ])

    const video = await Video.query()
      .with('comments.reactions', (builder) => builder.where('reaction', 'like')).first()
    assert.equal(video.getRelated('comments').size(), 2)
    assert.equal(video.getRelated('comments').first().getRelated('reactions').size(), 2)
    assert.equal(video.getRelated('comments').last().getRelated('reactions').size(), 1)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select * from "comments" where "comments"."commentable_id" in (?) and "comments"."commentable_type" = ?'))
    assert.equal(reactionQuery.sql, queryHelpers.formatQuery('select * from "reactions" where "reaction" = ? and "reactions"."reactionable_id" in (?, ?) and "reactions"."reactionable_type" = ?'))
  })

  test('add query constraint to child and grand child query', async (assert) => {
    class Reaction extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      reactions () {
        return this.morphMany(Reaction, 'id', 'reactionable_id', 'reactionable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      comments () {
        return this.morphMany(Comment, 'id', 'commentable_id', 'commentable_type')
      }
    }

    Reaction._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()

    let reactionQuery = null
    let commentQuery = null
    Reaction.onQuery((query) => (reactionQuery = query))
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('comments').insert([
      {
        commentable_id: 1,
        commentable_type: 'videos',
        text: 'Awesome tutorial! Coming from Laravel and loving Adonis so far!'
      },
      {
        commentable_id: 1,
        commentable_type: 'videos',
        text: 'Thanks guys!'
      }
    ])
    await ioc.use('Database').table('reactions').insert([
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'like' },
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'like' },
      { reactionable_id: 1, reactionable_type: 'comments', reaction: 'dislike' },
      { reactionable_id: 2, reactionable_type: 'comments', reaction: 'dislike' },
      { reactionable_id: 2, reactionable_type: 'comments', reaction: 'like' }
    ])

    const video = await Video.query().with('comments', (builder) => {
      builder
        .where('text', 'Thanks guys!')
        .with('reactions', (builder) => builder.where('reaction', 'like'))
    }).first()

    assert.equal(video.getRelated('comments').size(), 1)
    assert.equal(video.getRelated('comments').first().getRelated('reactions').size(), 1)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select * from "comments" where "text" = ? and "comments"."commentable_id" in (?) and "comments"."commentable_type" = ?'))
    assert.equal(reactionQuery.sql, queryHelpers.formatQuery('select * from "reactions" where "reaction" = ? and "reactions"."reactionable_id" in (?) and "reactions"."reactionable_type" = ?'))
  })

  test('get relation count', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert([
      {
        title: 'adonis', taggable_id: 1, taggable_type: 'videos'
      },
      {
        title: 'routing', taggable_id: 1, taggable_type: 'videos'
      }
    ])

    const video = await Video.query().withCount('tags').first()
    assert.deepEqual(video.$sideLoaded, { tags_count: queryHelpers.formatNumber(2) })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "tags" where "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ?) as "tags_count" from "videos" limit ?'))
  })

  test('filter parent based upon child', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert([
      {
        title: 'adonis', taggable_id: 1, taggable_type: 'videos'
      },
      {
        title: 'routing', taggable_id: 1, taggable_type: 'videos'
      }
    ])

    const videos = await Video.query().has('tags').fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "tags" where "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ?)'))
  })

  test('define minimum count via has', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert([
      {
        title: 'adonis', taggable_id: 1, taggable_type: 'videos'
      },
      {
        title: 'routing', taggable_id: 1, taggable_type: 'videos'
      }
    ])

    const videos = await Video.query().has('tags', '>=', 2).fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where (select count(*) from "tags" where "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ?) >= ?'))
  })

  test('add additional constraints via where has', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('issues').insert({
      title: 'Update to work with Adonis 4'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'vue', taggable_id: 2, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 2, taggable_type: 'videos'
    })

    const videos = await Video.query().whereHas('tags', (builder) => {
      return builder.where('title', 'adonis')
    }).fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "tags" where "title" = ? and "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ?)'))
  })

  test('add additional constraints and count constraints at same time', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('issues').insert({
      title: 'Update to work with Adonis 4'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'vue', taggable_id: 2, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 2, taggable_type: 'videos'
    })

    const videos = await Video.query().whereHas('tags', (builder) => {
      return builder.where('title', 'adonis')
    }, '>', 1).fetch()
    assert.equal(videos.size(), 0)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where (select count(*) from "tags" where "title" = ? and "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ?) > ?'))
  })

  test('add orWhereHas clause', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('issues').insert({
      title: 'Update to work with Adonis 4'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'vue', taggable_id: 2, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 2, taggable_type: 'videos'
    })

    const videos = await Video.query().whereHas('tags', (builder) => {
      return builder.where('title', 'adonis')
    }, '>', 1).orWhereHas('tags', (builder) => builder.where('title', 'vue')).fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where (select count(*) from "tags" where "title" = ? and "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ?) > ? or exists (select * from "tags" where "title" = ? and "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ?)'))
  })

  test('paginate records', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('issues').insert({
      title: 'Update to work with Adonis 4'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'vue', taggable_id: 2, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 2, taggable_type: 'videos'
    })

    const videos = await Video.query().with('tags').paginate()
    assert.equal(videos.size(), 2)
    assert.deepEqual(videos.pages, { total: queryHelpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
  })

  test('convert paginated records to json', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('issues').insert({
      title: 'Update to work with Adonis 4'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'routing', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 1, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'vue', taggable_id: 2, taggable_type: 'videos'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis', taggable_id: 2, taggable_type: 'videos'
    })

    const videos = await Video.query().with('tags').paginate()
    const json = videos.toJSON()
    assert.deepEqual(json.total, queryHelpers.formatNumber(2))
    assert.deepEqual(json.perPage, 20)
    assert.deepEqual(json.page, 1)
    assert.deepEqual(json.lastPage, 1)
    assert.isArray(json.data)
    assert.isArray(json.data[0].tags)
    assert.isArray(json.data[1].tags)
  })

  test('save related model instance', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'
    await video.save()

    const tag = new Tag()
    tag.title = 'adonis'

    await video.tags().save(tag)
    assert.equal(tag.taggable_id, video.id)
    assert.equal(tag.taggable_type, 'videos')
    assert.isTrue(tag.$persisted)
    assert.isFalse(tag.isNew)
  })

  test('create related model instance', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'
    await video.save()

    const tag = await video.tags().create({ title: 'adonis' })
    assert.equal(tag.taggable_id, 1)
    assert.equal(tag.taggable_type, 'videos')
    assert.equal(tag.taggable_id, video.id)
    assert.equal(tag.taggable_type, Video.table)
    assert.equal(tag.taggable_type, video.constructor.table)
    assert.isTrue(tag.$persisted)
    assert.isFalse(tag.isNew)
  })

  test('persist parent model when isNew', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    const tag = await video.tags().create({ title: 'adonis' })
    assert.equal(tag.taggable_id, 1)
    assert.equal(tag.taggable_id, video.id)
    assert.equal(tag.taggable_type, Video.table)
    assert.equal(tag.taggable_type, video.constructor.table)
    assert.isTrue(tag.$persisted)
    assert.isFalse(tag.isNew)
    assert.isTrue(video.$persisted)
    assert.isFalse(video.isNew)
  })

  test('persist parent model when isNew while calling save', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    const tag = new Tag()
    tag.title = 'adonis'

    await video.tags().save(tag)
    assert.equal(tag.taggable_id, 1)
    assert.equal(tag.taggable_id, video.id)
    assert.equal(tag.taggable_type, Video.table)
    assert.equal(tag.taggable_type, video.constructor.table)
    assert.isTrue(tag.$persisted)
    assert.isFalse(tag.isNew)
    assert.isTrue(video.$persisted)
    assert.isFalse(video.isNew)
  })

  test('saveMany of related instances', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    const adonis = new Tag()
    adonis.title = 'adonis'

    const routing = new Tag()
    routing.title = 'routing'

    await video.tags().saveMany([adonis, routing])
    assert.equal(adonis.taggable_id, 1)
    assert.equal(adonis.taggable_id, video.id)
    assert.equal(adonis.taggable_type, video.constructor.table)
    assert.equal(adonis.taggable_type, Video.table)
    assert.isTrue(adonis.$persisted)
    assert.isFalse(adonis.isNew)
    assert.equal(routing.taggable_id, 1)
    assert.equal(routing.taggable_id, video.id)
    assert.equal(routing.taggable_type, video.constructor.table)
    assert.equal(routing.taggable_type, Video.table)
    assert.isTrue(routing.$persisted)
    assert.isFalse(routing.isNew)
    assert.isTrue(video.$persisted)
    assert.isFalse(video.isNew)
  })

  test('createMany of related instances', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    const [adonis, routing] = await video.tags().createMany([
      { title: 'adonis' },
      { title: 'routing' }
    ])

    assert.equal(adonis.taggable_id, 1)
    assert.equal(adonis.taggable_id, video.id)
    assert.equal(adonis.taggable_type, video.constructor.table)
    assert.equal(adonis.taggable_type, Video.table)
    assert.isTrue(adonis.$persisted)
    assert.isFalse(adonis.isNew)
    assert.equal(routing.taggable_id, 1)
    assert.equal(routing.taggable_id, video.id)
    assert.equal(routing.taggable_type, video.constructor.table)
    assert.equal(routing.taggable_type, Video.table)
    assert.isTrue(routing.$persisted)
    assert.isFalse(routing.isNew)
    assert.isTrue(video.$persisted)
    assert.isFalse(video.isNew)
  })

  test('delete related rows', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    await video.tags().createMany([
      { title: 'adonis' },
      { title: 'routing' }
    ])
    await video.tags().delete()
    const tags = await ioc.use('Database').table('tags')
    assert.lengthOf(tags, 0)
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('delete from "tags" where "taggable_id" = ? and "taggable_type" = ?'))
  })

  test('add constraints to delete query', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    await video.tags().createMany([
      { title: 'adonis' },
      { title: 'routing' }
    ])
    await video.tags().where('title', 'adonis').delete()
    const tags = await ioc.use('Database').table('tags')
    assert.lengthOf(tags, 1)
    assert.equal(tags[0].title, 'routing')
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('delete from "tags" where "title" = ? and "taggable_id" = ? and "taggable_type" = ?'))
  })

  test('throw exception when createMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    try {
      await video.tags().createMany({ title: 'adonis' })
    } catch ({ message }) {
      assert.match(message, /^E_INVALID_PARAMETER: morphMany.createMany expects an array of values instead received object/)
    }
  })

  test('throw exception when saveMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Musical Routes (AdonisJs)'
    video.uri = 'https://youtu.be/w7LD7E53w3w'

    try {
      await video.tags().saveMany(new Tag())
    } catch ({ message }) {
      assert.match(message, /^E_INVALID_PARAMETER: morphMany.saveMany expects an array of related model instances instead received object/)
    }
  })

  test('get first instance of related model via IoC container', async (assert) => {
    class Tag extends Model {
    }

    ioc.fake('App/Models/Tag', () => Tag)

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany('App/Models/Tag', 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert([
      { taggable_id: 1, taggable_type: 'videos', title: 'adonis' },
      { taggable_id: 1, taggable_type: 'videos', title: 'routing' }
    ])

    const video = await Video.find(1)
    const tag = await video.tags().first()
    assert.instanceOf(tag, Tag)
    assert.equal(tag.title, 'adonis')
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select * from "tags" where "taggable_id" = ? and "taggable_type" = ? limit ?'))
    assert.deepEqual(tagQuery.bindings, queryHelpers.formatBindings([1, 'videos', 1]))
  })

  test('bind custom callback for eagerload query', async (assert) => {
    class Tag extends Model {
    }

    ioc.fake('App/Models/Tag', () => Tag)

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany('App/Models/Tag', 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })

    await Video.query().with('tags', (builder) => {
      builder.eagerLoadQuery((query, fk, values, typeKey, typeValue) => {
        query.whereIn(fk, values).where(typeKey, typeValue).where('title', 'adonis')
      })
    }).fetch()

    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select * from "tags" where "taggable_id" in (?) and "taggable_type" = ? and "title" = ?'))
    assert.deepEqual(tagQuery.bindings, queryHelpers.formatBindings([1, 'videos', 'adonis']))
  })

  test('withCount work fine with self relations', async (assert) => {
    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      answers () {
        return this.morphMany(Comment, 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('comments').insert([
      {
        text: 'Sadly u cant use AdonisJs with MongoDB?',
        commentable_id: 1,
        commentable_type: 'videos'
      },
      {
        text: 'You can use lucid-mongo',
        commentable_id: 1,
        commentable_type: 'comments'
      },
      {
        text: 'for javascript development I think mongodb is better. For anything else though I think sql is good.',
        commentable_id: 1,
        commentable_type: 'comments'
      }
    ])

    const results = await Comment.query().withCount('answers').fetch()

    const expectedQuery = 'select *, (select count(*) from "comments" as "sj_0" where "comments"."id" = "sj_0"."commentable_id" and "sj_0"."commentable_type" = ?) as "answers_count" from "comments"'

    assert.equal(results.first().$sideLoaded.answers_count, 2)
    assert.equal(results.rows[1].$sideLoaded.answers_count, 0)
    assert.equal(results.last().$sideLoaded.answers_count, 0)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery(expectedQuery))
  })

  test('apply global scope on related model when eagerloading', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    Tag.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await Video.query().with('tags').fetch()

    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select * from "tags" where "tags"."taggable_id" in (?, ?) and "tags"."taggable_type" = ? and "deleted_at" is null'))
  })

  test('apply global scope on related model when called withCount', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    Tag.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await Video.query().withCount('tags').fetch()

    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "tags" where "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ? and "tags"."deleted_at" is null) as "tags_count" from "videos"'))
  })

  test('apply global scope on related model when called has', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    Tag.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await Video.query().has('tags').fetch()

    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "tags" where "videos"."id" = "tags"."taggable_id" and "tags"."taggable_type" = ? and "tags"."deleted_at" is null)'))
  })

  test('work fine when foreign key value is 0', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis',
      taggable_id: 0,
      taggable_type: 'videos'
    })

    const video = await Video.find(0)
    const tags = await video.tags().fetch()
    assert.equal(tags.first().taggable_id, 0)
  })

  test('eagerload when foreign key value is 0', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis',
      taggable_id: 0,
      taggable_type: 'videos'
    })

    const video = await Video.query().with('tags').first()
    assert.instanceOf(video.getRelated('tags').first(), Tag)
  })

  test('save related when foreign key value is 0', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })

    const video = await Video.find(0)
    await video.tags().create({
      title: 'adonis',
      taggable_id: 0,
      taggable_type: 'videos'
    })

    const tags = await ioc.use('Database').table('tags')
    assert.lengthOf(tags, 1)
    assert.equal(tags[0].taggable_id, 0)
  })

  test('update related when foreign key value is 0', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis',
      taggable_id: 0,
      taggable_type: 'videos'
    })

    const video = await Video.find(0)
    await video.tags().update({ title: 'routing' })

    const tags = await ioc.use('Database').table('tags')
    assert.equal(tags[0].title, 'routing')
  })

  test('serialize when foreign key is 0', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert({
      title: 'adonis',
      taggable_id: 0,
      taggable_type: 'videos'
    })

    const video = await Video.query().with('tags').first()
    assert.equal(video.toJSON().tags[0].taggable_id, 0)
  })

  test('get an array of ids for the related model', async (assert) => {
    class Tag extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      tags () {
        return this.morphMany(Tag, 'id', 'taggable_id', 'taggable_type')
      }
    }

    Tag._bootIfNotBooted()
    Video._bootIfNotBooted()

    let tagQuery = null
    Tag.onQuery((query) => (tagQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('tags').insert([
      { taggable_id: 1, taggable_type: 'videos', title: 'adonis', id: 1 },
      { taggable_id: 1, taggable_type: 'videos', title: 'nodejs', id: 2 },
      { taggable_id: 2, taggable_type: 'videos', title: 'routing', id: 3 }
    ])

    const video = await Video.find(1)
    const tagIds = await video.tags().ids()
    assert.deepEqual(tagIds, [1, 2])
    assert.equal(tagQuery.sql, queryHelpers.formatQuery('select "id" from "tags" where "taggable_id" = ? and "taggable_type" = ?'))
    assert.deepEqual(tagQuery.bindings, queryHelpers.formatBindings([1, 'videos']))
  })
})
