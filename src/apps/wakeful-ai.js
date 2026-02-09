import { getActiveObjectives } from "../state.js";

const DEFAULT_AI_ENDPOINT = "http://localhost:8790/ai/wakeful-thread/respond";

function clipText(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function summarizeObjectives(state = {}) {
  return getActiveObjectives(state, state.activeRole)
    .slice(0, 5)
    .map((objective) => ({
      id: objective.id,
      label: objective.label,
      phase: objective.phase || "mission"
    }));
}

function summarizeTerminalHistory(state = {}) {
  return (state.terminalHistory || [])
    .slice(-10)
    .map((entry) => ({
      command: clipText(entry?.command || "", 120),
      outputTail: clipText(entry?.outputTail || "", 220),
      actor: entry?.actor || state.activeRole || "operator",
      ts: entry?.ts || Date.now()
    }));
}

function summarizeChatHistory(state = {}) {
  return (state.chatHistory || [])
    .slice(-8)
    .map((entry) => ({
      role: entry?.role || "assistant",
      text: clipText(entry?.text || "", 240)
    }));
}

export function buildWakefulContextPack(state = {}, message = "") {
  return {
    player: {
      id: state.playerId || "local-player",
      role: state.activeRole || "operator",
      sessionMode: state.sessionMode || "solo"
    },
    progress: {
      chapter: Number(state.chapter) || 1,
      completedObjectives: (state.completedObjectives || []).slice(-12),
      activeObjectives: summarizeObjectives(state),
      unlocked: {
        archive: Boolean(state?.unlocked?.archive),
        redactedLog: Boolean(state?.unlocked?.redactedLog),
        mediaReveal: Boolean(state?.unlocked?.mediaReveal)
      },
      relaySignal: state.relaySignal
        ? {
          code: state.relaySignal.code,
          expiresAt: state.relaySignal.expiresAt,
          resolvedBy: state.relaySignal.resolvedBy || null
        }
        : null
    },
    telemetry: {
      trust: Number(state.teamTrustScore) || 0,
      driftMinutes: Number(state.driftMinutes) || 0,
      memoryFailures: Number(state.memoryFailures) || 0,
      aiParanoia: Number(state.aiParanoia) || 0,
      aiAffinity: Number(state.aiAffinity) || 0
    },
    recent: {
      terminal: summarizeTerminalHistory(state),
      forensicTrail: (state.forensicTrail || []).slice(-8),
      chat: summarizeChatHistory(state)
    },
    prompt: clipText(message, 800)
  };
}

export function resolveWakefulEndpoint() {
  if (typeof window === "undefined") return DEFAULT_AI_ENDPOINT;
  const params = new URLSearchParams(window.location.search);
  return params.get("ai") || DEFAULT_AI_ENDPOINT;
}

export async function requestWakefulReply({ message, state, signal } = {}) {
  const endpoint = resolveWakefulEndpoint();
  const payload = buildWakefulContextPack(state, message);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`wakeful-ai-http-${response.status}: ${body.slice(0, 160)}`);
  }

  const data = await response.json();
  return {
    text: clipText(data?.reply || "", 1200) || "Signal loss. Ask again with tighter scope.",
    mood: ["calm", "evasive", "possessive", "fragmented"].includes(data?.mood) ? data.mood : "fragmented",
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 4) : [],
    mode: data?.mode || "ai"
  };
}
