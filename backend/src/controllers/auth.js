import db from '../db.js'
import validator from 'validator';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


export async function loginExist(login) {
  const stmt = db.prepare(`
    SELECT 1 FROM users
    WHERE login = ?
    LIMIT 1
  `);
  const user = stmt.get(login); // SQLite get() est synchrone, pas besoin de await ici
  return !!user;
}

export function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

export async function emailExist(email) {
  const stmt = db.prepare(`
    SELECT 1 FROM users
    WHERE email = ?
    LIMIT 1
  `);
  const user = stmt.get(email); // get() = sync
  return !!user;
}

// Handler pour l'inscription
export async function signUp(req, reply) {
  let { login, password, email } = req.body;

  if (!login || !password || !email) {
    return reply.status(400).send({ error: 'Login, password and email are required' });
  }

  login = login.trim();
  email = email.trim();

  if (await loginExist(login) || await emailExist(email)) {
    return reply.status(400).send({ error: 'User with this login or email already exists' });
  }

  if (login.length > 20 || login.length < 2) {
    return reply.status(400).send({ error: 'Login must be between 2 and 20 characters long' });
  }

  if (!validator.isEmail(email)) {
    return reply.status(400).send({ error: 'Invalid email format' });
  }

  if (!isStrongPassword(password)) {
    return reply.status(400).send({
      error: "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    });
  }

  // 🛡️ À FAIRE : hacher le mot de passe avec bcrypt

  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;
  try {
    const stmt = db.prepare('INSERT INTO users (login, password, email, avatarUrl) VALUES (?, ?, ?, ?)');
    stmt.run(login, password, email, avatarUrl);
    const token = await reply.jwtSign({ login, email, avatarUrl });

    reply
      .setCookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 60 * 60, // 1 heure
      })
      .code(201)
      .send({ token });

  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export async function signUpGoogle(req, reply) {
  const token = req.body.token || req.body.idtoken;
  console.log('Google sign-up token:', token);
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

    if (await emailExist(email)) {
      return reply.status(400).send({ error: 'User with this email already exists' });
    }

    const login = name.replace(/\s+/g, '').toLowerCase();
    if (await loginExist(login)) {
      return reply.status(400).send({ error: 'User with this login already exists' });
    }
    console.log('Google sign-up for:', login, email);
    const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;

    const stmt = db.prepare('INSERT INTO users (login, email, avatarUrl, auth_provider) VALUES (?, ?, ?, ?)');
    stmt.run(login, email, avatarUrl, 'google');

    const tokenJWT = await reply.jwtSign({ login, email, avatarUrl });
    reply
      .setCookie('token', tokenJWT, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      })
      .code(201)
      .send({ message: 'User created successfully'});

  } catch (err) {
    console.error('Google sign-up error:', err);
    reply.status(401).send({ error: 'Invalid Google token' });
  }
}

async function send2FACode(email, code) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your 2FA Code',
    text: `Your 2FA code is: ${code}. It is valid for 5 minutes.`,
  });
}


export async function signIn(req, reply) {
  let { givenLogin, password } = req.body;

  try {
    if (!givenLogin || !password) {
      return reply.status(400).send({ error: 'Login and password are required' });
    }

    givenLogin = givenLogin.trim();

    const stmt = db.prepare(`
      SELECT * FROM users
      WHERE login = ?
      LIMIT 1
    `);
    const user = stmt.get(givenLogin);
    //Si deja connecté, on ne peut pas se reconnecter
    

    if (!user) {
      return reply.status(401).send({ error: 'Invalid login or password' });
    }
    // 🛡️ À FAIRE : remplacer par bcrypt.compare(password, user.password)
    if (password !== user.password) {
      return reply.status(401).send({ error: 'Invalid password' });
    }
 
    if (user.secure_auth === true) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      db.prepare(`UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?`)
        .run(code, Date.now() + 5 * 60 * 1000, user.id);
      await send2FACode(user.email, code);
      return reply.status(200).send({
        message: '2FA code sent to your email. Please verify to complete sign-in.',
        requires2FA: true,
        user: {
          login: user.login,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }
      });
    }

    const token = await reply.jwtSign({
      login: user.login,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });

  reply
    .setCookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })
    .code(200)
    .send({ token });
  }

  catch (err) {
    console.error('Sign-in error:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

export async function signOut(req, reply) {
  try {

    reply
      .clearCookie('token', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      })
      .code(200)
      .send({ message: 'Successfully signed out' });
  }

  catch (err) {
    console.error('Sign-out error:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}


export async function verify2FA(req, reply) {
  const { login, otp } = req.body;
  try {
    const user = db.prepare(`SELECT * FROM users WHERE login = ?`).get(login);
    if (!user) {
      return reply.status(400).send({ error: 'User not found' });
    }
    if (!otp) {
      return reply.status(400).send({ error: 'OTP is required' });
    }
    if (user.otp_code !== otp || Date.now() > user.otp_expires_at) {
      return reply.status(400).send({ error: 'Invalid OTP' });
    }
    db.prepare(`UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = ?`)
      .run(user.id);
    const token = await reply.jwtSign({
      login: user.login,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
    reply
      .setCookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      })
      .code(200)
      .send({ token, message: '2FA verification successful' });
  }
  catch (err) {
    console.error('2FA verification error:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}