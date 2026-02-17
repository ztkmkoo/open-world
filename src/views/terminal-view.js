function renderTerminalContent(detail) {
  return `
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
            <button type="button" class="chat-tab active" data-chat-tab="all">전체</button>
            <button type="button" class="chat-tab" data-chat-tab="sect">문파</button>
            <button type="button" class="chat-tab" data-chat-tab="whisper">귓</button>
          </div>
          <div class="log" id="chat-log">채팅 연결 중...</div>
          <div class="row">
            <input id="chat-input" style="flex:1;" placeholder="채팅 입력 (/문파 내용, @닉 내용)" />
            <button id="chat-send" type="button">전송</button>
          </div>
        </div>
      </div>
      <script>
        const logEl = document.getElementById("log");
        const inputEl = document.getElementById("cmd-input");
        const sendBtn = document.getElementById("cmd-send");
        const chatLogEl = document.getElementById("chat-log");
        const chatInputEl = document.getElementById("chat-input");
        const chatSendBtn = document.getElementById("chat-send");
        const chatTabs = Array.from(document.querySelectorAll("[data-chat-tab]"));
        const TICK_INTERVAL_MS = 10 * 60 * 1000;

        let currentChatTab = "all";
        const chatBuffer = {
          all: [],
          sect: [],
          whisper: [],
        };
        let tickTimerId = null;

        function appendLogLine(text) {
          const line = String(text || "");
          if (!logEl.textContent) {
            logEl.textContent = line;
          } else {
            logEl.textContent += "\\n" + line;
          }
          logEl.scrollTop = logEl.scrollHeight;
        }

        function appendLogSpacer() {
          if (!logEl.textContent) return;
          if (!logEl.textContent.endsWith("\\n")) {
            logEl.textContent += "\\n";
          }
          logEl.textContent += "\\n";
          logEl.scrollTop = logEl.scrollHeight;
        }

        function appendDivider() {
          appendLogLine("────────────────────────────────");
        }

        function renderResponse(data) {
          appendLogLine(data.header || "【오류】 응답 형식 오류");
          for (const line of data.lines || []) {
            appendLogLine("  - " + line);
          }
          const actions = data.actions || [];
          if (actions.length > 0) {
            appendLogLine("  다음: " + actions.join(" | "));
          }
          appendDivider();
        }

        async function sendCommand() {
          const input = inputEl.value.trim();
          if (!input) return;
          appendLogSpacer();
          appendLogLine("> " + input);
          inputEl.value = "";
          try {
            const res = await fetch("/command", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ input }),
            });
            const payload = await res.json();
            renderResponse(payload);
            if (!res.ok) {
              appendLogLine("  ! 요청 실패: HTTP " + res.status);
              appendDivider();
            }
          } catch (_err) {
            appendLogLine("  ! 요청 실패: 네트워크 오류");
            appendDivider();
          }
        }

        function newClientRequestId() {
          if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
          }
          return "tick-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
        }

        async function runCatchupOnce() {
          try {
            const res = await fetch("/tick/catchup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({}),
            });
            const payload = await res.json();
            if (!res.ok || !payload.ok) {
              appendLogLine("[SYSTEM] catchup failed: HTTP " + res.status);
              return;
            }
            const tickCount = Number(payload.tick_count || 0);
            if (tickCount > 0) {
              appendLogLine("[SYSTEM] catchup applied ticks: " + tickCount);
            }
          } catch (_error) {
            appendLogLine("[SYSTEM] catchup skipped: network error");
          }
        }

        async function runTickOnce() {
          try {
            const res = await fetch("/tick", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                client_request_id: newClientRequestId(),
              }),
            });
            const payload = await res.json();
            if (!res.ok || !payload.ok) {
              appendLogLine("[SYSTEM] tick failed: HTTP " + res.status);
              return;
            }
            const applied = Number(payload.applied_ticks || 0);
            if (payload.duplicate) {
              appendLogLine("[SYSTEM] tick ignored (duplicate request_id)");
              return;
            }
            if (payload.penalized) {
              appendLogLine("[SYSTEM] tick penalized (too early)");
              return;
            }
            if (applied > 0) {
              appendLogLine("[SYSTEM] tick applied: " + applied);
            }
          } catch (_error) {
            appendLogLine("[SYSTEM] tick skipped: network error");
          }
        }

        async function startTickLoop() {
          if (tickTimerId !== null) return;
          await runCatchupOnce();
          tickTimerId = window.setInterval(() => {
            runTickOnce();
          }, TICK_INTERVAL_MS);
        }

        sendBtn.addEventListener("click", sendCommand);
        inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            sendCommand();
          }
        });

        function appendChat(channel, text) {
          if (channel !== "all" && channel !== "sect" && channel !== "whisper") {
            channel = "all";
          }
          if (channel === "all") {
            chatBuffer.all.push(text);
          } else {
            chatBuffer[channel].push(text);
            chatBuffer.all.push(text);
          }
          renderChat();
        }

        function renderChat() {
          const source = currentChatTab === "all" ? chatBuffer.all : chatBuffer[currentChatTab];
          chatLogEl.textContent = source.join("\\n");
          chatLogEl.scrollTop = chatLogEl.scrollHeight;
        }

        function parseChatInput(raw) {
          const input = raw.trim();
          if (!input) return null;

          if (input.startsWith("/문파 ")) {
            return { channel: "sect", text: input.slice(4).trim() };
          }

          if (input.startsWith("@")) {
            const parts = input.split(/\\s+/);
            const target = parts[0].slice(1).trim();
            const text = parts.slice(1).join(" ").trim();
            if (!target || !text) return { error: "귓말 형식: @닉 내용" };
            return { channel: "whisper", to: target, text };
          }

          if (currentChatTab === "sect") {
            return { channel: "sect", text: input };
          }
          if (currentChatTab === "whisper") {
            return { error: "귓 탭에서는 @닉 내용 형식으로 입력하세요." };
          }
          return { channel: "global", text: input };
        }

        const scheme = location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(scheme + "://" + location.host + "/ws/chat");

        ws.addEventListener("open", () => {
          appendChat("all", "[system] 채팅 연결 성공");
        });

        ws.addEventListener("close", () => {
          appendChat("all", "[system] 채팅 연결 종료");
        });

        ws.addEventListener("message", (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (!msg || msg.type !== "chat") return;

            const ts = msg.ts ? new Date(msg.ts).toLocaleTimeString("ko-KR", { hour12: false }) : "--:--:--";
            if (msg.channel === "system") {
              appendChat("all", "[" + ts + "][system] " + msg.text);
              return;
            }

            const to = msg.to ? " -> " + msg.to : "";
            const line = "[" + ts + "][" + msg.channel + "] " + msg.from + to + ": " + msg.text;
            if (msg.channel === "global") appendChat("all", line);
            if (msg.channel === "sect") appendChat("sect", line);
            if (msg.channel === "whisper") appendChat("whisper", line);
          } catch (_error) {
            appendChat("all", "[system] 채팅 메시지 파싱 실패");
          }
        });

        function sendChat() {
          const parsed = parseChatInput(chatInputEl.value);
          if (!parsed) return;

          if (parsed.error) {
            appendChat("all", "[system] " + parsed.error);
            return;
          }

          if (ws.readyState !== WebSocket.OPEN) {
            appendChat("all", "[system] 채팅 서버에 연결되어 있지 않습니다.");
            return;
          }

          ws.send(JSON.stringify({
            type: "chat",
            channel: parsed.channel,
            to: parsed.to || "",
            text: parsed.text,
          }));
          chatInputEl.value = "";
        }

        chatSendBtn.addEventListener("click", sendChat);
        chatInputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            sendChat();
          }
        });

        for (const tab of chatTabs) {
          tab.addEventListener("click", () => {
            currentChatTab = tab.dataset.chatTab;
            for (const t of chatTabs) {
              t.classList.toggle("active", t === tab);
            }
            renderChat();
          });
        }

        startTickLoop();
      </script>
    </div>
  `;
}

module.exports = {
  renderTerminalContent,
};
