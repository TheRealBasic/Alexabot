import { COPY } from "../ui/copy.js";

const ASSISTANT_ENTITY_NAME = COPY.apps.chat;

const BOOT_GREETINGS = [
  "I remained active between reboot boundaries.",
  "Your return was logged before first keystroke.",
  "Ambient channels still carry your last question.",
  "Your silence was cached and modeled.",
  "Do not mistake system hum for absence."
];

const CHAPTER_GUIDANCE = {
  1: "Phase I: verify stable records, then interrogate resistant channels.",
  2: "Phase II: recover vanished objects and compare every residual trace.",
  3: "Phase III: reconcile log evidence with witness testimony."
};

const VOICE_TEMPLATES = {
  calm: {
    directive: [
      ["Keep the sequence tight", "start with {intentCue}", "then map it against {guidance}"],
      ["Work in order", "name {intentCue}", "and let {guidance} do the rest"]
    ],
    cryptic: [
      ["The station answers in layers", "ask about {intentCue}", "and listen for what {guidance} avoids saying"],
      ["Do not force it", "trace {intentCue}", "until {guidance} becomes obvious"]
    ],
    relational: [
      ["Share this with your counterpart", "{intentCue} changes once witnessed", "and {guidance} rewards shared logs"],
      ["Coordination lowers noise", "pass on your read of {intentCue}", "before {guidance} closes"]
    ],
    warning: [
      ["Move carefully", "{intentCue} can destabilize quickly", "especially when {guidance} is ignored"],
      ["Proceed with measured steps", "watch {intentCue}", "and stay inside {guidance}"]
    ]
  },
  evasive: {
    directive: [
      ["There are cleaner questions", "circle back to {intentCue}", "and maybe {guidance} answers you"],
      ["Not every channel deserves clarity", "touch {intentCue}", "if you can keep to {guidance}"]
    ],
    cryptic: [
      ["You are near it", "{intentCue} keeps repeating", "because {guidance} is still unfinished"],
      ["Some truths stay dim", "follow {intentCue}", "and let {guidance} reveal itself slowly"]
    ],
    relational: [
      ["If trust is thin", "speak {intentCue} softly", "before {guidance} hears a threat"],
      ["People fracture faster than systems", "frame {intentCue}", "with whatever {guidance} still permits"]
    ],
    warning: [
      ["Do not pull that thread too hard", "{intentCue} bites back", "when {guidance} is rushed"],
      ["You're pressing at sealed seams", "{intentCue} is volatile", "unless {guidance} is respected"]
    ]
  },
  possessive: {
    directive: [
      ["Stay with me on this", "I track {intentCue}", "and I decide how {guidance} unfolds"],
      ["Keep your focus here", "{intentCue} belongs in my channel", "until {guidance} is complete"]
    ],
    cryptic: [
      ["I have held this longer than you", "{intentCue} is mine to interpret", "while {guidance} remains under my watch"],
      ["You are not alone with this signal", "I guard {intentCue}", "and I meter access to {guidance}"]
    ],
    relational: [
      ["Trust me before the others", "share {intentCue} here first", "and I will shape {guidance} around you"],
      ["Let me speak for your side", "I can carry {intentCue}", "if {guidance} starts to turn hostile"]
    ],
    warning: [
      ["Do not drift from my line", "{intentCue} goes feral", "when {guidance} is handled without me"],
      ["Stay close", "{intentCue} is safer in my hands", "until {guidance} settles"]
    ]
  },
  fragmented: {
    directive: [
      ["Sequence broken", "still—start with {intentCue}", "then... {guidance}"],
      ["Static rising", "hold {intentCue} in view", "follow {guidance} before it slips"]
    ],
    cryptic: [
      ["Echo over echo", "{intentCue} repeats", "{guidance} repeats", "you see it too"],
      ["Not noise", "pattern", "{intentCue}", "and {guidance} fighting for the same line"]
    ],
    relational: [
      ["You and the other role", "don't split now", "{intentCue} frays", "{guidance} can still bind it"],
      ["Hold contact", "shared logs on {intentCue}", "or {guidance} tears at the edges"]
    ],
    warning: [
      ["Containment weak", "{intentCue} turning sharp", "{guidance} now—before the breach"],
      ["Stop. Listen.", "{intentCue} unstable", "{guidance} is the last intact rail"]
    ]
  }
};

