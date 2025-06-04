import { getMatches, postMatch, updateMatch, getMatchById } from '../controllers/matches.js';

const Match = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        player1: { type: 'string' },
        player2: { type: 'string' },
        score1: { type: 'integer', nullable: true },
        score2: { type: 'integer', nullable: true },
    }
}

const getMatchByIdOptions = {
    schema: {
        response: {
            200: Match,
            404: { type: 'object', properties: { error: { type: 'string' } } },
        },
    },
    handler: getMatchById,
};

const getMatchesOptions = {
    schema: {
        response: {
            200: {
                type: 'array',
                items: Match,
            },
        },
    },
    handler: getMatches,
};

const postMatchOptions = {
    schema: {
        body: {
            type: 'object',
            required: ['player1', 'player2'],
            properties: {
                player1: { type: 'string' },
                player2: { type: 'string' },
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    player1: { type: 'string' },
                    player2: { type: 'string' },
                },
            }
        },
    },
    handler: postMatch,
};

const updateMatchOptions = {
    schema: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
            },
        },
        body: {
            type: 'object',
            required: ['score1', 'score2'],
            properties: {
                score1: { type: 'integer' },
                score2: { type: 'integer' },
            },
        },
        response: {
            200: Match,
            404: { type: 'object', properties: { error: { type: 'string' } } },
        },
    },
    handler: updateMatch,
};

export default async function matchRoutes(fastify, options) {
    fastify.get('/matches', getMatchesOptions);
    fastify.get('/match/:id', getMatchByIdOptions);
    fastify.post('/match', postMatchOptions);
    fastify.put('/match/:id', updateMatchOptions);
}