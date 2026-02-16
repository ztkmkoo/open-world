function registerCharacterRoutes(app, deps) {
  const {
    htmlPage,
    db,
    requireRegistered,
    loadUser,
    assignSectTx,
    redirectWithAlert,
  } = deps;

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
        res.status(409).send(redirectWithAlert("만석", "/choose-faction"));
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
}

module.exports = {
  registerCharacterRoutes,
};
