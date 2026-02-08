import { createSimulationState, ensureSimulationState } from "./simulation/serializer.js";
import { createSystemSimulationState, ensureSystemSimulationState } from "./systems/services.js";

export const STORAGE_KEY = "eidolon_state_v1";

export const defaultState = {
  chapter: 1,
  objectives: [
    { id: "onboarding_open_explorer", label: "Boot sequence: open Node Directory (Explorer)", chapter: 1, roles: ["operator", "observer"], phase: "onboarding" },
    { id: "onboarding_run_help", label: "Boot sequence: run `help` in Terminal", chapter: 1, roles: ["operator", "observer"], phase: "onboarding" },
    { id: "onboarding_read_file", label: "Boot sequence: read one file", chapter: 1, roles: ["operator", "observer"], phase: "onboarding" },
    { id: "onboarding_progression_command", label: "Boot sequence: execute one progression command", chapter: 1, roles: ["operator"], phase: "onboarding" },
    { id: "onboarding_confirm_objective_panel", label: "Boot sequence: confirm mission telemetry panel usage", chapter: 1, roles: ["operator", "observer"], phase: "onboarding" },
    { id: "unlock_archive", label: "Unlock archive channel", chapter: 1, roles: ["operator"] },
    { id: "set_time_0311", label: "Synchronize local clock to 03:11", chapter: 1, roles: ["operator"] },
    { id: "observer_ping_operator", label: "Observer: capture transient relay code and ping operator", chapter: 1, roles: ["observer"], coopOnly: true },
    { id: "operator_execute_relay", label: "Operator: execute observer relay code before timeout", chapter: 1, roles: ["operator"], coopOnly: true },
    { id: "recover_manifest", label: "Recover deleted manifest", chapter: 2, roles: ["operator"] },
    { id: "decode_cam2", label: "Decode cam2 payload", chapter: 2, roles: ["operator"] },
    { id: "access_redacted_audit", label: "Access redacted audit", chapter: 2, roles: ["observer", "operator"] },
    { id: "observer_anomaly_trace", label: "Observer: flag anomaly signature in system logs", chapter: 2, roles: ["observer"], coopOnly: true }
  ],
  completedObjectives: [],
  bootCount: 0,
  lastBootMessage: "",
  memoryFailures: 0,
  driftMinutes: 0,
  unlocked: { archive: false, redactedLog: false, mediaReveal: false },
  recoveredFiles: false,
  terminalHistory: [],
  forensicTrail: [],
  notesDraft: "",
  notesRevisions: [],
  notesConflictMarkers: [],
  aiAffinity: 0,
  aiParanoia: 0,
  aiTrustInPlayer: 0,
  aiContradictionCount: 0,
  aiLastTopics: [],
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
  manifestationState: {
    lastTriggeredAt: {},
    activeUntil: {},
    delivered: {},
    pendingClockLine: null
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
    onboardingDismissedChapter: 0,
    objectivePanelConfirmedChapters: []
  },
  guidanceMetrics: {
    failedCommandStreak: 0,
    lastCommandAt: 0,
    idleMs: 0,
    unresolvedObjectiveSince: 0,
    unresolvedObjectiveDurationMs: 0,
    hintTier: 0,
    lastHintTierPrompted: 0
  },
  windowLayout: {},
  disableChatAnimations: false,
  userProfile: {
    username: "operator",
    hostname: "eidolon-ws3",
    timezone: "UTC-05",
    keyboardLayout: "us-intl",
    wallpaperChoice: "maintenance-grid",
    lastLoginAt: "2003-04-19T03:11:00.000Z"
  },
  recentApps: [],
  recentFiles: [],
  bootStage: "bios",
  lastBootServices: [],
  lastBootReport: null,
  panicFragment: "",
  pendingRecoveryNotice: false,
  lifecycleHistory: [],
  simulationState: createSimulationState(),
  systemSimulationState: createSystemSimulationState()
};

function ensureTrustState(state) {
  if (typeof state.teamTrustScore !== "number") state.teamTrustScore = 0;
  if (!state.playerDivergence || typeof state.playerDivergence !== "object") state.playerDivergence = {};
  if (!Array.isArray(state.recentConflicts)) state.recentConflicts = [];
}

