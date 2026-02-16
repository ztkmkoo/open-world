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
          appendLog(data.header || "【오류】 응답 형식 오류");
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
            renderResponse(payload);
            if (!res.ok) {
              appendLog("요청 실패: HTTP " + res.status);
            }
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
  `;
}

module.exports = {
  renderTerminalContent,
};
