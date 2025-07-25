import { createTournament, getTournamentById, updateTournament } from "../controllers/tournament.js";
import { verifyUser } from '../controllers/users.js';

const createTournamentOptions = {
    preHandler: verifyUser,
    schema: {
        body: {
            type: "object",
            required: ["name", "max_players"],
            properties: {
                name: { type: "string" },
                max_players: { type: "integer" },
                players: { type: "array"},
            }
        },
        response: {
            201: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    player_1: { type: "string" },
                    player_2: { type: "string" }
                },
            },
        },
    },
    handler : createTournament,
}

const updateTournamentOptions = {
    schema: {
        params: {
            type: "object",
            properties: {
                winner: { type: "string" },
            },
        },
        response: {
            200: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    player_1: { type: "string" },
                    player_2: { type: "string" }
                },
            },
        },
    },
    handler: updateTournament,  
}

const getTournamentByIdOptions = {
    schema: {
        params: {
            type: "object",
            properties: {
                id: { type: "integer" },
            },
        },
        response: {
            200: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    maxPlayers: { type: "integer" },
                    created_at: { type: "string", format: "date-time" },
                    participants: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" }
                            }
                        }
                    }
                },
            },
        },
    },
    handler: getTournamentById,
}

export default async function tournamentRoutes(fastify, options) {
    fastify.post("/tournament", createTournamentOptions);
    fastify.get("/tournament/:id", getTournamentByIdOptions);
    fastify.put("/tournament/:id", updateTournamentOptions);
}