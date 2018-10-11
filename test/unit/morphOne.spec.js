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

test.group('Relation | MorphOne', (group) => {
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
    await fixtures.truncate(Database, 'categories')
    await fixtures.truncate(Database, 'images')
    await fixtures.truncate(Database, 'comments')
  })

  test('morphOne relation should make right query', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })
    const video = new Video()
    video.id = 1
    video.$persisted = true
    const category = await video.category().load()
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categorizable_id" = ? and "categorizable_type" = ? limit ?'))
    assert.deepEqual(categoryQuery.bindings, queryHelpers.formatBindings([1, 'videos', 1]))
    assert.instanceOf(category, Category)
    assert.equal(category.$attributes.categorizable_id, 1)
    assert.equal(category.$attributes.categorizable_type, 'videos')
    assert.equal(category.$attributes.title, 'Programming')
  })

  test('fetch related row', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    await ioc.use('Database').table('categories').insert({
      categorizable_id: video.id,
      categorizable_type: Video.table,
      title: 'Programming'
    })
    const category = await video.category().fetch()
    assert.instanceOf(category, Category)
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categorizable_id" = ? and "categorizable_type" = ? limit ?'))
    assert.deepEqual(categoryQuery.bindings, queryHelpers.formatBindings([1, 'videos', 1]))
  })

  test('throw exception when trying to fetch row with undefined binding', async (assert) => {
    assert.plan(1)
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })
    try {
      await video.category().fetch()
    } catch ({ message }) {
      assert.match(message, /^E_UNSAVED_MODEL_INSTANCE: Cannot process relation, since Video model is not persisted to database or relational value is undefined/)
    }
  })

  test('update related model', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    await ioc.use('Database').table('categories').insert({
      categorizable_id: video.id,
      categorizable_type: Video.table,
      title: 'Programming'
    })

    await video.category().where('title', 'Programming').update({ title: 'Programming learnings' })

    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('update "categories" set "title" = ?, "updated_at" = ? where "title" = ? and "categorizable_id" = ? and "categorizable_type" = ?'))
    assert.deepEqual(categoryQuery.bindings, ['Programming learnings', categoryQuery.bindings[1], 'Programming', 1, 'videos'])
  })

  test('call static methods on related model', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming',
      all_views: 3
    })

    await video.category().increment('all_views', 1)

    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('update "categories" set "all_views" = "all_views" + 1 where "categorizable_id" = ? and "categorizable_type" = ?'))
  })

  test('eagerload and set relation on model instance', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })
    await video.load('category')

    assert.instanceOf(video.$relations.category, Category)
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categorizable_id" = ? and "categorizable_type" = ? limit ?'))
  })

  test('filter results while eagerloading', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })

    await video.load('category', (builder) => {
      builder.where('title', 'Cooking')
    })

    assert.isNull(video.$relations.category)
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "title" = ? and "categorizable_id" = ? and "categorizable_type" = ? limit ?'))
  })

  test('load multiple relations', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      thumbnail () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    await ioc.use('Database').table('images').insert({
      imageable_id: video.id,
      imageable_type: 'videos',
      uri: 'https://i1.ytimg.com/vi/dfEZlcPvez8/hqdefault.jpg'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: video.id,
      categorizable_type: 'videos',
      title: 'Programming'
    })

    await video.load('thumbnail')
    await video.load('category')

    assert.property(video.$relations, 'thumbnail')
    assert.property(video.$relations, 'category')
    assert.instanceOf(video.$relations.thumbnail, Image)
    assert.instanceOf(video.$relations.category, Category)
  })

  test('map whereIn values for array of model instances', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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

    const videos = await Video.all()
    const videoInstances = videos.rows
    const values = videos.first().category().mapValues(videoInstances)
    assert.deepEqual(videoInstances.map((video) => video.id), values)
  })

  test('map whereIn values for different primary keys', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }

      vCategory () {
        return this.morphOne(Category, 'vid', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert([
      {
        vid: 100,
        title: 'Musical Routes (AdonisJs)',
        uri: 'https://youtu.be/w7LD7E53w3w'
      },
      {
        vid: 101,
        title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
        uri: 'https://youtu.be/dfEZlcPvez8'
      }
    ])

    const videos = await Video.all()
    const videoInstances = videos.rows
    const values = videos.first().category().mapValues(videoInstances)
    const vValues = videos.first().vCategory().mapValues(videoInstances)
    assert.deepEqual(videoInstances.map((video) => video.id), values)
    assert.deepEqual(videoInstances.map((video) => video.vid), vValues)
  })

  test('group related rows for each unique instance', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    const videos = await Video.all()

    const fakeCategory1 = new Category()
    fakeCategory1.id = 1
    fakeCategory1.categorizable_id = videos.rows[1].id
    fakeCategory1.categorizable_type = Video.table

    const fakeCategory2 = new Category()
    fakeCategory2.id = 2
    fakeCategory2.categorizable_id = videos.rows[0].id
    fakeCategory2.categorizable_type = Video.table

    const { values: grouped } = videos.first().category().group([fakeCategory1, fakeCategory2])
    assert.lengthOf(grouped, 2)

    assert.equal(grouped[0].identity, 2)
    assert.equal(grouped[0].value.id, 1)
    assert.equal(grouped[0].value.categorizable_id, 2)
    assert.equal(grouped[0].value.categorizable_type, 'videos')

    assert.equal(grouped[1].identity, 1)
    assert.equal(grouped[1].value.id, 2)
    assert.equal(grouped[1].value.categorizable_id, 1)
    assert.equal(grouped[1].value.categorizable_type, 'videos')
  })

  test('use 2nd instance of related instance when grouping rows', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    const videos = await Video.all()

    const fakeCategory1 = new Category()
    fakeCategory1.id = 1
    fakeCategory1.categorizable_id = videos.rows[1].id
    fakeCategory1.categorizable_type = Video.table

    const fakeCategory2 = new Category()
    fakeCategory2.id = 2
    fakeCategory2.categorizable_id = videos.rows[0].id
    fakeCategory2.categorizable_type = Video.table

    const fakeCategory3 = new Category()
    fakeCategory3.id = 3
    fakeCategory3.categorizable_id = videos.rows[0].id
    fakeCategory3.categorizable_type = Video.table

    const { values: grouped } = videos.first().category().group([fakeCategory1, fakeCategory2, fakeCategory3])
    assert.lengthOf(grouped, 2)
    assert.equal(grouped[0].identity, 2)
    assert.equal(grouped[0].value.id, 1)
    assert.equal(grouped[0].value.categorizable_id, 2)
    assert.equal(grouped[0].value.categorizable_type, 'videos')

    assert.equal(grouped[1].identity, 1)
    assert.equal(grouped[1].value.id, 3)
    assert.equal(grouped[1].value.categorizable_id, 1)
    assert.equal(grouped[1].value.categorizable_type, 'videos')
  })

  test('eagerload via query builder', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    }).returning('id')

    await ioc.use('Database').table('categories').insert({
      categorizable_id: video[0],
      categorizable_type: Video.table,
      title: 'Programming'
    })

    const result = await Video.query().with('category').fetch()
    assert.instanceOf(result.first().getRelated('category'), Category)
  })

  test('eagerload for multiple parent records via query builder', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend'
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack'
      }
    ])

    const result = await Video.query().with('category').fetch()
    assert.equal(result.size(), 2)
    assert.instanceOf(result.rows[0].getRelated('category'), Category)
    assert.instanceOf(result.rows[1].getRelated('category'), Category)
    assert.equal(result.rows[0].getRelated('category').title, 'Backend')
    assert.equal(result.rows[1].getRelated('category').title, 'Full Stack')
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categories"."categorizable_id" in (?, ?) and "categories"."categorizable_type" = ?'))
  })

  test('modify query builder when fetching relationships', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])

    const result = await Video.query().with('category', (builder) => {
      builder.where('all_views', '>', 2)
    }).fetch()
    assert.equal(result.size(), 2)
    assert.instanceOf(result.rows[0].getRelated('category'), Category)
    assert.isNull(result.rows[1].getRelated('category'))
    assert.equal(result.rows[0].getRelated('category').title, 'Backend')
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "all_views" > ? and "categories"."categorizable_id" in (?, ?) and "categories"."categorizable_type" = ?'))
  })

  test('fetch nested relationships', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      image () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    let imageQuery = null
    Category.onQuery((query) => (categoryQuery = query))
    Image.onQuery((query) => (imageQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })
    await ioc.use('Database').table('images').insert({
      imageable_id: 1,
      imageable_type: 'categories',
      storage_path: '/foo'
    })

    const video = await Video.query().with('category.image').fetch()
    assert.instanceOf(video.first().getRelated('category').getRelated('image'), Image)
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categories"."categorizable_id" in (?) and "categories"."categorizable_type" = ?'))
    assert.equal(imageQuery.sql, queryHelpers.formatQuery('select * from "images" where "images"."imageable_id" in (?) and "images"."imageable_type" = ?'))
  })

  test('add runtime constraints on nested relationships', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      image () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    let imageQuery = null
    Category.onQuery((query) => (categoryQuery = query))
    Image.onQuery((query) => (imageQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })
    await ioc.use('Database').table('images').insert({
      imageable_id: 1,
      imageable_type: 'categories',
      storage_path: '/foo'
    })

    const video = await Video.query().with('category.image', (builder) => {
      builder.where('storage_path', '/bar')
    }).fetch()
    assert.isNull(video.first().getRelated('category').getRelated('image'))
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categories"."categorizable_id" in (?) and "categories"."categorizable_type" = ?'))
    assert.equal(imageQuery.sql, queryHelpers.formatQuery('select * from "images" where "storage_path" = ? and "images"."imageable_id" in (?) and "images"."imageable_type" = ?'))
  })

  test('add runtime constraints on child relationships and not grandchild', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      image () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    let imageQuery = null
    Category.onQuery((query) => (categoryQuery = query))
    Image.onQuery((query) => (imageQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming',
      all_views: 3
    })
    await ioc.use('Database').table('images').insert({
      imageable_id: 1,
      imageable_type: 'categories',
      storage_path: '/foo'
    })

    const video = await Video.query().with('category', (builder) => {
      builder.where('all_views', '>', 3).with('image')
    }).fetch()
    assert.isUndefined(video.first().getRelated('image'))
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "all_views" > ? and "categories"."categorizable_id" in (?) and "categories"."categorizable_type" = ?'))
    assert.isNull(imageQuery)
  })

  test('limit parent records based on child', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })

    const videos = await Video.query().has('category').fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('limit parent records based on nested childs', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      image () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })
    await ioc.use('Database').table('images').insert({
      imageable_id: 1,
      imageable_type: 'categories',
      storage_path: '/foo'
    })

    const videos = await Video.query().has('category.image').fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where exists (select * from "images" where "categories"."id" = "images"."imageable_id" and "images"."imageable_type" = ?) and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('return null when nested child query fails', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      image () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })

    const videos = await Video.query().has('category.image').fetch()
    assert.equal(videos.size(), 0)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where exists (select * from "images" where "categories"."id" = "images"."imageable_id" and "images"."imageable_type" = ?) and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('throw exception when has receives an invalid relationship', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Video._bootIfNotBooted()
    Category._bootIfNotBooted()

    const fn = () => Video.query().has('foo')
    assert.throw(fn, 'E_INVALID_MODEL_RELATION: foo is not defined on Video model')
  })

  test('add expression and value to has method', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Video._bootIfNotBooted()
    Category._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })

    const videos = await Video.query().has('category', '>', 1).fetch()
    assert.equal(videos.size(), 0)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where (select count(*) from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) > ?'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings(['videos', 1]))
  })

  test('add expression and value to nested relation using has method', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      image () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })

    const videos = await Video.query().has('category.image', '>', 1).fetch()
    assert.equal(videos.size(), 0)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where (select count(*) from "images" where "categories"."id" = "images"."imageable_id" and "images"."imageable_type" = ?) > ? and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
    assert.deepEqual(videoQuery.bindings, queryHelpers.formatBindings(['categories', 1, 'videos']))
  })

  test('add expression and value to nested relation using orHas method', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      thumbnail () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('images').insert({
      imageable_id: 1,
      imageable_type: 'videos',
      storage_path: '/foo'
    })

    const videos = await Video.query().has('category').orHas('thumbnail').fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) or exists (select * from "images" where "videos"."id" = "images"."imageable_id" and "images"."imageable_type" = ?)'))
  })

  test('apply has via query scope', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }

      static scopeHasCategory (query) {
        return query.has('category')
      }
    }

    Video._bootIfNotBooted()
    Category._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Programming'
    })

    const videos = await Video.query().hasCategory().fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('add more constraints to has via whereHas', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Video._bootIfNotBooted()
    Category._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])

    const videos = await Video.query().whereHas('category', function (builder) {
      builder.where('all_views', '>', 2)
    }).fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where "all_views" > ? and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('add count constraints via whereHas', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Video._bootIfNotBooted()
    Category._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])

    const videos = await Video.query().whereHas('category', function (builder) {
      builder.where('all_views', '>', 2)
    }, '=', 1).fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where (select count(*) from "categories" where "all_views" > ? and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) = ?'))
  })

  test('add whereDoesHave constraint', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Video._bootIfNotBooted()
    Category._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])

    const videos = await Video.query().whereDoesntHave('category', function (builder) {
      builder.where('all_views', '>', 2)
    }).fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videos.first().title, 'Full Stack Todo List Tutorial using Vue.js & AdonisJs')
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where not exists (select * from "categories" where "all_views" > ? and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('add orWhereHas constraint', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      thumbnail () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])
    await ioc.use('Database').table('images').insert([
      {
        imageable_id: 1,
        imageable_type: 'videos',
        storage_path: '/foo'
      },
      {
        imageable_id: 2,
        imageable_type: 'videos',
        storage_path: '/bar'
      }
    ])

    const videos = await Video.query().whereHas('category', function (builder) {
      builder.where('all_views', '>', 2)
    }).orWhereHas('thumbnail', function (builder) {
      builder.where('storage_path', '/bar')
    }).fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where "all_views" > ? and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) or exists (select * from "images" where "storage_path" = ? and "videos"."id" = "images"."imageable_id" and "images"."imageable_type" = ?)'))
  })

  test('add orWhereDoesntHave constraint', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      thumbnail () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])
    await ioc.use('Database').table('images').insert([
      {
        imageable_id: 1,
        imageable_type: 'videos',
        storage_path: '/foo'
      },
      {
        imageable_id: 2,
        imageable_type: 'videos',
        storage_path: '/bar'
      }
    ])

    const videos = await Video.query().whereHas('category', function (builder) {
      builder.where('all_views', '>', 2)
    }).orWhereDoesntHave('thumbnail', function (builder) {
      builder.where('storage_path', '/bar')
    }).fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videos.first().title, 'Musical Routes (AdonisJs)')
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where "all_views" > ? and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) or not exists (select * from "images" where "storage_path" = ? and "videos"."id" = "images"."imageable_id" and "images"."imageable_type" = ?)'))
  })

  test('eagerload and paginate via query builder', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])

    const videos = await Video.query().with('category').paginate(1, 1)
    assert.instanceOf(videos, VanillaSerializer)
    assert.equal(videos.size(), 1)
    assert.instanceOf(videos.first().getRelated('category'), Category)
    assert.equal(videos.first().getRelated('category').title, 'Backend')
  })

  test('paginate with has constraints', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      }
    ])

    const videos = await Video.query().has('category', '=', 1).paginate(1)
    assert.equal(videos.size(), 1)
    assert.deepEqual(videos.pages, { lastPage: 1, perPage: 20, total: queryHelpers.formatNumber(1), page: 1 })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where (select count(*) from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) = ? limit ?'))
  })

  test('return relation count', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      }
    ])

    const videos = await Video.query().withCount('category').fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videos.first().category_count, 1)
    assert.deepEqual(videos.first().$sideLoaded, { category_count: queryHelpers.formatNumber(1) })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) as "category_count" from "videos"'))
  })

  test('return relation count with paginate method', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      }
    ])

    const videos = await Video.query().withCount('category').paginate()
    assert.equal(videos.size(), 2)
    assert.equal(videos.first().category_count, 1)
    assert.deepEqual(videos.first().$sideLoaded, { category_count: queryHelpers.formatNumber(1) })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) as "category_count" from "videos" limit ?'))
  })

  test('define count column for withCount', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      }
    ])

    const videos = await Video.query().withCount('category as my_category').fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videos.first().my_category, 1)
    assert.deepEqual(videos.first().$sideLoaded, { my_category: queryHelpers.formatNumber(1) })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) as "my_category" from "videos"'))
  })

  test('define callback with withCount', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      }
    ])

    const videos = await Video.query().withCount('category', function (builder) {
      builder.where('all_views', '>', 3)
    }).fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videos.first().category_count, 0)
    assert.deepEqual(videos.first().$sideLoaded, { category_count: queryHelpers.formatNumber(0) })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "categories" where "all_views" > ? and "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) as "category_count" from "videos"'))
  })

  test('throw exception when trying to call withCount with nested relations', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      }
    ])

    const videos = () => Video.query().withCount('category.image')
    assert.throw(videos, `E_CANNOT_NEST_RELATION: withCount does not allowed nested relations. Instead use .with('category', (builder) => builder.withCount('image'))`)
  })

  test('allow withCount on nested query builder', async (assert) => {
    class Image extends Model {
    }

    class Category extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      thumbnail () {
        return this.morphOne(Image, 'id', 'imageable_id', 'imageable_type')
      }
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Image._bootIfNotBooted()
    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))
    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })
    await ioc.use('Database').table('images').insert({
      imageable_id: 1,
      imageable_type: 'categories',
      storage_path: '/foo'
    })

    const videos = await Video.query().with('category', (builder) => builder.withCount('thumbnail')).fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videos.first().getRelated('category').thumbnail_count, queryHelpers.formatNumber(1))
    assert.deepEqual(videos.first().getRelated('category').$sideLoaded, { thumbnail_count: queryHelpers.formatNumber(1) })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos"'))
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "images" where "categories"."id" = "images"."imageable_id" and "images"."imageable_type" = ?) as "thumbnail_count" from "categories" where "categories"."categorizable_id" in (?, ?) and "categories"."categorizable_type" = ?'))
  })

  test('eagerload when calling first', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = await Video.query().with('category').first()
    assert.instanceOf(video.getRelated('category'), Category)
  })

  test('set model parent when fetched as a relation', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = await Video.query().with('category').first()
    assert.equal(video.getRelated('category').$parent, 'Video')
    assert.isTrue(video.getRelated('category').hasParent)
  })

  test('set model parent when fetched via query builder fetch method', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      title: 'Full Stack Todo List Tutorial using Vue.js & AdonisJs',
      uri: 'https://youtu.be/dfEZlcPvez8'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = await Video.query().with('category').fetch()
    assert.equal(video.first().getRelated('category').$parent, 'Video')
    assert.isTrue(video.first().getRelated('category').hasParent)
  })

  test('withCount should respect existing selected columns', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const videos = await Video.query().select('title').withCount('category').fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videos.first().category_count, 1)
    assert.deepEqual(videos.first().$sideLoaded, { category_count: queryHelpers.formatNumber(1) })
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select "title", (select count(*) from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) as "category_count" from "videos"'))
  })

  test('orHas should work fine', async (assert) => {
    class Category extends Model {
    }

    class Comment extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      comments () {
        return this.morphMany(Comment, 'id', 'commentable_id', 'commentable_type')
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })
    await ioc.use('Database').table('comments').insert({
      commentable_id: 2,
      commentable_type: 'videos',
      text: 'Awesome tutorial! Coming from Laravel and loving Adonis so far!'
    })

    const videos = await Video.query().has('comments').orHas('category').fetch()
    assert.equal(videos.size(), 2)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "comments" where "videos"."id" = "comments"."commentable_id" and "comments"."commentable_type" = ?) or exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('doesntHave should work fine', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const videos = await Video.query().doesntHave('category').fetch()
    assert.equal(videos.size(), 1)
    assert.equal(videos.first().title, 'Full Stack Todo List Tutorial using Vue.js & AdonisJs')
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where not exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?)'))
  })

  test('orDoesntHave should work fine', async (assert) => {
    class Category extends Model {
    }

    class Comment extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      comments () {
        return this.morphMany(Comment, 'id', 'commentable_id', 'commentable_type')
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Comment._bootIfNotBooted()
    Video._bootIfNotBooted()

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
    await ioc.use('Database').table('categories').insert([
      {
        categorizable_id: 1,
        categorizable_type: 'videos',
        title: 'Backend',
        all_views: 3
      },
      {
        categorizable_id: 2,
        categorizable_type: 'videos',
        title: 'Full Stack',
        all_views: 2
      }
    ])
    await ioc.use('Database').table('comments').insert({
      commentable_id: 2,
      commentable_type: 'videos',
      text: 'Awesome tutorial! Coming from Laravel and loving Adonis so far!'
    })

    const videos = await Video.query().doesntHave('category').orDoesntHave('comments').paginate()
    assert.equal(videos.size(), 1)
    assert.equal(videos.first().title, 'Musical Routes (AdonisJs)')
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where not exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?) or not exists (select * from "comments" where "videos"."id" = "comments"."commentable_id" and "comments"."commentable_type" = ?) limit ?'))
  })

  test('save related hasOne relation', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    assert.isTrue(video.$persisted)

    const category = new Category()
    category.title = 'Development'
    await video.category().save(category)

    assert.equal(category.categorizable_id, 1)
    assert.equal(category.categorizable_id, video.id)
    assert.equal(category.categorizable_type, Video.table)
    assert.equal(category.categorizable_type, 'videos')
    assert.isTrue(category.$persisted)
  })

  test('create related instance', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    assert.isTrue(video.$persisted)

    const category = await video.category().create({ title: 'Development' })

    assert.equal(category.categorizable_id, 1)
    assert.equal(category.categorizable_id, video.id)
    assert.equal(category.categorizable_type, Video.table)
    assert.equal(category.categorizable_type, 'videos')
    assert.isTrue(category.$persisted)
  })

  test('persist parent model if it\'s not persisted', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'

    assert.isTrue(video.isNew)

    const category = new Category()
    category.title = 'Development'

    await video.category().save(category)

    assert.equal(category.categorizable_id, 1)
    assert.equal(category.categorizable_id, video.id)
    assert.equal(category.categorizable_type, Video.table)
    assert.equal(category.categorizable_type, 'videos')
    assert.isTrue(category.$persisted)
    assert.isTrue(video.$persisted)
  })

  test('persist parent model if it\'s not persisted via create method', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'

    assert.isTrue(video.isNew)

    const category = await video.category().create({ title: 'Development' })

    assert.equal(category.categorizable_id, 1)
    assert.equal(category.categorizable_id, video.id)
    assert.equal(category.categorizable_type, Video.table)
    assert.equal(category.categorizable_type, 'videos')
    assert.isTrue(category.$persisted)
    assert.isTrue(video.$persisted)
  })

  test('createMany with morphOne should throw exception', (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    const fn = () => video.category().createMany({ title: 'Development' })
    assert.throw(fn, 'E_INVALID_RELATION_METHOD: createMany is not supported by morphOne relation')
  })

  test('saveMany with hasOne should throw exception', (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    const video = new Video()
    const fn = () => video.category().saveMany(new Category())
    assert.throw(fn, 'E_INVALID_RELATION_METHOD: saveMany is not supported by morphOne relation')
  })

  test('delete related row', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

    const video = new Video()
    video.title = 'Full Stack Todo List Tutorial using Vue.js & AdonisJs'
    video.uri = 'https://youtu.be/dfEZlcPvez8'
    await video.save()

    await video.category().create({ title: 'Development' })
    await video.category().delete()

    const categories = await ioc.use('Database').table('categories')
    assert.lengthOf(categories, 0)
    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('delete from "categories" where "categorizable_id" = ? and "categorizable_type" = ?'))
  })

  test('hasOne relation work fine with IoC container binding', async (assert) => {
    class Category extends Model {
    }

    ioc.fake('App/Models/Category', () => {
      return Category
    })

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne('App/Models/Category', 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

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
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = new Video()
    video.id = 1
    video.$persisted = true

    const category = await video.category().load()

    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categorizable_id" = ? and "categorizable_type" = ? limit ?'))
    assert.deepEqual(categoryQuery.bindings, queryHelpers.formatBindings([1, 'videos', 1]))
    assert.instanceOf(category, Category)
    assert.equal(category.$attributes.categorizable_id, 1)
    assert.equal(category.$attributes.categorizable_type, 'videos')
  })

  test('bind custom callback for eagerload query', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

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

    await Video.query().with('category', (builder) => {
      builder.eagerLoadQuery(function (query, relatedKey, values, typeKey, typeValue) {
        query
          .where('all_views', 1)
          .whereIn(relatedKey, values)
          .where(typeKey, typeValue)
      })
    }).fetch()

    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "all_views" = ? and "categorizable_id" in (?, ?) and "categorizable_type" = ?'))
    assert.deepEqual(categoryQuery.bindings, queryHelpers.formatBindings([1, 1, 2, 'videos']))
  })

  test('apply global scope on related model when eagerloading', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    Category.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    let categoryQuery = null
    Category.onQuery((query) => (categoryQuery = query))

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
    await Video.query().with('category').fetch()

    assert.equal(categoryQuery.sql, queryHelpers.formatQuery('select * from "categories" where "categories"."categorizable_id" in (?, ?) and "categories"."categorizable_type" = ? and "deleted_at" is null'))
  })

  test('apply global scope on related model when called withCount', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    Category.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await Video.query().withCount('category').fetch()

    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select *, (select count(*) from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ? and "categories"."deleted_at" is null) as "category_count" from "videos"'))
  })

  test('apply global scope on related model when called has', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    Category.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await Video.query().has('category').fetch()

    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ? and "categories"."deleted_at" is null)'))
  })

  test('scope whereHas call', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    let videoQuery = null
    Video.onQuery((query) => (videoQuery = query))

    await ioc.use('Database').table('videos').insert({
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 1,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const videos = await Video.query().where(function (builder) {
      builder.whereHas('category')
    }).fetch()

    assert.equal(videos.size(), 1)
    assert.equal(videoQuery.sql, queryHelpers.formatQuery('select * from "videos" where (exists (select * from "categories" where "videos"."id" = "categories"."categorizable_id" and "categories"."categorizable_type" = ?))'))
  })

  test('work fine when foreign key value is 0', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 0,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = await Video.find(0)
    const category = await video.category().fetch()
    assert.equal(category.categorizable_id, 0)
  })

  test('eagerload when foreign key value is 0', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 0,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = await Video.query().with('category').first()
    assert.instanceOf(video.getRelated('category'), Category)
  })

  test('save related when foreign key value is 0', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })

    const video = await Video.find(0)
    await video.category().create({ title: 'Development' })

    const categories = await ioc.use('Database').table('categories')
    assert.lengthOf(categories, 1)
    assert.equal(categories[0].categorizable_id, 0)
  })

  test('update related when foreign key value is 0', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 0,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = await Video.find(0)
    await video.category().update({ all_views: 4 })

    const categories = await ioc.use('Database').table('categories')
    assert.equal(categories[0].all_views, 4)
  })

  test('serialize when foreign key is 0', async (assert) => {
    class Category extends Model {
    }

    class Video extends Model {
      static get traits () {
        return ['@provider:Morphable']
      }

      category () {
        return this.morphOne(Category, 'id', 'categorizable_id', 'categorizable_type')
      }
    }

    Category._bootIfNotBooted()
    Video._bootIfNotBooted()

    await ioc.use('Database').table('videos').insert({
      id: 0,
      title: 'Musical Routes (AdonisJs)',
      uri: 'https://youtu.be/w7LD7E53w3w'
    })
    await ioc.use('Database').table('categories').insert({
      categorizable_id: 0,
      categorizable_type: 'videos',
      title: 'Backend',
      all_views: 3
    })

    const video = await Video.query().with('category').first()
    assert.equal(video.toJSON().category.categorizable_id, 0)
  })
})
