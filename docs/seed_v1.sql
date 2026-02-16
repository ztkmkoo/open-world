-- seed_v1.sql
-- MVP-friendly SQLite schema + seed data for factions, sects, and organization layers.
-- Safe to run multiple times (uses INSERT OR IGNORE where appropriate).
-- NOTE: If you already have tables, adjust column names/types accordingly.

PRAGMA foreign_keys = ON;

-- =========================
-- 1) Core tables (MVP)
-- =========================

CREATE TABLE IF NOT EXISTS factions (
  faction_id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sects (
  sect_id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL REFERENCES factions(faction_id),
  name TEXT NOT NULL,
  capacity_total INTEGER NOT NULL DEFAULT 144,
  roster_count INTEGER NOT NULL DEFAULT 0,
  prestige INTEGER NOT NULL DEFAULT 1000
);

-- =========================
-- 2) Organization layer tables (keep layer keys stable)
-- =========================

CREATE TABLE IF NOT EXISTS hierarchy_layers (
  layer_key TEXT PRIMARY KEY,     -- e.g., L9_LEADER
  level INTEGER NOT NULL,         -- 9..1
  slots INTEGER NOT NULL,         -- slot count for this layer in a sect
  meaning TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sect_role_titles (
  sect_id TEXT NOT NULL REFERENCES sects(sect_id),
  layer_key TEXT NOT NULL REFERENCES hierarchy_layers(layer_key),
  title TEXT NOT NULL,
  PRIMARY KEY (sect_id, layer_key)
);

CREATE TABLE IF NOT EXISTS sect_departments (
  dept_id TEXT PRIMARY KEY,
  sect_id TEXT NOT NULL REFERENCES sects(sect_id),
  dept_key TEXT NOT NULL,               -- OPS / TRAIN / EXTERNAL (stable keys)
  display_name TEXT NOT NULL,
  elder_slot_index INTEGER NOT NULL     -- 1..3
);

CREATE TABLE IF NOT EXISTS sect_halls (
  hall_id TEXT PRIMARY KEY,
  sect_id TEXT NOT NULL REFERENCES sects(sect_id),
  dept_id TEXT NOT NULL REFERENCES sect_departments(dept_id),
  display_name TEXT NOT NULL,
  hall_slot_index INTEGER NOT NULL      -- 1..6
);

CREATE TABLE IF NOT EXISTS sect_squads (
  squad_id TEXT PRIMARY KEY,
  sect_id TEXT NOT NULL REFERENCES sects(sect_id),
  hall_id TEXT NOT NULL REFERENCES sect_halls(hall_id),
  display_name TEXT NOT NULL,
  squad_slot_index INTEGER NOT NULL     -- 1..12
);

-- Optional: enforce uniqueness per sect for indices (helps data correctness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dept_slot_unique
  ON sect_departments(sect_id, elder_slot_index);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hall_slot_unique
  ON sect_halls(sect_id, hall_slot_index);

CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_slot_unique
  ON sect_squads(sect_id, squad_slot_index);

-- =========================
-- 3) Seed: factions
-- =========================

INSERT OR IGNORE INTO factions(faction_id, name) VALUES
  ('FACTION_JUNGPHA', '정파'),
  ('FACTION_MAGYO',   '마교'),
  ('FACTION_SAPHA',   '사파');

-- =========================
-- 4) Seed: sects (capacity_total always 144)
-- =========================

INSERT OR IGNORE INTO sects(sect_id, faction_id, name, capacity_total, roster_count, prestige) VALUES
  ('SECT_CHEONGUN',   'FACTION_JUNGPHA', '청운문', 144, 0, 1000),
  ('SECT_MYEONGYO',   'FACTION_MAGYO',   '명교',   144, 0, 1000),
  ('SECT_HEUKRINHOE', 'FACTION_SAPHA',   '흑린회', 144, 0, 1000);

