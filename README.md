# Meteor Publication Factory

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
![GitHub file size in bytes](https://img.shields.io/github/size/leaonline/publication-factory/publication-factory.js)
![GitHub](https://img.shields.io/github/license/leaonline/publication-factory)

Create validated Meteor publications. Lightweight. Simple.

With this package you can define factory functions to create a variety of Meteor publications.
Decouples definition from instantiation (also for the schema) and allows different configurations for different
types of publications.

**Minified size < 2KB!**

## Why do I want this?

- Decouple definition from instantiation
- Validate publication arguments as with `mdg:validated-method`
- Just pass in the schema as plain object, instead of manually instantiating `SimpleSchema`
- Create mixins (similar to `mdg:validated-method`) on the abstract factory level, on the factory level, or both 
  (see mixins section)
- Fail silently in case of errors (uses the publication's `error` and `ready`), undefined cursors or unexpected 
  returntypes

## Installation

Simply add this package to your meteor packages

```bash
$ meteor add leaonline:publication-factory
```

## Usage

Import the `createPublicationFactory` publication and create the factory function from it:

```javascript
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'
import { MyCollection } from '/path/to/MyCollection'

const createPublication = createPublicationFactory() // no params = use defaults
const fancyPublication = createPublication({ name: 'fancy', validate: () => {}, run: () => MyCollection.find() }) // minimal required
```

Under the hood it all runs like a 

### With schema

We support various ways to validate an input schema. To **decouple** schema definition from instantiation, we introduced a `shemaFactory`, which
is basically a function that creates your schema for this collection. This also ensures, that
publications don't share the same schema instances.

#### Using SimpleSchema

```javascript
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'
import { MyCollection } from '/path/to/MyCollection'
import SimpleSchema from 'simpl-schema'

const schemaFactory = definitions => new SimpleSchema(definitions)

const createPublication = createPublicationFactory({ schemaFactory })
createPublication({
  name: 'fancy',
  schema: { author: String },
  run: function({ author }) {
    return MyCollection.find({ author })
  }
})
```

and subcribe via

```javascript
Meteor.subscribe('fancy', { author: 'Mr.x' }) // leaving author will raise an error
```

As you can see, there is **no need to pass a `validate` function** as it is internally built using the `schemaFactory`
and the given `schema`.

#### Overriding `validate` when using schema

You can also override the internal `validate` when using `schema` by passing a `validate` function.
This, however, disables the schema validation and is then your responsibility:

```javascript
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'
import { MyCollection } from '/path/to/MyCollection'
import SimpleSchema from 'simpl-schema'

const schemaFactory = definitions => new SimpleSchema(definitions)

const createPublication = createPublicationFactory({ schemaFactory })
createPublication({
  name: 'fancy',
  schema: { author: String },
  validate: () => {},
  run: function({ author }) {
    return MyCollection.find({ author })
  }
})
```

and subcribe via

```javascript
Meteor.subscribe('fancy', {}) // leaving author will NOT raise an error
```

If none of these cover your use case, you can still use mixins.

#### Using check

You can also use Meteor's builtin `check` and `Match` for schema validation:

```javascript
import { check } from 'meteor/check'
import { MyCollection } from '/path/to/MyCollection'
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'

const schemaFactory = schema => ({
  validate (args) {
    check(args, schema)
  }
})

const createPublication = createPublicationFactory({ schemaFactory })
createPublication({
  name: 'fancy',
  schema: { author: String },
  run: function({ author }) {
    return MyCollection.find({ author })
  }
})
```

Note, that some definitions for `SimpleSchema` and `check`/`Match` may differ.

### With mixins

There are three ways to define [mixins](https://github.com/meteor/validated-publication#mixins):

- on the abstract factory function level, all publications created by the factory will contain these mixins
- on the factory level, you basically pass mixins the a single publication
- on both levels, where mixins from the abstract factory function are executed first; no overrides

#### Abstract factory level mixins

If you want a certain mixin to be included for all publications created by the factory just pass them to the
`createPublicationFactory` function:

```javascript
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'
import { ValidatedPublication } from 'meteor/mdg:validated-publication'
import { myDefaultMixin } from '/path/to/myDefaultMixin'
import { MyCollection } from '/path/to/MyCollection'

const createPublication = createPublicationFactory({ mixins: [myDefaultMixin] })
createPublication({ 
  name: 'publicationWithMixin', 
  validate: () => {}, 
  run: () => MyCollection.find(), 
  foo: 'bar' // assuming your mixin requires foo 
})
```

#### Factory level mixins

You can also define mixins for each publication. This is the same as passing mixins to the `ValidatedPublication`:

```javascript
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'
import { ValidatedPublication } from 'meteor/mdg:validated-publication'
import { myDefaultMixin } from '/path/to/myDefaultMixin'
import { MyCollection } from '/path/to/MyCollection'

const createPublication = createPublicationFactory() // use defaults

createPublication({ 
  name: 'publicationWithMixin',
  mixins: [myDefaultMixin],
  validate: () => {}, 
  run: () => MyCollection.find(), 
  foo: 'bar' // assuming your mixin requires foo 
})

const publicationWithoutMixin = createPublication({
  name: 'publicationWithoutMixin',
  validate: () => {}, 
  run: () => MyCollection.find(), 
})
```

##### Use mixins on both levels

Of course you can define mixins on both levels, so that you have a certain set of default mixins and publication-specific 
mixins:

```javascript
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'
import { ValidatedPublication } from 'meteor/mdg:validated-publication'
import { myDefaultMixin } from '/path/to/myDefaultMixin'
import { someOtherMixin } from '/path/to/someOtherMixin'
import { MyCollection } from '/path/to/MyCollection'

const createPublication = createPublicationFactory({ mixins: [myDefaultMixin] })

const publicationWithMixin = createPublication({ 
  name: 'publicationWithMixin', 
  validate: () => {}, 
  run: () => MyCollection.find(), 
  foo: 'bar' // assuming your mixin requires foo 
})

const publicationWithMixins = createPublication({
  name: 'publicationWithMixin', 
  mixins: [someOtherMixin],
  validate: () => {}, 
  run: () => MyCollection.find(), 
  foo: 'bar', // assuming your mixin requires foo
  bar: 'baz', // assuming the other mixin requires bar 
})
```

## Codestyle

We use `standard` as code style and for linting.

##### via npm

```bash
$ npm install --global standard snazzy
$ standard | snazzy
```

##### via Meteor npm

```bash
$ meteor npm install --global standard snazzy
$ standard | snazzy
```


## Test

We use `meteortesting:mocha` to run our tests on the package.

##### Watch mode

```bash
$ TEST_WATCH=1 TEST_CLIENT=0 meteor test-packages ./ --driver-package meteortesting:mocha
```

##### Cli mode

## License

MIT, see [LICENSE](./LICENSE)
