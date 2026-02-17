const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const { initDatabase } = require("./lib/db");
const {
  firstToken,
  parseCommandInput,
  buildCommandResponse,
  getTerminalDetail,
  getSectDepartmentNames,
} = require("./lib/command-service");
const { renderTerminalContent } = require("./views/terminal-view");
const { registerAuthRoutes } = require("./routes/auth-routes");
const { registerCharacterRoutes } = require("./routes/character-routes");
const { initChatWebSocket } = require("./ws/chat-server");
const { createTrainingService } = require("./lib/training-service");
const { SURNAME_ALLOWLIST, GIVEN_NAME_REGEX } = require("./constants");

const app = express();
const PORT = process.env.PORT || 3000;

const db = initDatabase({ applySeed: true });
const trainingService = createTrainingService(db);

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/health", (_req, res) => {
  try {
    db.prepare("SELECT 1 AS ok").get();
    res.json({
      ok: true,
      service: "open-world",
      db: "up",
      now: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: "open-world",
      db: "down",
      error: "db_unavailable",
    });
  }
});

function htmlPage(title, content) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 24px; font-family: "Segoe UI", sans-serif; background: #f4f4f2; color: #1f1f1f; }
    .card { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 20px; }
    h1 { margin-top: 0; font-size: 24px; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
    label { display: block; margin-bottom: 6px; font-weight: 600; }
    input, select, button { font-size: 15px; padding: 10px; border: 1px solid #bbb; border-radius: 8px; }
    button { cursor: pointer; background: #1f3b2d; color: #fff; border: none; }
    button:disabled { background: #8f8f8f; cursor: not-allowed; }
    .error { color: #af1b1b; margin: 0 0 12px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .terminal { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; min-height: 60vh; }
    .panel { border: 1px solid #c9c9c9; border-radius: 8px; background: #fff; padding: 12px; }
    .log { height: 360px; overflow: auto; background: #111; color: #d4ffd4; padding: 10px; border-radius: 6px; font-family: Consolas, monospace; }
    .chat-tabs { display: flex; gap: 6px; margin-bottom: 8px; }
    .chat-tab { background: #eee; color: #333; border: 1px solid #d0d0d0; border-radius: 6px; padding: 6px 10px; font-size: 13px; cursor: pointer; }
    .chat-tab.active { background: #1f3b2d; color: #fff; border-color: #1f3b2d; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

function newId() {
  return crypto.randomUUID();
}

function nowIsoPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function getSession(req) {
  const sid = req.cookies.session_id;
  if (!sid) return null;
  return db.prepare(`SELECT session_id, auth_state, user_id, expires_at FROM sessions WHERE session_id = ?`).get(sid) || null;
}

function redirectWithAlert(message, fallbackPath) {
  return htmlPage(
    "알림",
    `<div class="card"><script>alert(${JSON.stringify(message)}); location.href=${JSON.stringify(fallbackPath)};</script></div>`
  );
}

function requireAuthenticated(req, res) {
  const session = getSession(req);
  if (!session) {
    res.redirect("/login");
    return null;
  }
  return session;
}

function requireRegistered(req, res) {
  const session = requireAuthenticated(req, res);
  if (!session) return null;
  if (session.auth_state !== "REGISTERED" || !session.user_id) {
    res.redirect("/nickname");
    return null;
  }
  return session;
}

function loadUser(userId) {
  return db.prepare(`SELECT user_id, surname, given_name, nickname_unique, gender, sect_id FROM users WHERE user_id = ?`).get(userId);
}

function buildTrainingCommandResponse(result, successHeader) {
  if (!result.ok) {
    return {
      ok: false,
      header: "【오류】 수련 명령 실패",
      lines: [`코드: ${result.code || "UNKNOWN"}`],
      actions: ["수련 상태", "수련 중지", "도움"],
    };
  }

  const profile = result.profile;
  return {
    ok: true,
    header: successHeader,
    lines: [
      `모드: ${profile.training_mode}`,
      `대상: ${profile.training_target_name || profile.training_target_id || "-"}`,
      `last_tick_at: ${profile.last_tick_at || "-"}`,
    ],
    actions: ["수련 상태", "상태", "도움"],
  };
}

function handleTrainingCommand(rawInput, userId, trainingApi) {
  const normalized = String(rawInput || "").trim().replace(/^\/+/, "");
  const parts = normalized ? normalized.split(/\s+/) : [];
  if (parts[0] !== "수련") return null;

  const sub = parts[1] || "";
  const targetName = parts.slice(2).join(" ").trim();

  if (sub === "심법") {
    if (!targetName) {
      return {
        ok: false,
        header: "【오류】 수련 명령 실패",
        lines: ["형식: 수련 심법 <심법명>"],
        actions: ["수련 상태", "도움"],
      };
    }
    return buildTrainingCommandResponse(
      trainingApi.setTraining(userId, "INNER_ART", targetName),
      "【수련】 심법 변경 완료"
    );
  }

  if (sub === "무공") {
    if (!targetName) {
      return {
        ok: false,
        header: "【오류】 수련 명령 실패",
        lines: ["형식: 수련 무공 <무공명>"],
        actions: ["수련 상태", "도움"],
      };
    }
    return buildTrainingCommandResponse(
      trainingApi.setTraining(userId, "SKILL", targetName),
      "【수련】 무공 변경 완료"
    );
  }

  if (sub === "중지") {
    return buildTrainingCommandResponse(
      trainingApi.setTraining(userId, "NONE", null),
      "【수련】 수련 중지 완료"
    );
  }

  if (sub === "상태") {
    const status = trainingApi.getTrainingStatus(userId);
    return buildTrainingCommandResponse(status, "【수련】 현재 상태");
  }

  return {
    ok: false,
    header: "【오류】 수련 명령 실패",
    lines: [
      "지원 형식: 수련 심법 <심법명> | 수련 무공 <무공명> | 수련 중지 | 수련 상태",
    ],
    actions: ["수련 상태", "도움"],
  };
}

const assignSectTx = db.transaction((userId, sectId) => {
  const user = loadUser(userId);
  if (!user) return { ok: false, code: "NO_USER" };
  if (user.sect_id) return { ok: false, code: "ALREADY_ASSIGNED" };

  const sect = db.prepare(`SELECT sect_id FROM sects WHERE sect_id = ?`).get(sectId);
  if (!sect) return { ok: false, code: "NO_SECT" };

  const inc = db.prepare(`
    UPDATE sects
    SET roster_count = roster_count + 1
    WHERE sect_id = ? AND roster_count < 144
  `).run(sectId);

  if (inc.changes === 0) return { ok: false, code: "SECT_FULL" };

  const userUpdate = db.prepare(`
    UPDATE users SET sect_id = ?, updated_at = datetime('now')
    WHERE user_id = ? AND sect_id IS NULL
  `).run(sectId, userId);

  if (userUpdate.changes === 0) {
    throw new Error("Failed to assign user to sect after capacity increment.");
  }

  return { ok: true };
});

app.get("/", (_req, res) => res.redirect("/login"));

registerAuthRoutes(app, {
  htmlPage,
  db,
  newId,
  nowIsoPlusDays,
  requireAuthenticated,
  loadUser,
  SURNAME_ALLOWLIST,
  GIVEN_NAME_REGEX,
  redirectWithAlert,
});

registerCharacterRoutes(app, {
  htmlPage,
  db,
  requireRegistered,
  loadUser,
  assignSectTx,
  onSectAssigned: (userId, sectId) => {
    const result = trainingService.ensureSectDefaultUnlocked(userId, sectId, { autoSelect: false });
    if (!result.ok) {
      console.warn(`[TRAINING] failed to unlock default inner art user=${userId} sect=${sectId} code=${result.code}`);
    }
  },
  redirectWithAlert,
});

app.get("/terminal", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const user = loadUser(session.user_id);
  if (!user || !user.sect_id) {
    res.redirect("/choose-faction");
    return;
  }

  const detail = getTerminalDetail(db, user.user_id);
  if (!detail || !detail.sect_id) {
    res.redirect("/choose-faction");
    return;
  }

  res.send(htmlPage("터미널", renderTerminalContent(detail)));
});

app.post("/command", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const user = loadUser(session.user_id);
  if (!user || !user.sect_id) {
    res.status(403).json({ ok: false, message: "sect selection required" });
    return;
  }

  const detail = getTerminalDetail(db, user.user_id);

  if (!detail || !detail.sect_id) {
    res.status(404).json({ ok: false, message: "character/sect not found" });
    return;
  }

  const deptNames = getSectDepartmentNames(db, detail.sect_id, 3);

  const rawInput = String(req.body.input || "");
  const trainingResponse = handleTrainingCommand(rawInput, user.user_id, trainingService);
  if (trainingResponse) {
    res.json(trainingResponse);
    return;
  }

  const parsed = parseCommandInput(rawInput);
  const response = buildCommandResponse(parsed, detail, deptNames);

  console.log(
    `[COMMAND] user=${detail.nickname_unique} sect=${detail.sect_name} input="${firstToken(rawInput)}" canonical="${parsed.canonical || "unknown"}"`
  );
  console.log(`[COMMAND] ${response.header} | actions=${response.actions.join(",")}`);

  res.json(response);
});

app.post("/api/training/set", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const mode = String(req.body.mode || "NONE").trim().toUpperCase();
  const rawTargetId = String(req.body.target_id || "").trim();
  const rawTargetName = String(req.body.target_name || "").trim();
  const target = rawTargetName || rawTargetId || null;

  const result = trainingService.setTraining(session.user_id, mode, target);
  if (!result.ok) {
    res.status(400).json({ ok: false, code: result.code });
    return;
  }

  res.json({
    ok: true,
    training_mode: result.profile.training_mode,
    training_target_id: result.profile.training_target_id,
    training_target_name: result.profile.training_target_name,
    stars: result.profile.stars,
    meridians: result.profile.meridians,
  });
});

app.post("/tick", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const clientRequestId = String(req.body.client_request_id || "").trim().slice(0, 80);
  const result = trainingService.tick(session.user_id, clientRequestId);
  if (!result.ok) {
    res.status(400).json({ ok: false, code: result.code });
    return;
  }

  res.json(result);
});

app.post("/tick/catchup", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const result = trainingService.catchup(session.user_id);
  if (!result.ok) {
    res.status(400).json({ ok: false, code: result.code });
    return;
  }

  res.json(result);
});

app.get("/api/me", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const result = trainingService.getApiMe(session.user_id);
  if (!result.ok) {
    res.status(404).json({ ok: false, code: result.code });
    return;
  }

  res.json({ ok: true, ...result.profile });
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

initChatWebSocket({ server, db });
