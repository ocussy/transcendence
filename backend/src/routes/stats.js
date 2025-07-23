import {
  getStats,
  getMatchHistory,
  getPerformanceData,
} from "../controllers/stats.js";

export default async function statsRoutes(fastify, options) {
  fastify.get("/stats", {
    preHandler: [fastify.authenticate],
    handler: getStats,
  });

  fastify.get("/match-history", {
    preHandler: [fastify.authenticate],
    handler: getMatchHistory,
  });

  fastify.get("/stats/performance", {
    preHandler: [fastify.authenticate],
    handler: getPerformanceData,
  });
}
