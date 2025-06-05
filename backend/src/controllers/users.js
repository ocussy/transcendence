import db from '../db.js'

// Handler pour GET /user
export function getUser(req, reply) {
  try { 
    const rows = db.prepare('SELECT login FROM users').all();
    reply.send(rows);
  }
  catch (err) {
    reply.status(500).send({ error: err.message });
  }
}


export function debugDb(req, reply) {
  try {
    const rows = db.prepare('SELECT * FROM users').all();
    reply.send(rows);
  }
  catch (err) {
    reply.status(500).send({ error: err.message });
  }
}
