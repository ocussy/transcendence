import db from '../db.js'
import validator from 'validator';
import { auth, OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import { send } from 'process';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let transporter = nodemailer.createTransport({
  service: 'gmail',
  secure: true,
  auth: {
    user: 'oceane.cussy@gmail.com',
    pass: 'eqdt sjkk czkx omxj'
  }
});


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
    return reply
      .status(400)
      .send({ error: "Login, password and email are required" });
  }

  login = login.trim();
  email = email.trim();

  if ((await loginExist(login)) || (await emailExist(email))) {
    return reply
      .status(400)
      .send({ error: "User with this login or email already exists" });
  }

  if (login.length > 20 || login.length < 2) {
    return reply
      .status(400)
      .send({ error: "Login must be between 2 and 20 characters long" });
  }

  if (!validator.isEmail(email)) {
    return reply.status(400).send({ error: "Invalid email format" });
  }

  if (!isStrongPassword(password)) {
    return reply.status(400).send({
      error:
        "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    });
  }

  // 🛡️ À FAIRE : hacher le mot de passe avec bcrypt

  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;
  try {
    const stmt = db.prepare(
      "INSERT INTO users (login, password, email, avatarUrl) VALUES (?, ?, ?, ?)",
    );
    stmt.run(login, password, email, avatarUrl);
    const token = await reply.jwtSign({ login, email, avatarUrl, auth_provider: 'local' });

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
  console.log("Google sign-up token:", token);
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email || !name) {
      return reply.status(400).send({ error: "Invalid Google token" });
    }

    if (await emailExist(email)) {
      console.log("Google sign-up for existing user:", email);
      return signIn(req, reply);
    }

    const login = name.replace(/\s+/g, "").toLowerCase();
    if (await loginExist(login)) {
      return reply
        .status(400)
        .send({ error: "User with this login already exists" });
    }
    console.log("Google sign-up for:", login, email);
    const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;

    const stmt = db.prepare(
      "INSERT INTO users (login, email, avatarUrl, auth_provider) VALUES (?, ?, ?, ?)",
    );
    stmt.run(login, email, avatarUrl, "google");

    const tokenJWT = await reply.jwtSign({ login, email, avatarUrl, auth_provider: 'google' });
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
    console.error("Google sign-up error:", err);
    reply.status(401).send({ error: "Invalid Google token" });
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
  let { auth_provider } = req.body;

  try {
    if (auth_provider && auth_provider === 'google') {
      const token = req.body.token || req.body.idtoken;
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

      const payload = ticket.getPayload();
      const { email, name } = payload;

      const login = name.replace(/\s+/g, "").toLowerCase();
      if (!email || !name) {
        return reply.status(400).send({ error: "Invalid Google token" });
      }

      const stmt = db.prepare(`
        SELECT * FROM users
        WHERE login = ? AND email = ?
        LIMIT 1
      `);
      const user = stmt.get(login, email);
      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }
      const tokenJWT = await reply.jwtSign({ login : user.login, email, avatarUrl : user.avatarUrl, auth_provider: 'google' });
      reply
        .setCookie('token', tokenJWT, {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          path: '/',
          maxAge: 60 * 60, // 1 hour
        })
        .code(201)
        .send({ login : user.login });
    }
    else {
      let { givenLogin, password } = req.body;
      if (!givenLogin) {
        return reply
          .status(400)
          .send({ error: "Login is required" });
      }

      givenLogin = givenLogin.trim();
      const stmt = db.prepare(`
        SELECT * FROM users
        WHERE login = ? 
        LIMIT 1
      `);
      const user = stmt.get(givenLogin);

      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }
      user.secure_auth = true;
      if (user.secure_auth == true) {
        const result = await sendOtpVerificationEmail(user, reply);
        if (result) {
          const token = await reply.jwtSign({
          login: user.login,
          });
          return reply.code(400).send({ message: 'OTP sent to email', token });
        } else {
          return reply.code(500).send({ error: 'Failed to send OTP verification email' });
        }
      }
      // 🛡️ À FAIRE : remplacer par bcrypt.compare(password, user.password)
      if (password !== user.password) {
        return reply.status(401).send({ error: "Invalid password" });
      }
      const token = await reply.jwtSign({
        login: user.login,
        email: user.email,
        avatarUrl: user.avatarUrl,
        auth_provider: user.auth_provider
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
        .send({ login: user.login });
    }
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

export async function sendOtpVerificationEmail(user, reply) {
  try { 
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const mailOptions = {
      from: `"Mon App" <test@openjavascript.info>`,
      to: 'oceane.cussy@gmail.com',
      subject: 'Your 2FA Code',
      text: `Your 2FA code is: ${code}. It is valid for 5 minutes.`,
      html: `<p>Your 2FA code is: <strong>${code}</strong>. It is valid for 5 minutes.</p>`,
    };

    const saltRounds = 10;
    const hashedCode = await bcrypt.hash(code, saltRounds);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now (in ms)
    const stmt = db.prepare(`
      UPDATE users
      SET otp_code = ?, otp_expires_at = ?
      WHERE login = ?
    `);
    stmt.run(hashedCode, expiresAt, user.login);

    // Envoi de l'email après avoir stocké le code
    await transporter.sendMail(mailOptions);
    return true;
  }
  catch (err) {
    console.error('Error sending OTP verification email:', err);
    return false;
  }
}


export async function verify2FA(req, reply) {
  const { token, otp } = req.body;
  if (!token) {
    return reply.status(400).send({ error: 'Token is required' });
  }
  let login;
  try {
    const decoded = await reply.jwtVerify(token);
    login = decoded.login;
		const stmt = db.prepare(`
			SELECT otp_code, otp_expires_at, login
			FROM users
			WHERE login = ?
			LIMIT 1
		`);
		const user = stmt.get(login);
		if (!user || !user.otp_code || !user.otp_expires_at) {
			return reply.status(400).send({ error: 'OTP not found or expired' });
		}
  	const isValid = await bcrypt.compare(otp, otp_code);
		if (!isValid || Date.now() > user.otp_expires_at) {
  		return reply.status(400).send({ error: 'Invalid OTP' });
		}

    db.prepare(`UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE login = ?`)
      .run(login);
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