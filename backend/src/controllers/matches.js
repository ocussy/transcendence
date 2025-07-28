import db from '../db.js'
// Handler pour match creation

export function postMatch(req, reply) {
  const { mode } = req.body;
  const { id: userId } = req.user;

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    const stmt = db.prepare('INSERT INTO matches (player1, player2, mode) VALUES (?, ?, ?)');
      stmt.run(user.login, "guest", mode);
    db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(userId);
    reply.code(201).send({ id: info.lastInsertRowid, player1: user.login });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export function updateMatch(req, reply) {
  const { id } = req.params;
  const {score1, score2 } = req.body;
  const { player_id } = req.user;

  try {
    let winner = null;
    if (score1 > score2) {
      winner = player_id;
      db.prepare('UPDATE users SET games_won = games_won + 1 WHERE id = ?').run(player_id);
    }
    const games_wons = db.prepare('SELECT games_won FROM users WHERE id = ?').get(winner);
    console.log(`Games won by ${winner}: ${games_wons ? games_wons.games_won : 0}`);
    db.prepare('UPDATE matches SET score1 = ?, score2 = ?, winner = ? WHERE id = ?').run(score1, score2, winner, id);
    reply.send({ id, score1, score2, winner });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export function getMatches(req, reply) {
  try {
    const rows = db.prepare('SELECT * FROM matches').all();
    reply.send(rows);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export async function getMatchesByUser(req, reply, userId) {
  try {
    const user = db.prepare('SELECT login FROM users WHERE id = ?').get(userId);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const rows = db.prepare('SELECT * FROM matches WHERE player1 = ? OR player2 = ?').all(user.id, user.id);
    reply.send(rows);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export function getMatchById(req, reply) {
  const { id } = req.params;
  
  try {
    const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    
    if (!row) {
      return reply.status(404).send({ error: 'Match not found' });
    }
    reply.send(row);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}