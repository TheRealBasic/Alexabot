export const STORAGE_KEY = "eidolon_state_v1";

export const defaultState = {
  chapter: 1,
  objectives: [
    { id: "unlock_archive", label: "Unlock archive channel", chapter: 1, roles: ["operator"] },
    { id: "set_time_0311", label: "Synchronize local clock to 03:11", chapter: 1, roles: ["operator"] },
    { id: "observer_ping_operator", label: "Observer: capture transient relay code and ping operator", chapter: 1, roles: ["observer"] },
    { id: "operator_execute_relay", label: "Operator: execute observer relay code before timeout", chapter: 1, roles: ["operator"] },
    { id: "recover_manifest", label: "Recover deleted manifest", chapter: 2, roles: ["operator"] },
    { id: "decode_cam2", label: "Decode cam2 payload", chapter: 2, roles: ["operator"] },
    { id: "access_redacted_audit", label: "Access redacted audit", chapter: 2, roles: ["observer", "operator"] },
    { id: "observer_anomaly_trace", label: "Observer: flag anomaly signature in system logs", chapter: 2, roles: ["observer"] }
  ],
  completedObjectives: [],
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
  sessionMode: "solo",
  playerId: "local-player",
  activeRole: "operator",
  roles: {
    operator: "local-player",
    observer: null
  },
  playerRoles: {
    "local-player": "operator"
  },
  relaySignal: null,
  roomId: null,
  reactionFlags: {
    alteredBootLines: false,
    trayWarning: false,
    syntheticCorrespondence: false,
    appGlitch: false
  },
  teamTrustScore: 0,
  playerDivergence: {},
  recentConflicts: [],
  cinematicSeen: {
    archiveUnlock: false,
    maintenance311: false,
    finalReveal: false
  },
  uiHints: {
    onboardingDismissed: false,
    onboardingDismissedChapter: 0
  },
  windowLayout: {}
};

function ensureTrustState(state) {
  if (typeof state.teamTrustScore !== "number") state.teamTrustScore = 0;
  if (!state.playerDivergence || typeof state.playerDivergence !== "object") state.playerDivergence = {};
  if (!Array.isArray(state.recentConflicts)) state.recentConflicts = [];
}

export function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return parsed
      ? {
        ...defaultState,
        ...parsed,
        unlocked: { ...defaultState.unlocked, ...(parsed.unlocked || {}) },
        roles: { ...defaultState.roles, ...(parsed.roles || {}) },
        playerRoles: { ...defaultState.playerRoles, ...(parsed.playerRoles || {}) },
        reactionFlags: { ...defaultState.reactionFlags, ...(parsed.reactionFlags || {}) },
        cinematicSeen: { ...defaultState.cinematicSeen, ...(parsed.cinematicSeen || {}) },
        uiHints: { ...defaultState.uiHints, ...(parsed.uiHints || {}) },
        windowLayout: { ...defaultState.windowLayout, ...(parsed.windowLayout || {}) }
      }
      : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function incrementFileView(state, path) {
  if (!state.viewed || typeof state.viewed !== "object") {
    state.viewed = {};
  }
  state.viewed[path] = (state.viewed[path] || 0) + 1;
}

export function completeObjective(state, objectiveId) {
  if (!state.completedObjectives.includes(objectiveId)) {
    state.completedObjectives.push(objectiveId);
  }
  updateChapter(state);
}

export function getActiveObjectives(state, role = state.activeRole) {
  return state.objectives.filter((objective) => {
    const visibleToRole = !Array.isArray(objective.roles) || objective.roles.includes(role);
    return visibleToRole && objective.chapter <= state.chapter && !state.completedObjectives.includes(objective.id);
  });
}

export function getProgressSignature(state) {
  const completed = [...(state.completedObjectives || [])].sort().join("|");
  return `${state.chapter}:${completed}`;
}

export function refreshChapterFromState(state) {
  updateChapter(state);
}

function updateChapter(state) {
  const chapterOneGoals = ["unlock_archive", "set_time_0311"];
  const chapterTwoGoals = ["recover_manifest", "decode_cam2", "access_redacted_audit"];

  const hasCompleted = (id) => state.completedObjectives.includes(id);
  const trustScore = Number(state.teamTrustScore || 0);
  const conflictCount = Array.isArray(state.recentConflicts) ? state.recentConflicts.length : 0;

  if (chapterOneGoals.every(hasCompleted)) {
    state.chapter = Math.max(state.chapter, 2);
  }
  if (chapterTwoGoals.every(hasCompleted)) {
    const highTrustRoute = trustScore >= 2;
    const lowTrustRoute = trustScore <= -2 && conflictCount >= 2;
    if (highTrustRoute || lowTrustRoute) {
      state.chapter = Math.max(state.chapter, 3);
    }
  }
}

export function applyProgressionFlags(state) {
  if (!Array.isArray(state.objectives) || state.objectives.length === 0) {
    state.objectives = [...defaultState.objectives];
  }
  if (!state.objectives.every((objective) => Array.isArray(objective.roles))) {
    state.objectives = [...defaultState.objectives];
  }
  if (!Array.isArray(state.completedObjectives)) {
    state.completedObjectives = [];
  }
  if (!state.roles || typeof state.roles !== "object") {
    state.roles = { ...defaultState.roles };
  }
  if (!state.playerRoles || typeof state.playerRoles !== "object") {
    state.playerRoles = { ...defaultState.playerRoles };
  }
  if (!state.activeRole) {
    state.activeRole = "operator";
  }
  if (!state.chapter) {
    state.chapter = 1;
  }
  if (!state.uiHints || typeof state.uiHints !== "object") {
    state.uiHints = { ...defaultState.uiHints };
  } else {
    state.uiHints = { ...defaultState.uiHints, ...state.uiHints };
  }
  if (!state.windowLayout || typeof state.windowLayout !== "object") {
    state.windowLayout = {};
  }
  ensureTrustState(state);
  updateChapter(state);
  state.bootCount += 1;
  state.driftMinutes += (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0);
  return state;
}
