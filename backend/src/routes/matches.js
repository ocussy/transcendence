import {
  getMatches,
  postMatch,
  updateMatch,
  getMatchById,
  getMatchesByUser,
} from "../controllers/matches.js";

import { verifyUser } from "../controllers/users.js";

const Match = {
  type: "object",
  properties: {
    id: { type: "integer" },
    player1: { type: "string" },
    player2: { type: "string" },
    score1: { type: "integer", nullable: true },
    score2: { type: "integer", nullable: true },
    winner: { type: "string", nullable: true },
    //JAI BESOIN DE CA AUSSI
    // mode: { type: 'string' },
    // duration: { type: 'integer' },
    // created_at: { type: 'string' },
    // tournamentId: { type: 'integer', nullable: true }
  },
};

const getMatchByIdOptions = {
  schema: {
    response: {
      200: Match,
      404: { type: "object", properties: { error: { type: "string" } } },
    },
  },
  handler: getMatchById,
};

const getMatchByUserOptions = {
  schema: {
    response: {
      200: {
        type: "array",
        items: Match,
      },
      500: { type: "object", properties: { error: { type: "string" } } },
    },
  },
  handler: getMatchesByUser,
};

const getMatchesOptions = {
  schema: {
    response: {
      200: {
        type: "array",
        items: Match,
      },
    },
  },
  handler: getMatches,
};

const postMatchOptions = {
  preHandler: verifyUser,
  schema: {
    body: {
      type: "object",
      required: ["mode"],
      properties: {
        mode: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          id: { type: "integer" },
          player_id: { type: "integer" },
        },
      },
    },
  },
  handler: postMatch,
};

const updateMatchOptions = {
  schema: {
    params: {
      type: "object",
      properties: {
        id: { type: "integer" },
      },
    },
    body: {
      type: "object",
      required: ["player_id", "score1", "score2"],
      properties: {
        player_id: { type: "integer" },
        score1: { type: "integer" },
        score2: { type: "integer" },
        winner: { type: "string", nullable: true },
      },
    },
    response: {
      200: Match,
      404: { type: "object", properties: { error: { type: "string" } } },
    },
  },
  handler: updateMatch,
};

export default async function matchRoutes(fastify, options) {
  fastify.get("/matches", getMatchesOptions);
  fastify.get("/match/:id", getMatchByIdOptions);
  fastify.post("/match", postMatchOptions);
  fastify.put("/match/:id", updateMatchOptions);
  fastify.get("/matches/user/:id", getMatchByUserOptions);
}
