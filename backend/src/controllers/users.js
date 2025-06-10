import db from '../db.js'
import { loginExist, isStrongPassword, emailExist } from './auth.js';

export async function verifyUser(req, reply) {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
}
  
export async function buildUpdateQuery(table, updates, whereClause, whereArgs) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  const sql = `UPDATE ${table} SET ${fields.join(', ')} WHERE ${whereClause}`;
  return { sql, values: [...values, ...whereArgs] };
}


// Handler pour GET /user
export async function getUser(req, reply) {
  try {
    const login = req.user.login;
    const user = db.prepare('SELECT login, email, avatarUrl, language, password, secure_auth FROM users WHERE login = ?').get(login);
    reply.send(user);
  }
  catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

async function verifData(req, reply) {
  const { login, email, avatarUrl, language, password, secure_auth } = req.body;

  if (!email && !avatarUrl && !language && !password && !secure_auth) {
    return reply.status(400).send({
      error: 'No fields to update',
    });
  }

  if (login && await loginExist(login)) {
    return reply.status(400).send({
      error: 'Login already exists',
    });
  }

  if (email && await emailExist(email)) {
    return reply.status(400).send({
      error: 'Email already exists',
    });
  }

  if (password && !isStrongPassword(password)) {
    return reply.status(400).send({
      error:
        'Password must be at least 8 characters long, contain uppercase, lowercase, numbers, and special characters',
    });
  }

  return null;
}


export async function updateUser(req, reply) { 
  try {
    const login = req.user.login;
    const err = await verifData(req, reply);
    if (err) return; // réponse déjà envoyée
    
    const { email, avatarUrl, language, password, secure_auth } = req.body;
    // Convert boolean to integer for SQLite compatibility
    const updateData = { 
      email, 
      avatarUrl, 
      language, 
      password, 
      secure_auth: typeof secure_auth === 'boolean' ? (secure_auth ? 1 : 0) : secure_auth 
    };

    const { sql, values } = await buildUpdateQuery('users', updateData, 'login = ?', [login]);
    db.prepare(sql).run(values);
    const updatedUser = db.prepare('SELECT login, email, avatarUrl, language, secure_auth FROM users WHERE login = ?').get(login);
    const newToken = await reply.jwtSign(updatedUser);

    reply
      .setCookie('token', newToken, {
        httpOnly: true,      // ❗ Empêche JS d’y accéder → sécurité contre XSS
        secure: true,        // ❗ HTTPS obligatoire (en local tu peux désactiver temporairement)
        sameSite: 'Strict',  // Empêche l’envoi du cookie sur d'autres domaines (anti-CSRF)
        path: '/',           // Cookie envoyé pour toutes les routes du site
        maxAge: 3600         // 1h en secondes (optionnel)
      })
      .code(200)
      .send({ message: 'User updated successfully'});
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
