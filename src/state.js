export const STORAGE_KEY = "eidolon_state_v1";

export const defaultState = {
  bootCount: 0,
  lastBootMessage: "",
  memoryFailures: 0,
  driftMinutes: 0,
  unlocked: { archive: false, redactedLog: false, mediaReveal: false },
  recoveredFiles: false,
  terminalHistory: [],
  notesDraft: "",
  viewed: {},
  complianceScore: 0,
  sessionId: Math.floor(Math.random() * 1e6),
  reactionFlags: {
    alteredBootLines: false,
    trayWarning: false,
    syntheticCorrespondence: false,
    appGlitch: false
  },
  cinematicSeen: {
    archiveUnlock: false,
    maintenance311: false,
    finalReveal: false
  }
};

export function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return parsed
      ? {
        ...defaultState,
        ...parsed,
        unlocked: { ...defaultState.unlocked, ...(parsed.unlocked || {}) },
        reactionFlags: { ...defaultState.reactionFlags, ...(parsed.reactionFlags || {}) },
        cinematicSeen: { ...defaultState.cinematicSeen, ...(parsed.cinematicSeen || {}) }
      }
      : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function applyProgressionFlags(state) {
  state.bootCount += 1;
  state.driftMinutes += (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0);
  return state;
}
