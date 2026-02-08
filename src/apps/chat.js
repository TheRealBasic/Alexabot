import { COPY } from "../ui/copy.js";

const KEYWORD_RESPONSES = [
  {
    pattern: /help|what\s+do\s+i\s+do|stuck|hint/i,
    reply: "If you're stuck, open Command Shell and run `help`, then inspect /system/help for chapter-specific procedures."
  },
  {
    pattern: /archive|unlock/i,
    reply: "Archive routes are unstable; align workstation time to 03:11 before forcing sensitive unlock paths."
  },
  {
    pattern: /observer|operator|role/i,
    reply: "Operator executes corrective actions; Observer monitors anomalies and relays transient codes. Coordinate both roles."
  },
  {
    pattern: /trust|team/i,
    reply: "Trust score changes based on cooperative behavior. Share findings early to avoid conflict penalties."
  },
  {
    pattern: /recover|manifest|decode/i,
    reply: "Recovery tasks are window-sensitive. Use `recover --manifest` during maintenance-aligned clock states."
  }
];

export function generateAiReply(message, state = {}) {
  const text = String(message || "").trim();
  if (!text) return "I can help with commands, objectives, and anomaly triage. Ask me what to do next.";

  const match = KEYWORD_RESPONSES.find((entry) => entry.pattern.test(text));
  if (match) return match.reply;

  const chapter = Number(state.chapter) || 1;
  const chapterGuidance = {
    1: "Phase I guidance: verify directory evidence, then unlock archive access through valid command flow.",
    2: "Phase II guidance: recover withheld records and cross-check decoded artifacts in logs and media.",
    3: "Phase III guidance: reconcile logs and correspondence, then complete final disclosure objectives."
  };

  return `${chapterGuidance[chapter] || chapterGuidance[3]} Keep prompts concrete for better assistance.`;
}

export function openChat({ makeWindow, state, saveState }) {
  makeWindow("chat", COPY.apps.chat, (content, win) => {
    if (!Array.isArray(state.chatHistory)) state.chatHistory = [];

    content.innerHTML = `
      <div class="app-shell chat-app">
        <div class="system-label">continuity assistant</div>
        <div class="chat-log panel-dense" id="chatLog" aria-live="polite"></div>
        <form class="chat-controls" id="chatForm">
          <input class="input-field" id="chatInput" autocomplete="off" placeholder="Ask the assistant about objectives, commands, or logs..." />
          <button class="btn-primary" type="submit">Send</button>
        </form>
      </div>
    `;

    const log = content.querySelector("#chatLog");
    const form = content.querySelector("#chatForm");
    const input = content.querySelector("#chatInput");

    const render = () => {
      log.innerHTML = state.chatHistory
        .slice(-30)
        .map((entry) => `<div class="chat-bubble ${entry.role === "user" ? "chat-user" : "chat-ai"}"><span class="chat-author">${entry.role === "user" ? "You" : "Eidolon AI"}:</span> ${entry.text}</div>`)
        .join("");
      log.scrollTop = log.scrollHeight;
    };

    const pushMessage = (role, text) => {
      state.chatHistory.push({ role, text, ts: Date.now() });
      state.chatHistory = state.chatHistory.slice(-80);
    };

    if (!state.chatHistory.length) {
      pushMessage("assistant", "Continuity assistant online. Ask for mission guidance, command syntax, or objective triage.");
      saveState();
    }

    render();
    win?.setHealth?.("active");

    form.onsubmit = (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;

      pushMessage("user", message);
      const reply = generateAiReply(message, state);
      pushMessage("assistant", reply);
      input.value = "";
      render();
      saveState();
      win?.setHealth?.("active");
    };
  });
}
