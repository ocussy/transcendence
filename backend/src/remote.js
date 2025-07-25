import {db} from "./db.js";
import { app } from "./server.js";

let waitingPlayer = null;
let gameRooms = new Map(); // Stockage des rooms de jeu actives

// Fonction pour nettoyer les utilisateurs connectés au démarrage
export async function clearConnectedUsers(app) {
  try {
    await app.redis.del('connectedUsers');
  } catch (err) {
    console.error('❌ Erreur lors du nettoyage des ConnectedUsers:', err);
  }
}

export async function logConnectedUsers(app) {
  const userIds = await app.redis.hkeys('connectedUsers');
  console.log(`👥 Utilisateurs connectés : ${userIds.length}`);

  const numericUserIds = userIds.map(id => parseInt(id, 10));

  db.prepare("UPDATE users SET online = 0").run();

  if (numericUserIds.length > 0) {
    const placeholders = numericUserIds.map(() => "?").join(", ");
    db.prepare(`UPDATE users SET online = 1 WHERE id IN (${placeholders})`).run(...numericUserIds);
  }

  let logins = [];
  if (numericUserIds.length > 0) {
    const placeholders = numericUserIds.map(() => "?").join(", ");
    const rows = db.prepare(`SELECT login FROM users WHERE id IN (${placeholders})`).all(...numericUserIds);
    logins = rows.map(row => row.login);
  }

  console.log("Logins des utilisateurs connectés :", logins);

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
                connection.socket.send(JSON.stringify({ type: "waiting", message: "En attente d’un autre joueur…" }));
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

export function setupRemoteGame(app) {
    app.get("/ws/remote/game", { websocket: true }, async (connection, req) => {
        try {
            const decoded = await authenticateSocket(req, connection);
            if (!decoded) return;
    
            const userId = decoded.id;
            const roomId = req.query.roomId;

            if (!roomId) {
                connection.socket.send(JSON.stringify({ type: "error", message: "Room ID manquant" }));
                connection.socket.close();
                return;
            }

            // Récupérer ou créer la room
            if (!gameRooms.has(roomId)) {
                gameRooms.set(roomId, {
                    players: new Map(),
                    gameState: {
                        // État initial du jeu - voir avec Adem
                        ball: { x: 0, y: 0, velocityX: 0, velocityY: 0 },
                        paddle1: { y: 0 },
                        paddle2: { y: 0 },
                        score: { player1: 0, player2: 0 }
                    },
                    createdAt: Date.now()
                });
            }

            const room = gameRooms.get(roomId);
            room.players.set(userId, { connection, userId });

            console.log(`Utilisateur ${userId} rejoint la room ${roomId}`);

            // Envoyer l'état initial du jeu
            connection.socket.send(JSON.stringify({
                type: "game_init",
                roomId,
                gameState: room.gameState,
                playerId: userId
            }));

            // Écouter les messages du client (mouvements, etc.)
            connection.socket.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    
                    // Diffuser le message à tous les joueurs de la room
                    room.players.forEach((player, playerId) => {
                        if (playerId !== userId && player.connection.socket.readyState === 1) {
                            player.connection.socket.send(JSON.stringify({
                                ...data,
                                fromPlayer: userId
                            }));
                        }
                    });
                } catch (err) {
                    console.error("Erreur parsing message:", err);
                }
            });
    
            connection.socket.on('close', () => {
                console.log(`Déconnexion de l'utilisateur ${userId} (REMOTE GAME)`);
                
                // Supprimer le joueur de la room
                if (room.players.has(userId)) {
                    room.players.delete(userId);
                    
                    // Notifier les autres joueurs lier avec supprimer
                    room.players.forEach((player) => {
                        if (player.connection.socket.readyState === 1) {
                            player.connection.socket.send(JSON.stringify({
                                // deconnecter la socket dans le front
                                type: "player_disconnected",
                                playerId: userId
                            }));
                        }
                    });
                    
                    // Supprimer la room si plus de joueurs
                    if (room.players.size === 0) {
                        gameRooms.delete(roomId);
                        console.log(`Room ${roomId} supprimée`);
                    }
                }
            });
        } catch (err) {
            console.error("Token invalide:", err);
            connection.socket.close();
        }
    });
}

// Fonctions utilitaires pour votre partenaire
export function getRoomById(roomId) {
    return gameRooms.get(roomId);
}

export function updateGameState(roomId, newState) {
    const room = gameRooms.get(roomId);
    if (room) {
        room.gameState = { ...room.gameState, ...newState };
        return true;
    }
    return false;
}

export function broadcastToRoom(roomId, message) {
    const room = gameRooms.get(roomId);
    if (room) {
        room.players.forEach((player) => {
            if (player.connection.socket.readyState === 1) {
                player.connection.socket.send(JSON.stringify(message));
            }
        });
    }
}

export function getRoomStats() {
    return {
        totalRooms: gameRooms.size,
        rooms: Array.from(gameRooms.entries()).map(([id, room]) => ({
            id,
            playerCount: room.players.size,
            createdAt: room.createdAt
        }))
    };
}