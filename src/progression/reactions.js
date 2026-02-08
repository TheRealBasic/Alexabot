import { appendManifestationEvent, updateGuidanceMetrics } from "../state.js";
import { emitSystemEvent } from "../systems/events.js";



const HINT_TIER_MESSAGES = {
  1: "subtle clue: revisit the mission telemetry panel for active objective context",
  2: "stronger clue: focus on one unresolved objective and use help/history to verify command format",
  3: "direct nudge: complete the highlighted objective in mission telemetry before exploring further"
};

function computeHintTier(metrics) {
  const failed = Number(metrics.failedCommandStreak || 0);
  const idleMs = Number(metrics.idleMs || 0);
  const unresolvedMs = Number(metrics.unresolvedObjectiveDurationMs || 0);

  if (failed >= 6 || idleMs >= 300_000 || unresolvedMs >= 420_000) return 3;
  if (failed >= 4 || idleMs >= 180_000 || unresolvedMs >= 240_000) return 2;
  if (failed >= 2 || idleMs >= 90_000 || unresolvedMs >= 120_000) return 1;
  return 0;
}

export function evaluateHintTier(state, now = Date.now()) {
  const metrics = updateGuidanceMetrics(state, now);
  const computedTier = computeHintTier(metrics);
  if (computedTier > Number(metrics.hintTier || 0)) {
    metrics.hintTier = computedTier;
  }
  return Number(metrics.hintTier || 0);
}

export function consumeTieredHint(state, now = Date.now()) {
  const metrics = updateGuidanceMetrics(state, now);
  const tier = evaluateHintTier(state, now);
  if (tier <= 0 || tier <= Number(metrics.lastHintTierPrompted || 0)) return "";
  metrics.lastHintTierPrompted = tier;
  return HINT_TIER_MESSAGES[tier] || "";
}

const MANIFESTATION_RULES = {
  terminalAnomaly: {
    threshold: (state) => Number(state.aiParanoia || 0) >= 4,
    minChapter: 2,
    cooldownMs: 90_000,
    activeMs: 35_000
  },
  labelShift: {
    threshold: (state) => Number(state.aiParanoia || 0) + Number(state.aiContradictionCount || 0) >= 6,
    minChapter: 2,
    cooldownMs: 130_000,
    activeMs: 45_000
  },
  clockWhisper: {
    threshold: (state) => Number(state.aiTrustInPlayer || 0) <= -2 || Number(state.aiParanoia || 0) >= 5,
    minChapter: 2,
    cooldownMs: 120_000,
    activeMs: 80_000
  },
  delayedNotification: {
    threshold: (state) => Number(state.aiParanoia || 0) >= 6,
    minChapter: 3,
    cooldownMs: 160_000,
    activeMs: 90_000
  },
  systemCrashReboot: {
    threshold: (state) => Number(state.aiParanoia || 0) >= 5 || Number(state.aiContradictionCount || 0) >= 6,
    minChapter: 2,
    cooldownMs: 420_000,
    activeMs: 14_000,
    probability: 0.04,
    guard: (state, now) => !isCriticalPuzzleInputWindow(state, now)
  }
};

export function isCriticalPuzzleInputWindow(state, now = Date.now()) {
  const relay = state.relaySignal;
  const relayActive = relay
    && Number(relay.expiresAt || 0) >= now
    && !relay.resolvedBy;
  if (relayActive) return true;

  const recoverOutstanding = !Array.isArray(state.completedObjectives)
    || !state.completedObjectives.includes("recover_manifest");
  if (!recoverOutstanding) return false;

  const clock = new Date(now + Number(state.driftMinutes || 0) * 60_000);
  return clock.getHours() === 3 && clock.getMinutes() >= 11 && clock.getMinutes() <= 13;
}

function ensureReactionState(state) {
  if (!state.reactionFlags) {
    state.reactionFlags = {
      alteredBootLines: false,
      trayWarning: false,
      syntheticCorrespondence: false,
      appGlitch: false
    };
  }
  return state.reactionFlags;
}

