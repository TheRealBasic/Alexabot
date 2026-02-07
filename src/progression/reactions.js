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

export function evaluateBehaviorReactions({ state, fs, saveState }) {
  const flags = ensureReactionState(state);
  const terminal = summarizeTerminalHistory(state);

  if (flags.syntheticCorrespondence) injectSyntheticFiles(fs);
  const fileAccess = summarizeFileAccess(state);

  const frequentCommands = terminal.frequentCommandCount >= 4 || (terminal.counts.cat || 0) >= 5;
  const repeatedAccess = fileAccess.repeated >= 2 || fileAccess.totalViews >= 12;
  const lowCompliance = state.complianceScore <= -2;

  if (!flags.alteredBootLines && (frequentCommands || repeatedAccess)) {
    flags.alteredBootLines = true;
    saveState();
  }

  if (!flags.trayWarning && (lowCompliance || (frequentCommands && terminal.total >= 6))) {
    flags.trayWarning = true;
    saveState();
  }

  if (!flags.syntheticCorrespondence && repeatedAccess && (terminal.counts.cat || 0) >= 3) {
    flags.syntheticCorrespondence = true;
    injectSyntheticFiles(fs);
    saveState();
  }

  if (!flags.appGlitch && (state.complianceScore <= -4 || (frequentCommands && repeatedAccess && terminal.maxRepeatedLine >= 3))) {
    flags.appGlitch = true;
    saveState();
  }
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
  if (flags.trayWarning) return "SYS: BEHAVIOR WATCH";
  if (state.complianceScore < -2) return "SYS: OBSERVING";
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
