import db from '../db.js'

// Handler pour l'authentification
export function signUp(req, reply) {
    const { login, password, email } = req.body;

    try {
        const stmt = db.prepare('INSERT INTO users (login, password, email) VALUES (?, ?, ?)');
        stmt.run(login, password, email);
        reply.code(201).send({ login });
    }
    catch {
        reply.status(500).send({ error: 'User already exists or database error' });
    }
}