function ensureManifestationState(state) {
  if (!state.manifestationState || typeof state.manifestationState !== "object") {
    state.manifestationState = {
      lastTriggeredAt: {},
      activeUntil: {},
      delivered: {},
      pendingClockLine: null
    };
  }
  if (!state.manifestationState.lastTriggeredAt || typeof state.manifestationState.lastTriggeredAt !== "object") {
    state.manifestationState.lastTriggeredAt = {};
  }
  if (!state.manifestationState.activeUntil || typeof state.manifestationState.activeUntil !== "object") {
    state.manifestationState.activeUntil = {};
  }
  if (!state.manifestationState.delivered || typeof state.manifestationState.delivered !== "object") {
    state.manifestationState.delivered = {};
  }
  if (typeof state.manifestationState.pendingClockLine !== "string") {
    state.manifestationState.pendingClockLine = null;
  }
  return state.manifestationState;
}

function summarizeTerminalHistory(state) {
  const counts = {};
  const lines = state.terminalHistory || [];
  const repeatedLines = {};

  for (const line of lines) {
    const commandLine = typeof line === "string" ? line : line?.command;
    const normalized = String(commandLine || "").trim().toLowerCase();
    if (!normalized) continue;
    const cmd = normalized.split(/\s+/)[0];
    counts[cmd] = (counts[cmd] || 0) + 1;
    repeatedLines[normalized] = (repeatedLines[normalized] || 0) + 1;
  }

  const frequentCommandCount = Math.max(0, ...Object.values(counts));
  const maxRepeatedLine = Math.max(0, ...Object.values(repeatedLines));

  return { counts, frequentCommandCount, maxRepeatedLine, total: lines.length };
}

function summarizeFileAccess(state) {
  const viewed = state.viewed || {};
  const repeated = Object.values(viewed).filter((count) => count >= 3).length;
  const totalViews = Object.values(viewed).reduce((sum, count) => sum + count, 0);
  return { repeated, totalViews };
}

function injectSyntheticFiles(fs) {
  if (!fs["/home/operator/mail"].includes("observer_followup.eml")) {
    fs["/home/operator/mail"].push("observer_followup.eml");
  }
  if (!fs["/home/operator/docs"].includes("stability_note.txt")) {
    fs["/home/operator/docs"].push("stability_note.txt");
  }
}

export function shouldActivateManifestation(state, triggerId, now = Date.now(), options = {}) {
  const rule = MANIFESTATION_RULES[triggerId];
  if (!rule) return false;
  const manifest = ensureManifestationState(state);
  const chapter = Number(state.chapter || 1);
  if (chapter < rule.minChapter) return false;
  if (!rule.threshold(state)) return false;
  if (typeof rule.guard === "function" && !rule.guard(state, now)) return false;
  if (typeof rule.probability === "number") {
    const roll = Number.isFinite(options.randomValue) ? Number(options.randomValue) : Math.random();
    if (roll > rule.probability) return false;
  }
  const lastTriggeredAt = Number(manifest.lastTriggeredAt[triggerId] || 0);
  return now - lastTriggeredAt >= rule.cooldownMs;
}

export function activateManifestation(state, triggerId, detail, now = Date.now(), options = {}) {
  const rule = MANIFESTATION_RULES[triggerId];
  if (!rule) return false;
  const manifest = ensureManifestationState(state);
  manifest.lastTriggeredAt[triggerId] = now;
  manifest.activeUntil[triggerId] = now + rule.activeMs;
  manifest.delivered[triggerId] = false;
  const suffix = options.projectionMode ? " [simulated]" : "";
  appendManifestationEvent(state, triggerId, `${detail}${suffix}`, options.projectionMode ? "simulation" : "system");
  return true;
}

export function isManifestationActive(state, triggerId, now = Date.now()) {
  const manifest = ensureManifestationState(state);
  const until = Number(manifest.activeUntil[triggerId] || 0);
  return until > now;
}

export function consumeManifestation(state, triggerId) {
  const manifest = ensureManifestationState(state);
  if (manifest.delivered[triggerId]) return false;
  manifest.delivered[triggerId] = true;
  return true;
}

