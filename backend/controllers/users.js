import db from '../src/db.js'

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

// Handler pour POST /user
export function postUser(req, reply) {
  const { login, password } = req.body

  try { 
    const stmt = db.prepare('INSERT INTO users (login, password, email) VALUES (?, ?, ?)')
    stmt.run(login, password, `${login}@example.com`);
    reply.code(201).send({login})
  }
  catch (err) {
    reply.status(500).send({ error: err.message });
  }
};

export function debugDb(req, reply) {
  try {
    const rows = db.prepare('SELECT * FROM users').all();
    reply.send(rows);
  }
  catch (err) {
    reply.status(500).send({ error: err.message });
  }
}
