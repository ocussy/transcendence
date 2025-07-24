import { createTournament, getTournamentById, updateTournament } from "../controllers/tournament.js";

const createTournamentOptions = {
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

export default async function tournamentRoutes(fastify, options) {
    fastify.post("/tournament/", createTournamentOptions);
    fastify.get("/tournament/:id", getTournamentByIdOptions);
    fastify.put("/tournament/:id", updateTournamentOptions);
}