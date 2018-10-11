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

test.group('Relation | MorphTo', (group) => {
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
    await fixtures.truncate(Database, 'posts')
    await fixtures.truncate(Database, 'tags')
    await fixtures.truncate(Database, 'comments')
    await fixtures.truncate(Database, 'reactions')
    await fixtures.truncate(Database, 'issues')
  })

  test('fetch related row via load method', async assert => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))
    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const videoComment = await Comment.find(1)
    const video = await videoComment.commentable().load()

    assert.instanceOf(video, Video)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from `videos` where `id` = ? limit ?'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings([1, 1]))

    const postComment = await Comment.find(2)
    const post = await postComment.commentable().load()

    assert.instanceOf(post, Post)
    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from `posts` where `id` = ? limit ?'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1, 1]))
  })

  test('fetch related row via first method', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))
    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const videoComment = await Comment.find(1)
    const video = await videoComment.commentable().load()

    assert.instanceOf(video, Video)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from `videos` where `id` = ? limit ?'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings([1, 1]))

    const postComment = await Comment.find(2)
    const post = await postComment.commentable().first()

    assert.instanceOf(post, Post)
    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from `posts` where `id` = ? limit ?'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1, 1]))
  })

  test('fetch related row via fetch method', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))
    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const videoComment = await Comment.find(1)
    const video = await videoComment.commentable().load()

    assert.instanceOf(video, Video)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from `videos` where `id` = ? limit ?'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings([1, 1]))

    const postComment = await Comment.find(2)
    const post = await postComment.commentable().fetch()

    assert.instanceOf(post, Post)
    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from `posts` where `id` = ? limit ?'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1, 1]))
  })

  test('fetch relation with different ids', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert([
      {
        title: 'Musical Routes (AdonisJs)',
        uri: 'https://youtu.be/w7LD7E53w3w'
      },
      {
        title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
        uri: 'https://youtu.be/dfEZlcPvez8'
      }
    ])
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert({
      text: 'Awesome!', commentable_id: 2, commentable_type: 'videos'
    })

    const comment = await Comment.find(1)
    await comment.commentable().fetch()
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where "id" = ? limit ?'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings([2, 1]))
  })

  test('eagerload related instance', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))
    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('videos').insert([
      {
        title: 'Musical Routes (AdonisJs)',
        uri: 'https://youtu.be/w7LD7E53w3w'
      },
      {
        title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
        uri: 'https://youtu.be/dfEZlcPvez8'
      }
    ])
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Great Job!', commentable_id: 2, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const comments = await Comment.query().with('commentable').fetch()
    assert.instanceOf(comments, VanillaSerializer)
    assert.equal(comments.size(), 3)
    assert.instanceOf(comments.rows[0].getRelated('commentable'), Video)
    assert.equal(comments.rows[0].getRelated('commentable').title, 'Musical Routes (AdonisJs)')
    assert.instanceOf(comments.rows[1].getRelated('commentable'), Video)
    assert.equal(comments.rows[1].getRelated('commentable').title, 'Full Stack Todo List Tutorial using Vue.js & AdonisJs')
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where "id" in (?, ?)'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings([1, 2]))

    assert.instanceOf(comments.rows[2].getRelated('commentable'), Post)
    assert.equal(comments.last().getRelated('commentable').title, 'AdonisJs — Framework concept and Features')
    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from "posts" where "id" in (?)'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1]))
  })

  test('eagerload and paginate', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))
    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('videos').insert([
      {
        title: 'Musical Routes (AdonisJs)',
        uri: 'https://youtu.be/w7LD7E53w3w'
      },
      {
        title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
        uri: 'https://youtu.be/dfEZlcPvez8'
      }
    ])
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Great Job!', commentable_id: 2, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const comments = await Comment.query().with('commentable').paginate()
    assert.instanceOf(comments, VanillaSerializer)
    assert.equal(comments.size(), 3)
    assert.instanceOf(comments.rows[0].getRelated('commentable'), Video)
    assert.equal(comments.rows[0].getRelated('commentable').title, 'Musical Routes (AdonisJs)')
    assert.instanceOf(comments.rows[1].getRelated('commentable'), Video)
    assert.equal(comments.rows[1].getRelated('commentable').title, 'Full Stack Todo List Tutorial using Vue.js & AdonisJs')
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where "id" in (?, ?)'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings([1, 2]))

    assert.instanceOf(comments.rows[2].getRelated('commentable'), Post)
    assert.equal(comments.last().getRelated('commentable').title, 'AdonisJs — Framework concept and Features')
    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from "posts" where "id" in (?)'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1]))
  })

  test('work fine with nested relations', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    class Reaction extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      reactionable () {
        return this.morphTo([
          Comment
        ], 'id', 'id', 'reactionable_id', 'reactionable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()
    Reaction._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert([
      {
        title: 'Musical Routes (AdonisJs)',
        uri: 'https://youtu.be/w7LD7E53w3w'
      },
      {
        title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
        uri: 'https://youtu.be/dfEZlcPvez8'
      }
    ])
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Great Job!', commentable_id: 2, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      }
    ])
    await ioc.use('Database').table('reactions').insert([
      // comments
      {
        reaction: 'dislike', reactionable_id: 1, reactionable_type: 'comments'
      },
      {
        reaction: 'like', reactionable_id: 2, reactionable_type: 'comments'
      },
      {
        reaction: 'like', reactionable_id: 3, reactionable_type: 'comments'
      }
    ])

    const reactions = await Reaction.query().with('reactionable.commentable').fetch()
    assert.instanceOf(reactions.rows[0].getRelated('reactionable'), Comment)
    assert.instanceOf(reactions.rows[0].getRelated('reactionable').getRelated('commentable'), Video)
    assert.equal(reactions.rows[0].getRelated('reactionable').text, 'Awesome!')
    assert.equal(reactions.rows[0].getRelated('reactionable').getRelated('commentable').title, 'Musical Routes (AdonisJs)')

    assert.instanceOf(reactions.rows[1].getRelated('reactionable'), Comment)
    assert.instanceOf(reactions.rows[1].getRelated('reactionable').getRelated('commentable'), Video)
    assert.equal(reactions.rows[1].getRelated('reactionable').text, 'Great Job!')
    assert.equal(reactions.rows[1].getRelated('reactionable').getRelated('commentable').title, 'Full Stack Todo List Tutorial using Vue.js & AdonisJs')

    assert.instanceOf(reactions.rows[2].getRelated('reactionable'), Comment)
    assert.instanceOf(reactions.rows[2].getRelated('reactionable').getRelated('commentable'), Post)
    assert.equal(reactions.rows[2].getRelated('reactionable').text, 'Cool!')
    assert.equal(reactions.rows[2].getRelated('reactionable').getRelated('commentable').title, 'AdonisJs — Framework concept and Features')
  })

  test('make right json structure when calling toJSON', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    class Reaction extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      reactionable () {
        return this.morphTo([
          Comment
        ], 'id', 'id', 'reactionable_id', 'reactionable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()
    Reaction._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert([
      {
        id: 2,
        title: 'Musical Routes (AdonisJs)',
        uri: 'https://youtu.be/w7LD7E53w3w'
      },
      {
        id: 4,
        title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
        uri: 'https://youtu.be/dfEZlcPvez8'
      }
    ])
    await ioc.use('Database').table('posts').insert({
      id: 2,
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        id: 5,
        text: 'Awesome!',
        commentable_id: 2,
        commentable_type: 'videos'
      },
      {
        id: 7,
        text: 'Great Job!',
        commentable_id: 4,
        commentable_type: 'videos'
      },
      {
        id: 50,
        text: 'Cool!',
        commentable_id: 2,
        commentable_type: 'posts'
      }
    ])
    await ioc.use('Database').table('reactions').insert([
      // comments
      {
        id: 20,
        reaction: 'dislike',
        reactionable_id: 5,
        reactionable_type: 'comments'
      },
      {
        id: 23,
        reaction: 'like',
        reactionable_id: 7,
        reactionable_type: 'comments'
      },
      {
        id: 10,
        reaction: 'like',
        reactionable_id: 50,
        reactionable_type: 'comments'
      }
    ])

    const reaction = await Reaction.query().with('reactionable.commentable').first()
    const json = reaction.toJSON()
    assert.equal(json.id, 10)
    assert.equal(json.reaction, 'like')
    assert.equal(json.reactionable_type, 'comments')
    assert.equal(json.reactionable_id, json.reactionable.id)
    assert.equal(json.reactionable.id, 50)
    assert.equal(json.reactionable.text, 'Cool!')
    assert.equal(json.reactionable.commentable_type, 'posts')
    assert.equal(json.reactionable.commentable_id, 2)
    assert.equal(json.reactionable.commentable_id, json.reactionable.commentable.id)
    assert.equal(json.reactionable.commentable.id, 2)
    assert.equal(json.reactionable.commentable.title, 'AdonisJs — Framework concept and Features')
  })

  test('sideload relation count', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const comment = await Comment.query().withCount('commentable').first()
    assert.deepEqual(comment.$sideLoaded, { commentable_count: queryHelpers.formatNumber(1) })
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "videos" where "comments"."commentable_id" = "videos"."id") as "commentable_count" from "comments" limit ?'))
  })

  test('filter parent via has clause', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const comments = await Comment.query().has('commentable').fetch()
    assert.equal(comments.size(), 3)
    assert.equal(comments.first().text, 'Awesome!')
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select * from "comments" where exists (select * from "videos" where "comments"."commentable_id" = "videos"."id")'))
  })

  test('add count constraints to has', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Video,
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const comments = await Comment.query().has('commentable', '>', 1).fetch()
    assert.equal(comments.size(), 0)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select * from "comments" where (select count(*) from "videos" where "comments"."commentable_id" = "videos"."id") > ?'))
  })

  test('add additional constraints via whereHas', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Awesome!', commentable_id: 1, commentable_type: 'videos'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'posts'
      }
    ])

    const comments = await Comment.query().whereHas('commentable', (builder) => builder.where('text', 'Cool!')).fetch()
    assert.equal(comments.size(), 1)
    assert.equal(comments.first().text, 'Cool!')
    assert.equal(comments.first().commentable_id, 1)
    assert.equal(comments.first().commentable_type, 'posts')
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select * from "comments" where exists (select * from "posts" where "text" = ? and "comments"."commentable_id" = "posts"."id")'))
  })

  test('associate related instance', async (assert) => {
    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    const comment = new Comment()
    comment.text = 'Cool1'
    await comment.save()

    const post = new Post()
    post.title = 'AdonisJs — Framework concept and Features'
    await post.save()

    await comment.commentable().associate(post)
    assert.equal(comment.commentable_id, 1)
    assert.equal(comment.commentable_type, 'posts')
    assert.isFalse(comment.isNew)

    const freshComment = await ioc.use('Database').table('comments').first()
    assert.equal(freshComment.id, 1)
    assert.equal(freshComment.commentable_id, 1)
    assert.equal(freshComment.commentable_type, 'posts')
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('update "comments" set "commentable_id" = ?, "commentable_type" = ? where "id" = ?'))
  })

  test('persist parent record if not already persisted', async (assert) => {
    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    const comment = new Comment()
    comment.text = 'Cool!!!'

    const post = new Post()
    post.title = 'AdonisJs — Framework concept and Features'
    await post.save()

    await comment.commentable().associate(post)
    assert.equal(comment.commentable_id, 1)
    assert.equal(comment.commentable_type, 'posts')
    assert.isFalse(comment.isNew)

    const freshComment = await ioc.use('Database').table('comments').first()
    assert.equal(freshComment.id, 1)
    assert.equal(freshComment.commentable_id, 1)
    assert.equal(freshComment.commentable_type, 'posts')
    assert.equal(commentQuery.sql, queryHelpers.formatQuery(queryHelpers.addReturningStatement('insert into `comments` (`commentable_id`, `commentable_type`, `created_at`, `text`, `updated_at`) values (?, ?, ?, ?, ?)', 'id')))
  })

  test('persist related instance if not already persisted', async (assert) => {
    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))
    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    const comment = new Comment()
    comment.text = 'Cool!!!'

    const post = new Post()
    post.title = 'AdonisJs — Framework concept and Features'

    await comment.commentable().associate(post)
    assert.equal(comment.commentable_id, 1)
    assert.equal(comment.commentable_type, 'posts')
    assert.isFalse(comment.isNew)
    assert.isFalse(post.isNew)

    const freshComment = await ioc.use('Database').table('comments').first()
    assert.equal(freshComment.id, 1)
    assert.equal(freshComment.commentable_id, 1)
    assert.equal(freshComment.commentable_type, 'posts')

    const freshPost = await ioc.use('Database').table('posts').first()
    assert.equal(freshPost.id, 1)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery(queryHelpers.addReturningStatement('insert into "comments" ("commentable_id", "commentable_type", "created_at", "text", "updated_at") values (?, ?, ?, ?, ?)', 'id')))
    assert.equal(postQuery.sql, queryHelpers.formatQuery(queryHelpers.addReturningStatement('insert into "posts" ("created_at", "title", "updated_at") values (?, ?, ?)', 'id')))
  })

  test('dissociate existing relationship', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    const comment = await Comment.find(1)
    assert.equal(comment.commentable_id, 1)
    assert.equal(comment.commentable_type, 'posts')

    await comment.commentable().dissociate()
    assert.equal(comment.commentable_id, null)
    assert.equal(comment.commentable_type, null)
    assert.isFalse(comment.isNew)

    const freshComment = await ioc.use('Database').table('comments').first()
    assert.equal(freshComment.id, 1)
    assert.equal(freshComment.commentable_id, null)
    assert.equal(freshComment.commentable_type, null)

    assert.equal(commentQuery.sql, queryHelpers.formatQuery('update "comments" set "updated_at" = ?, "commentable_id" = ?, "commentable_type" = ? where "id" = ?'))
    assert.isNull(commentQuery.bindings[1])
    assert.isNull(commentQuery.bindings[2])
  })

  test('throw exception when trying to dissociate fresh models', async (assert) => {
    assert.plan(1)
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    const comment = new Comment()
    try {
      await comment.commentable().dissociate()
    } catch ({ message }) {
      assert.equal(message, 'E_UNSAVED_MODEL_INSTANCE: Cannot dissociate relationship since model instance is not persisted')
    }
  })

  test('delete related rows', async (assert) => {
    assert.plan(1)
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    const comment = await Comment.find(1)
    await comment.commentable().delete()
    assert.equal(postQuery.sql, queryHelpers.formatQuery('delete from "posts" where "id" = ?'))
  })

  test('belongsTo relation work fine with IoC container binding', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    ioc.fake('App/Models/Video', () => {
      return Video
    })

    ioc.fake('App/Models/Post', () => {
      return Post
    })

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          'App/Models/Post',
          'App/Models/Video'
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    const comment = await Comment.find(1)
    await comment.commentable().fetch()
    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from "posts" where "id" = ? limit ?'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1, 1]))
  })

  test('load relation without null value in foreign key', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Awesome!', commentable_id: null, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    await Comment.query().with('commentable').fetch()

    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from "posts" where "id" in (?)'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1]))
  })

  test('do not load relation with null value in foreign key', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))
    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: null, commentable_type: null
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    const comment = await Comment.query().select([
      'id', 'text', 'commentable_id', 'commentable_type'
    ]).where('id', 1).first()
    await comment.load('commentable')
    const json = comment.toJSON()

    assert.deepEqual(json, {
      id: 1,
      text: 'Great Job!',
      commentable: null,
      commentable_id: null,
      commentable_type: null
    })

    assert.equal(postQuery, null)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select "id", "text", "commentable_id", "commentable_type" from "comments" where "id" = ? limit ?'))
    assert.deepEqual(commentQuery.bindings, queryHelpers.formatBindings([1, 1]))
  })

  test('do not eager load relation with null value in foreign key', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))
    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: null, commentable_type: null
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    const comment = await Comment
      .query()
      .select([
        'id', 'text', 'commentable_id', 'commentable_type'
      ])
      .where('id', 1)
      .with('commentable')
      .first()

    const json = comment.toJSON()

    assert.deepEqual(json, {
      id: 1,
      text: 'Great Job!',
      commentable: null,
      commentable_id: null,
      commentable_type: null
    })

    assert.equal(postQuery, null)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select "id", "text", "commentable_id", "commentable_type" from "comments" where "id" = ? limit ?'))
    assert.deepEqual(commentQuery.bindings, queryHelpers.formatBindings([1, 1]))
  })

  test('bind custom callback for eagerload query', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    await Comment.query().with('commentable', (builder) => {
      builder.eagerLoadQuery(function (query, fk, values) {
        query.whereIn(fk, values).where('category_id', 10)
      })
    }).fetch()

    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from "posts" where "id" in (?) and "category_id" = ?'))
    assert.deepEqual(postQuery.bindings, queryHelpers.formatBindings([1, 10]))
  })

  test('withCount work fine with self relations', async (assert) => {
    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Comment
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Comment._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great!'
      },
      {
        text: 'Awesome!',
        commentable_id: 1,
        commentable_type: 'comments'
      }
    ])

    const results = await Comment.query().withCount('commentable').fetch()

    const expectedQuery = 'select *, (select count(*) from "comments" as "sj_0" where "comments"."commentable_id" = "sj_0"."id") as "commentable_count" from "comments"'

    assert.equal(results.first().$sideLoaded.commentable_count, 0)
    assert.equal(results.last().$sideLoaded.commentable_count, 1)
    assert.equal(commentQuery.sql, queryHelpers.formatQuery(expectedQuery))
  })

  test('withCount work fine with multiple self relations', async (assert) => {
    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Comment
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }

      responsible () {
        return this.morphTo([
          Comment
        ], 'id', 'id', 'responsible_id', 'responsible_type')
      }
    }

    Comment._bootIfNotBooted()

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await ioc.use('Database').table('comments').insert([
      {
        text: 'Awesome tutorial! Coming from Laravel and loving Adonis so far!'
      },
      {
        text: 'Thanks for the feedback!',
        commentable_id: 1,
        commentable_type: 'comments'
      },
      {
        text: 'Thanks You!',
        commentable_id: 1,
        commentable_type: 'comments',
        responsible_id: 2,
        responsible_type: 'comments'
      }
    ])

    const results = await Comment.query().withCount('commentable').withCount('responsible').fetch()

    const expectedQuery = 'select *, (select count(*) from "comments" as "sj_0" where "comments"."commentable_id" = "sj_0"."id") as "commentable_count", (select count(*) from "comments" as "sj_1" where "comments"."responsible_id" = "sj_1"."id") as "responsible_count" from "comments"'

    assert.equal(results.first().$sideLoaded.commentable_count, 0)
    assert.equal(results.first().$sideLoaded.responsible_count, 0)

    assert.equal(results.rows[1].$sideLoaded.commentable_count, 1)
    assert.equal(results.rows[1].$sideLoaded.responsible_count, 0)

    assert.equal(results.last().$sideLoaded.commentable_count, 1)
    assert.equal(results.last().$sideLoaded.responsible_count, 1)

    assert.equal(commentQuery.sql, queryHelpers.formatQuery(expectedQuery))
  })

  test('apply global scope on related model when eagerloading', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    Post.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    let postQuery = null
    Post.onQuery((query) => (postQuery = query))

    await ioc.use('Database').table('posts').insert({
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 1, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 1, commentable_type: 'videos'
      }
    ])

    await Comment.query().with('commentable').fetch()
    assert.equal(postQuery.sql, queryHelpers.formatQuery('select * from "posts" where "id" in (?) and `deleted_at` is null'))
  })

  test('apply global scope on related model when called withCount', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    Post.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await Comment.query().withCount('commentable').fetch()

    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "posts" where "comments"."commentable_id" = "posts"."id" and "posts"."deleted_at" is null) as "commentable_count" from "comments"'))
  })

  test('apply global scope on related model when called has', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    Post.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let commentQuery = null
    Comment.onQuery((query) => (commentQuery = query))

    await Comment.query().has('commentable').fetch()

    assert.equal(commentQuery.sql, queryHelpers.formatQuery('select * from "comments" where exists (select * from "posts" where "comments"."commentable_id" = "posts"."id" and "posts"."deleted_at" is null)'))
  })

  test('work fine when foreign key value is 0', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('posts').insert({
      id: 0,
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 0, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 0, commentable_type: 'videos'
      }
    ])

    const comment = await Comment.find(1)
    const commentable = await comment.commentable().fetch()
    assert.instanceOf(commentable, Post)
  })

  test('eagerload when foreign key value is 0', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('posts').insert({
      id: 0,
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 0, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 0, commentable_type: 'videos'
      }
    ])

    const comment = await Comment.query().with('commentable').first()
    assert.instanceOf(comment.getRelated('commentable'), Post)
  })

  test('associate related when foreign key value is 0', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('posts').insert({
      id: 0,
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: null, commentable_type: null
      }
    ])

    const comment = await Comment.find(1)
    const post = await Post.find(0)
    await comment.commentable().associate(post)

    const comments = await ioc.use('Database').table('comments')
    assert.equal(comments[0].commentable_id, 0)
    assert.equal(comments[0].commentable_type, 'posts')
  })

  test('serialize when foreign key is 0', async (assert) => {
    class Video extends Model {
    }

    class Post extends Model {
    }

    class Comment extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      commentable () {
        return this.morphTo([
          Post,
          Video
        ], 'id', 'id', 'commentable_id', 'commentable_type')
      }
    }

    Video._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Post._bootIfNotBooted()

    await ioc.use('Database').table('posts').insert({
      id: 0,
      title: 'AdonisJs — Framework concept and Features',
      uri: 'https://medium.com/ph-devconnect/adonisjs-framework-concept-and-features-529734d07606'
    })
    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('comments').insert([
      {
        text: 'Great Job!', commentable_id: 0, commentable_type: 'posts'
      },
      {
        text: 'Cool!', commentable_id: 0, commentable_type: 'videos'
      }
    ])

    const comment = await Comment.query().with('commentable').first()
    assert.equal(comment.toJSON().commentable.id, 0)
  })
})
