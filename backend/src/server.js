import fastify from "fastify";
import path from "path";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.js";
import matchRoutes from "./routes/matches.js";
import formbody from "@fastify/formbody";
import cors from "@fastify/cors";
import authRoutes from "./routes/auth.js";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import FastifyRedis from "@fastify/redis";
import db from "../utils/db.js"
import { seedDatabase } from '../utils/seed.js';
import { setupConnexionSocket, setupRemoteSocket, setupRemoteGame, clearConnectedUsers} from "./remote.js";
import statsRoutes from "./routes/stats.js";
import tournamentRoutes from "./routes/tournament.js";
import fs from "fs";
import { verifyUser } from "./controllers/users.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const key = fs.readFileSync(path.join(__dirname, "../certs/server.key"));
const cert = fs.readFileSync(path.join(__dirname, "../certs/server.cert"));

export const app = fastify({
  // https: {
  //   key,
  //   cert,
  // },
});

seedDatabase(db);

console.log("Database seeded successfully");

await app.register(websocket);

await app.register(cors, {
  origin: true,
  credentials: true,
});


app.register(jwt, {
  secret: process.env.JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false,
  },
});

await app.register(cookie, {
  hook: "onRequest",
});

await app.register(FastifyRedis, {
  host: process.env.REDIS_HOST || "redis",
  port:6379,
});

// Nettoyer les utilisateurs connectés au démarrage du serveur
await clearConnectedUsers(app);

app.register(fastifyStatic, {
  root: path.join(__dirname, "../frontend"),
  prefix: "/",
});

app.register(formbody);
app.register(userRoutes);
app.register(matchRoutes);
app.register(authRoutes);
app.register(statsRoutes);
app.register(tournamentRoutes);

// pour SPA sinon les routes pas trouve
const spaRoutes = [
  "/",
  "/game",
  "/auth",
  "/game/tournament",
  "/game/dashboard",
  "/game/profile",
];

spaRoutes.forEach((route) => {
  app.get(route, async (request, reply) => {
    return reply.sendFile("index.html");
  });
});

setupConnexionSocket(app);
setupRemoteSocket(app);
setupRemoteGame(app);

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

app.addHook("preHandler", async (req, reply) => {
  try {
      req.lang = 'en';
    }
  catch (err) {
    console.error("JWT verification failed:", err);
    req.lang = 'en';
  }
});



const start = async () => {
  try {
    await app.listen({ port: 8000, host: "0.0.0.0" });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
