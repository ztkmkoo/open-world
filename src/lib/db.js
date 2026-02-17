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
  if (!columns.includes("squad_id")) {
    db.exec("ALTER TABLE users ADD COLUMN squad_id TEXT REFERENCES sect_squads(squad_id)");
  }
  if (!columns.includes("role_layer_key")) {
    db.exec("ALTER TABLE users ADD COLUMN role_layer_key TEXT NOT NULL DEFAULT 'L1_MEMBER'");
  }
}

function ensureOrgColumns(db) {
  const squadColumns = db.prepare("PRAGMA table_info(sect_squads)").all().map((row) => row.name);
  if (!squadColumns.includes("capacity_total")) {
    db.exec("ALTER TABLE sect_squads ADD COLUMN capacity_total INTEGER NOT NULL DEFAULT 10");
  }
  if (!squadColumns.includes("roster_count")) {
    db.exec("ALTER TABLE sect_squads ADD COLUMN roster_count INTEGER NOT NULL DEFAULT 0");
  }

  db.exec(`
    UPDATE sect_squads
    SET capacity_total = 10
    WHERE capacity_total IS NULL OR capacity_total <= 0
  `);
}

function ensureTrainingCatalogTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inner_arts (
      inner_art_id TEXT PRIMARY KEY,
      name_ko TEXT NOT NULL UNIQUE,
      name_hanja TEXT,
      meridian_growth_json TEXT NOT NULL,
      combat_mod_json TEXT NOT NULL,
      breakthrough_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sect_default_inner_arts (
      sect_id TEXT PRIMARY KEY REFERENCES sects(sect_id) ON DELETE CASCADE,
      inner_art_id TEXT NOT NULL REFERENCES inner_arts(inner_art_id)
    );

    CREATE TABLE IF NOT EXISTS martial_skills (
      skill_id TEXT PRIMARY KEY,
      name_ko TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS user_inner_arts (
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      inner_art_id TEXT NOT NULL REFERENCES inner_arts(inner_art_id),
      star INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, inner_art_id)
    );

    CREATE TABLE IF NOT EXISTS user_skills (
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES martial_skills(skill_id),
      star INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS user_meridian_progress (
      user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      daemac_points REAL NOT NULL DEFAULT 0,
      gihae_points REAL NOT NULL DEFAULT 0,
      immac_points REAL NOT NULL DEFAULT 0,
      dokmac_points REAL NOT NULL DEFAULT 0,
      chungmac_points REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedTrainingCatalog(db) {
  db.prepare(`
    INSERT OR IGNORE INTO inner_arts (
      inner_art_id, name_ko, name_hanja, meridian_growth_json, combat_mod_json, breakthrough_json
    ) VALUES
      (@id, @nameKo, @nameHanja, @growth, @combat, @breakthrough)
  `).run({
    id: "INNER_CHEONGUN",
    nameKo: "청운심법",
    nameHanja: "靑雲心法",
    growth: JSON.stringify({ DAEMAC: 1.0, GIHAE: 0.8, IMMAC: 0.3, DOKMAC: 0.0, CHUNGMAC: 0.0 }),
    combat: JSON.stringify({ qi_regen_mult: 1.05, stability_regen_mult: 1.1, backlash_mult: 0.9, inner_injury_mult: 0.9 }),
    breakthrough: JSON.stringify({
      start_star: 5,
      base_success: { 5: 0.2, 6: 0.12, 7: 0.08, 8: 0.05, 9: 0.03, 10: 0.0 },
      fail_penalty: { stability_delta: -2 },
    }),
  });

  db.prepare(`
    INSERT OR IGNORE INTO inner_arts (
      inner_art_id, name_ko, name_hanja, meridian_growth_json, combat_mod_json, breakthrough_json
    ) VALUES
      (@id, @nameKo, @nameHanja, @growth, @combat, @breakthrough)
  `).run({
    id: "INNER_HYEOLYEOM",
    nameKo: "혈염심공",
    nameHanja: "血炎心功",
    growth: JSON.stringify({ DOKMAC: 1.0, CHUNGMAC: 1.0, GIHAE: 0.2, IMMAC: 0.0, DAEMAC: 0.0 }),
    combat: JSON.stringify({ qi_regen_mult: 0.95, stability_regen_mult: 0.85, backlash_mult: 1.2, inner_injury_mult: 1.25 }),
    breakthrough: JSON.stringify({
      start_star: 5,
      base_success: { 5: 0.24, 6: 0.15, 7: 0.1, 8: 0.06, 9: 0.035, 10: 0.0 },
      fail_penalty: { stability_delta: -4 },
    }),
  });

  db.prepare(`
    INSERT OR IGNORE INTO inner_arts (
      inner_art_id, name_ko, name_hanja, meridian_growth_json, combat_mod_json, breakthrough_json
    ) VALUES
      (@id, @nameKo, @nameHanja, @growth, @combat, @breakthrough)
  `).run({
    id: "INNER_MUHYEONG",
    nameKo: "무형심법",
    nameHanja: "無形心法",
    growth: JSON.stringify({ IMMAC: 1.0, GIHAE: 0.8, DAEMAC: 0.3, DOKMAC: 0.0, CHUNGMAC: 0.0 }),
    combat: JSON.stringify({ qi_regen_mult: 1.12, stability_regen_mult: 1.12, backlash_mult: 1.05, inner_injury_mult: 0.95 }),
    breakthrough: JSON.stringify({
      start_star: 5,
      base_success: { 5: 0.2, 6: 0.12, 7: 0.08, 8: 0.05, 9: 0.03, 10: 0.0 },
      fail_penalty: { stability_delta: -3 },
    }),
  });

  db.exec(`
    INSERT OR IGNORE INTO sect_default_inner_arts (sect_id, inner_art_id) VALUES
      ('SECT_CHEONGUN', 'INNER_CHEONGUN'),
      ('SECT_MYEONGYO', 'INNER_HYEOLYEOM'),
      ('SECT_HEUKRINHOE', 'INNER_MUHYEONG');

    INSERT OR IGNORE INTO martial_skills (skill_id, name_ko, description) VALUES
      ('SKILL_CHEONGUN_BASIC_SWORD', '청운기본검', '청운문 기본 검식'),
      ('SKILL_MYEONGYO_BASIC_BLADE', '혈염도식', '명교 기본 도식'),
      ('SKILL_HEUKRIN_BASIC_FIST', '흑린권', '흑린회 기본 권법');
  `);
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
      squad_id TEXT REFERENCES sect_squads(squad_id),
      role_layer_key TEXT NOT NULL DEFAULT 'L1_MEMBER',
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
  ensureOrgColumns(db);
  ensureTrainingCatalogTables(db);
  seedTrainingCatalog(db);
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
