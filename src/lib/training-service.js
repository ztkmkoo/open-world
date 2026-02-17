const TRAINING_MODES = new Set(["NONE", "INNER_ART", "SKILL", "MERIDIAN_ART"]);
const TICK_SECONDS = 10 * 60;
const CATCHUP_CAP_SECONDS = 24 * 60 * 60;

function modeToColumns(mode) {
  if (mode === "INNER_ART") return { star: "inner_art_star", points: "inner_art_points" };
  if (mode === "SKILL") return { star: "skill_star", points: "skill_points" };
  if (mode === "MERIDIAN_ART") return { star: "meridian_star", points: "meridian_points" };
  return null;
}

function thresholdFor(star) {
  return star < 4 ? 3 : 6;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function applyTicksToTrack(star, points, ticks) {
  let currentStar = Number(star || 0);
  let currentPoints = Number(points || 0);

  for (let i = 0; i < ticks; i += 1) {
    if (currentStar >= 10) break;
    currentPoints += 1;
    let threshold = thresholdFor(currentStar);
    while (currentPoints >= threshold && currentStar < 10) {
      currentPoints -= threshold;
      currentStar += 1;
      threshold = thresholdFor(currentStar);
    }
  }

  if (currentStar >= 10) {
    currentStar = 10;
    currentPoints = 0;
  }

  return { star: currentStar, points: currentPoints };
}

function ensureProgressRows(db, userId) {
  db.prepare(`
    INSERT INTO training_progress (user_id)
    VALUES (?)
    ON CONFLICT(user_id) DO NOTHING
  `).run(userId);

  db.prepare(`
    INSERT INTO user_meridian_progress (user_id)
    VALUES (?)
    ON CONFLICT(user_id) DO NOTHING
  `).run(userId);
}

function toIsoFromEpoch(epochSeconds) {
  return new Date(epochSeconds * 1000).toISOString();
}

function safeParseJson(text, fallback) {
  try {
    return JSON.parse(String(text || ""));
  } catch (_error) {
    return fallback;
  }
}

function loadInnerArtByIdOrName(db, value) {
  const key = String(value || "").trim();
  if (!key) return null;
  const lowered = normalizeName(key);
  return db.prepare(`
    SELECT inner_art_id, name_ko, meridian_growth_json
    FROM inner_arts
    WHERE inner_art_id = ? OR lower(name_ko) = ?
    LIMIT 1
  `).get(key, lowered);
}

function loadSkillByIdOrName(db, value) {
  const key = String(value || "").trim();
  if (!key) return null;
  const lowered = normalizeName(key);
  return db.prepare(`
    SELECT skill_id, name_ko
    FROM martial_skills
    WHERE skill_id = ? OR lower(name_ko) = ?
    LIMIT 1
  `).get(key, lowered);
}

function unlockSectDefaultInnerArt(db, userId, sectId) {
  if (!sectId) return null;
  const mapping = db.prepare(`
    SELECT sdi.inner_art_id, ia.name_ko
    FROM sect_default_inner_arts sdi
    JOIN inner_arts ia ON ia.inner_art_id = sdi.inner_art_id
    WHERE sdi.sect_id = ?
  `).get(sectId);
  if (!mapping) return null;

  db.prepare(`
    INSERT INTO user_inner_arts (user_id, inner_art_id)
    VALUES (?, ?)
    ON CONFLICT(user_id, inner_art_id) DO NOTHING
  `).run(userId, mapping.inner_art_id);

  return mapping;
}

function applyInnerArtMeridianGrowth(db, userId, innerArtId, ticks) {
  if (ticks <= 0 || !innerArtId) return null;
  const innerArt = db.prepare(`
    SELECT meridian_growth_json
    FROM inner_arts
    WHERE inner_art_id = ?
  `).get(innerArtId);
  if (!innerArt) return null;

  const growth = safeParseJson(innerArt.meridian_growth_json, {});
  const deltas = {
    daemac: Number(growth.DAEMAC || 0) * ticks,
    gihae: Number(growth.GIHAE || 0) * ticks,
    immac: Number(growth.IMMAC || 0) * ticks,
    dokmac: Number(growth.DOKMAC || 0) * ticks,
    chungmac: Number(growth.CHUNGMAC || 0) * ticks,
  };

  db.prepare(`
    UPDATE user_meridian_progress
    SET
      daemac_points = daemac_points + ?,
      gihae_points = gihae_points + ?,
      immac_points = immac_points + ?,
      dokmac_points = dokmac_points + ?,
      chungmac_points = chungmac_points + ?,
      updated_at = datetime('now')
    WHERE user_id = ?
  `).run(deltas.daemac, deltas.gihae, deltas.immac, deltas.dokmac, deltas.chungmac, userId);

  return deltas;
}

function loadUserTrainingState(db, userId) {
  return db.prepare(`
    SELECT
      u.user_id,
      u.nickname_unique,
      u.sect_id,
      u.last_tick_at,
      unixepoch(u.last_tick_at) AS last_tick_epoch,
      u.training_mode,
      u.training_target_id,
      ia.name_ko AS training_inner_art_name,
      ms.name_ko AS training_skill_name,
      tp.inner_art_star,
      tp.inner_art_points,
      tp.skill_star,
      tp.skill_points,
      tp.meridian_star,
      tp.meridian_points
    FROM users u
    LEFT JOIN training_progress tp ON tp.user_id = u.user_id
    LEFT JOIN inner_arts ia ON ia.inner_art_id = u.training_target_id
    LEFT JOIN martial_skills ms ON ms.skill_id = u.training_target_id
    WHERE u.user_id = ?
  `).get(userId);
}

function loadApiMe(db, userId) {
  return db.prepare(`
    SELECT
      u.user_id,
      u.nickname_unique,
      u.last_tick_at,
      u.training_mode,
      u.training_target_id,
      ia.name_ko AS training_inner_art_name,
      ms.name_ko AS training_skill_name,
      tp.inner_art_star,
      tp.skill_star,
      tp.meridian_star,
      ump.daemac_points,
      ump.gihae_points,
      ump.immac_points,
      ump.dokmac_points,
      ump.chungmac_points
    FROM users u
    LEFT JOIN training_progress tp ON tp.user_id = u.user_id
    LEFT JOIN user_meridian_progress ump ON ump.user_id = u.user_id
    LEFT JOIN inner_arts ia ON ia.inner_art_id = u.training_target_id
    LEFT JOIN martial_skills ms ON ms.skill_id = u.training_target_id
    WHERE u.user_id = ?
  `).get(userId);
}

function buildApiMePayload(row) {
  const activeTargetName = row.training_mode === "INNER_ART"
    ? (row.training_inner_art_name || null)
    : (row.training_skill_name || null);

  return {
    user_id: row.user_id,
    nickname: row.nickname_unique,
    last_tick_at: row.last_tick_at || null,
    training_mode: row.training_mode || "NONE",
    training_target_id: row.training_target_id || null,
    training_target_name: activeTargetName,
    stars: {
      inner_art: Number(row.inner_art_star || 0),
      skill: Number(row.skill_star || 0),
      meridian_art: Number(row.meridian_star || 0),
    },
    meridians: {
      daemac: Number(row.daemac_points || 0),
      gihae: Number(row.gihae_points || 0),
      immac: Number(row.immac_points || 0),
      dokmac: Number(row.dokmac_points || 0),
      chungmac: Number(row.chungmac_points || 0),
    },
  };
}

function applyTrainingTicks(db, userId, ticks) {
  if (ticks <= 0) return { mode: "NONE", gained_ticks: 0 };

  const state = loadUserTrainingState(db, userId);
  if (!state) return { mode: "NONE", gained_ticks: 0 };

  const mode = state.training_mode || "NONE";
  const columns = modeToColumns(mode);
  if (!columns) return { mode, gained_ticks: 0 };

  const next = applyTicksToTrack(state[columns.star], state[columns.points], ticks);
  db.prepare(`
    UPDATE training_progress
    SET ${columns.star} = ?, ${columns.points} = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(next.star, next.points, userId);

  let meridianDelta = null;
  if (mode === "INNER_ART") {
    meridianDelta = applyInnerArtMeridianGrowth(db, userId, state.training_target_id, ticks);
  }

  return {
    mode,
    gained_ticks: ticks,
    star: next.star,
    points: next.points,
    meridian_delta: meridianDelta,
  };
}

function createTrainingService(db) {
  const setTrainingTx = db.transaction((userId, mode, targetValue) => {
    if (!TRAINING_MODES.has(mode)) {
      return { ok: false, code: "INVALID_MODE" };
    }

    ensureProgressRows(db, userId);

    if (mode === "NONE") {
      db.prepare(`
        UPDATE users
        SET training_mode = 'NONE', training_target_id = NULL, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(userId);
      const row = loadApiMe(db, userId);
      return { ok: true, profile: buildApiMePayload(row) };
    }

    if (mode === "INNER_ART") {
      const innerArt = loadInnerArtByIdOrName(db, targetValue);
      if (!innerArt) return { ok: false, code: "INNER_ART_NOT_FOUND" };

      db.prepare(`
        INSERT INTO user_inner_arts (user_id, inner_art_id)
        VALUES (?, ?)
        ON CONFLICT(user_id, inner_art_id) DO NOTHING
      `).run(userId, innerArt.inner_art_id);

      db.prepare(`
        UPDATE users
        SET training_mode = 'INNER_ART', training_target_id = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(innerArt.inner_art_id, userId);

      const row = loadApiMe(db, userId);
      return { ok: true, profile: buildApiMePayload(row) };
    }

    if (mode === "SKILL") {
      const skill = loadSkillByIdOrName(db, targetValue);
      if (!skill) return { ok: false, code: "SKILL_NOT_FOUND" };

      db.prepare(`
        INSERT INTO user_skills (user_id, skill_id)
        VALUES (?, ?)
        ON CONFLICT(user_id, skill_id) DO NOTHING
      `).run(userId, skill.skill_id);

      db.prepare(`
        UPDATE users
        SET training_mode = 'SKILL', training_target_id = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(skill.skill_id, userId);

      const row = loadApiMe(db, userId);
      return { ok: true, profile: buildApiMePayload(row) };
    }

    db.prepare(`
      UPDATE users
      SET training_mode = ?, training_target_id = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(mode, targetValue || null, userId);

    const row = loadApiMe(db, userId);
    return { ok: true, profile: buildApiMePayload(row) };
  });

  const tickTx = db.transaction((userId, clientRequestId) => {
    ensureProgressRows(db, userId);

    if (clientRequestId) {
      try {
        db.prepare(`
          INSERT INTO tick_request_log (user_id, client_request_id)
          VALUES (?, ?)
        `).run(userId, clientRequestId);
      } catch (_error) {
        const row = loadApiMe(db, userId);
        return {
          ok: true,
          duplicate: true,
          applied_ticks: 0,
          profile: buildApiMePayload(row),
        };
      }
    }

    const state = loadUserTrainingState(db, userId);
    if (!state) return { ok: false, code: "NO_USER" };

    const nowEpoch = Math.floor(Date.now() / 1000);
    const lastEpoch = Number(state.last_tick_epoch || 0);

    if (!lastEpoch) {
      db.prepare("UPDATE users SET last_tick_at = datetime(?,'unixepoch') WHERE user_id = ?").run(nowEpoch, userId);
      const row = loadApiMe(db, userId);
      return { ok: true, duplicate: false, applied_ticks: 0, profile: buildApiMePayload(row), penalized: false };
    }

    const elapsed = nowEpoch - lastEpoch;
    if (elapsed < TICK_SECONDS) {
      db.prepare("UPDATE users SET last_tick_at = datetime(?,'unixepoch') WHERE user_id = ?").run(nowEpoch, userId);
      const row = loadApiMe(db, userId);
      return { ok: true, duplicate: false, applied_ticks: 0, profile: buildApiMePayload(row), penalized: true };
    }

    const nextTickEpoch = lastEpoch + TICK_SECONDS;
    const training = applyTrainingTicks(db, userId, 1);
    db.prepare("UPDATE users SET last_tick_at = datetime(?,'unixepoch') WHERE user_id = ?").run(nextTickEpoch, userId);
    const row = loadApiMe(db, userId);

    return {
      ok: true,
      duplicate: false,
      applied_ticks: 1,
      penalized: false,
      processed_until: toIsoFromEpoch(nextTickEpoch),
      training,
      profile: buildApiMePayload(row),
    };
  });

  const catchupTx = db.transaction((userId) => {
    ensureProgressRows(db, userId);

    const state = loadUserTrainingState(db, userId);
    if (!state) return { ok: false, code: "NO_USER" };

    const nowEpoch = Math.floor(Date.now() / 1000);
    const lastEpoch = Number(state.last_tick_epoch || 0);
    if (!lastEpoch) {
      db.prepare("UPDATE users SET last_tick_at = datetime(?,'unixepoch') WHERE user_id = ?").run(nowEpoch, userId);
      const row = loadApiMe(db, userId);
      return { ok: true, tick_count: 0, profile: buildApiMePayload(row) };
    }

    const elapsed = Math.max(0, nowEpoch - lastEpoch);
    const boundedElapsed = Math.min(elapsed, CATCHUP_CAP_SECONDS);
    const tickCount = Math.floor(boundedElapsed / TICK_SECONDS);
    const nextEpoch = lastEpoch + (tickCount * TICK_SECONDS);

    const training = applyTrainingTicks(db, userId, tickCount);
    db.prepare("UPDATE users SET last_tick_at = datetime(?,'unixepoch') WHERE user_id = ?").run(nextEpoch, userId);
    const row = loadApiMe(db, userId);

    return {
      ok: true,
      tick_count: tickCount,
      applied_seconds: tickCount * TICK_SECONDS,
      processed_until: toIsoFromEpoch(nextEpoch),
      training,
      profile: buildApiMePayload(row),
    };
  });

  function getApiMe(userId) {
    ensureProgressRows(db, userId);
    const row = loadApiMe(db, userId);
    return row ? { ok: true, profile: buildApiMePayload(row) } : { ok: false, code: "NO_USER" };
  }

  function ensureSectDefaultUnlocked(userId, sectId, { autoSelect = false } = {}) {
    const tx = db.transaction((uid, sid, shouldSelect) => {
      ensureProgressRows(db, uid);
      const mapping = unlockSectDefaultInnerArt(db, uid, sid);
      if (!mapping) return { ok: false, code: "NO_DEFAULT_INNER_ART" };

      if (shouldSelect) {
        db.prepare(`
          UPDATE users
          SET training_mode = 'INNER_ART', training_target_id = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `).run(mapping.inner_art_id, uid);
      }

      return { ok: true, default_inner_art_id: mapping.inner_art_id, default_inner_art_name: mapping.name_ko };
    });

    return tx(userId, sectId, autoSelect);
  }

  function getTrainingStatus(userId) {
    const row = loadApiMe(db, userId);
    if (!row) return { ok: false, code: "NO_USER" };
    return { ok: true, profile: buildApiMePayload(row) };
  }

  function getTrainingCatalog(userId) {
    ensureProgressRows(db, userId);
    const user = db.prepare(`
      SELECT user_id, sect_id
      FROM users
      WHERE user_id = ?
    `).get(userId);
    if (!user) return { ok: false, code: "NO_USER" };

    if (user.sect_id) {
      ensureSectDefaultUnlocked(userId, user.sect_id, { autoSelect: false });
    }

    const defaultInnerArt = user.sect_id
      ? db.prepare(`
          SELECT ia.inner_art_id, ia.name_ko
          FROM sect_default_inner_arts sdi
          JOIN inner_arts ia ON ia.inner_art_id = sdi.inner_art_id
          WHERE sdi.sect_id = ?
        `).get(user.sect_id)
      : null;

    const innerArts = db.prepare(`
      SELECT
        ia.inner_art_id,
        ia.name_ko,
        CASE WHEN uia.user_id IS NULL THEN 0 ELSE 1 END AS unlocked
      FROM inner_arts ia
      LEFT JOIN user_inner_arts uia
        ON uia.inner_art_id = ia.inner_art_id
       AND uia.user_id = ?
      ORDER BY ia.name_ko
    `).all(userId).map((row) => ({
      id: row.inner_art_id,
      name: row.name_ko,
      unlocked: Boolean(row.unlocked),
    }));

    const skills = db.prepare(`
      SELECT
        ms.skill_id,
        ms.name_ko,
        CASE WHEN us.user_id IS NULL THEN 0 ELSE 1 END AS unlocked
      FROM martial_skills ms
      LEFT JOIN user_skills us
        ON us.skill_id = ms.skill_id
       AND us.user_id = ?
      ORDER BY ms.name_ko
    `).all(userId).map((row) => ({
      id: row.skill_id,
      name: row.name_ko,
      unlocked: Boolean(row.unlocked),
    }));

    return {
      ok: true,
      sect_id: user.sect_id || null,
      default_inner_art: defaultInnerArt
        ? { id: defaultInnerArt.inner_art_id, name: defaultInnerArt.name_ko }
        : null,
      inner_arts: innerArts,
      skills,
    };
  }

  return {
    setTraining(userId, mode, targetValue) {
      return setTrainingTx(userId, mode, targetValue);
    },
    tick(userId, clientRequestId) {
      return tickTx(userId, clientRequestId || "");
    },
    catchup(userId) {
      return catchupTx(userId);
    },
    getApiMe,
    ensureSectDefaultUnlocked,
    getTrainingStatus,
    getTrainingCatalog,
    constants: {
      TICK_SECONDS,
      CATCHUP_CAP_SECONDS,
    },
  };
}

module.exports = {
  TRAINING_MODES,
  createTrainingService,
};