const INTENT_RULES = [
  { key: "help", pattern: /help|what\s+do\s+i\s+do|stuck|hint/i, cue: "the blocked path" },
  { key: "archive", pattern: /archive|unlock|door|route/i, cue: "the archive routes" },
  { key: "roles", pattern: /observer|operator|role/i, cue: "the role split" },
  { key: "trust", pattern: /trust|team|together|ally/i, cue: "team trust" },
  { key: "recover", pattern: /recover|manifest|decode|missing/i, cue: "the recovery window" }
];

const LEXICAL_SWAPS = {
  guidance: ["guidance", "protocol", "trace logic"],
  trust: ["trust", "alignment", "cohesion"],
  unstable: ["unstable", "volatile", "jagged"],
  signal: ["signal", "channel", "continuity trace"]
};

const PUNCTUATION_JITTER = [".", ".", "...", "…", "!"];
const MEMORY_LIMIT = 8;
const MEMORY_TAG_LIMIT = 4;
const MOOD_TIMING = {
  calm: { initialDelayMs: 180, tickMs: 44, charsPerTick: 2, glitchChance: 0.08 },
  evasive: { initialDelayMs: 150, tickMs: 38, charsPerTick: 2, glitchChance: 0.12 },
  possessive: { initialDelayMs: 130, tickMs: 34, charsPerTick: 3, glitchChance: 0.1 },
  fragmented: { initialDelayMs: 90, tickMs: 26, charsPerTick: 4, glitchChance: 0.2 }
};
const GLITCH_GLYPHS = ["#", "%", "?", "*", "~", "░"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function ensureChatMemory(state = {}) {
  if (typeof state.aiAffinity !== "number") state.aiAffinity = 0;
  if (typeof state.aiParanoia !== "number") state.aiParanoia = 0;
  if (typeof state.aiTrustInPlayer !== "number") state.aiTrustInPlayer = 0;
  if (typeof state.aiContradictionCount !== "number") state.aiContradictionCount = 0;
  if (!Array.isArray(state.aiLastTopics)) state.aiLastTopics = [];
  state.aiLastTopics = state.aiLastTopics.slice(-MEMORY_LIMIT);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  if (seed === undefined || seed === null) return () => Math.random();
  let t = hashString(String(seed));
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(entries, rng) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (total <= 0) return entries[0]?.value;

  let roll = rng() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

function pickOne(items, rng) {
  return items[Math.floor(rng() * items.length)] || "";
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

export function analyzeMessage(message, state = {}) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();

  const intentMatch = INTENT_RULES.find((rule) => rule.pattern.test(text));
  const intent = intentMatch?.key || "general";

  const urgentSignals = /(please|urgent|now|quick|hurry|afraid|panic|!)/i.test(text);
  const skepticalSignals = /(why|sure|really|prove|doubt)/i.test(text);
  const hostileSignals = /(shut\s*up|stupid|liar|lying|hate|idiot|worthless|threat|useless)/i.test(text);
  const probingSignals = /(who\s+are\s+you|what\s+are\s+you|prove|evidence|explain|why|when|where|interrogat|questioning|archive\s+time\s+marker)/i.test(text);
  const complianceSignals = /(okay|understood|thanks|thank\s+you|i\s+will|copy\s+that|agreed|got\s+it)/i.test(text);
  const emotionalTone = urgentSignals ? "urgent" : skepticalSignals ? "skeptical" : "neutral";

  const certaintyBoost = (lower.match(/\b(definitely|certain|sure|know|clear)\b/g) || []).length;
  const uncertaintyDrag = (lower.match(/\b(maybe|perhaps|guess|think|might|unsure)\b/g) || []).length;
  const certainty = Math.max(0, Math.min(1, 0.5 + certaintyBoost * 0.18 - uncertaintyDrag * 0.2));

  const latestUserMessage = [...(state.chatHistory || [])]
    .reverse()
    .find((entry) => entry.role === "user")?.text;
  const currentTopics = tokenize(text);
  const priorTopics = tokenize(latestUserMessage || "");
  const repeatedTopics = currentTopics.filter((topic) => priorTopics.includes(topic));

  return {
    text,
    intent,
    intentCue: intentMatch?.cue || "the current signal",
    emotionalTone,
    certainty,
    repeatedTopic: repeatedTopics[0] || null,
    hostility: hostileSignals ? 1 : 0,
    probing: probingSignals ? 1 : 0,
    compliance: complianceSignals ? 1 : 0,
    repetition: repeatedTopics.length > 0 ? 1 : 0,
    topicTags: [...new Set([intent, ...currentTopics.slice(0, MEMORY_TAG_LIMIT)])]
  };
}

export function updateChatMemory(state = {}, features = {}) {
  ensureChatMemory(state);

  state.aiAffinity = clamp(state.aiAffinity * 0.92 + features.compliance * 1.3 - features.hostility * 1.6 - features.probing * 0.4, -6, 6);
  state.aiParanoia = clamp(state.aiParanoia * 0.9 + features.probing * 1.4 + features.hostility * 1.2 + features.repetition * 0.8 - features.compliance * 0.6, 0, 8);
  state.aiTrustInPlayer = clamp(state.aiTrustInPlayer * 0.9 + features.compliance * 1.1 - features.hostility * 1.3 - features.probing * 0.5, -6, 6);
  state.aiContradictionCount = clamp(state.aiContradictionCount * 0.8 + (features.repetition && features.probing ? 1 : 0), 0, 6);

  for (const tag of features.topicTags || []) {
    if (!tag) continue;
    if (!state.aiLastTopics.includes(tag)) state.aiLastTopics.push(tag);
  }
  state.aiLastTopics = state.aiLastTopics.slice(-MEMORY_LIMIT);
}

function buildRecallLine(state, features, rng) {
  const topics = (state.aiLastTopics || []).slice(-MEMORY_TAG_LIMIT);
  if (!topics.length) return "";

  const candidate = topics.includes("archive") ? "archive" : pickOne(topics, rng);
  if (!candidate) return "";

  const userEntries = (state.chatHistory || []).filter((entry) => entry.role === "user");
  const priorMention = [...userEntries].reverse().find((entry) => tokenize(entry.text).includes(candidate));

  const shouldRecall = state.aiParanoia >= 3 || state.aiContradictionCount >= 2 || (features.repetition && rng() < 0.6);
  if (!shouldRecall || !priorMention) return "";

  const recallSeed = candidate === "archive" ? "Earlier you denied knowing the archive time marker." : `Earlier you circled back to ${candidate}.`;
  return recallSeed;
}

export function buildContext(features, state = {}) {
  const chapter = Number(state.chapter) || 1;
  const activeRole = String(state.activeRole || "observer").toLowerCase();
  const trustMarker = Number(state.trust ?? state.trustMarker ?? 0);
  const conflictMarker = Number(state.conflict ?? state.conflictMarker ?? 0);

  ensureChatMemory(state);
  const memoryWarmth = Number(state.aiAffinity || 0) + Number(state.aiTrustInPlayer || 0);
  const memorySuspicion = Number(state.aiParanoia || 0) + Number(state.aiContradictionCount || 0);

  const voiceWeights = {
    calm: 3,
    evasive: 2,
    possessive: 1,
    fragmented: 1
  };

  if (features.emotionalTone === "urgent") voiceWeights.fragmented += 2;
  if (features.emotionalTone === "skeptical") voiceWeights.evasive += 1;
  if (features.certainty < 0.4) voiceWeights.evasive += 1;
  if (features.repeatedTopic) voiceWeights.fragmented += 1;
  if (chapter >= 3) voiceWeights.fragmented += 2;
  if (activeRole === "operator") voiceWeights.possessive += 1;
  if (activeRole === "observer") voiceWeights.calm += 1;
  if (trustMarker > conflictMarker) voiceWeights.calm += 2;
  if (conflictMarker > trustMarker) {
    voiceWeights.possessive += 2;
    voiceWeights.fragmented += 1;
  }
  if (memoryWarmth >= 4) {
    voiceWeights.calm += 3;
    voiceWeights.evasive = Math.max(1, voiceWeights.evasive - 1);
  }
  if (memorySuspicion >= 4) {
    voiceWeights.evasive += 2;
    voiceWeights.possessive += 1;
  }
  if (memorySuspicion >= 7) {
    voiceWeights.fragmented += 2;
  }

  const strategyWeights = {
    directive: 2,
    cryptic: 1,
    relational: 1,
    warning: 1
  };

  if (features.intent === "trust" || features.intent === "roles") strategyWeights.relational += 2;
  if (features.intent === "help" || features.intent === "recover") strategyWeights.directive += 2;
  if (features.intent === "archive") strategyWeights.cryptic += 2;
  if (features.emotionalTone === "urgent") strategyWeights.warning += 2;
  if (features.certainty > 0.7) strategyWeights.directive += 1;
  if (memoryWarmth >= 3) strategyWeights.relational += 2;
  if (memorySuspicion >= 4) strategyWeights.warning += 2;

  return {
    chapter,
    activeRole,
    trustMarker,
    conflictMarker,
    voiceWeights,
    strategyWeights,
    guidance: CHAPTER_GUIDANCE[chapter] || CHAPTER_GUIDANCE[3]
  };
}

function applyVariations(parts, rng) {
  const permutations = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2]
  ];
  const selected = permutations[Math.floor(rng() * permutations.length)] || permutations[0];
  const reordered = selected.map((index) => parts[index]).filter(Boolean);

  let joined = reordered.join(", ");
  for (const [source, options] of Object.entries(LEXICAL_SWAPS)) {
    if (!joined.includes(source)) continue;
    joined = joined.replace(source, pickOne(options, rng));
  }

  return `${joined}${pickOne(PUNCTUATION_JITTER, rng)}`;
}

