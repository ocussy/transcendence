import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'db_volume', 'db.sqlite')

const db = new Database(dbPath)

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        language TEXT DEFAULT 'fr',
        avatarUrl TEXT DEFAULT 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=coco',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        auth_provider TEXT DEFAULT 'local',
        secure_auth BOOLEAN DEFAULT FALSE,
        otp_code INTEGER DEFAULT NULL,
        otp_expires_at TIMESTAMP DEFAULT NULL,
        nb_trys INTEGER DEFAULT 0,
        friends TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1 TEXT NOT NULL,
        player2 TEXT NOT NULL,
        winner TEXT,
        score1 INTEGER DEFAULT 0,
        score2 INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tournamentId INTEGER DEFAULT NULL,
        duration INTEGER DEFAULT 0,
        mode TEXT DEFAULT 'normal'
    );

    CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        organizer TEXT NOT NULL,
        maxPlayers INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        start_at TIMESTAMP
    );

`);


export default db;