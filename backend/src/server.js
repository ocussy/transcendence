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
import db from "./db.js"
import { seedDatabase } from './seed.js';
import { setupConnexionSocket, setupRemoteSocket } from "./remote.js";
import statsRoutes from "./routes/stats.js";

// import websocket from "@fastify/websocket";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

export const app = fastify();

// seedDatabase(db);


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

app.register(fastifyStatic, {
  root: path.join(__dirname, "../frontend"),
  prefix: "/",
});

app.register(formbody);
app.register(userRoutes);
app.register(matchRoutes);
app.register(authRoutes);
app.register(statsRoutes);

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

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
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
