/* global describe it beforeEach afterEach */
import { Mongo } from 'meteor/mongo'
import { check, Match } from 'meteor/check'
import { Random } from 'meteor/random'
import { PublicationCollector } from 'meteor/johanbrook:publication-collector'
import { createPublicationFactory } from 'meteor/leaonline:publication-factory'
import { expect } from 'chai'
import SimpleSchema from 'simpl-schema'

const schemaFactory = def => new SimpleSchema(def)

const collectionName = Random.id()
const TestCollection = new Mongo.Collection(collectionName)
const insertDocs = num => (new Array(num)).forEach(() => TestCollection.insert({}))
const getRandom = (upper = 25) => Math.floor(Math.random() * upper)
const randomDocs = () => insertDocs(getRandom())

describe('default, no args', function () {
  const collector = new PublicationCollector({ userId: Random.id() })

  beforeEach(function () {
    randomDocs()
  })

  afterEach(function () {
    TestCollection.remove({})
  })

  it('creates a publication with defaults', function (done) {
    const name = Random.id()
    const createPublication = createPublicationFactory()
    createPublication({ name, run: () => TestCollection.find() })

    const expectedCount = TestCollection.find().count()
    collector.collect(name, (collections) => {
      expect(collections[collectionName]).to.have.lengthOf(expectedCount)
      done()
    })
  })

  it('throws if the pubication already exists', function () {
    const name = Random.id()
    const createPublication = createPublicationFactory()
    createPublication({ name, run: () => {} })
    expect(() => createPublication({ name, run: () => {} })).to.throw(`Publication "${name}" already exists`)
  })

  it('falls back if no cursor is returned', function (done) {
    const name = Random.id()
    const createPublication = createPublicationFactory()
    createPublication({ name, run: () => {} })
    collector.collect(name, (collections) => {
      expect(collections[collectionName]).to.have.lengthOf(0)
      done()
    })
  })

  it('falls back if cursor is something else than a Mongo.Cursor', function (done) {
    const name = Random.id()
    const createPublication = createPublicationFactory()
    const publication = createPublication({ name, run: () => [] })

    const env = {
      ready () {
        done()
      },
      error (e) {
        expect(e.message).to.include('Failed Match.Where validation')
      }
    }
    publication.call(env)
  })

  it('falls back if if an error is thrown', function (done) {
    const name = Random.id()
    const message = Random.id()
    const createPublication = createPublicationFactory()
    const publication = createPublication({ name, run: () => { throw new Error(message) } })

    const env = {
      ready () {
        done()
      },
      error (e) {
        expect(e.message).to.equal(message)
      }
    }
    publication.call(env)
  })
})

describe('with schema', function () {
  const collector = new PublicationCollector({ userId: Random.id() })

  beforeEach(function () {
    randomDocs()
  })

  afterEach(function () {
    TestCollection.remove({})
  })

  it('allows to define a SimpleSchema to validate run args', function (done) {
    const name = Random.id()
    const createPublication = createPublicationFactory({ schemaFactory })
    const publication = createPublication({
      name: name,
      schema: {
        limit: {
          type: Number,
          min: 1,
          max: 100
        }
      },
      run ({ limit }) {
        return TestCollection.find({}, { limit })
      }
    })

    // expect fail
    expect(() => publication()).to.throw('Limit is required')

    // expect pass
    const limit = getRandom()
    collector.collect(name, { limit }, (collections) => {
      expect(collections[collectionName]).to.have.lengthOf.below(limit)
      done()
    })
  })
  it('allows to define a check/match schema to validate run args', function (done) {
    const name = Random.id()
    const checkMatchFactory = (schema) => ({
      validate (doc) {
        check(doc, schema)
      }
    })
    const createPublication = createPublicationFactory({ schemaFactory: checkMatchFactory })
    const publication = createPublication({
      name: name,
      schema: {
        limit: Match.Where(l => typeof l === 'number' && l >= 0 && l <= 25)
      },
      run ({ limit }) {
        return TestCollection.find({}, { limit })
      }
    })

    // expect fail
    expect(() => publication()).to.throw('Match error: Missing key \'limit\'')

    // expect pass
    const limit = getRandom()
    collector.collect(name, { limit }, (collections) => {
      expect(collections[collectionName]).to.have.lengthOf.below(limit)
      done()
    })
  })
  it('allows to override validation using a validate function', function (done) {
    const name = Random.id()
    const createPublication = createPublicationFactory({ schemaFactory })
    createPublication({
      name: name,
      schema: {
        limit: {
          type: Number,
          min: 1,
          max: 100
        }
      },
      validate () {},
      run ({ limit }) {
        return TestCollection.find({}, { limit })
      }
    })

    const expectedCount = TestCollection.find().count()
    collector.collect(name, {}, (collections) => {
      expect(collections[collectionName]).to.have.lengthOf(expectedCount)
      done()
    })
  })
})

describe('mixins', function () {
  const testMixin = function (options) {
    check(options.foo, String)
    return options
  }

  beforeEach(function () {
    randomDocs()
  })

  afterEach(function () {
    TestCollection.remove({})
  })

  it('throws if mixins do not return options', function () {
    const createPublication = createPublicationFactory({ mixins: [() => {}] })
    expect(() => createPublication({
      name: Random.id(),
      validate: () => {},
      run: () => {}
    })).to.throw('didn\'t return the options object.')
  })
  it('allows to define mixins on the abstract factory level', function () {
    const createPublication = createPublicationFactory({ mixins: [testMixin] })
    expect(() => createPublication({
      name: Random.id(),
      validate: () => {},
      run: () => {}
    })).to.throw('Expected string, got undefined')

    createPublication({ name: Random.id(), validate: () => {}, run: () => {}, foo: 'bar' })
  })
  it('allows to define mixins on the factory level', function () {
    const createPublication = createPublicationFactory()
    expect(() => createPublication({
      name: Random.id(),
      validate: () => {},
      mixins: [testMixin],
      run: () => {}
    })).to.throw('Expected string, got undefined')

    createPublication({ name: Random.id(), validate: () => {}, run: () => {}, foo: 'bar' })
  })
  it('allows to define mixins on both levels', function () {
    const anotherTestMixin = function (options) {
      check(options.bar, String)
      return options
    }
    const createPublication = createPublicationFactory({ mixins: [testMixin] })
    expect(() => createPublication({
      name: Random.id(),
      mixins: [anotherTestMixin],
      validate: () => {},
      run: () => {},
      foo: 'bar'
    })).to.throw('Expected string, got undefined')

    createPublication({ name: Random.id(), validate: () => {}, run: () => {}, foo: 'bar', bar: 'baz' })
  })
})