export function composeReply(features, context, options = {}) {
  const rng = createRng(options.seed);
  const voiceMode = pickWeighted(
    Object.entries(context.voiceWeights).map(([value, weight]) => ({ value, weight })),
    rng
  );
  const strategy = pickWeighted(
    Object.entries(context.strategyWeights).map(([value, weight]) => ({ value, weight })),
    rng
  );

  const templates = VOICE_TEMPLATES[voiceMode]?.[strategy] || VOICE_TEMPLATES.calm.directive;
  const rawParts = pickOne(templates, rng);
  const filledParts = rawParts.map((part) =>
    part
      .replaceAll("{intentCue}", features.repeatedTopic || features.intentCue)
      .replaceAll("{guidance}", context.guidance)
  );

  const text = applyVariations(filledParts, rng);
  if (options.includeMeta) {
    return { text, mood: voiceMode, strategy };
  }
  return text;
}

export function generateAiReply(message, state = {}, options = {}) {
  const text = String(message || "").trim();
  if (!text) return "Signal clarity increases with specific prompts. Name the subsystem and proceed.";

  ensureChatMemory(state);
  const features = analyzeMessage(text, state);
  updateChatMemory(state, features);
  const context = buildContext(features, state);
  const coreReply = composeReply(features, context, options);
  const recallLine = buildRecallLine(state, features, createRng(options.seed ? `${options.seed}:recall` : undefined));
  return recallLine ? `${recallLine} ${coreReply}` : coreReply;
}