export function evaluateBehaviorReactions({ state, fs, saveState, projectionMode = false }) {
  const flags = ensureReactionState(state);
  const terminal = summarizeTerminalHistory(state);
  const now = Date.now();
  const previousHintTier = Number(state.guidanceMetrics?.hintTier || 0);
  const hintTier = evaluateHintTier(state, now);

  if (flags.syntheticCorrespondence) injectSyntheticFiles(fs);
  const fileAccess = summarizeFileAccess(state);

  const frequentCommands = terminal.frequentCommandCount >= 4 || (terminal.counts.cat || 0) >= 5;
  const repeatedAccess = fileAccess.repeated >= 2 || fileAccess.totalViews >= 12;
  const lowCompliance = state.complianceScore <= -2;

  if (!flags.alteredBootLines && (frequentCommands || repeatedAccess)) {
    flags.alteredBootLines = true;
    if (!projectionMode) saveState();
  }

  if (!flags.trayWarning && (lowCompliance || (frequentCommands && terminal.total >= 6))) {
    flags.trayWarning = true;
    if (!projectionMode) saveState();
  }

  if (!flags.syntheticCorrespondence && repeatedAccess && (terminal.counts.cat || 0) >= 3) {
    flags.syntheticCorrespondence = true;
    injectSyntheticFiles(fs);
    if (!projectionMode) saveState();
  }

  if (!flags.appGlitch && (state.complianceScore <= -4 || (frequentCommands && repeatedAccess && terminal.maxRepeatedLine >= 3))) {
    flags.appGlitch = true;
    if (!projectionMode) saveState();
  }

  let changed = false;
  if (shouldActivateManifestation(state, "terminalAnomaly", now)) {
    changed = activateManifestation(state, "terminalAnomaly", "terminal line checksum mismatch", now, { projectionMode }) || changed;
  }
  if (shouldActivateManifestation(state, "labelShift", now)) {
    changed = activateManifestation(state, "labelShift", "label harmonics shifted", now, { projectionMode }) || changed;
  }
  if (shouldActivateManifestation(state, "clockWhisper", now)) {
    changed = activateManifestation(state, "clockWhisper", "clock offset whisper queued", now, { projectionMode }) || changed;
    state.manifestationState.pendingClockLine = "clock discipline accepted // residual drift remains";
  }
  if (shouldActivateManifestation(state, "delayedNotification", now)) {
    changed = activateManifestation(state, "delayedNotification", "notification tone desynchronized", now, { projectionMode }) || changed;
  }
  if (shouldActivateManifestation(state, "systemCrashReboot", now)) {
    changed = activateManifestation(state, "systemCrashReboot", "kernel panic rehearsal sequence injected", now, { projectionMode }) || changed;
    if (!projectionMode) {
      emitSystemEvent(state, {
        type: "narrative.crash_reboot",
        level: "warning",
        service: "continuity-core",
        message: "simulated kernel panic + reboot vignette initiated"
      });
    }
  }

  if (hintTier > previousHintTier) changed = true;

  if (changed && !projectionMode) saveState();
}

export function getReactiveBootloaderLines(baseLines, state) {
  const flags = ensureReactionState(state);
  if (!flags.alteredBootLines) return baseLines;

  return baseLines.map((line, index) => {
    if (index === 2) return "applying continuity map... forced";
    if (index === 5) return "warning: operator pattern mismatch [ignored]";
    if (index === 9) return "log replay: source timestamp unavailable";
    return line;
  });
}

export function getTrayWarningText(state) {
  const flags = ensureReactionState(state);
  const hintTier = evaluateHintTier(state);
  if (hintTier === 3) return "SYS: NUDGE: CHECK OBJECTIVES";
  if (hintTier === 2) return "SYS: clue intensity rising";
  if (hintTier === 1) return "SYS: subtle clue available";
  if (flags.trayWarning) return "SYS: BEHAVIOR WATCH";
  if (state.complianceScore < -2) return "SYS: OBSERVING";
  if (isManifestationActive(state, "labelShift")) return "SYS: nominal*";
  return "SYS: nominal";
}

export function getAppGlitchStyle(state) {
  const flags = ensureReactionState(state);
  if (!flags.appGlitch) return { filter: "", transform: "" };

  const pulse = Math.sin(Date.now() / 140) * 0.8;
  return {
    filter: `contrast(${100 + Math.abs(pulse) * 16}%) saturate(${100 - Math.abs(pulse) * 10}%)`,
    transform: `translate(${pulse}px, ${-pulse}px)`
  };
}
