import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'db_volume', 'db.sqlite')

const db = new Database(dbPath)

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        login TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1 TEXT NOT NULL,
        player2 TEXT NOT NULL,
        score1 INTEGER DEFAULT 0,
        score2 INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);

export default db;