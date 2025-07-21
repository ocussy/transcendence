
import { getStats, getPerformanceData } from '../controllers/stats.js';

const StatsSchema = {
    type: 'object',
    properties: {
        totalGames: { type: 'integer' },
        totalWins: { type: 'integer' },
        winRate: { type: 'number' },
        currentStreak: { type: 'integer' },
        ranking: { type: 'integer', nullable: true }
    }
};

const PerformanceSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            date: { type: 'string' },
            winRate: { type: 'number' },
            gamesPlayed: { type: 'integer' }
        }
    }
};

const getStatsOptions = {
    schema: {
        response: {
            200: StatsSchema,
            500: { type: 'object', properties: { error: { type: 'string' } } }
        }
    },
    handler: getStats
};

const getPerformanceOptions = {
    schema: {
        response: {
            200: PerformanceSchema,
            500: { type: 'object', properties: { error: { type: 'string' } } }
        }
    },
    handler: getPerformanceData
};

export default async function statsRoutes(fastify, options) {
    fastify.get('/stats', getStatsOptions);
    fastify.get('/stats/performance', getPerformanceOptions);
}