import bodyParser from 'body-parser'
import cors from 'cors'
import {replace as replaceWithFastURLParser} from 'fast-url-parser'
import {HttpProblemFromException, sendHttpProblem} from '../../api/send-http-problem'

/**
 * @param {nconf} config
 * @param {ojbect} webConfig
 * @param {express.app} app
 * @returns {{sendHttpProblem: <function>}}
 */
export default (config, webConfig, app) => {
  replaceWithFastURLParser()

  app.enable('trust proxy')
  app.use(bodyParser.json({type: webConfig.mimeType}))

  app.use(cors({
    origin: config.get('web_host'),
    exposedHeaders: [
      'cache-control',
      'connection',
      'content-length',
      'content-type',
      'location',
      'x-made-by',
      'x-github',
      'x-rheactor-app'
    ]
  }))

  // Disable caching by default
  app.set('etag', false)
  app.use((req, res, next) => {
    res.header('Cache-Control', 'max-age=0, private')
    next()
  })

  // Set content type
  const CONTENT_TYPE = webConfig.mimeType + '; charset=utf-8'
  app.use((req, res, next) => {
    if (/\/api/.test(req.url)) {
      res.header('Content-Type', CONTENT_TYPE)
    }
    next()
  })

  app.use(function (err, req, res, next) {
    if (res.headersSent) {
      return next(err)
    }
    if (err.name === 'AuthenticationError') {
      return res
        .status(401)
        .send(HttpProblemFromException(err, 401))
    }
    console.error(err.name)
    console.error(req.method + ' ' + req.url)
    console.error(err.message)
    console.error(err.stack)
    return res.status(500)
      .send(HttpProblemFromException(err, 500))
  })

  return {
    sendHttpProblem: sendHttpProblem.bind(null, config.get('environment'))
  }
}