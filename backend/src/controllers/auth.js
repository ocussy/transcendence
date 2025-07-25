import db from "../db.js";
import validator from "validator";
import { auth, OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {app } from "../server.js"

dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function getConnectedUsers(app)
{
  const userIds = await app.redis.hkeys('connectedUsers');
  return userIds;
}

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

  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;
  try {
    const stmt = db.prepare(
      "INSERT INTO users (login, password, email, avatarUrl, alias) VALUES (?, ?, ?, ?, ?)",
    );
    const hashedPassword = await bcrypt.hash(password, 10);
    stmt.run(login, hashedPassword, email, avatarUrl, login);
    reply.status(201).send({ message: "User created successfully" });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export async function signUpGoogle(req, reply) {
  const token = req.body.token || req.body.idtoken;
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
      return signIn(req, reply);
    }

    const login = name.replace(/\s+/g, "").toLowerCase();
    if (await loginExist(login)) {
      return reply
        .status(400)
        .send({ error: "User with this login already exists" });
    }
    const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(login)}`;

    const stmt = db.prepare(
      "INSERT INTO users (login, email, avatarUrl, auth_provider, alias) VALUES (?, ?, ?, ?, ?)",
    );
    stmt.run(login, email, avatarUrl, "google", login);
    const user = db.prepare("SELECT * FROM users WHERE login = ?").get(login);
    const tokenJWT = await reply.jwtSign({ id : user.id });
    reply
      .setCookie("token", tokenJWT, {
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      })
      .code(201)
      .send({ login });
  } catch (err) {
    console.error("Google sign-up error:", err);
    reply.status(401).send({ error: "Invalid Google token" });
  }
}

export async function signIn(req, reply) {
  try {
    if (req.body.token || req.body.idtoken) {
      const token = req.body.token || req.body.idtoken;
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email, name } = payload;

      if (!email || !name) {
        return reply.status(400).send({ error: "Invalid Google token" });
      }

      const login = name.replace(/\s+/g, "").toLowerCase();

      const stmt = db.prepare(`
        SELECT * FROM users
        WHERE login = ? AND email = ?
        LIMIT 1
      `);
      const user = stmt.get(login, email);
      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }
      if (user.auth_provider !== "google") {
        return reply.status(401).send({ error: "Please login with your password" });
      }
      const connectedUsersIds = await getConnectedUsers(app);
      if (connectedUsersIds.includes(user.id.toString())) {
        return reply.status(400).send({error : "User already connected somewhere else"});
      }
      const tokenJWT = await reply.jwtSign({
        id: user.id,
      });
      reply
        .setCookie("token", tokenJWT, {
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          path: "/",
          maxAge: 60 * 60, // 1 hour
        })
        .code(201)
        .send({ login: user.login });
    } else {
      let { givenLogin, password } = req.body;
      if (!givenLogin) {
        return reply.status(400).send({ error: "Login is required" });
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
      if (user.password) {
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return reply.status(401).send({ error: "Invalid password" });
        } // compare les version hash
      }
      else if (user.auth_provider == "google") {
        return reply.status(401).send({ error: "Google account identified, please login with Google" });
      }
      else
        return reply.status(500).send({ error: "Internal server error" });

        const connectedUsersIds = await getConnectedUsers(app);
        if (connectedUsersIds.includes(user.id.toString())) {
          return reply.status(400).send({error : "User already connected somewhere else"});
        }
        
      if (user.secure_auth == true) {
        const result = await sendOtpVerificationEmail(user, reply);
        if (result) {
          const token = await reply.jwtSign({
            login: user.login,
          });
          return reply.code(400).send({ message: "OTP sent to email", token });
        } else {
          return reply
            .code(500)
            .send({ error: "Failed to send OTP verification email" });
        }
      }
      const token = await reply.jwtSign({
        id: user.id,
      });
      reply
        .setCookie("token", token, {
          httpOnly: true,
          secure: false, // false for local dev, true for production
          sameSite: "Lax",
          path: "/",
          maxAge: 60 * 60, // 1 hour
        })
        .code(200)
        .send({ login: user.login });
    }
  } catch (err) {
    console.error("Sign-in error:", err);
    return reply.status(500).send({ error: "Internal server error" });
  }
}

export async function signOut(req, reply) {
  try {
    reply
      .clearCookie("token", {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      })
      .code(200)
      .send({ message: "Successfully signed out" });
  } catch (err) {
    console.error("Sign-out error:", err);
    return reply.status(500).send({ error: "Internal server error" });
  }
}

export async function sendOtpVerificationEmail(user, reply) {
  try {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const mailOptions = {
      from: `"Mon App" <test@openjavascript.info>`,
      to: user.email,
      subject: "Your 2FA Code",
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
  } catch (err) {
    console.error("Error sending OTP verification email:", err);
    return false;
  }
}

export async function verify2FA(req, reply) {
  const { otp } = req.body;
  let login;
  try {
    const decoded = await req.jwtVerify();
    login = decoded.login;
    const stmt = db.prepare(`
			SELECT otp_code, otp_expires_at, login, nb_trys
			FROM users
			WHERE login = ?
			LIMIT 1
		`);
    const user = stmt.get(login);
    if (!user || !user.otp_code || !user.otp_expires_at || user.nb_trys > 2 || Date.now() > user.otp_expires_at) {
      db.prepare(
        `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, nb_trys = 0 WHERE login = ?`,
      ).run(login);
      if (user && user.nb_trys > 2) {
        return reply
          .status(429)
          .send({ error: "Too many attempts, please try again" });
      }
      return reply.status(400).send({ error: "OTP not found or expired" });
    }

    const isValid = await bcrypt.compare(otp, user.otp_code);
    if (!isValid) {
      db.prepare(`UPDATE users SET nb_trys = nb_trys + 1 WHERE login = ?`).run(
        login,
      );
      return reply.status(400).send({ error: "Invalid OTP" });
    }

    db.prepare(
      `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, nb_trys = 0 WHERE login = ?`,
    ).run(login);
    const jwtToken = await reply.jwtSign({
      id : user.id,
    });
    reply
      .setCookie("token", jwtToken, {
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      })
      .code(200)
      .send({ jwtToken, message: "2FA verification successful" });
  } catch (err) {
    console.error("2FA verification error:", err);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
