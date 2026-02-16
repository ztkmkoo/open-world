const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const { initDatabase } = require("./lib/db");
const { SURNAME_ALLOWLIST, GIVEN_NAME_REGEX } = require("./constants");

const app = express();
const PORT = process.env.PORT || 3000;

const db = initDatabase({ applySeed: true });

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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
    .chat-tab { background: #eee; color: #333; border-radius: 6px; padding: 6px 10px; font-size: 13px; }
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

const COMMAND_ALIAS = {
  도움: "help",
  help: "help",
  h: "help",
  상태: "status",
  status: "status",
  stat: "status",
  문파: "sect",
  sect: "sect",
};

function firstToken(input) {
  return String(input || "").trim().split(/\s+/)[0] || "";
}

function normalizeCommand(input) {
  const token = firstToken(input).toLowerCase();
  return COMMAND_ALIAS[token] || "";
}

function formatKstNow() {
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${dtf.format(new Date()).replace(" ", "T")} KST`;
}

function buildCommandResponse(command, detail, deptNames) {
  if (command === "status") {
    return {
      ok: true,
      header: "【상태】 캐릭터 현황",
      lines: [
        `이름: ${detail.nickname_unique}`,
        `성별: ${detail.gender}`,
        `소속: ${detail.faction_name} / ${detail.sect_name}`,
        `시간: ${formatKstNow()}`,
      ],
      actions: ["문파", "도움", "상태"],
    };
  }

  if (command === "sect") {
    const lines = [
      `문파: ${detail.sect_name}`,
      `세력: ${detail.faction_name}`,
      `위상: ${detail.prestige}`,
      `정원: ${detail.roster_count}/${detail.capacity_total}`,
    ];
    if (deptNames.length > 0) {
      lines.push(`조직: ${deptNames.join(", ")}`);
    }
    return {
      ok: true,
      header: "【문파】 소속 정보",
      lines,
      actions: ["상태", "도움", "문파"],
    };
  }

  if (command === "help") {
    return {
      ok: true,
      header: "【안내】 지원 명령",
      lines: [
        "도움(help): 지원 명령 목록 표시",
        "상태(status): 캐릭터와 소속 상태 표시",
        "문파(sect): 문파 상세 정보 표시",
        "예시: 상태",
      ],
      actions: ["상태", "문파", "도움"],
    };
  }

  return {
    ok: false,
    header: "【오류】 알 수 없는 명령",
    lines: ["지원 명령: 도움, 상태, 문파"],
    actions: ["도움", "상태", "문파"],
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

app.get("/login", (_req, res) => {
  res.redirect("/auth/mock");
});

app.get("/auth/mock", (_req, res) => {
  res.send(htmlPage("Mock Login", `
    <div class="card">
      <h1>Mock 로그인</h1>
      <p>OAuth 리다이렉트 구조 대체용 테스트 로그인입니다.</p>
      <form method="post" action="/auth/mock/callback">
        <button type="submit">로그인</button>
      </form>
    </div>
  `));
});

app.post("/auth/mock/callback", (_req, res) => {
  const sessionId = newId();
  db.prepare(`
    INSERT INTO sessions (session_id, auth_state, user_id, expires_at)
    VALUES (?, 'AUTHENTICATED', NULL, ?)
  `).run(sessionId, nowIsoPlusDays(7));

  res.cookie("session_id", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.redirect("/nickname");
});

app.get("/nickname", (req, res) => {
  const session = requireAuthenticated(req, res);
  if (!session) return;

  if (session.auth_state === "REGISTERED" && session.user_id) {
    const user = loadUser(session.user_id);
    if (user && user.sect_id) {
      res.redirect("/terminal");
      return;
    }
    res.redirect("/choose-faction");
    return;
  }

  const surnameOptions = SURNAME_ALLOWLIST.map((surname) => `<option value="${surname}">${surname}</option>`).join("");

  res.send(htmlPage("캐릭터 생성", `
    <div class="card">
      <h1>캐릭터 생성</h1>
      <form method="post" action="/nickname">
        <div class="row">
          <div>
            <label for="gender">성별</label>
            <select id="gender" name="gender" required>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label for="surname">성</label>
            <select id="surname" name="surname" required>${surnameOptions}</select>
          </div>
          <div>
            <label for="given_name">이름 (한글 1~3글자)</label>
            <input id="given_name" name="given_name" maxlength="3" required />
          </div>
        </div>
        <button type="submit">생성 완료</button>
      </form>
    </div>
  `));
});

app.post("/nickname", (req, res) => {
  const session = requireAuthenticated(req, res);
  if (!session) return;

  const gender = String(req.body.gender || "").trim();
  const surname = String(req.body.surname || "").trim();
  const givenName = String(req.body.given_name || "").trim();

  if (!["M", "F"].includes(gender)) {
    res.status(400).send(redirectWithAlert("성별이 올바르지 않습니다.", "/nickname"));
    return;
  }
  if (!SURNAME_ALLOWLIST.includes(surname)) {
    res.status(400).send(redirectWithAlert("허용되지 않은 성입니다.", "/nickname"));
    return;
  }
  if (!GIVEN_NAME_REGEX.test(givenName)) {
    res.status(400).send(redirectWithAlert("이름은 한글 1~3글자여야 합니다.", "/nickname"));
    return;
  }

  const nickname = `${surname}${givenName}`;

  try {
    let userId = session.user_id;
    if (userId) {
      db.prepare(`
        UPDATE users
        SET surname = ?, given_name = ?, nickname_unique = ?, gender = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(surname, givenName, nickname, gender, userId);
    } else {
      userId = newId();
      db.prepare(`
        INSERT INTO users (user_id, surname, given_name, nickname_unique, gender)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, surname, givenName, nickname, gender);
    }

    db.prepare(`
      UPDATE sessions
      SET auth_state = 'REGISTERED', user_id = ?
      WHERE session_id = ?
    `).run(userId, session.session_id);

    res.redirect("/choose-faction");
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      res.status(409).send(redirectWithAlert("이미 사용 중인 이름입니다.", "/nickname"));
      return;
    }
    throw error;
  }
});

app.get("/choose-faction", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const user = loadUser(session.user_id);
  if (user && user.sect_id) {
    res.redirect("/terminal");
    return;
  }

  const factions = db.prepare(`SELECT faction_id, name FROM factions ORDER BY name`).all();
  const buttons = factions
    .map((f) => `<a href="/choose-sect?faction_id=${encodeURIComponent(f.faction_id)}"><button type="button">${f.name}</button></a>`)
    .join("");

  res.send(htmlPage("세력 선택", `
    <div class="card">
      <h1>세력 선택</h1>
      <div class="row">${buttons}</div>
    </div>
  `));
});

app.get("/choose-sect", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const user = loadUser(session.user_id);
  if (user && user.sect_id) {
    res.redirect("/terminal");
    return;
  }

  const factionId = String(req.query.faction_id || "").trim();
  if (!factionId) {
    res.redirect("/choose-faction");
    return;
  }

  const faction = db.prepare(`SELECT faction_id, name FROM factions WHERE faction_id = ?`).get(factionId);
  if (!faction) {
    res.status(404).send(htmlPage("오류", `<div class="card"><h1>존재하지 않는 세력입니다.</h1></div>`));
    return;
  }

  const sects = db.prepare(`
    SELECT sect_id, name, roster_count, capacity_total
    FROM sects
    WHERE faction_id = ?
    ORDER BY name
  `).all(factionId);

  const list = sects.map((sect) => {
    const full = sect.roster_count >= 144;
    return `
      <form method="post" action="/api/sect/select" style="margin-bottom:10px;">
        <input type="hidden" name="sect_id" value="${sect.sect_id}" />
        <button type="submit" ${full ? "disabled" : ""}>
          ${sect.name} (${sect.roster_count}/${sect.capacity_total}) ${full ? "- 만석" : ""}
        </button>
      </form>
    `;
  }).join("");

  res.send(htmlPage("문파 선택", `
    <div class="card">
      <h1>문파 선택 - ${faction.name}</h1>
      ${list || "<p>선택 가능한 문파가 없습니다.</p>"}
      <a href="/choose-faction">세력으로 돌아가기</a>
    </div>
  `));
});

app.post("/api/sect/select", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const sectId = String(req.body.sect_id || "").trim();
  if (!sectId) {
    res.status(400).send(redirectWithAlert("문파를 선택해주세요.", "/choose-faction"));
    return;
  }

  const result = assignSectTx(session.user_id, sectId);

  if (!result.ok) {
    if (result.code === "SECT_FULL") {
      res.status(409).send(redirectWithAlert("만석", `/choose-faction`));
      return;
    }
    if (result.code === "ALREADY_ASSIGNED") {
      res.redirect("/terminal");
      return;
    }
    res.status(400).send(redirectWithAlert("선택 처리에 실패했습니다.", "/choose-faction"));
    return;
  }

  res.redirect("/terminal");
});

app.get("/api/factions", (_req, res) => {
  const factions = db.prepare(`SELECT faction_id AS id, name FROM factions ORDER BY name`).all();
  res.json(factions);
});

app.get("/api/sects", (req, res) => {
  const factionId = String(req.query.faction_id || "").trim();
  if (!factionId) {
    res.status(400).json({ ok: false, message: "faction_id is required" });
    return;
  }
  const sects = db.prepare(`
    SELECT
      sect_id AS id,
      faction_id,
      name,
      roster_count,
      capacity_total,
      prestige
    FROM sects
    WHERE faction_id = ?
    ORDER BY name
  `).all(factionId);
  res.json(sects);
});

app.get("/terminal", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const user = loadUser(session.user_id);
  if (!user || !user.sect_id) {
    res.redirect("/choose-faction");
    return;
  }

  const detail = db.prepare(`
    SELECT
      u.nickname_unique,
      u.gender,
      s.sect_id,
      s.name AS sect_name,
      s.prestige,
      s.roster_count,
      s.capacity_total,
      f.name AS faction_name
    FROM users u
    LEFT JOIN sects s ON s.sect_id = u.sect_id
    LEFT JOIN factions f ON f.faction_id = s.faction_id
    WHERE u.user_id = ?
  `).get(user.user_id);

  res.send(htmlPage("터미널", `
    <div class="card">
      <h1>무림 터미널</h1>
      <p>${detail.nickname_unique} (${detail.gender}) | ${detail.faction_name} / ${detail.sect_name}</p>
      <div class="terminal">
        <div class="panel">
          <h3>명령 콘솔</h3>
          <div class="log" id="log">환영합니다. "도움"을 입력해보세요.</div>
          <div class="row">
            <input id="cmd-input" style="flex:1;" placeholder="명령어 입력" />
            <button id="cmd-send" type="button">전송</button>
          </div>
        </div>
        <div class="panel">
          <h3>채팅</h3>
          <div class="chat-tabs">
            <div class="chat-tab">전체</div>
            <div class="chat-tab">문파</div>
            <div class="chat-tab">귓</div>
          </div>
          <div class="log">채팅 서버는 MVP에서 stub입니다.</div>
        </div>
      </div>
      <script>
        const logEl = document.getElementById("log");
        const inputEl = document.getElementById("cmd-input");
        const sendBtn = document.getElementById("cmd-send");

        function appendLog(text) {
          logEl.textContent += "\\n" + text;
          logEl.scrollTop = logEl.scrollHeight;
        }

        function renderResponse(data) {
          appendLog("");
          appendLog(data.header);
          for (const line of data.lines || []) {
            appendLog("- " + line);
          }
          appendLog("추천: " + (data.actions || []).join(" | "));
        }

        async function sendCommand() {
          const input = inputEl.value.trim();
          if (!input) return;
          appendLog("> " + input);
          inputEl.value = "";
          try {
            const res = await fetch("/command", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ input }),
            });
            const payload = await res.json();
            if (!res.ok) {
              appendLog("요청 실패: HTTP " + res.status);
              return;
            }
            renderResponse(payload);
          } catch (_err) {
            appendLog("요청 실패: 네트워크 오류");
          }
        }

        sendBtn.addEventListener("click", sendCommand);
        inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            sendCommand();
          }
        });
      </script>
    </div>
  `));
});

app.post("/command", (req, res) => {
  const session = requireRegistered(req, res);
  if (!session) return;

  const user = loadUser(session.user_id);
  if (!user || !user.sect_id) {
    res.status(403).json({ ok: false, message: "sect selection required" });
    return;
  }

  const detail = db.prepare(`
    SELECT
      u.nickname_unique,
      u.gender,
      s.sect_id,
      s.name AS sect_name,
      s.prestige,
      s.roster_count,
      s.capacity_total,
      f.name AS faction_name
    FROM users u
    LEFT JOIN sects s ON s.sect_id = u.sect_id
    LEFT JOIN factions f ON f.faction_id = s.faction_id
    WHERE u.user_id = ?
  `).get(user.user_id);

  if (!detail || !detail.sect_id) {
    res.status(404).json({ ok: false, message: "character/sect not found" });
    return;
  }

  const deptNames = db.prepare(`
    SELECT display_name
    FROM sect_departments
    WHERE sect_id = ?
    ORDER BY elder_slot_index
    LIMIT 3
  `).all(detail.sect_id).map((row) => row.display_name);

  const rawInput = String(req.body.input || "");
  const command = normalizeCommand(rawInput);
  const response = buildCommandResponse(command, detail, deptNames);

  console.log(
    `[COMMAND] user=${detail.nickname_unique} sect=${detail.sect_name} input="${firstToken(rawInput)}" canonical="${command || "unknown"}"`
  );
  console.log(`[COMMAND] ${response.header} | actions=${response.actions.join(",")}`);

  res.json(response);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
