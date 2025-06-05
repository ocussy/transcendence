import { getUser, debugDb} from '../controllers/users.js'

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
  fastify.get('/debug/users', debugOptions)
}
