import db from '../db.js'
// Handler pour match creation

export function postMatch(req, reply) {
  const { player1, player2 } = req.body;

  try {
    const stmt = db.prepare('INSERT INTO matches (player1, player2) VALUES (?, ?)');
    const info = stmt.run(player1, player2);
    reply.code(201).send({ id: info.lastInsertRowid, player1, player2 });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export function updateMatch(req, reply) {
  const { id } = req.params;
  const { score1, score2 } = req.body;

  try {
    const stmt = db.prepare('UPDATE matches SET score1 = ?, score2 = ?, winner = ? WHERE id = ?');
    const info = stmt.run(score1, score2, winner, id);
    
    if (info.changes === 0) {
      return reply.status(404).send({ error: 'Match not found' });
    }
    
    reply.send({ id, score1, score2, winner});
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

    const rows = db.prepare('SELECT * FROM matches WHERE player1 = ? OR player2 = ?').all(user.login, user.login);
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