function ensureAiMemoryState(state) {
  if (typeof state.disableChatAnimations !== "boolean") state.disableChatAnimations = false;
  if (typeof state.aiAffinity !== "number") state.aiAffinity = 0;
  if (typeof state.aiParanoia !== "number") state.aiParanoia = 0;
  if (typeof state.aiTrustInPlayer !== "number") state.aiTrustInPlayer = 0;
  if (typeof state.aiContradictionCount !== "number") state.aiContradictionCount = 0;
  if (!Array.isArray(state.aiLastTopics)) state.aiLastTopics = [];
}

function ensureManifestationState(state) {
  if (!state.manifestationState || typeof state.manifestationState !== "object") {
    state.manifestationState = { ...defaultState.manifestationState };
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
}

function ensureLifecycleState(state) {
  if (typeof state.bootStage !== "string") state.bootStage = "bios";
  if (!Array.isArray(state.lastBootServices)) state.lastBootServices = [];
  if (!state.lastBootReport || typeof state.lastBootReport !== "object") state.lastBootReport = null;
  if (typeof state.panicFragment !== "string") state.panicFragment = "";
  if (typeof state.pendingRecoveryNotice !== "boolean") state.pendingRecoveryNotice = false;
  if (!Array.isArray(state.lifecycleHistory)) state.lifecycleHistory = [];
}

function ensureProfileState(state) {
  if (!state.userProfile || typeof state.userProfile !== "object") {
    state.userProfile = { ...defaultState.userProfile };
  } else {
    state.userProfile = { ...defaultState.userProfile, ...state.userProfile };
  }
  if (!Array.isArray(state.recentApps)) state.recentApps = [];
  if (!Array.isArray(state.recentFiles)) state.recentFiles = [];
}

function ensureSimulationSubstate(state) {
  ensureSimulationState(state);
  ensureSystemSimulationState(state);
}

function ensureGuidanceMetrics(state) {
  if (!state.guidanceMetrics || typeof state.guidanceMetrics !== "object") {
    state.guidanceMetrics = { ...defaultState.guidanceMetrics };
  } else {
    state.guidanceMetrics = { ...defaultState.guidanceMetrics, ...state.guidanceMetrics };
  }
  return state.guidanceMetrics;
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
        guidanceMetrics: { ...defaultState.guidanceMetrics, ...(parsed.guidanceMetrics || {}) },
        windowLayout: { ...defaultState.windowLayout, ...(parsed.windowLayout || {}) },
        lastBootReport: parsed.lastBootReport || null,
        lastBootServices: Array.isArray(parsed.lastBootServices) ? parsed.lastBootServices : [],
        lifecycleHistory: Array.isArray(parsed.lifecycleHistory) ? parsed.lifecycleHistory : [],
        pendingRecoveryNotice: Boolean(parsed.pendingRecoveryNotice),
        panicFragment: typeof parsed.panicFragment === "string" ? parsed.panicFragment : "",
        simulationState: {
          ...createSimulationState(),
          ...(parsed.simulationState || {})
        },
        systemSimulationState: {
          ...createSystemSimulationState(),
          ...(parsed.systemSimulationState || {})
        }
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
  if (!Array.isArray(state.recentFiles)) state.recentFiles = [];
  state.recentFiles.push({ path, at: Date.now() });
  state.recentFiles = state.recentFiles.slice(-24);
}

export function appendForensicTrace(state, category, detail, actor = state.activeRole || "operator") {
  if (!Array.isArray(state.forensicTrail)) state.forensicTrail = [];
  state.forensicTrail.push({
    timestamp: Date.now(),
    category,
    detail,
    actor
  });
  state.forensicTrail = state.forensicTrail.slice(-40);
}


export function appendTerminalEvent(state, command, actor = state.activeRole || "operator") {
  if (!Array.isArray(state.terminalHistory)) state.terminalHistory = [];
  state.terminalHistory.push({ command, actor, timestamp: Date.now() });
}

export function appendManifestationEvent(state, triggerId, detail, actor = "system") {
  appendForensicTrace(state, "manifestation", `${triggerId}: ${detail}`, actor);
  appendTerminalEvent(state, `manifestation:${triggerId} ${detail}`, actor);
}

export function completeObjective(state, objectiveId) {
  const wasCompleted = state.completedObjectives.includes(objectiveId);
  if (!state.completedObjectives.includes(objectiveId)) {
    state.completedObjectives.push(objectiveId);
  }
  if (!wasCompleted) resetHintIntensity(state);
  updateChapter(state);
  updateGuidanceMetrics(state);
}

export function resetHintIntensity(state) {
  const metrics = ensureGuidanceMetrics(state);
  metrics.hintTier = 0;
  metrics.failedCommandStreak = 0;
  metrics.lastHintTierPrompted = 0;
}

export function recordCommandTelemetry(state, { success, timestamp = Date.now() } = {}) {
  const metrics = ensureGuidanceMetrics(state);
  metrics.lastCommandAt = timestamp;
  metrics.idleMs = 0;
  if (success) metrics.failedCommandStreak = 0;
  else metrics.failedCommandStreak = Math.max(0, Number(metrics.failedCommandStreak || 0) + 1);
  updateGuidanceMetrics(state, timestamp);
}

export function updateGuidanceMetrics(state, now = Date.now()) {
  const metrics = ensureGuidanceMetrics(state);
  metrics.idleMs = metrics.lastCommandAt > 0 ? Math.max(0, now - metrics.lastCommandAt) : 0;

  const unresolvedObjectives = getActiveObjectives(state).length;
  if (unresolvedObjectives > 0) {
    if (!metrics.unresolvedObjectiveSince) metrics.unresolvedObjectiveSince = now;
    metrics.unresolvedObjectiveDurationMs = Math.max(0, now - metrics.unresolvedObjectiveSince);
  } else {
    metrics.unresolvedObjectiveSince = 0;
    metrics.unresolvedObjectiveDurationMs = 0;
  }
  return metrics;
}

export function startSimulation(state, payload = {}) {
  const simulation = ensureSimulationState(state);
  state.simulationState = {
    ...createSimulationState(),
    ...simulation,
    ...payload,
    status: "running",
    eventLog: Array.isArray(payload.eventLog) ? payload.eventLog : [],
    branches: payload.branches && typeof payload.branches === "object" ? payload.branches : (simulation.branches || {}),
    artifacts: payload.artifacts && typeof payload.artifacts === "object" ? payload.artifacts : (simulation.artifacts || {})
  };
  return state.simulationState;
}

export function recordSimulationEvent(state, event = {}) {
  const sim = ensureSimulationState(state);
  const entry = {
    id: event.id || `evt-${sim.eventLog.length + 1}`,
    at: event.at || Date.now(),
    ...event
  };
  sim.eventLog.push(entry);
  sim.eventLog = sim.eventLog.slice(-120);
  return entry;
}

export function completeSimulation(state, payload = {}) {
  const sim = ensureSimulationState(state);
  sim.status = "completed";
  Object.assign(sim, payload);
  return sim;
}

export function clearSimulation(state) {
  state.simulationState = createSimulationState();
  return state.simulationState;
}

export function getActiveObjectives(state, role = state.activeRole) {
  const isSolo = (state.sessionMode || "solo") === "solo";
  return state.objectives.filter((objective) => {
    const visibleToRole = !Array.isArray(objective.roles) || objective.roles.includes(role);
    const visibleInSession = !isSolo || objective.coopOnly !== true;
    return visibleToRole
      && visibleInSession
      && objective.chapter <= state.chapter
      && !state.completedObjectives.includes(objective.id);
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
  const requiredObjectiveIds = new Set(defaultState.objectives.map((objective) => objective.id));
  const existingObjectiveIds = new Set(state.objectives.map((objective) => objective.id));
  for (const objectiveId of requiredObjectiveIds) {
    if (!existingObjectiveIds.has(objectiveId)) {
      state.objectives = [...defaultState.objectives];
      break;
    }
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
  if (!Array.isArray(state.forensicTrail)) {
    state.forensicTrail = [];
  }
  if (!Array.isArray(state.notesRevisions)) {
    state.notesRevisions = [];
  }
  if (!Array.isArray(state.notesConflictMarkers)) {
    state.notesConflictMarkers = [];
  }
  ensureTrustState(state);
  ensureAiMemoryState(state);
  ensureManifestationState(state);
  ensureLifecycleState(state);
  ensureProfileState(state);
  ensureSimulationSubstate(state);
  ensureGuidanceMetrics(state);
  updateChapter(state);
  updateGuidanceMetrics(state);
  state.bootCount += 1;
  state.driftMinutes += (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0);
  return state;
}
