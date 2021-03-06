import backend from './backend'
import {rheactorExpressConfig} from '../src/config/express/rheactor-express-config'
import express from 'express'

const config = backend.config
const webConfig = backend.webConfig
const redis = backend.redis.client
const repositories = backend.repositories
const emitter = backend.emitter

// HTTP API
const app = express()
app.set('env', 'test') // Suppress errors logged from express.js
rheactorExpressConfig(app, config, webConfig, repositories, emitter)
const port = config.get('port')
const host = config.get('host')
app.listen(port, host)
console.log('Web:', config.get('web_host') + webConfig.baseHref)
console.log('API:', config.get('api_host'))

export default {
  app,
  repositories,
  redis,
  config,
  webConfig,
  emitter
}
