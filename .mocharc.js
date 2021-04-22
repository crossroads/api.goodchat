

process.env['DEBUG'] = '-*,*:error'
process.env['NODE_ENV'] = 'test'

require('kankyo').inject({ verbose: true, env: 'test' })

module.exports = {
  "extension": ["ts"],
  "spec": "specs/**/*.spec.ts",
  "require": "ts-node/register",
  "file": ["specs/spec_helpers/setup.ts"]
}
