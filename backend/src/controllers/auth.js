import db from '../db.js'
import validator from 'validator';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export function loginExist(login) {
  const stmt = db.prepare(`
    SELECT 1 FROM users
    WHERE login = ?
    LIMIT 1
    `);
    const user = stmt.get(login);
    return !!user;
}

function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}


export function emailExist(email) {
  const stmt = db.prepare(`
    SELECT 1 FROM users
    WHERE email = ?
    LIMIT 1
    `);
    const user = stmt.get(email);
    return !!user;
}

// Handler pour l'authentification
export function signUp(req, reply) {
  const { login, password, email} = req.body

  if (!login || !password || !email) {
    return reply.status(400).send({ error: 'Login, password and email are required' });
  }
  login = login.trim();
  email = email.trim();
  if (userExists(login, email)) {
    return reply.status(400).send({ error: 'User with this login or email already exists' });
  }
  if (login.length > 20 || login.length < 2) {
    return reply.status(400).send({ error: 'Login must be between 2 and 20 characters long' });
  }
  if (validator.isEmail(email) === false) {
    return reply.status(400).send({ error: 'Invalid email format' });
  }
  if (!isStrongPassword(password)) {
  return reply.status(400).send({error: "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character." });
  }
  //ajouter fonction pour hacher le mot de passe
  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;
  try { 
    const stmt = db.prepare('INSERT INTO users (login, password, email, avatarUrl) VALUES (?, ?, ?, ?)')
    stmt.run(login, password, email, avatarUrl);
    reply.code(201).send({login, password})
  }
  catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export async function signUpGoogle(req, reply) {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;

        if (!email || !name) {
            return reply.status(400).send({ error: 'Invalid Google token' });
        }
        if (emailExist(email)) {
            return reply.status(400).send({ error: 'User with this email already exists' });
        }
        const login = name.replace(/\s+/g, '').toLowerCase();
        if (loginExist(login)) {
            return reply.status(400).send({ error: 'User with this login already exists' });
        }

        const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;

        const stmt = db.prepare('INSERT INTO users (login, email, avatarUrl, auth_provider) VALUES (?, ?, ?, ?)');
        stmt.run(login, email, avatarUrl, 'google');

        reply.code(201).send({ login, email });
    }
    catch (err) {
        console.error('Google sign-up error:', err);
        reply.status(401).send({ error: 'Invalig google token' });
    }
}