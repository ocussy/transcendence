import db from "../db.js";

// Calculer les stats d'un utilisateur
function calculateUserStats(login) {
  const matches = db
    .prepare(
      `
    SELECT winner FROM matches
    WHERE player1 = ? OR player2 = ?
  `,
    )
    .all(login, login);

  if (matches.length === 0) {
    return {
      totalMatches: 0,
      wins: 0,
      winrate: 0,
    };
  }

  const wins = matches.filter((match) => match.winner === login).length;
  const winrate = Math.round((wins / matches.length) * 100);

  return {
    totalMatches: matches.length,
    wins,
    winrate,
  };
}

// GET /friends - Récupérer la liste des amis avec leurs stats
export async function getFriendsWithStats(req, reply) {
  try {
    const currentLogin = req.user.login;

    // Utiliser la même logique que dans votre getUser()
    const friends = db
      .prepare(
        `
      SELECT u.login, u.avatarUrl, u.created_at
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = (SELECT id FROM users WHERE login = ?)
      ORDER BY u.login
    `,
      )
      .all(currentLogin);

    // Enrichir chaque ami avec ses stats
    const friendsWithStats = friends.map((friend) => {
      const stats = calculateUserStats(friend.login);
      return {
        login: friend.login,
        avatarUrl: friend.avatarUrl,
        friendSince: friend.created_at,
        totalMatches: stats.totalMatches,
        winrate: stats.winrate,
      };
    });

    reply.send({
      friends: friendsWithStats,
    });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}
