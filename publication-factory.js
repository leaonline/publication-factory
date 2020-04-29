import { Meteor } from 'meteor/meteor'
import { check, Match } from 'meteor/check'

const isConnection = Match.Where(c => typeof c === 'object' && typeof c.publish === 'function')
const isMaybeMongoCursor = Match.Where(c => !c || c.constructor.name === 'Cursor')

export const createPublicationFactory = ({ schemaFactory, mixins, connection = Meteor } = {}) => {
  check(connection, isConnection)
  const abstractFactoryLevelConnection = connection
  const abstractFactoryLevelMixins = mixins || []
  const isRequiredSchema = schemaFactory ? Object : Match.Maybe(Object)

  return ({ name, schema, validate, run, mixins = [], connection = Meteor, ...factoryArgs }) => {
    check(name, String)
    check(schema, isRequiredSchema)
    check(validate, Match.Maybe(Function))
    check(run, Function)
    check(mixins, [Function])
    check(connection, isConnection)

    // first we apply all mixins and create our internal "options"
    const localMixins = [].concat(mixins, abstractFactoryLevelMixins)
    const allArgs = Object.assign({}, { name, validate, run, mixins: localMixins, connection }, factoryArgs)
    const options = applyMixins(allArgs, localMixins)

    // connection can be overridden on factory level
    const factoryLevelConnection = options.connection !== Meteor
      ? options.connection
      : abstractFactoryLevelConnection

    // ensure there is no pub with the same name and fail early
    if (typeof factoryLevelConnection.server.publish_handlers[options.name] === 'function') {
      throw new Error(`Publication "${options.name}" already exists`)
    }

    let validateFn = options.validate || (() => {})
    if (!options.validate && schemaFactory) {
      const validationSchema = schemaFactory(schema)
      // we fallback to a plain object to support Meteor.subscribe(name)
      // for schemas that contain no property: { schema: {} }
      validateFn = function validate (document = {}) {
        validationSchema.validate(document)
      }
    }

    /**
     * The final publication to run with arbitrary args
     * @param args arbitrary number and form of arguments
     * @return {Mongo.Cursor} a Mongo Cursor instance
     */
    const publication = function (...args) {
      check(args, Match.Any) // make audit-all-arguments happy
      validateFn(...args)

      const self = this
      let cursor

      try {
        cursor = options.run.apply(self, args)
        check(cursor, isMaybeMongoCursor)
      } catch (e) {
        self.error(e)
        return self.ready()
      }

      return cursor || self.ready()
    }

    publication.name = options.name
    factoryLevelConnection.publish(options.name, publication)
    check(factoryLevelConnection.server.publish_handlers[options.name], Function)
    return publication
  }
}

function applyMixins (args, mixins) {
  // Save name of the method here, so we can attach it to potential error messages
  const { name } = args

  mixins.forEach((mixin) => {
    args = mixin(args)

    if (!Match.test(args, Object)) {
      const functionName = mixin.toString().match(/function\s(\w+)/)
      let msg = 'One of the mixins'

      if (functionName) {
        msg = `The function '${functionName[1]}'`
      }

      throw new Error(`Error in ${name} publication: ${msg} didn't return the options object.`)
    }
  })

  return args
}
