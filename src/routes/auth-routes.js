function registerAuthRoutes(app, deps) {
  const {
    htmlPage,
    db,
    newId,
    nowIsoPlusDays,
    requireAuthenticated,
    loadUser,
    SURNAME_ALLOWLIST,
    GIVEN_NAME_REGEX,
    redirectWithAlert,
  } = deps;

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
}

module.exports = {
  registerAuthRoutes,
};