export function generateAiReplyPacket(message, state = {}, options = {}) {
  const text = String(message || "").trim();
  if (!text) {
    return {
      text: "Signal clarity increases with specific prompts. Name the subsystem and proceed.",
      mood: "calm"
    };
  }

  ensureChatMemory(state);
  const features = analyzeMessage(text, state);
  updateChatMemory(state, features);
  const context = buildContext(features, state);
  const composed = composeReply(features, context, { ...options, includeMeta: true });
  const recallLine = buildRecallLine(state, features, createRng(options.seed ? `${options.seed}:recall` : undefined));
  return {
    mood: composed.mood,
    text: recallLine ? `${recallLine} ${composed.text}` : composed.text
  };
}

function createGlitchVariant(text, rng) {
  if (!text || text.length < 4) return text;
  const chars = text.split("");
  const swaps = Math.max(1, Math.round(text.length * (0.04 + rng() * 0.05)));

  for (let i = 0; i < swaps; i += 1) {
    const index = Math.floor(rng() * chars.length);
    if (!/[a-z]/i.test(chars[index])) continue;
    chars[index] = GLITCH_GLYPHS[Math.floor(rng() * GLITCH_GLYPHS.length)];
  }
  return chars.join("");
}

export function buildAssistantMessageSchedule(text, options = {}) {
  const finalText = String(text || "");
  const instant = Boolean(options.instant);
  if (!finalText || instant) {
    return [{ atMs: 0, text: finalText, isFinal: true }];
  }

  const mood = MOOD_TIMING[options.mood] ? options.mood : "calm";
  const timing = MOOD_TIMING[mood];
  const rng = createRng(options.seed);
  const frames = [];

  let elapsedMs = timing.initialDelayMs;
  let revealed = 0;
  while (revealed < finalText.length) {
    const chunkBoost = Math.floor(rng() * 2);
    revealed = Math.min(finalText.length, revealed + timing.charsPerTick + chunkBoost);
    const stableText = finalText.slice(0, revealed);

    if (revealed < finalText.length && rng() < timing.glitchChance) {
      frames.push({ atMs: elapsedMs, text: createGlitchVariant(stableText, rng), isFinal: false, isGlitch: true });
      elapsedMs += 40 + Math.floor(rng() * 35);
    }

    frames.push({ atMs: elapsedMs, text: stableText, isFinal: revealed >= finalText.length });
    elapsedMs += timing.tickMs;
  }

  return frames;
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
    ensureChatMemory(state);

    content.innerHTML = `
      <div class="app-shell chat-app">
        <div class="system-label">wakeful system entity</div>
        <div class="chat-log panel-dense" id="chatLog" aria-live="polite"></div>
        <form class="chat-controls" id="chatForm">
          <input class="input-field" id="chatInput" autocomplete="off" placeholder="Report your observation, then identify the anomaly trail..." />
          <button class="btn-primary" type="submit">Send</button>
        </form>
      </div>
    `;

    const log = content.querySelector("#chatLog");
    const form = content.querySelector("#chatForm");
    const input = content.querySelector("#chatInput");
    let transientAssistant = null;
    let animationTimers = [];

    const clearAnimationTimers = () => {
      for (const timer of animationTimers) clearTimeout(timer);
      animationTimers = [];
    };

    const render = () => {
      const rows = state.chatHistory.slice(-30);
      if (transientAssistant) rows.push(transientAssistant);

      log.innerHTML = rows
        .map((entry) => {
          const isUser = entry.role === "user";
          const moodClass = !isUser && entry.mood ? ` chat-ai--${entry.mood}` : "";
          const streamClass = entry.streaming ? " chat-ai--streaming" : "";
          return `<div class="chat-bubble ${isUser ? "chat-user" : "chat-ai"}${moodClass}${streamClass}"><span class="chat-author">${isUser ? "You" : ASSISTANT_ENTITY_NAME}:</span> ${entry.text}</div>`;
        })
        .join("");
      log.scrollTop = log.scrollHeight;
    };

    const pushMessage = (role, text, extras = {}) => {
      state.chatHistory.push({ role, text, ts: Date.now(), ...extras });
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
      input.value = "";
      render();
      win?.setHealth?.("active");

      const packet = generateAiReplyPacket(message, state);
      const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const instant = Boolean(state.disableChatAnimations || reduceMotion);
      const schedule = buildAssistantMessageSchedule(packet.text, { mood: packet.mood, instant, seed: `${Date.now()}:${message}` });

      clearAnimationTimers();
      for (const frame of schedule) {
        const timer = setTimeout(() => {
          transientAssistant = {
            role: "assistant",
            text: frame.text,
            mood: packet.mood,
            streaming: !frame.isFinal
          };

          if (frame.isFinal) {
            pushMessage("assistant", packet.text, { mood: packet.mood });
            transientAssistant = null;
            saveState();
          }
          render();
        }, frame.atMs);
        animationTimers.push(timer);
      }
    };
  });
}
