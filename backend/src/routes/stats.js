import {
  getStats,
  getMatchHistory,
  getPerformanceData,
} from "../controllers/stats.js";
import { verifyUser } from "../controllers/users.js";

const getStatsOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          totalGames: { type: "integer" },
          totalWins: { type: "integer" },
          winRate: { type: "number" },
          currentStreak: { type: "integer" },
          ranking: { type: ["integer", "null"] },
        },
      },
    },
  },
  handler: getStats,
};

const getMatchHistoryOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            player1: { type: "string" },
            opponent: { type: "string" },
            winner: { type: "string" },
            score1: { type: "integer" },
            score2: { type: "integer" },
            result: { type: "string"},
            mode: { type: "string" },
            formatted_date: { type: "string", format: "date-time" },
            duration: { type: "integer" },
          },
        },
      },
    },
  },
  handler: getMatchHistory,
};

// GET /stats/performance
const getPerformanceDataOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", format: "date" },
            winRate: { type: "number" },
            gamesPlayed: { type: "integer" },
          },
        },
      },
    },
  },
  handler: getPerformanceData,
};


// Register routes
export default async function statsRoutes(fastify, options) {
  fastify.get("/stats", getStatsOptions);
  fastify.get("/match-history", getMatchHistoryOptions);
  fastify.get("/stats/performance", getPerformanceDataOptions);
}
