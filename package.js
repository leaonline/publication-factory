/* eslint-env meteor */
Package.describe({
  name: 'leaonline:publication-factory',
  version: '1.1.1',
  // Brief, one-line summary of the package.
  summary: 'Create Meteor publications. Lightweight. Simple.',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/leaonline/publication-factory.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
})

Package.onUse(function (api) {
  api.versionsFrom('1.6')
  api.use('ecmascript', 'server')
  api.use('mongo', 'server')
  api.use('check', 'server')
  api.mainModule('publication-factory.js', 'server')
})

Package.onTest(function (api) {
  Npm.depends({
    chai: '4.2.0',
    'simpl-schema': '1.6.2'
  })

  api.use('ecmascript')
  api.use('mongo')
  api.use('random')
  api.use('meteortesting:mocha')
  api.use('johanbrook:publication-collector')
  api.use('leaonline:publication-factory')
  api.mainModule('publication-factory-tests.js')
})