-- =========================
-- 5) Seed: hierarchy layers (MUST KEEP these keys across all sects)
-- =========================

INSERT OR IGNORE INTO hierarchy_layers(layer_key, level, slots, meaning) VALUES
  ('L9_LEADER',       9,  1,  'Top leader'),
  ('L8_DEPUTY',       8,  1,  'Deputy leader'),
  ('L7_GRAND',        7,  1,  'Grand elder/guardian/inspector'),
  ('L6_ELDER',        6,  3,  'Elder tier (3), each owns 1 department'),
  ('L5_HALL_LEADER',  5,  6,  'Hall leaders (6), 2 halls per elder'),
  ('L4_SQUAD_LEADER', 4,  12, 'Squad leaders (12), 2 squads per hall'),
  ('L3_MEMBER',       3,  40, 'Members tier A'),
  ('L2_MEMBER',       2,  40, 'Members tier B'),
  ('L1_MEMBER',       1,  40, 'Members tier C');

-- =========================
-- 6) Seed: role titles per sect (layer keys stable, titles vary)
-- =========================

-- 청운문
INSERT OR IGNORE INTO sect_role_titles(sect_id, layer_key, title) VALUES
  ('SECT_CHEONGUN','L9_LEADER','장문인'),
  ('SECT_CHEONGUN','L8_DEPUTY','부문주'),
  ('SECT_CHEONGUN','L7_GRAND','대장로'),
  ('SECT_CHEONGUN','L6_ELDER','장로'),
  ('SECT_CHEONGUN','L5_HALL_LEADER','당주'),
  ('SECT_CHEONGUN','L4_SQUAD_LEADER','대주'),
  ('SECT_CHEONGUN','L3_MEMBER','대원(상)'),
  ('SECT_CHEONGUN','L2_MEMBER','대원(중)'),
  ('SECT_CHEONGUN','L1_MEMBER','대원(하)');

-- 명교
INSERT OR IGNORE INTO sect_role_titles(sect_id, layer_key, title) VALUES
  ('SECT_MYEONGYO','L9_LEADER','교주'),
  ('SECT_MYEONGYO','L8_DEPUTY','부교주'),
  ('SECT_MYEONGYO','L7_GRAND','대호법'),
  ('SECT_MYEONGYO','L6_ELDER','호법'),
  ('SECT_MYEONGYO','L5_HALL_LEADER','당주'),
  ('SECT_MYEONGYO','L4_SQUAD_LEADER','대주'),
  ('SECT_MYEONGYO','L3_MEMBER','대원(상)'),
  ('SECT_MYEONGYO','L2_MEMBER','대원(중)'),
  ('SECT_MYEONGYO','L1_MEMBER','대원(하)');

-- 흑린회
INSERT OR IGNORE INTO sect_role_titles(sect_id, layer_key, title) VALUES
  ('SECT_HEUKRINHOE','L9_LEADER','회주'),
  ('SECT_HEUKRINHOE','L8_DEPUTY','부회주'),
  ('SECT_HEUKRINHOE','L7_GRAND','대감찰'),
  ('SECT_HEUKRINHOE','L6_ELDER','감찰'),
  ('SECT_HEUKRINHOE','L5_HALL_LEADER','각주'),
  ('SECT_HEUKRINHOE','L4_SQUAD_LEADER','대주'),
  ('SECT_HEUKRINHOE','L3_MEMBER','대원(상)'),
  ('SECT_HEUKRINHOE','L2_MEMBER','대원(중)'),
  ('SECT_HEUKRINHOE','L1_MEMBER','대원(하)');

-- =========================
-- 7) Seed: departments (3), halls (6), squads (12)
-- =========================

