import { getUser, postUser, debugDb} from '../controllers/users.js'

const User = {
  type: 'object',
  properties: {
    login: { type: 'string' },
    email : { type: 'string' },
    password: { type: 'string' },
  },
}

const getUserOptions = {
  schema: {
    response: {
      200: {
        type: 'array',
        items: { type: 'object', properties: { login: { type: 'string' } } },
      },
    },
  },
  handler: getUser,
}

const postUserOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['login', 'password', 'email'],
      properties: {
        login: { type: 'string' },
        password: { type: 'string' },
        email: { type: 'string'},
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          login: { type: 'string' },
        },
      },
    },
  },
  handler: postUser,
}

const debugOptions = {
  schema: {
    response: {
      200: {
        type: 'array',
        items: User,
      },
    },
  },
  handler: debugDb,
}


export default async function userRoutes(fastify, options) {
  fastify.get('/user', getUserOptions)
  fastify.post('/user', postUserOptions)
  fastify.get('/debug/users', debugOptions)
}
