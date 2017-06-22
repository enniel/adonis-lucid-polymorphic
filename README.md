# Adonis Lucid Polymorphic (WORK IN PROGRESS)

[![Build Status](https://travis-ci.org/enniel/adonis-lucid-polymorphic.svg?branch=master)](https://travis-ci.org/enniel/adonis-lucid-polymorphic)
[![Coverage Status](https://coveralls.io/repos/github/enniel/adonis-lucid-polymorphic/badge.svg)](https://coveralls.io/github/enniel/adonis-lucid-polymorphic)

Polymorphic Relations support for [Adonis Lucid](http://adonisjs.com/docs/3.2/lucid).

## Installation

1. Add package:

```bash
$ npm i adonis-lucid-polymorphic --save
```
or

```bash
$ yarn add adonis-lucid-polymorphic
```

2. Register providers inside the your bootstrap/app.js file.

```js
const providers = [
  ...
  'adonis-lucid-polymorphic/providers/PolymorphicProvider',
  ...
]
```
## Examples

### Table Structure

```
posts
    id - integer
    title - string
    body - text

videos
    id - integer
    title - string
    url - string

comments
    id - integer
    body - text
    commentable_id - integer
    commentable_type - string
```

### Model Structure

```js
// App/Model/Post
'use strict'

const Model = use('Lucid')

class Post extends Model {
  static get traits () {
    return ['Adonis/Lucid/MorphTrait']
  }

  comments () {
    return this.morphMany('App/Model/Comment', 'commentable')
  }
}

module.exports = Post
```

```js
// App/Model/Video
'use strict'

const Model = use('Lucid')

class Video extends Model {
  static get traits () {
    return ['Adonis/Lucid/MorphTrait']
  }

  comments () {
    return this.morphMany('App/Model/Comment', 'commentable')
  }
}

module.exports = Video
```

```js
// App/Model/Comment
'use strict'

const Model = use('Lucid')

class Comment extends Model {
  static get traits () {
    return ['Adonis/Lucid/MorphTrait']
  }

  commentable () {
    return this.morphTo('commentable', [
      'App/Model/Post', 'App/Model/Video'
    ])
  }
}

module.exports = Video
```

## API

### morphTo(determiner, morphMap, [primaryKey])

```js
...

class Comment extends Model {
  static get traits () {
    return ['Adonis/Lucid/MorphTrait']
  }

  commentable () {
    return this.morphTo('commentable', [
      'App/Model/Post', 'App/Model/Video'
    ], 'id')
  }
}

...
```

### morphMany(relatedModel, determiner, [primaryKey])

```js
...

class Post extends Model {
  static get traits () {
    return ['Adonis/Lucid/MorphTrait']
  }

  comments () {
    return this.morphMany('App/Model/Comment', 'commentable', 'id')
  }
}

...
```

### morphOne(relatedModel, determiner, [primaryKey])

```js
...

class Publication extends Model {
  static get traits () {
    return ['Adonis/Lucid/MorphTrait']
  }

  content () {
    return this.morphOne('App/Model/Content', 'contentable', 'id')
  }
}

...
```

## Credits

- [Evgeni Razumov](https://github.com/enniel)

## Support

Having trouble? [Open an issue](https://github.com/enniel/adonis-lucid-polymorphic/issues/new)!

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
