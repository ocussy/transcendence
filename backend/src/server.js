import fastify from "fastify";
import path from "path";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "url";
import db from "./db.js";
import userRoutes from "./routes/user.js";
import matchRoutes from "./routes/matches.js";
import formbody from "@fastify/formbody";
import cors from "@fastify/cors";
import authRoutes from "./routes/auth.js";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import cookie from "@fastify/cookie";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = fastify();

await app.register(cors, {
  origin: true,
});

app.register(jwt, {
  secret: process.env.JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false, // Set to true if you want to sign the cookie
  },
});

await app.register(cookie, {
  hook: "onRequest", // This will run on every request
});

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

const start = async () => {
  try {
    await app.listen({ port: 8000, host: "0.0.0.0" });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
