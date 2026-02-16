const WebSocket = require("ws");

function parseCookies(cookieHeader) {
  const cookies = {};
  const parts = String(cookieHeader || "").split(";");
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join("=") || "");
  }
  return cookies;
}

function sendJson(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function systemMessage(text) {
  return {
    type: "chat",
    channel: "system",
    from: "system",
    text,
    ts: new Date().toISOString(),
  };
}

function initChatWebSocket({ server, db }) {
  const wss = new WebSocket.Server({ server, path: "/ws/chat" });
  const clients = new Map();

  function findOnlineUserByNickname(nickname) {
    for (const [socket, profile] of clients.entries()) {
      if (socket.readyState === WebSocket.OPEN && profile.nickname === nickname) {
        return { socket, profile };
      }
    }
    return null;
  }

  function broadcast(payload, predicate) {
    for (const [socket, profile] of clients.entries()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (!predicate || predicate(profile)) {
        sendJson(socket, payload);
      }
    }
  }

  wss.on("connection", (ws, request) => {
    try {
      const cookies = parseCookies(request.headers.cookie);
      const sessionId = cookies.session_id;
      if (!sessionId) {
        ws.close(1008, "Unauthorized");
        return;
      }

      const session = db.prepare(`
        SELECT user_id, auth_state
        FROM sessions
        WHERE session_id = ?
      `).get(sessionId);

      if (!session || session.auth_state !== "REGISTERED" || !session.user_id) {
        ws.close(1008, "Unauthorized");
        return;
      }

      const user = db.prepare(`
        SELECT user_id, nickname_unique, sect_id
        FROM users
        WHERE user_id = ?
      `).get(session.user_id);

      if (!user) {
        ws.close(1008, "Unauthorized");
        return;
      }

      const profile = {
        userId: user.user_id,
        nickname: user.nickname_unique,
        sectId: user.sect_id || null,
      };
      clients.set(ws, profile);
      sendJson(ws, systemMessage("채팅 서버에 연결되었습니다."));

      ws.on("message", (raw) => {
        let message;
        try {
          message = JSON.parse(String(raw));
        } catch (_error) {
          sendJson(ws, systemMessage("잘못된 메시지 형식입니다."));
          return;
        }

        if (!message || message.type !== "chat") {
          sendJson(ws, systemMessage("지원하지 않는 메시지 타입입니다."));
          return;
        }

        const channel = String(message.channel || "").trim();
        const text = String(message.text || "").trim();
        const to = String(message.to || "").trim();

        if (!["global", "sect", "whisper"].includes(channel)) {
          sendJson(ws, systemMessage("지원하지 않는 채널입니다."));
          return;
        }
        if (text.length < 1 || text.length > 200) {
          sendJson(ws, systemMessage("채팅은 1~200자여야 합니다."));
          return;
        }

        const ts = new Date().toISOString();

        if (channel === "global") {
          const payload = { type: "chat", channel, from: profile.nickname, text, ts };
          broadcast(payload);
          return;
        }

        if (channel === "sect") {
          if (!profile.sectId) {
            sendJson(ws, systemMessage("문파 소속이 없어 문파 채팅을 사용할 수 없습니다."));
            return;
          }
          const payload = { type: "chat", channel, from: profile.nickname, text, ts };
          broadcast(payload, (target) => target.sectId === profile.sectId);
          return;
        }

        if (!to) {
          sendJson(ws, systemMessage("귓말 대상이 필요합니다. 예: @닉 내용"));
          return;
        }

        const target = findOnlineUserByNickname(to);
        if (!target) {
          sendJson(ws, systemMessage(`접속 중인 대상이 없습니다: ${to}`));
          return;
        }

        const payload = { type: "chat", channel, from: profile.nickname, to, text, ts };
        sendJson(target.socket, payload);
        if (target.socket !== ws) {
          sendJson(ws, payload);
        }
      });

      ws.on("close", () => {
        clients.delete(ws);
      });
    } catch (error) {
      console.error("[WS] connection error:", error.message);
      ws.close(1011, "Server error");
    }
  });

  return wss;
}

module.exports = {
  initChatWebSocket,
};
