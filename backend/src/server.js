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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

export const app = fastify();

await seedDatabase(db);

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

// fastify.after(async () => {
//   const pong = await fastify.redis.ping();
//   console.log('Redis ping:', pong); // doit afficher 'PONG'
// });


app.register(fastifyStatic, {
  root: path.join(__dirname, "../frontend"),
  prefix: "/",
});

app.register(formbody);
app.register(userRoutes);
app.register(matchRoutes);
app.register(authRoutes);

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

// export async function logConnectedUsers(app) {
//   const users = await app.redis.hkeys('connectedUsers');
//   console.log(`👥 Utilisateurs connectés : ${users.length}`);
// }

export async function logConnectedUsers(app) {
  const userIds = await app.redis.hkeys('connectedUsers');
  console.log('🔍 userIds =', userIds);
  console.log(`👥 Utilisateurs connectés : ${userIds.length}`);

  if (userIds.length === 0) return { count: 0, logins: [] };

  const placeholders = userIds.map(() => '?').join(', ');
  const query = `SELECT id, login FROM users WHERE id IN (${placeholders})`;

  const stmt = db.prepare(query);
  const rows = stmt.all(...userIds);

  const logins = rows.map((user) => user.login);
  console.log(`🔐 Logins connectés : ${logins.join(', ')}`);

  return { count: userIds.length, logins };
}


app.get("/ws", { websocket: true}, async (connection, req) => {
  const cookies = req.headers.cookie;
  const token = cookies ?.split("token=")[1]?.split(";")[0];

  try {
    const decoded = app.jwt.verify(token);
    const userId = decoded.id;
    console.log(`WebSocket ouverte pour l'utilisateur ${userId}`);

    app.redis.hset('connectedUsers', userId, JSON.stringify({ connectedAt: Date.now() }))

    connection.socket.on('close', () => {
      app.redis.hdel('connectedUsers', userId)
    });
    logConnectedUsers(app);
  } catch (err) {
    console.error("Token invalide:", err);
    connection.socket.close(); // Ferme la socket si le token est mauvais
  }
});

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
