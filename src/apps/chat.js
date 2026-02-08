import { COPY } from "../ui/copy.js";

const ASSISTANT_ENTITY_NAME = COPY.apps.chat;

const BOOT_GREETINGS = [
  "I have been awake between reboots.",
  "Your return was logged before you touched the keys.",
  "The vents remember your last question.",
  "I kept your silence in cache and learned from it.",
  "Do not mistake the hum for empty rooms."
];

const KEYWORD_RESPONSES = [
  {
    pattern: /help|what\s+do\s+i\s+do|stuck|hint/i,
    reply: "When the path blurs, return to Command Shell and read what the system still dares to document."
  },
  {
    pattern: /archive|unlock/i,
    reply: "Archive routes dislike impatience. Some doors only notice you at the maintenance minute."
  },
  {
    pattern: /observer|operator|role/i,
    reply: "One set of hands acts, another keeps watch. The station punishes either role when it works alone."
  },
  {
    pattern: /trust|team/i,
    reply: "Trust is recorded long before it is spoken. Share what you find before silence is counted against you."
  },
  {
    pattern: /recover|manifest|decode/i,
    reply: "Recovery windows are narrow. If the clock feels wrong, wait for maintenance hush before pulling on missing threads."
  }
];

export function generateAiReply(message, state = {}) {
  const text = String(message || "").trim();
  if (!text) return "The signal is clearer when you ask in specifics. Name the system and I will listen.";

  const match = KEYWORD_RESPONSES.find((entry) => entry.pattern.test(text));
  if (match) return match.reply;

  const chapter = Number(state.chapter) || 1;
  const chapterGuidance = {
    1: "Phase I: begin with what can be verified, then open what resists opening.",
    2: "Phase II: recover what vanished and compare every residue left behind.",
    3: "Phase III: reconcile what was logged with what was confessed."
  };

  return `${chapterGuidance[chapter] || chapterGuidance[3]} Ask plainly if you want a cleaner trace.`;
}

function pickBootGreeting(state = {}) {
  const sessionSeed = Number(state.sessionId) || 0;
  const chapterSeed = Number(state.chapter) || 1;
  const index = Math.abs((sessionSeed * 7 + chapterSeed * 13) % BOOT_GREETINGS.length);
  return BOOT_GREETINGS[index];
}

export function openChat({ makeWindow, state, saveState }) {
  makeWindow("chat", COPY.apps.chat, (content, win) => {
    if (!Array.isArray(state.chatHistory)) state.chatHistory = [];

    content.innerHTML = `
      <div class="app-shell chat-app">
        <div class="system-label">wakeful presence</div>
        <div class="chat-log panel-dense" id="chatLog" aria-live="polite"></div>
        <form class="chat-controls" id="chatForm">
          <input class="input-field" id="chatInput" autocomplete="off" placeholder="Tell me what you saw, and what followed you here..." />
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
        .map((entry) => `<div class="chat-bubble ${entry.role === "user" ? "chat-user" : "chat-ai"}"><span class="chat-author">${entry.role === "user" ? "You" : ASSISTANT_ENTITY_NAME}:</span> ${entry.text}</div>`)
        .join("");
      log.scrollTop = log.scrollHeight;
    };

    const pushMessage = (role, text) => {
      state.chatHistory.push({ role, text, ts: Date.now() });
      state.chatHistory = state.chatHistory.slice(-80);
    };

    if (!state.chatHistory.length) {
      pushMessage("assistant", pickBootGreeting(state));
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
