import { getUser, debugDb, verifyUser, updateUser} from '../controllers/users.js'

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
        },
        required: ['login', 'email', 'avatarUrl', 'language'],
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
  fastify.put('/user', updateUserOptions)
  fastify.get('/debug/users', debugOptions)
}
