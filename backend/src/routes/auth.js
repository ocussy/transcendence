import { signUp, signUpGoogle } from '../controllers/auth.js'

const signUpOptions = {
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
  handler: signUp,
}

const signUpGoogleOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string' },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          login: { type: 'string' },
          email : { type: 'string' },
        },
      },
    },
  },
  handler: signUpGoogle,
}

export default async function authRoutes(fastify, options) {
  fastify.post('/auth/signup', signUpOptions)
  fastify.post('/auth/signup/google', signUpGoogleOptions)
}