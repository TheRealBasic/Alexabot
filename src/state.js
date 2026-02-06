export const STORAGE_KEY = "eidolon_state_v1";

export const defaultState = {
  chapter: 1,
  objectives: [
    { id: "unlock_archive", label: "Unlock archive channel", chapter: 1 },
    { id: "set_time_0311", label: "Synchronize local clock to 03:11", chapter: 1 },
    { id: "recover_manifest", label: "Recover deleted manifest", chapter: 2 },
    { id: "decode_cam2", label: "Decode cam2 payload", chapter: 2 },
    { id: "access_redacted_audit", label: "Access redacted audit", chapter: 2 }
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

export function completeObjective(state, objectiveId) {
  if (!state.completedObjectives.includes(objectiveId)) {
    state.completedObjectives.push(objectiveId);
  }
  updateChapter(state);
}

export function getActiveObjectives(state) {
  return state.objectives.filter((objective) => {
    return objective.chapter <= state.chapter && !state.completedObjectives.includes(objective.id);
  });
}

function updateChapter(state) {
  const chapterOneGoals = ["unlock_archive", "set_time_0311"];
  const chapterTwoGoals = ["recover_manifest", "decode_cam2", "access_redacted_audit"];

  const hasCompleted = (id) => state.completedObjectives.includes(id);

  if (chapterOneGoals.every(hasCompleted)) {
    state.chapter = Math.max(state.chapter, 2);
  }
  if (chapterTwoGoals.every(hasCompleted)) {
    state.chapter = Math.max(state.chapter, 3);
  }
}

export function applyProgressionFlags(state) {
  if (!Array.isArray(state.objectives) || state.objectives.length === 0) {
    state.objectives = [...defaultState.objectives];
  }
  if (!Array.isArray(state.completedObjectives)) {
    state.completedObjectives = [];
  }
  if (!state.chapter) {
    state.chapter = 1;
  }
  updateChapter(state);
  state.bootCount += 1;
  state.driftMinutes += (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0);
  return state;
}
