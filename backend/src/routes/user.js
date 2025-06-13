import { type } from 'os'
import { getUser, debugDb, verifyUser, updateUser, getStatUser } from '../controllers/users.js'

const User = {
  type: 'object',
  properties: {
    login: { type: 'string' },
    email : { type: 'string' },
    password: { type: 'string' },
  },
}

const getUserOptions = {
  preHandler: verifyUser,
  schema: {
  response: {
    200: {
      type: 'object',
        properties: {
          login: { type: 'string' },
          email: { type: 'string' },
          avatarUrl: { type: 'string' },
          language: { type: 'string' },
          password: { type: 'string' },
          secure_auth: { type: 'boolean' },
          friends: { type: 'array', items: { type: 'string' } },
          stats : { type: 'array', items: { type: 'object', properties: {
            player1: { type: 'string' },
            player2: { type: 'string' },
            score: { type: 'number' },
            winner: { type: 'number' },
            duration: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
          } } }
        },
      },
    },
  },
  handler: getUser,
}

const updateUserOptions = {
  preHandler: verifyUser,
  schema: {
    body: {
      type: 'object',
      properties: {
        login: { type: 'string' },
        email: { type: 'string'},
        avatarUrl: { type: 'string' },
        language: { type: 'string' },
        password: { type: 'string', minLength: 8 },
        secure_auth: { type: 'boolean' },
        friends: {type: 'string'},
      },
      additionalProperties: false, // refuse les clés inconnues
      minProperties: 1, // exige au moins une propriété à modifier
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  },
  handler: updateUser,
}

const getStatUserOptions = {
  preHandler: verifyUser,
  schema: {
    params: {
      type: 'object',
      properties: {
        login: { type: 'string' },
      },
      required: ['login'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          login: { type: 'string' },
          email: { type: 'string' },
          avatarUrl: { type: 'string' },
          match: { type: 'array'},
        }
      }
    }
  },
  handler: getStatUser,
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
  fastify.get('/user:login', getStatUserOptions)
  fastify.put('/user', updateUserOptions)
  fastify.get('/debug/users', debugOptions)
}
