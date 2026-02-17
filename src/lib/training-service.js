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

function ensureProgressRow(db, userId) {
  db.prepare(`
    INSERT INTO training_progress (user_id)
    VALUES (?)
    ON CONFLICT(user_id) DO NOTHING
  `).run(userId);
}

function toIsoFromEpoch(epochSeconds) {
  return new Date(epochSeconds * 1000).toISOString();
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
      tp.inner_art_star,
      tp.inner_art_points,
      tp.skill_star,
      tp.skill_points,
      tp.meridian_star,
      tp.meridian_points
    FROM users u
    LEFT JOIN training_progress tp ON tp.user_id = u.user_id
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
      tp.inner_art_star,
      tp.skill_star,
      tp.meridian_star
    FROM users u
    LEFT JOIN training_progress tp ON tp.user_id = u.user_id
    WHERE u.user_id = ?
  `).get(userId);
}

function buildApiMePayload(row) {
  return {
    user_id: row.user_id,
    nickname: row.nickname_unique,
    last_tick_at: row.last_tick_at || null,
    training_mode: row.training_mode || "NONE",
    training_target_id: row.training_target_id || null,
    stars: {
      inner_art: Number(row.inner_art_star || 0),
      skill: Number(row.skill_star || 0),
      meridian_art: Number(row.meridian_star || 0),
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

  return {
    mode,
    gained_ticks: ticks,
    star: next.star,
    points: next.points,
  };
}

function createTrainingService(db) {
  const setTrainingTx = db.transaction((userId, mode, targetId) => {
    if (!TRAINING_MODES.has(mode)) {
      return { ok: false, code: "INVALID_MODE" };
    }

    ensureProgressRow(db, userId);
    db.prepare(`
      UPDATE users
      SET
        training_mode = ?,
        training_target_id = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(mode, targetId, userId);

    const row = loadApiMe(db, userId);
    return { ok: true, profile: buildApiMePayload(row) };
  });

  const tickTx = db.transaction((userId, clientRequestId) => {
    ensureProgressRow(db, userId);

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
    ensureProgressRow(db, userId);

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
    ensureProgressRow(db, userId);
    const row = loadApiMe(db, userId);
    return row ? { ok: true, profile: buildApiMePayload(row) } : { ok: false, code: "NO_USER" };
  }

  return {
    setTraining(userId, mode, targetId) {
      return setTrainingTx(userId, mode, targetId);
    },
    tick(userId, clientRequestId) {
      return tickTx(userId, clientRequestId || "");
    },
    catchup(userId) {
      return catchupTx(userId);
    },
    getApiMe,
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
