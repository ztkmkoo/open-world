function registerCharacterRoutes(app, deps) {
  const {
    htmlPage,
    db,
    requireRegistered,
    loadUser,
    assignSectTx,
    assignSquadTx,
    onSectAssigned,
    redirectWithAlert,
  } = deps;

  app.get("/choose-faction", (req, res) => {
    const session = requireRegistered(req, res);
    if (!session) return;

    const user = loadUser(session.user_id);
    if (user && user.sect_id) {
      res.redirect(user.squad_id ? "/terminal" : "/choose-squad");
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
      res.redirect(user.squad_id ? "/terminal" : "/choose-squad");
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
        res.status(409).send(redirectWithAlert("만석", "/choose-faction"));
        return;
      }
      if (result.code === "ALREADY_ASSIGNED") {
        const user = loadUser(session.user_id);
        res.redirect(user && user.squad_id ? "/terminal" : "/choose-squad");
        return;
      }
      res.status(400).send(redirectWithAlert("선택 처리에 실패했습니다.", "/choose-faction"));
      return;
    }

    if (typeof onSectAssigned === "function") {
      onSectAssigned(session.user_id, sectId);
    }

    res.redirect("/choose-squad");
  });

  app.get("/choose-squad", (req, res) => {
    const session = requireRegistered(req, res);
    if (!session) return;

    const user = loadUser(session.user_id);
    if (!user || !user.sect_id) {
      res.redirect("/choose-faction");
      return;
    }
    if (user.squad_id) {
      res.redirect("/terminal");
      return;
    }

    const rows = db.prepare(`
      SELECT
        ss.squad_id,
        ss.display_name AS squad_name,
        ss.roster_count,
        ss.capacity_total,
        sh.display_name AS hall_name,
        sd.display_name AS dept_name
      FROM sect_squads ss
      JOIN sect_halls sh ON sh.hall_id = ss.hall_id
      JOIN sect_departments sd ON sd.dept_id = sh.dept_id
      WHERE ss.sect_id = ?
      ORDER BY ss.squad_slot_index
    `).all(user.sect_id);

    const list = rows.map((row) => {
      const full = row.roster_count >= row.capacity_total;
      return `
        <form method="post" action="/api/squad/select" style="margin-bottom:10px;">
          <input type="hidden" name="squad_id" value="${row.squad_id}" />
          <button type="submit" ${full ? "disabled" : ""}>
            ${row.squad_name} (${row.roster_count}/${row.capacity_total}) - ${row.dept_name} / ${row.hall_name} ${full ? "- 만석" : ""}
          </button>
        </form>
      `;
    }).join("");

    res.send(htmlPage("대 선택", `
      <div class="card">
        <h1>대 선택</h1>
        <p>문파 가입 후에는 대를 선택해야 터미널에 입장할 수 있습니다.</p>
        ${list || "<p>선택 가능한 대가 없습니다.</p>"}
      </div>
    `));
  });

  app.post("/api/squad/select", (req, res) => {
    const session = requireRegistered(req, res);
    if (!session) return;

    const squadId = String(req.body.squad_id || "").trim();
    if (!squadId) {
      res.status(400).send(redirectWithAlert("대를 선택해주세요.", "/choose-squad"));
      return;
    }

    const result = assignSquadTx(session.user_id, squadId);
    if (!result.ok) {
      if (result.code === "SQUAD_FULL") {
        res.status(409).send(redirectWithAlert("대 정원이 가득 찼습니다.", "/choose-squad"));
        return;
      }
      if (result.code === "ALREADY_ASSIGNED") {
        res.redirect("/terminal");
        return;
      }
      res.status(400).send(redirectWithAlert("대 선택 처리에 실패했습니다.", "/choose-squad"));
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
}

module.exports = {
  registerCharacterRoutes,
};
