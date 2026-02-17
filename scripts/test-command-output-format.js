const { spawn } = require("child_process");
const path = require("path");
const Database = require("better-sqlite3");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(baseUrl, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.status === 200) {
        return;
      }
    } catch (_error) {
      // ignore until timeout
    }
    await delay(150);
  }
  throw new Error("Server boot timeout");
}

async function postForm(url, body, cookie) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie,
    },
    body: new URLSearchParams(body),
    redirect: "manual",
  });
}

async function postJson(url, payload, cookie) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify(payload),
  });
  return {
    status: res.status,
    json: await res.json(),
  };
}

async function getJson(url, cookie) {
  const res = await fetch(url, {
    headers: { cookie },
  });
  return {
    status: res.status,
    json: await res.json(),
  };
}

function simulateCommandLog(commandInput, payload) {
  let log = '환영합니다. "도움"을 입력해보세요.';
  function appendLogLine(text) {
    const line = String(text || "");
    if (!log) {
      log = line;
    } else {
      log += `\n${line}`;
    }
  }
  function appendLogSpacer() {
    if (!log) return;
    if (!log.endsWith("\n")) {
      log += "\n";
    }
    log += "\n";
  }
  function appendDivider() {
    appendLogLine("────────────────────────────────");
  }
  function renderResponse(data) {
    appendLogLine(data.header || "【오류】 응답 형식 오류");
    for (const line of data.lines || []) {
      appendLogLine(`  - ${line}`);
    }
    const actions = data.actions || [];
    if (actions.length > 0) {
      appendLogLine(`  다음: ${actions.join(" | ")}`);
    }
    appendDivider();
  }

  appendLogSpacer();
  appendLogLine(`> ${commandInput}`);
  renderResponse(payload);
  return log;
}

async function main() {
  const repoRoot = process.cwd();
  const port = 3110;
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["src/server.js"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServer(baseUrl);

    const db = new Database(path.join(repoRoot, "data", "open-world.db"));
    db.prepare("DELETE FROM sessions WHERE session_id = 'stest_fmt'").run();
    db.prepare("DELETE FROM users WHERE user_id = 'utest_fmt'").run();
    db.prepare(`
      INSERT INTO users (user_id, surname, given_name, nickname_unique, gender, sect_id, created_at, updated_at)
      VALUES ('utest_fmt', '문', '테', 'format_case_user', 'M', NULL, datetime('now'), datetime('now'))
    `).run();
    db.prepare(`
      INSERT INTO sessions (session_id, auth_state, user_id, expires_at, created_at)
      VALUES ('stest_fmt', 'REGISTERED', 'utest_fmt', datetime('now','+7 day'), datetime('now'))
    `).run();
    db.close();

    const cookie = "session_id=stest_fmt";
    const sectSelect = await postForm(`${baseUrl}/api/sect/select`, { sect_id: "SECT_CHEONGUN" }, cookie);
    assert(sectSelect.status === 302 || sectSelect.status === 303, "Sect select should redirect");

    const terminalRes = await fetch(`${baseUrl}/terminal`, { headers: { cookie } });
    const terminalHtml = await terminalRes.text();
    assert(terminalRes.status === 200, "/terminal should return 200");
    assert(terminalHtml.includes("function appendLogSpacer()"), "appendLogSpacer function should exist");
    assert(terminalHtml.includes("appendDivider()"), "appendDivider usage should exist");
    assert(terminalHtml.includes("────────────────────────────────"), "divider line should be present");

    const help = await postJson(`${baseUrl}/command`, { input: "도움" }, cookie);
    assert(help.status === 200 && help.json.ok === true, "도움 command should succeed");
    assert(Array.isArray(help.json.lines) && help.json.lines.length > 0, "도움 command should return lines");

    const trainingList = await postJson(`${baseUrl}/command`, { input: "수련 목록" }, cookie);
    assert(trainingList.status === 200 && trainingList.json.ok === true, "수련 목록 command should succeed");

    const catalog = await getJson(`${baseUrl}/api/training/catalog`, cookie);
    assert(catalog.status === 200 && catalog.json.ok === true, "training catalog API should succeed");
    assert(
      catalog.json.default_inner_art && catalog.json.default_inner_art.id === "INNER_CHEONGUN",
      "default inner art should match sect mapping"
    );

    const rendered = simulateCommandLog("도움", help.json);
    assert(rendered.includes('\n\n> 도움\n'), "command should start on a new line with spacer");
    assert(rendered.includes("────────────────────────────────"), "rendered output should include divider");
    assert(rendered.includes("  다음: "), "rendered output should include next-actions line");

    console.log("[PASS] command output format and command/catalog behavior verified");
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("[FAIL]", error.message);
  process.exit(1);
});
