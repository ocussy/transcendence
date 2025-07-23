import db from "../db.js";
import { loginExist, isStrongPassword, emailExist } from "./auth.js";
import bcrypt from "bcrypt";
import { getMatchesByUser } from "./matches.js";
import { logConnectedUsers} from "../remote.js";
import {app} from "../server.js";

export async function verifyUser(req, reply) {
  logConnectedUsers(app);
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
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
    throw new Error("No fields to update");
  }

  const sql = `UPDATE ? SET ${fields.map(() => "? = ?").join(", ")} WHERE ${whereClause}`;
  values.unshift(
    table,
    ...Object.keys(updates).filter((key) => updates[key] !== undefined),
  );
  return { sql, values: [...values, ...whereArgs] };
}

// Handler pour GET /user
export async function getUser(req, reply) {
  try {
    const id = req.user.id;
    const user = db.prepare('SELECT login, email, avatarUrl, alias, auth_provider, language, secure_auth, games_played, games_won FROM users WHERE id = ?').get(id);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }
    reply.send(user);
  }
  catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export async function getFriendsUser(req, reply) {
  try {
    const id = req.user.id;
    const friends = db.prepare(`
      SELECT u.login, u.avatarUrl, u.games_played, u.games_won
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
    `).all(id);
    return reply.status(200).send(friends);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

async function verifData(req, reply) {
  const { login, email, avatarUrl, language, password, secure_auth, friend } = req.body;

  // verifier si j'ai besoin de cette verif
  if (!email && !avatarUrl && !language && !password && secure_auth === undefined && !login && !friend) {
    return reply.status(400).send({
      error: "No fields to update",
    });
  }
  if (login && (await loginExist(login))) {
    return reply.status(400).send({
      error: "Login already exists",
    });
  }

  if (email && (await emailExist(email))) {
    return reply.status(400).send({
      error: "Email already exists",
    });
  }

  if (password && !isStrongPassword(password)) {
    return reply.status(400).send({
      error:
        "Password must be at least 8 characters long, contain uppercase, lowercase, numbers, and special characters",
    });
  }

  if (friend) {
    const stmt = db.prepare(`SELECT login FROM users WHERE login = ?`);
    const friendExist = stmt.get(friend);
    if (!friendExist) {
      return reply.status(400).send({
        error: "Friend does not exist",
      });
    }
  }

  return null;
}

async function addFriends(userId, friendLogin) {
  const getId = db.prepare(`SELECT id FROM users WHERE login = ?`);
  const friend = getId.get(friendLogin);
  if (!friend.id) return null;
  const stmtCheck = db.prepare(
    `SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?`,
  );
  const already = stmtCheck.get(userId, friend.id);
  if (already === undefined) {
    const stmtAdd = db.prepare(
      `INSERT INTO friends (user_id, friend_id) VALUES (?, ?)`,
    );
    stmtAdd.run(userId, friend.id); //pareil
  } else {
    const stmtDelete = db.prepare(
      `DELETE FROM friends WHERE user_id = ? AND friend_id = ?`,
    );
    stmtDelete.run(userId, friend.id); //pareil
  }
  return friend.id;
}

export async function updateUser(req, reply) {
  const error = await verifData(req, reply);
  const id = req.user.id;
  if (error) return error;

  const { login, email, avatarUrl, language, password, secure_auth, friend } =
    req.body;

  const updates = [];
  const values = [];

  if (login) {
    updates.push("login = ?");
    values.push(login);
  }
  if (email) {
    updates.push("email = ?");
    values.push(email);
  }
  if (avatarUrl) {
    updates.push("avatarUrl = ?");
    values.push(avatarUrl);
  }
  if (language) {
    updates.push("language = ?");
    values.push(language);
  }
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updates.push("password = ?");
    values.push(hashedPassword);
  }
  if (typeof secure_auth === "boolean") {
    updates.push("secure_auth = ?");
    values.push(secure_auth ? 1 : 0);
  }
  if (friend) {
    const user = db.prepare("SELECT login FROM users WHERE id = ?").get(id);
    console.log("Login :", user.login);
    if (user.login == friend)
        return reply.status(400).send({error : "You can't add yourself as a friend ..."});
    const friendAdd = await addFriends(id, friend);
    if (!friendAdd) {
      return reply.status(400).send({ error: "Friend does not exist" });
    }
    return reply.status(200).send({ message: "User updated successfully" });
  }

  values.push(id);

  const stmt = db.prepare(`
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = ?
  `);
  stmt.run(...values);
  return reply.status(200).send({ message: "User updated successfully" });
}

export async function getStatUser(req, reply) {
  try {
    userId = req.user.id;
    if (!userId) {
      return reply.status(404).send({ error: "User not found" });
    }
    const matches = getMatchesByUser(req, reply, userId);
    return reply.status(200).send(matches);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}

export function debugDb(req, reply) {
  try {
    const rows = db.prepare("SELECT * FROM users").all();
    reply.send(rows);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
}