-- 청운문 departments
INSERT OR IGNORE INTO sect_departments(dept_id, sect_id, dept_key, display_name, elder_slot_index) VALUES
  ('CHEONGUN_DEPT_OPS',      'SECT_CHEONGUN', 'OPS',      '총무전', 1),
  ('CHEONGUN_DEPT_TRAIN',    'SECT_CHEONGUN', 'TRAIN',    '연무전', 2),
  ('CHEONGUN_DEPT_EXTERNAL', 'SECT_CHEONGUN', 'EXTERNAL', '외사전', 3);

-- 청운문 halls (2 per dept)
INSERT OR IGNORE INTO sect_halls(hall_id, sect_id, dept_id, display_name, hall_slot_index) VALUES
  ('CHEONGUN_HALL_CHEONGSAN',  'SECT_CHEONGUN', 'CHEONGUN_DEPT_OPS',      '청산당', 1),
  ('CHEONGUN_HALL_CHEONGPUNG', 'SECT_CHEONGUN', 'CHEONGUN_DEPT_OPS',      '청풍당', 2),
  ('CHEONGUN_HALL_CHEONGGEOM', 'SECT_CHEONGUN', 'CHEONGUN_DEPT_TRAIN',    '청검당', 3),
  ('CHEONGUN_HALL_CHEONGSIM',  'SECT_CHEONGUN', 'CHEONGUN_DEPT_TRAIN',    '청심당', 4),
  ('CHEONGUN_HALL_CHEONGUI',   'SECT_CHEONGUN', 'CHEONGUN_DEPT_EXTERNAL', '청의당', 5),
  ('CHEONGUN_HALL_CHEONGLIN',  'SECT_CHEONGUN', 'CHEONGUN_DEPT_EXTERNAL', '청린당', 6);

-- 청운문 squads (2 per hall)
INSERT OR IGNORE INTO sect_squads(squad_id, sect_id, hall_id, display_name, squad_slot_index) VALUES
  ('CHEONGUN_SQUAD_CHEONGSAN_1',  'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGSAN',  '청산1대', 1),
  ('CHEONGUN_SQUAD_CHEONGSAN_2',  'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGSAN',  '청산2대', 2),
  ('CHEONGUN_SQUAD_CHEONGPUNG_1', 'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGPUNG', '청풍1대', 3),
  ('CHEONGUN_SQUAD_CHEONGPUNG_2', 'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGPUNG', '청풍2대', 4),
  ('CHEONGUN_SQUAD_CHEONGGEOM_1', 'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGGEOM', '청검1대', 5),
  ('CHEONGUN_SQUAD_CHEONGGEOM_2', 'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGGEOM', '청검2대', 6),
  ('CHEONGUN_SQUAD_CHEONGSIM_1',  'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGSIM',  '청심1대', 7),
  ('CHEONGUN_SQUAD_CHEONGSIM_2',  'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGSIM',  '청심2대', 8),
  ('CHEONGUN_SQUAD_CHEONGUI_1',   'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGUI',   '청의1대', 9),
  ('CHEONGUN_SQUAD_CHEONGUI_2',   'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGUI',   '청의2대', 10),
  ('CHEONGUN_SQUAD_CHEONGLIN_1',  'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGLIN',  '청린1대', 11),
  ('CHEONGUN_SQUAD_CHEONGLIN_2',  'SECT_CHEONGUN', 'CHEONGUN_HALL_CHEONGLIN',  '청린2대', 12);

-- 명교 departments
INSERT OR IGNORE INTO sect_departments(dept_id, sect_id, dept_key, display_name, elder_slot_index) VALUES
  ('MYEONGYO_DEPT_BLOODFLAME', 'SECT_MYEONGYO', 'OPS',      '혈염당', 1),
  ('MYEONGYO_DEPT_BLACKFLAME', 'SECT_MYEONGYO', 'TRAIN',    '흑염당', 2),
  ('MYEONGYO_DEPT_REDFLAME',   'SECT_MYEONGYO', 'EXTERNAL', '적염당', 3);

