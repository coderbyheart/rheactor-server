'use strict'

const Promise = require('bluebird')
const AccessDeniedError = require('rheactor-value-objects/errors/access-denied')
const CreateUserCommand = require('../../command/user/create')
const EmailValue = require('rheactor-value-objects/email')
const ValidationFailedError = require('rheactor-value-objects/errors/validation-failed')
const Joi = require('joi')
const _merge = require('lodash/merge')
const Pagination = require('../../util/pagination')
const sendPaginatedListResponse = require('../pagination').sendPaginatedListResponse
const URIValue = require('rheactor-value-objects/uri')
const User = require('rheactor-web-app/js/model/user')

const verifySuperUser = (req, userRepo) => userRepo.getById(req.user)
  .then(admin => {
    if (!admin.superUser) throw new AccessDeniedError(req.url, 'SuperUser privileges required.')
    return admin
  })

/**
 * @param {express.app} app
 * @param {nconf} config
 * @param {BackendEmitter} emitter
 * @param {UserRepository} userRepo
 * @param tokenAuth
 * @param {JSONLD} jsonld
 * @param {function} sendHttpProblem
 * @param {function} transformer
 */
module.exports = (app, config, emitter, userRepo, tokenAuth, jsonld, sendHttpProblem, transformer) => {
  /**
   * Returns the user account of the authenticated user
   */
  app.get('/api/user/:id', tokenAuth, (req, res) => Promise
    .try(() => {
      if (req.params.id !== req.user) {
        throw new AccessDeniedError(req.url, 'This is not you.')
      }
      return userRepo.getById(req.user)
    })
    .then(user => res.send(transformer(user)))
    .catch(sendHttpProblem.bind(null, res))
  )

  /**
   * Admins can create activated users, their password is set to 12345678
   */
  app.post('/api/user', tokenAuth, (req, res) => Promise
    .try(() => {
      const schema = Joi.object().keys({
        email: Joi.string().email().required(),
        firstname: Joi.string().trim().required(),
        lastname: Joi.string().trim().required()
      })
      let v = Joi.validate(req.body, schema)
      if (v.error) {
        throw new ValidationFailedError('Validation failed', req.body, v.error)
      }
      return verifySuperUser(req, userRepo)
        .then(superUser => emitter.emit(new CreateUserCommand(new EmailValue(v.value.email), v.value.firstname, v.value.lastname, '$2a$04$9J9g5cfQKyf1bMCQZg7oGua.CjHe5lfOQs4jW5fwGN/Gm5zTxPqh2', true)))
    })
    .then(() => res.status(201).send())
    .catch(sendHttpProblem.bind(null, res))
  )

  /**
   * Admins can list all users
   */
  app.post('/api/search/user', tokenAuth, (req, res) => Promise
    .try(() => {
      const schema = Joi.object().keys({
        offset: Joi.number().min(0)
      })
      const query = _merge(
        {},
        req.body,
        req.query
      )
      const v = Joi.validate(query, schema)
      if (v.error) {
        throw new ValidationFailedError('Validation failed', query, v.error)
      }
      return verifySuperUser(req, userRepo).then(() => query)
        .then(query => userRepo.listAll(new Pagination(query.offset)))
        .then(paginatedResult => sendPaginatedListResponse(new URIValue(config.get('api_host')), req, res, User.$context, jsonld, user => transformer(user), paginatedResult))
        .then(() => res.status(201).send())
    })
    .catch(sendHttpProblem.bind(null, res))
  )
}
