const COMMAND_ALIAS = {
  도움: "help",
  help: "help",
  h: "help",
  "?": "help",
  상태: "status",
  status: "status",
  stat: "status",
  문파: "sect",
  sect: "sect",
};

function firstToken(input) {
  return String(input || "").trim().split(/\s+/)[0] || "";
}

function parseCommandInput(input) {
  const raw = String(input || "").trim();
  const cleaned = raw.replace(/^\/+/, "");
  const parts = cleaned ? cleaned.split(/\s+/) : [];
  const token = parts[0] || "";
  const tokenLower = token.toLowerCase();
  const canonical = COMMAND_ALIAS[token] || COMMAND_ALIAS[tokenLower] || "";
  return {
    raw,
    token,
    canonical,
    args: parts.slice(1),
  };
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

function getTerminalDetail(db, userId) {
  return db.prepare(`
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
  `).get(userId);
}

function getSectDepartmentNames(db, sectId, limit = 3) {
  return db.prepare(`
    SELECT display_name
    FROM sect_departments
    WHERE sect_id = ?
    ORDER BY elder_slot_index
    LIMIT ?
  `).all(sectId, limit).map((row) => row.display_name);
}

function buildHelpLinesFor(target) {
  if (target === "status") {
    return [
      "상태(status): 캐릭터와 소속 상태를 보여줍니다.",
      "예시: 상태",
      "표시: 이름/성별/소속/현재시간(KST)",
    ];
  }
  if (target === "sect") {
    return [
      "문파(sect): 소속 문파 상세 정보를 보여줍니다.",
      "예시: 문파",
      "표시: 문파/세력/위상/정원/조직(최대 3개)",
    ];
  }
  return [
    "도움(help): 지원 명령 목록 표시",
    "상태(status): 캐릭터와 소속 상태 표시",
    "문파(sect): 문파 상세 정보 표시",
    "예시: /상태, 도움 문파",
  ];
}

function buildCommandResponse(parsed, detail, deptNames) {
  const command = parsed.canonical;

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
    const target = parseCommandInput(parsed.args[0] || "").canonical;
    return {
      ok: true,
      header: target ? "【안내】 명령 도움" : "【안내】 지원 명령",
      lines: buildHelpLinesFor(target),
      actions: target ? ["도움", "상태", "문파"] : ["상태", "문파", "도움"],
    };
  }

  return {
    ok: false,
    header: "【오류】 알 수 없는 명령",
    lines: [
      `입력: ${parsed.token || "(빈 입력)"}`,
      "지원 명령: 도움, 상태, 문파",
      "예시: /도움 또는 상태",
    ],
    actions: ["도움", "상태", "문파"],
  };
}

module.exports = {
  firstToken,
  parseCommandInput,
  buildCommandResponse,
  getTerminalDetail,
  getSectDepartmentNames,
};
