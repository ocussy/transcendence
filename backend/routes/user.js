const {
    getUser,
    postUser,
} = require('../controllers/users');

const User = {
    type: 'object',
    properties: {
        login: { type: 'string' },
        password: { type: 'string' },
    },
}

const getUserOptions = {
    schema: {
        response: {
            200: {
                type: 'array',
                items: User,
            },
        },
    },
    handler: getUser,
}

const postUserOptions = {
    schema: {
        body: {
            type: 'object',
            required: ['login', 'password'],
            properties: {
                login: { type: 'string' },
                password: { type: 'string' },
            },
        },
        response: {
            201: User,
        },
    },
    handler: postUser,
}

function userRoutes(fastify, options, done) {
    fastify.get('/user', getUserOptions)
    fastify.post('/user', postUserOptions)
    done()
}

module.exports = userRoutes