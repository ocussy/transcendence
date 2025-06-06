import { signUp, signUpGoogle, signIn } from '../controllers/auth.js'

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
          token: { type: 'string' },
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
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  handler: signUpGoogle,
}

const signInOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['givenLogin', 'password'],
      properties: {
        givenLogin: { type: 'string' },
        password: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          login: { type: 'string' },
          email : { type: 'string' },
        },
      },
    },
  },
  handler: signIn,
}

export default async function authRoutes(fastify, options) {
  fastify.post('/auth/signup', signUpOptions)
  fastify.post('/auth/signup/google', signUpGoogleOptions)
  fastify.post('/auth/login', signInOptions)
}