import {db} from "./db.js";
import { app } from "./server.js";

let waitingPlayer = null;

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

async function authenticateSocket(req, connection) {
  const cookies = req.headers.cookie;
  const token = cookies ?.split("token=")[1]?.split(";")[0];

  try {
    return app.jwt.verify(token);
  }
  catch (err)
  {
    console.error("Token invalide:", err);
    connection.socket.close();
    return null;
  }
}

export function setupConnexionSocket(app) {
    app.get("/ws", { websocket: true}, async (connection, req) => {
        const decoded = await authenticateSocket(req, connection);
        if (!decoded)
          return;
    
        const userId = decoded.id;
        console.log(`Connexion de l'utilisateur ${userId}`);
    
        app.redis.hset('connectedUsers', userId, JSON.stringify({ connectedAt: Date.now() }))
    
        connection.socket.on('close', () => {
          app.redis.hdel('connectedUsers', userId)
          console.log(`Déconnexion de l'utilisateur ${userId}`);
        });
    
        logConnectedUsers(app);
    });
}

export function setupRemoteSocket(app) {
    app.get("/ws/remote", { websocket: true }, async (connection, req) => {
        try {
            const decoded = await authenticateSocket(req, connection);
            if (!decoded) return;

            const userId = decoded.id;
            console.log(`Connexion de l'utilisateur ${userId} (REMOTE)`);

            // if no waiting player, set this one as waiting
            if (!waitingPlayer) {
                waitingPlayer = { connection, userId};
                connction.socket.send(JSON.stringify({ type: "waiting", message: "En attente d’un autre joueur…" }));
            }
            // if waiting player exists, create a room
            else {
                const roomId = `room-${Date.now()}`;
                const player1 = waitingPlayer;
                const player2 = { connection, userId };

                [player1, player2].forEach(player => {
                    player.connection.socket.send(JSON.stringify({
                        type: "match_found",
                        roomId,
                        opponentId: player === player1 ? player2.userId : player1.userId
                    }));
                });
                // Reset waiting player
                waitingPlayer = null;
            }

            connection.socket.on('close', () => {
                if (waitingPlayer && waitingPlayer.userId === userId) {
                    console.log(`❌ [REMOTE] User ${userId} left the queue`);
                    waitingPlayer = null; // Reset waiting player if this one disconnects
                }
            });
    }
    catch (err) {
        console.error("Token invalide:", err);
        connection.socket.close();
        }
    });
}