-- 명교 halls
INSERT OR IGNORE INTO sect_halls(hall_id, sect_id, dept_id, display_name, hall_slot_index) VALUES
  ('MYEONGYO_HALL_HYEOLHON', 'SECT_MYEONGYO', 'MYEONGYO_DEPT_BLOODFLAME', '혈혼당', 1),
  ('MYEONGYO_HALL_HYEOLWOL', 'SECT_MYEONGYO', 'MYEONGYO_DEPT_BLOODFLAME', '혈월당', 2),
  ('MYEONGYO_HALL_HEUKRIN',  'SECT_MYEONGYO', 'MYEONGYO_DEPT_BLACKFLAME', '흑린당', 3),
  ('MYEONGYO_HALL_HEUKPUNG', 'SECT_MYEONGYO', 'MYEONGYO_DEPT_BLACKFLAME', '흑풍당', 4),
  ('MYEONGYO_HALL_JEOKHWA',  'SECT_MYEONGYO', 'MYEONGYO_DEPT_REDFLAME',   '적화당', 5),
  ('MYEONGYO_HALL_JEOKHON',  'SECT_MYEONGYO', 'MYEONGYO_DEPT_REDFLAME',   '적혼당', 6);

-- 명교 squads
INSERT OR IGNORE INTO sect_squads(squad_id, sect_id, hall_id, display_name, squad_slot_index) VALUES
  ('MYEONGYO_SQUAD_HYEOLHON_1', 'SECT_MYEONGYO', 'MYEONGYO_HALL_HYEOLHON', '혈혼1대', 1),
  ('MYEONGYO_SQUAD_HYEOLHON_2', 'SECT_MYEONGYO', 'MYEONGYO_HALL_HYEOLHON', '혈혼2대', 2),
  ('MYEONGYO_SQUAD_HYEOLWOL_1', 'SECT_MYEONGYO', 'MYEONGYO_HALL_HYEOLWOL', '혈월1대', 3),
  ('MYEONGYO_SQUAD_HYEOLWOL_2', 'SECT_MYEONGYO', 'MYEONGYO_HALL_HYEOLWOL', '혈월2대', 4),
  ('MYEONGYO_SQUAD_HEUKRIN_1',  'SECT_MYEONGYO', 'MYEONGYO_HALL_HEUKRIN',  '흑린1대', 5),
  ('MYEONGYO_SQUAD_HEUKRIN_2',  'SECT_MYEONGYO', 'MYEONGYO_HALL_HEUKRIN',  '흑린2대', 6),
  ('MYEONGYO_SQUAD_HEUKPUNG_1', 'SECT_MYEONGYO', 'MYEONGYO_HALL_HEUKPUNG', '흑풍1대', 7),
  ('MYEONGYO_SQUAD_HEUKPUNG_2', 'SECT_MYEONGYO', 'MYEONGYO_HALL_HEUKPUNG', '흑풍2대', 8),
  ('MYEONGYO_SQUAD_JEOKHWA_1',  'SECT_MYEONGYO', 'MYEONGYO_HALL_JEOKHWA',  '적화1대', 9),
  ('MYEONGYO_SQUAD_JEOKHWA_2',  'SECT_MYEONGYO', 'MYEONGYO_HALL_JEOKHWA',  '적화2대', 10),
  ('MYEONGYO_SQUAD_JEOKHON_1',  'SECT_MYEONGYO', 'MYEONGYO_HALL_JEOKHON',  '적혼1대', 11),
  ('MYEONGYO_SQUAD_JEOKHON_2',  'SECT_MYEONGYO', 'MYEONGYO_HALL_JEOKHON',  '적혼2대', 12);

-- 흑린회 departments
INSERT OR IGNORE INTO sect_departments(dept_id, sect_id, dept_key, display_name, elder_slot_index) VALUES
  ('HEUKRIN_DEPT_FIN',      'SECT_HEUKRINHOE', 'OPS',      '재무각', 1),
  ('HEUKRIN_DEPT_SHADOW',   'SECT_HEUKRINHOE', 'TRAIN',    '암영각', 2),
  ('HEUKRIN_DEPT_EXTERNAL', 'SECT_HEUKRINHOE', 'EXTERNAL', '외사각', 3);

