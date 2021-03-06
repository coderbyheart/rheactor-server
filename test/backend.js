import Promise from 'bluebird'
import {EntryAlreadyExistsError, EntryNotFoundError} from '@resourcefulhumans/rheactor-errors'
import config from './config'
import emitter from '../src/services/emitter'
import {RedisConnection} from '../src/services/redis-connection'
import {UserRepository} from '../src/repository/user-repository'
import {rheactorCommandHandler} from '../src/config/command-handler'
import {rheactorEventHandler} from '../src/config/event-handler'
import keys from '../src/services/keys'

Promise.longStackTraces()

const webConfig = {
  baseHref: '/',
  mimeType: 'application/vnd.resourceful-humans.rheactor.v2+json'
}

// Event listening
emitter.on('error', (err) => {
  if (EntryNotFoundError.is(err) || EntryAlreadyExistsError.is(err)) {
    return
  }
  throw err
})

// Persistence
const redis = new RedisConnection()
redis.connect().then((client) => {
  client.on('error', function (err) {
    console.error(err)
  })
})
const repositories = {
  user: new UserRepository(redis.client)
}

keys(config, redis.client)

// Create a mock TemplateMailer
const templateMailer = {
  send: (cfg, template, to, name, data) => {
    return Promise.resolve()
  }
}

// Event handling
rheactorCommandHandler(repositories, emitter, config, webConfig, templateMailer)
rheactorEventHandler(repositories, emitter, config)

// Password strength
config.set('bcrypt_rounds', 1)

export default {
  repositories,
  config,
  webConfig,
  emitter,
  redis
}
