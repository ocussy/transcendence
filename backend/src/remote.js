

import {db} from "../utils/db.js";
// Removed circular import of app; we pass app explicitly from server.js

let waitingPlayer = null;
let gameRooms = new Map();

function getTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function clearConnectedUsers(app) {
  try {
    await app.redis.del('connectedUsers');
  } catch (err) {
    console.error('❌ Erreur lors du nettoyage des ConnectedUsers:', err);
  }
}

export async function logConnectedUsers(app) {
  const userIds = await app.redis.hkeys('connectedUsers');

  const numericUserIds = userIds.map(id => parseInt(id, 10));

  db.prepare("UPDATE users SET online = 0").run();;
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

  return { count: userIds.length, logins, ids: numericUserIds };
}

async function authenticateSocket(app, req, connection) {
  try {
    const token = getTokenFromCookieHeader(req.headers.cookie);
    if (!token) throw new Error('Missing token');
    return app.jwt.verify(token);
  } catch (err) {
    console.error("Token invalide:", err);
    try { connection.socket.close(); } catch (_) {}
    return null;
  }
}

export function setupConnexionSocket(app) {
    app.get("/ws", { websocket: true}, async (connection, req) => {
        const decoded = await authenticateSocket(app, req, connection);
        if (!decoded)
          return;
    
        const userId = decoded.id;
    
        app.redis.hset('connectedUsers', userId, JSON.stringify({ connectedAt: Date.now() }))
    
        connection.socket.on('close', () => {
          app.redis.hdel('connectedUsers', userId)
        });
    
    });
}
//backend
export function setupRemoteSocket(app) {
    app.get("/ws/remote", { websocket: true }, async (connection, req) => {
        try {
            const decoded = await authenticateSocket(app, req, connection);
            if (!decoded) return;

            const userId = decoded.id;

            // if no waiting player, set this one as waiting
            if (!waitingPlayer) {
                waitingPlayer = { connection, userId};
                connection.socket.send(JSON.stringify({ type: "waiting"}));
                console.log("waitingPlayer:", waitingPlayer.userId);
            }
            // if waiting player exists, create a room
            else if (waitingPlayer.userId !== userId) {
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

export async function setupRemoteGame(app) {
    app.get("/ws/remote/game", { websocket: true }, async (connection, req) => {
        try {
            const decoded = await authenticateSocket(app, req, connection);
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
                console.log(`Création de la room ${roomId} pour l'utilisateur ${userId}`);
                gameRooms.set(roomId, {
                    players: new Map(),
                    playerInfo: new Map(),
                    leftPlayerId: null,
                    rightPlayerId: null,
                    gameState: {
                        ball: { 
                            position: { x: 0, y: 0, z: 0 },
                            velocity: { x: 0, y: 0, z: 0 }
                        },
                        paddles: {
                            left: { position: { x: -9.3, y: 0, z: 0 } },
                            right: { position: { x: 9.3, y: 0, z: 0 } }
                        },
                        score: { left: 0, right: 0 },
                        gameStatus: {
                            started: false,
                            gameOver: false,
                            waitingAfterGoal: false,
                            winner: null
                        },
                        gameTimer: {
                            startTime: null,
                            duration: 0
                        },
                        config: {
                            scoreLimit: 3,
                            playWidth: 19,
                            ballSpeed: 0.15,
                            maxSpeed: 0.6
                        }
                    },
                    createdAt: Date.now()
                });
            }

            const room = gameRooms.get(roomId);
            console.log(`Connexion de l'utilisateur ${userId} à la room ${roomId}`);
            const currentUser = db.prepare('SELECT id, public_login, alias FROM users WHERE id = ?').get(userId);
            if (!currentUser) {
                connection.socket.send(JSON.stringify({ type: "error", message: "Utilisateur non trouvé" }));
                connection.socket.close();
                return;
            }

            // Ajouter le joueur à la room
            room.players.set(userId, { connection, userId });
            room.playerInfo.set(userId, {
                id: currentUser.id,
                login: currentUser.public_login,
                name: currentUser.alias || currentUser.public_login
            });
            console.log("Left player id before", room.leftPlayerId);
            // Assigner côté gauche ou droit
            if (!room.leftPlayerId) {
                room.leftPlayerId = userId;
            } else if (!room.rightPlayerId && userId !== room.leftPlayerId) {
                room.rightPlayerId = userId;
            }
            console.log("Joueur de gauche:", room.leftPlayerId, "Joueur de droite:", room.rightPlayerId);
            const isLeftPlayer = room.leftPlayerId === userId;
            console.log("Player left ?", isLeftPlayer ? "left" : "right");
            const playerSide = isLeftPlayer ? 'left' : 'right';
            const playerIndex = isLeftPlayer ? 0 : 1;

            // ✅ ATTENDRE QUE LES DEUX JOUEURS SOIENT CONNECTÉS
            if (room.players.size === 1) {
                // Premier joueur - juste envoyer un message d'attente
                connection.socket.send(JSON.stringify({
                    type: "waiting_for_opponent",
                    message: "En attente du deuxième joueur...",
                    playerSide,
                    playerIndex,
                    playerId: userId
                }));
                // console.log(`🎮 Premier joueur connecté (${userId}), en attente du second...`);
            } 
            else if (room.players.size === 2) {
                setTimeout(() => {
                    trySendGameInit(roomId);
                  }, 1000); // 1 seconde de délai
            }

            // Écouter les messages entrants
            connection.socket.on('message', (message) => {
                try {
                    const data = JSON.parse(message);

                    switch(data.type) {
                        case 'game_started':
                            break;

                        case 'game_ended':
                            // Marquer la fin de partie et informer les deux joueurs
                            if (room.gameState && room.gameState.gameStatus) {
                                room.gameState.gameStatus.gameOver = true;
                            }
                            broadcastToRoom(roomId, { type: 'game_ended' });
                            break;

                            default:
                                // Transmettre à tous les joueurs, y compris l'émetteur
                                room.players.forEach((player) => {
                                    if (player.connection.socket.readyState === 1) {
                                        player.connection.socket.send(JSON.stringify({
                                            ...data,
                                            fromPlayer: userId
                                        }));
                                    }
                                });
                            break;
                    }
                } catch (err) {
                    console.error("Erreur parsing message:", err);
                }
            });

            // Déconnexion
            connection.socket.on('close', () => {
                if (room.players.has(userId)) {
                    room.players.delete(userId);
                    room.playerInfo.delete(userId);

                    if (room.leftPlayerId === userId) room.leftPlayerId = null;
                    if (room.rightPlayerId === userId) room.rightPlayerId = null;

                    // Ne pas envoyer 'player_disconnected' si la partie est déjà terminée proprement
                    const isGameOver = !!(room.gameState && room.gameState.gameStatus && room.gameState.gameStatus.gameOver);
                    if (!isGameOver) {
                        room.players.forEach((player) => {
                            if (player.connection.socket.readyState === 1) {
                                player.connection.socket.send(JSON.stringify({
                                    type: "player_disconnected",
                                    playerId: userId
                                }));
                            }
                        });
                    }

                    if (room.players.size === 0) {
                        gameRooms.delete(roomId);
                    }
                }
            });

        } catch (err) {
            console.error("Erreur dans setupRemoteGame:", err);
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

// Safely send game_init when both players are known and registered
function trySendGameInit(roomId) {
  const room = gameRooms.get(roomId);
  if (!room) return;
  if (room.players.size < 2) return;

  // Ensure left/right assignments exist
  if (!room.leftPlayerId || !room.rightPlayerId) {
    const playerIds = Array.from(room.players.keys());
    if (!room.leftPlayerId) room.leftPlayerId = playerIds[0] ?? null;
    if (!room.rightPlayerId) room.rightPlayerId = playerIds.find((id) => id !== room.leftPlayerId) ?? null;
  }

  const player1Info = room.leftPlayerId ? room.playerInfo.get(room.leftPlayerId) : null;
  const player2Info = room.rightPlayerId ? room.playerInfo.get(room.rightPlayerId) : null;

  if (!player1Info || !player2Info) {
    console.warn(`Impossible d'envoyer game_init pour ${roomId}: infos joueurs manquantes`, {
      leftPlayerId: room.leftPlayerId,
      rightPlayerId: room.rightPlayerId,
    });
    // Try again shortly in case playerInfo arrives a tick later
    setTimeout(() => trySendGameInit(roomId), 25);
    return;
  }

  const gameInitMessageForBoth = {
    type: "game_init",
    roomId,
    gameState: room.gameState,
    player1Login: player1Info.login,
    player2Login: player2Info.login,
    player1Name: player1Info.name,
    player2Name: player2Info.name,
    waitingForOpponent: false,
    roomPlayerCount: 2,
  };

  room.players.forEach((player, playerId) => {
    console.log("playerId:", playerId);
    const isLeftPlayer = playerId === room.leftPlayerId;
    const currentUserInfo = room.playerInfo.get(playerId);
    const personalizedMessage = {
      ...gameInitMessageForBoth,
      playerId,
      playerSide: isLeftPlayer ? "left" : "right",
      playerIndex: isLeftPlayer ? 0 : 1,
      isLeftPlayer: isLeftPlayer, // Utiliser la même logique que dans setupRemoteGame
      currentUserLogin: currentUserInfo?.login,
      currentUserName: currentUserInfo?.name,
    };
    if (player.connection.socket.readyState === 1) {
    console.log("JE SEND LE GAME INIT");
      player.connection.socket.send(JSON.stringify(personalizedMessage));
    }
  });

  console.log(`🎮 Deux joueurs connectés! Game init envoyé aux deux.`);
}