-- 흑린회 halls
INSERT OR IGNORE INTO sect_halls(hall_id, sect_id, dept_id, display_name, hall_slot_index) VALUES
  ('HEUKRIN_HALL_GEUMRIN',    'SECT_HEUKRINHOE', 'HEUKRIN_DEPT_FIN',      '금린각', 1),
  ('HEUKRIN_HALL_CHEONGGEUM', 'SECT_HEUKRINHOE', 'HEUKRIN_DEPT_FIN',      '청금각', 2),
  ('HEUKRIN_HALL_MUYEONG',    'SECT_HEUKRINHOE', 'HEUKRIN_DEPT_SHADOW',   '무영각', 3),
  ('HEUKRIN_HALL_HEUKYEONG',  'SECT_HEUKRINHOE', 'HEUKRIN_DEPT_SHADOW',   '흑영각', 4),
  ('HEUKRIN_HALL_GYOSEOP',    'SECT_HEUKRINHOE', 'HEUKRIN_DEPT_EXTERNAL', '교섭각', 5),
  ('HEUKRIN_HALL_YURIN',      'SECT_HEUKRINHOE', 'HEUKRIN_DEPT_EXTERNAL', '유린각', 6);

-- 흑린회 squads
INSERT OR IGNORE INTO sect_squads(squad_id, sect_id, hall_id, display_name, squad_slot_index) VALUES
  ('HEUKRIN_SQUAD_GEUMRIN_1',    'SECT_HEUKRINHOE', 'HEUKRIN_HALL_GEUMRIN',    '금린1대', 1),
  ('HEUKRIN_SQUAD_GEUMRIN_2',    'SECT_HEUKRINHOE', 'HEUKRIN_HALL_GEUMRIN',    '금린2대', 2),
  ('HEUKRIN_SQUAD_CHEONGGEUM_1', 'SECT_HEUKRINHOE', 'HEUKRIN_HALL_CHEONGGEUM', '청금1대', 3),
  ('HEUKRIN_SQUAD_CHEONGGEUM_2', 'SECT_HEUKRINHOE', 'HEUKRIN_HALL_CHEONGGEUM', '청금2대', 4),
  ('HEUKRIN_SQUAD_MUYEONG_1',    'SECT_HEUKRINHOE', 'HEUKRIN_HALL_MUYEONG',    '무영1대', 5),
  ('HEUKRIN_SQUAD_MUYEONG_2',    'SECT_HEUKRINHOE', 'HEUKRIN_HALL_MUYEONG',    '무영2대', 6),
  ('HEUKRIN_SQUAD_HEUKYEONG_1',  'SECT_HEUKRINHOE', 'HEUKRIN_HALL_HEUKYEONG',  '흑영1대', 7),
  ('HEUKRIN_SQUAD_HEUKYEONG_2',  'SECT_HEUKRINHOE', 'HEUKRIN_HALL_HEUKYEONG',  '흑영2대', 8),
  ('HEUKRIN_SQUAD_GYOSEOP_1',    'SECT_HEUKRINHOE', 'HEUKRIN_HALL_GYOSEOP',    '교섭1대', 9),
  ('HEUKRIN_SQUAD_GYOSEOP_2',    'SECT_HEUKRINHOE', 'HEUKRIN_HALL_GYOSEOP',    '교섭2대', 10),
  ('HEUKRIN_SQUAD_YURIN_1',      'SECT_HEUKRINHOE', 'HEUKRIN_HALL_YURIN',      '유린1대', 11),
  ('HEUKRIN_SQUAD_YURIN_2',      'SECT_HEUKRINHOE', 'HEUKRIN_HALL_YURIN',      '유린2대', 12);
