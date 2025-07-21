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
import websocket from "@fastify/websocket";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = fastify();

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

export const connectedUsers = new Map();

app.get("/ws", { websocket: true}, async (connection, req) => {
  const cookies = req.headers.cookie;
  console.log("Cookies reçues:", cookies);
  const token = cookies ?.split("token=")[1]?.split(";")[0];

  try {
    console.log("Connexion WebSocket établie");
    const decoded = app.jwt.verify(token);
    const userId = decoded.id;

    connectedUsers.set(userId, {
      socket: connection.socket,
      username: decoded.login,
    });

    console.log("Utilisateur connecté :", userId);

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
