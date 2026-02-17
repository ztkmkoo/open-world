const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(process.cwd(), "data", "open-world.db");
const SEED_SQL_PATH = path.join(process.cwd(), "docs", "seed_v1.sql");

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function ensureUserColumns(db) {
  const columns = db.prepare("PRAGMA table_info(users)").all().map((row) => row.name);

  if (!columns.includes("last_tick_at")) {
    db.exec("ALTER TABLE users ADD COLUMN last_tick_at TEXT");
  }
  if (!columns.includes("training_mode")) {
    db.exec("ALTER TABLE users ADD COLUMN training_mode TEXT NOT NULL DEFAULT 'NONE'");
  }
  if (!columns.includes("training_target_id")) {
    db.exec("ALTER TABLE users ADD COLUMN training_target_id TEXT");
  }
}

function ensureAppTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      surname TEXT NOT NULL,
      given_name TEXT NOT NULL,
      nickname_unique TEXT NOT NULL UNIQUE,
      gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
      sect_id TEXT REFERENCES sects(sect_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      auth_state TEXT NOT NULL CHECK (auth_state IN ('AUTHENTICATED', 'REGISTERED')),
      user_id TEXT REFERENCES users(user_id),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS training_progress (
      user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      inner_art_star INTEGER NOT NULL DEFAULT 0,
      inner_art_points INTEGER NOT NULL DEFAULT 0,
      skill_star INTEGER NOT NULL DEFAULT 0,
      skill_points INTEGER NOT NULL DEFAULT 0,
      meridian_star INTEGER NOT NULL DEFAULT 0,
      meridian_points INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tick_request_log (
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      client_request_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, client_request_id)
    );
  `);

  ensureUserColumns(db);
}

function applySeedSql(db) {
  if (!fs.existsSync(SEED_SQL_PATH)) {
    throw new Error(`Seed SQL not found: ${SEED_SQL_PATH}`);
  }
  const seedSql = fs.readFileSync(SEED_SQL_PATH, "utf8");
  db.exec(seedSql);
}

function initDatabase({ applySeed = false } = {}) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = openDb();

  if (applySeed) {
    applySeedSql(db);
  }

  ensureAppTables(db);
  return db;
}

module.exports = {
  initDatabase,
  DB_PATH,
};
