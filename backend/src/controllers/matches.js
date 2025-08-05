import db from '../../utils/db.js'
import { t } from '../../utils/i18n.js';
// Handler pour match creation

export function postMatch(req, reply) {
  const { mode, score1, score2, duration, player1, player2 } = req.body;
  const userId = req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  let winner = null;

  try {
    if (!player1 || !player2) {
      if (score1 > score2) {
        winner = user.id;
        db.prepare('UPDATE users SET games_won = games_won + 1 WHERE id = ?').run(userId);
      }
      const stmt = db.prepare('INSERT INTO matches (player1, player2, mode, score1, score2, winner, duration) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(user.public_login, "guest", mode, score1, score2, winner, duration);
      db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(userId);
      reply.code(201).send({ winner: winner ? user.id : null });
  }
  else
  {
    if (score1 > score2) {
      winner = player1;
      db.prepare('UPDATE users SET games_won = games_won + 1 WHERE login = ?').run(player1);
    }
    const stmt = db.prepare('INSERT INTO matches (player1, player2, mode, score1, score2, winner, duration) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(player1, player2, "tournament", score1, score2, winner, duration);
    db.prepare('UPDATE users SET games_played = games_played + 1 WHERE login IN (?, ?)').run(player1, player2);
    reply.code(201).send({ winner });
  }
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "failed_to_create_match") });
  }
}

export function getMatches(req, reply) {
  try {
    const rows = db.prepare('SELECT * FROM matches').all();
    reply.send(rows);
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}

export async function getMatchesByUser(req, reply, userId) {
  try {
    const user = db.prepare('SELECT login FROM users WHERE id = ?').get(userId);
    if (!user) {
      return reply.status(404).send({ error: t(req.lang, "user_not_found") });
    }

    const rows = db.prepare('SELECT * FROM matches WHERE player1 = ? OR player2 = ?').all(user.id, user.id);
    reply.send(rows);
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}

export function getMatchById(req, reply) {
  const { id } = req.params;
  
  try {
    const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    
    if (!row) {
      return reply.status(404).send({ error: t(req.lang, "match_not_found") });
    }
    reply.send(row);
  } catch (err) {
    reply.status(500).send({ error: t(req.lang, "server_error") });
  }
}