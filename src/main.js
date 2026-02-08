import { applyProgressionFlags, clearState, getActiveObjectives, getProgressSignature, loadState, refreshChapterFromState, resetRuntimeState, saveState } from "./state.js";
import { fs, files, getDirectoryEntries, getDynamicFile as getDynamicFileBase, isContentVisible, rehydrateContentFromState } from "./content.js";
import { createWindowManager } from "./windowManager.js";
import { applyLifecycleEvent, runBoot } from "./boot.js";
import { createMultiplayerClient, applyIncrementalPatch } from "./multiplayer/client.js";
import { applyAction } from "./progression/reducer.js";
import {
  consumeManifestation,
  evaluateBehaviorReactions,
  getAppGlitchStyle,
  getTrayWarningText,
  isManifestationActive
} from "./progression/reactions.js";
import { openExplorer } from "./apps/explorer.js";
import { openTerminal } from "./apps/terminal.js";
import { openNotes } from "./apps/notes.js";
import { openMedia } from "./apps/media.js";
import { openSettings } from "./apps/settings.js";
import { openHelp } from "./apps/help.js";
import { openChat } from "./apps/chat.js";
import { openCalculator } from "./apps/calculator.js";
import { openCalendar } from "./apps/calendar.js";
import { openSystemMonitor } from "./apps/sysmon.js";
import { openSimulationConsole } from "./apps/simulation.js";
import { createPresentationController } from "./presentation.js";
import { getOnboardingChecklistItems, hasPendingOnboardingObjectives } from "./onboarding.js";
import { COPY, formatCopy } from "./ui/copy.js";
import { subscribeSystemEvents } from "./systems/events.js";
import { getServiceStatusTable, tickSystemSimulation } from "./systems/simulator.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");
const accessCode = params.get("code") || "";
const displayName = params.get("name") || "";
const playerId = params.get("player") || `p-${Math.floor(Math.random() * 1e6).toString(36)}`;
const preferredRole = params.get("role") === "observer" ? "observer" : "operator";
const sessionMode = roomId ? "coop" : "solo";

const state = applyProgressionFlags(loadState());
state.sessionMode = sessionMode;
state.roomId = roomId;
state.playerId = playerId;
if (!state.playerRoles || typeof state.playerRoles !== "object") state.playerRoles = {};

const currentRole = state.playerRoles[playerId] || preferredRole;
state.playerRoles[playerId] = currentRole;
state.activeRole = currentRole;
if (!state.roles || typeof state.roles !== "object") state.roles = { operator: null, observer: null };
if (!state.roles[currentRole]) state.roles[currentRole] = playerId;
rehydrateContentFromState(state);

const bootText = document.getElementById("bootText");
const bootEl = document.getElementById("boot");
const splash = document.getElementById("splash");
const login = document.getElementById("login");
const lastSession = document.getElementById("lastSession");
const loginBtn = document.getElementById("loginBtn");
const desktopRoot = document.getElementById("desktopRoot");
const taskList = document.getElementById("taskList");
const desktopIcons = document.getElementById("desktopIcons");
const startBtn = document.getElementById("startBtn");
const startMenu = document.getElementById("startMenu");
const startMenuItems = document.getElementById("startMenuItems");
const trayClock = document.getElementById("trayClock");
const trayState = document.getElementById("trayState");
const trayConnection = document.getElementById("trayConnection");
const traySync = document.getElementById("traySync");
const cinematicOverlay = document.getElementById("cinematicOverlay");
const taskbar = document.querySelector(".taskbar");
const notificationCenter = document.getElementById("notificationCenter");
const displayNameInput = document.getElementById("displayNameInput");
const roomIdInput = document.getElementById("roomIdInput");
const accessCodeInput = document.getElementById("accessCodeInput");
const roomNameInput = document.getElementById("roomNameInput");
const privateRoomInput = document.getElementById("privateRoomInput");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const copyInviteBtn = document.getElementById("copyInviteBtn");
const lobbyList = document.getElementById("lobbyList");
const lobbyStatus = document.getElementById("lobbyStatus");

let desktopInitialized = false;

let connectionQuality = "offline";
let syncState = "idle";
const bootServiceNotifications = [];


function resetSessionAndReboot({ announce = true } = {}) {
  clearState();
  resetRuntimeState(state);
  rehydrateContentFromState(state);
  if (announce) notify("Session state cleared. Reloading...");
  window.location.href = window.location.pathname;
}


function setTrayHealth(el, value = "") {
  const upper = String(value).toUpperCase();
  let health = "active";
  if (upper.includes("OFFLINE") || upper.includes("ERROR") || upper.includes("DEGRADED") || upper.includes("WATCH")) health = "fault";
  else if (upper.includes("IDLE") || upper.includes("RECONNECT")) health = "stale";
  el.dataset.health = health;
}


function updateConnectionIndicators() {
  trayConnection.textContent = `${COPY.shell.tray.linkPrefix}: ${connectionQuality.toUpperCase()}`;
  traySync.textContent = `${COPY.shell.tray.syncPrefix}: ${syncState.toUpperCase()}`;
  setTrayHealth(trayConnection, trayConnection.textContent);
  setTrayHealth(traySync, traySync.textContent);
}

function buildSessionUrl({ room, code, name, host }) {
  const next = new URL(window.location.href);
  next.searchParams.set("room", room);
  next.searchParams.set("player", playerId);
  next.searchParams.set("role", host ? "operator" : preferredRole);
  if (params.get("token")) next.searchParams.set("token", params.get("token"));
  if (params.get("ws")) next.searchParams.set("ws", params.get("ws"));
  if (code) next.searchParams.set("code", code); else next.searchParams.delete("code");
  if (name) next.searchParams.set("name", name); else next.searchParams.delete("name");
  return next.toString();
}

function applyJoinFormDefaults() {
  if (displayNameInput) displayNameInput.value = displayName || playerId;
  if (roomIdInput) roomIdInput.value = roomId || "";
  if (accessCodeInput) accessCodeInput.value = accessCode || "";
}

applyJoinFormDefaults();
updateConnectionIndicators();

const notify = (message, { actor } = {}) => {
  const delayed = isManifestationActive(state, "delayedNotification");
  const body = delayed && consumeManifestation(state, "delayedNotification")
    ? `${message} // relay delay acknowledged`
    : message;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = actor ? `[${actor}] ${body}` : body;
  const mountToast = () => {
    notificationCenter.appendChild(toast);
    setTimeout(() => toast.classList.add("is-exiting"), 2500);
    setTimeout(() => toast.remove(), 2750);
  };
  if (delayed) setTimeout(mountToast, 400);
  else mountToast();
};

const getSystemTraySummary = () => {
  const rows = getServiceStatusTable(state);
  const unhealthy = rows.filter((row) => row.status !== "active");
  const anomalies = rows.filter((row) => row.anomaly).length;
  if (!rows.length) return "SYS: N/A";
  if (anomalies > 0) return `SYS: WATCH (${anomalies} anomalies)`;
  if (unhealthy.length > 0) return `SYS: DEGRADED (${unhealthy.length}/${rows.length})`;
  return "SYS: ACTIVE";
};

const presentation = createPresentationController({
  state,
  desktopRoot,
  taskbar,
  overlay: cinematicOverlay
});

let previousSnapshot = JSON.parse(JSON.stringify(state));
let lastProgressSignature = getProgressSignature(state);
let renderObjectivePanel = () => {};
let renderOnboardingPanel = () => {};
let renderRecapPanel = () => {};

function ensureUiHintsState() {
  if (!state.uiHints || typeof state.uiHints !== "object") state.uiHints = {};
  if (typeof state.uiHints.onboardingDismissed !== "boolean") state.uiHints.onboardingDismissed = false;
  if (typeof state.uiHints.onboardingDismissedChapter !== "number") state.uiHints.onboardingDismissedChapter = 0;
  if (!Array.isArray(state.uiHints.objectivePanelConfirmedChapters)) state.uiHints.objectivePanelConfirmedChapters = [];
}

function syncOnboardingDismissalByChapter() {
  ensureUiHintsState();
  if (state.uiHints.onboardingDismissedChapter !== state.chapter) {
    state.uiHints.onboardingDismissed = false;
  }
  if (!hasPendingOnboardingObjectives(state, state.activeRole)) {
    state.uiHints.onboardingDismissed = true;
    state.uiHints.onboardingDismissedChapter = state.chapter;
  }
}

const CHAPTER_RECAPS = {
  2: {
    discovered: "Archive-gating logic and the 03:11 maintenance marker were validated as deliberate controls.",
    worldState: "Maintenance-window pathways and restricted records are now exposed for recovery attempts.",
    nextObjective: "Recover deleted manifest evidence before continuity systems overwrite the remaining forensic trail."
  },
  3: {
    discovered: "Recovered manifests and cam2 evidence contradict the official timeline and expose narrative tampering.",
    worldState: "The system is now in accounting mode where trust outcomes influence the final route through the incident record.",
    nextObjective: "Reconcile logs, testimony, and trust signals to lock in a defensible final account."
  }
};

function createRecapPayload(chapter, trigger = "chapter") {
  const template = CHAPTER_RECAPS[chapter];
  if (!template) return null;
  return {
    id: `recap-${chapter}-${Date.now()}`,
    chapter,
    trigger,
    discovered: template.discovered,
    worldState: template.worldState,
    nextObjective: template.nextObjective,
    createdAt: Date.now()
  };
}

function storeRecap(recap) {
  if (!recap) return;
  state.lastRecap = recap;
  if (!Array.isArray(state.recapHistory)) state.recapHistory = [];
  state.recapHistory.push(recap);
  state.recapHistory = state.recapHistory.slice(-8);
}

function maybeTriggerChapterRecap(previousChapter, nextChapter, trigger = "chapter") {
  if (Number(nextChapter) <= Number(previousChapter)) return;
  const recap = createRecapPayload(nextChapter, trigger);
  if (!recap) return;
  const alreadySeen = Array.isArray(state.recapHistory)
    && state.recapHistory.some((entry) => Number(entry.chapter) === Number(nextChapter));
  if (alreadySeen && trigger === "chapter") return;
  storeRecap(recap);
  notify(`recap available: act ${nextChapter} transition summary archived`);
}

const applyAuthoritativeUpdate = (patch, isSnapshot = false) => {
  const prev = JSON.parse(JSON.stringify(state));
  if (isSnapshot) {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, patch);
  } else {
    applyIncrementalPatch(state, patch);
  }
  state.activeRole = currentRole;
  if (!state.playerRoles || typeof state.playerRoles !== "object") state.playerRoles = {};
  state.playerRoles[playerId] = currentRole;
  if (!state.roles || typeof state.roles !== "object") state.roles = { operator: null, observer: null };
  if (!state.roles[currentRole]) state.roles[currentRole] = playerId;
  rehydrateContentFromState(state);
  presentation.handleStateTransition(prev, state);
  maybeTriggerChapterRecap(prev.chapter, state.chapter, isSnapshot ? "snapshot" : "patch");
  previousSnapshot = JSON.parse(JSON.stringify(state));
  const signature = getProgressSignature(state);
  if (signature !== lastProgressSignature) {
    lastProgressSignature = signature;
    renderObjectivePanel();
    syncOnboardingDismissalByChapter();
    renderOnboardingPanel();
    renderRecapPanel();
  }
};

const multiplayer = sessionMode === "coop"
  ? createMultiplayerClient({
    roomId,
    playerId,
    authToken: params.get("token") || "",
    accessCode,
    displayName: displayName || playerId,
    roomMeta: {
      displayName: params.get("roomName") || undefined,
      accessCode: accessCode || undefined,
      isPrivate: params.get("private") === "1"
    },
    url: params.get("ws") || "ws://localhost:8787",
    onSnapshot: (snapshot) => {
      applyAuthoritativeUpdate(snapshot, true);
      rehydrateContentFromState(state);
    },
    onPatch: (patch) => {
      applyAuthoritativeUpdate(patch);
      rehydrateContentFromState(state);
    },
    onAction: (action) => {
      let result = { notifications: [] };
      if (action.type === "terminal.command") {
        result = applyAction(state, action.command);
      } else if (action.type === "objective.interact") {
        result = applyAction(state, { type: "objective.complete", objectiveId: action.objectiveId });
      }
      const chapterUpdate = refreshChapterFromState(state);
      maybeTriggerChapterRecap(chapterUpdate.previousChapter, chapterUpdate.chapter, "action");
      for (const note of result.notifications || []) notify(note.message, { actor: note.actor });
      rehydrateContentFromState(state);
      evaluateBehaviorReactions({ state, fs, saveState: persist });
      presentation.handleStateTransition(previousSnapshot, state);
      previousSnapshot = JSON.parse(JSON.stringify(state));
      const signature = getProgressSignature(state);
      if (signature !== lastProgressSignature) {
        lastProgressSignature = signature;
        renderObjectivePanel();
        syncOnboardingDismissalByChapter();
        renderOnboardingPanel();
        renderRecapPanel();
      }
    },
    onPresence: (presence) => {
      const connected = presence?.connectedCount || 0;
      lobbyStatus.textContent = `${COPY.lobby.presencePrefix}: ${connected}/${presence?.capacity || 0}`;
    },
    onRoomEvent: (event) => {
      if (event.type === "player.joined") notify(`${event.player?.displayName || event.player?.playerId} ${COPY.lobby.joinedSuffix}`);
      if (event.type === "player.left") notify(`${event.player?.playerId} ${COPY.lobby.left}`);
    },
    onLobby: (rooms) => {
      if (!lobbyList) return;
      if (!Array.isArray(rooms) || !rooms.length) {
        lobbyList.innerHTML = `<div class="notice">${COPY.lobby.noNodes}</div>`;
        return;
      }
      lobbyList.innerHTML = rooms.map((entry) => `<button class="start-item lobby-item" data-room="${entry.roomId}">${entry.displayName} · ${entry.connectedCount}/${entry.seats}${entry.hasAccessCode ? " · keyed" : ""}</button>`).join("");
      for (const button of lobbyList.querySelectorAll("button[data-room]")) {
        button.onclick = () => {
          const selectedRoom = button.getAttribute("data-room");
          roomIdInput.value = selectedRoom || "";
        };
      }
    },
    onStatus: (status) => {
      if (["connected", "connecting", "reconnecting", "disconnected"].includes(status)) {
        connectionQuality = status;
        updateConnectionIndicators();
      }
      if (desktopInitialized) notify(`${COPY.lobby.coopStatusPrefix} ${status}`);
    },
    onSyncStatus: (status) => {
      syncState = status;
      updateConnectionIndicators();
    }
  })
  : null;

const persist = () => {
  if (state.sessionMode === "solo") saveState(state);
};

const dispatchAction = (action) => {
  if (state.sessionMode === "coop") {
    multiplayer?.sendAction(action);
    return { accepted: false, terminalLines: [] };
  }

  const result = applyAction(state, action);
  const chapterUpdate = refreshChapterFromState(state);
  maybeTriggerChapterRecap(chapterUpdate.previousChapter, chapterUpdate.chapter, "action");
  for (const note of result.notifications || []) notify(note.message, { actor: note.actor });
  return { accepted: true, ...result };
};

function completeOnboardingObjective(objectiveId) {
  if (state.completedObjectives.includes(objectiveId)) return;
  dispatchAction({ type: "objective.complete", objectiveId });
}

const save = () => {
  evaluateBehaviorReactions({ state, fs, saveState: persist });
  rehydrateContentFromState(state);

  if (state.sessionMode === "solo") {
    const prev = previousSnapshot;
    presentation.handleStateTransition(prev, state);
    persist();
    previousSnapshot = JSON.parse(JSON.stringify(state));

    const signature = getProgressSignature(state);
    if (signature !== lastProgressSignature) {
      lastProgressSignature = signature;
      renderObjectivePanel();
      syncOnboardingDismissalByChapter();
      renderOnboardingPanel();
      renderRecapPanel();
    }
    return;
  }

  // In coop mode, progression and shared state are server-authoritative via validated actions.
  // Local-only UI changes are not patched directly by clients.
};

const getDynamicFile = (path) => getDynamicFileBase(path, state);

evaluateBehaviorReactions({ state, fs, saveState: persist });
rehydrateContentFromState(state);

const { makeWindow } = createWindowManager({ desktopRoot, taskList, state, persistState: persist });

const appContext = {
  makeWindow,
  fs,
  files,
  state,
  saveState: save,
  completeObjective: (action) => dispatchAction(action),
  sendAction: (action) => dispatchAction(action),
  notify,
  resetSession: ({ actor } = {}) => resetSessionAndReboot({ announce: Boolean(actor) }),
  simulateSystemTick: () => tickSystemSimulation(state),
  simulationHooks: {
    onCriticalDivergence: ({ divergence, branchA, branchB }) => {
      notify(formatCopy(COPY.simulation.notifications.criticalDivergence, {
        divergence,
        branchA,
        branchB
      }));
    },
    onRunCompleted: ({ runId, eventCount, trust, conflict }) => {
      notify(formatCopy(COPY.simulation.notifications.runComplete, {
        runId,
        eventCount,
        trust,
        conflict
      }));
    }
  },
  getDynamicFile,
  getDirectoryEntries,
  isContentVisible
};

const unsubscribeSystemEvents = subscribeSystemEvents((event) => {
  if (event.level === "warning" || event.level === "critical") {
    notify(`service warning: ${event.service} // ${event.message}`, { actor: "system" });
  }
});
void unsubscribeSystemEvents;

function getChapterLabel(chapter) {
  return COPY.shell.chapterLabels[chapter] || COPY.shell.chapterLabels[3];
}

function mountObjectivePanel() {
  const panel = document.createElement("aside");
  panel.className = "objective-panel";
  panel.id = "objectivePanel";
  desktopRoot.appendChild(panel);

  const render = () => {
    const active = getActiveObjectives(state, state.activeRole);
    const isCoop = state.sessionMode === "coop";
    const teammateRole = state.activeRole === "operator" ? "observer" : "operator";
    const teammateId = state.roles?.[teammateRole] || "unassigned";
    const teammateActivity = [...(state.terminalHistory || [])]
      .reverse()
      .find((entry) => typeof entry !== "string" && entry.actor !== state.playerId);
    const relayCue = state.relaySignal
      ? (state.relaySignal.resolvedBy
          ? `Relay handoff acknowledged by ${state.relaySignal.resolvedBy}.`
          : `Relay handoff pending (${Math.max(0, Math.ceil((state.relaySignal.expiresAt - Date.now()) / 1000))}s remaining).`)
      : COPY.shell.objectives.activeRelay;
    const coopTelemetry = isCoop
      ? `<div class="kv-row"><span class="kv-key">${COPY.shell.objectives.teammate}</span><span class="kv-value">${teammateRole}: ${teammateId}</span></div>
        <div class="kv-row"><span class="kv-key">activity</span><span class="kv-value">${teammateActivity ? teammateActivity.command : COPY.shell.objectives.noTeammateActivity}</span></div>`
      : "";
    const relayNotice = isCoop ? `<div class="notice">${relayCue}</div>` : "";
    panel.innerHTML = `
      <div class="system-label">mission telemetry</div>
      <div class="objective-title">${getChapterLabel(state.chapter)}</div>
      <div class="objective-subtitle">${COPY.shell.objectives.panelRole}: <span class="status-badge active">${state.activeRole}</span></div>
      <div class="kv-diagnostics">
        <div class="kv-row"><span class="kv-key">${COPY.shell.objectives.trust}</span><span class="kv-value">${state.teamTrustScore || 0}</span></div>
        ${coopTelemetry}
      </div>
      ${relayNotice}
      <div class="objective-subtitle">${COPY.shell.objectives.activeObjectives}</div>
      <ul>${active.map((objective) => `<li><span class="status-badge">${(objective.roles || ["operator"]).join("/")}</span> ${objective.label}</li>`).join("") || `<li>${COPY.shell.objectives.allDone}</li>`}</ul>
      <button type="button" class="onboarding-dismiss" data-action="confirm-panel">Confirm panel reviewed</button>
    `;

    panel.querySelector('[data-action="confirm-panel"]').onclick = () => {
      ensureUiHintsState();
      if (!state.uiHints.objectivePanelConfirmedChapters.includes(state.chapter)) {
        state.uiHints.objectivePanelConfirmedChapters.push(state.chapter);
      }
      completeOnboardingObjective("onboarding_confirm_objective_panel");
      save();
    };
  };

  render();
  return render;
}

function mountOnboardingPanel() {
  const panel = document.createElement("aside");
  panel.className = "onboarding-panel";
  panel.id = "onboardingPanel";
  desktopRoot.appendChild(panel);

  const render = () => {
    syncOnboardingDismissalByChapter();
    if (state.uiHints.onboardingDismissed) {
      panel.style.display = "none";
      return;
    }

    const checklist = getOnboardingChecklistItems(state, state.activeRole, 5);
    panel.style.display = "block";
    panel.innerHTML = `
      <div class="system-label">operator bootstrap</div>
      <div class="objective-title">${COPY.shell.onboarding.title}</div>
      <div class="objective-subtitle">${COPY.shell.objectives.panelRole}: <span class="status-badge active">${state.activeRole}</span></div>
      <ul>${checklist.map((item) => `<li>${item.hint}</li>`).join("") || "<li>All current objectives complete.</li>"}</ul>
      <div class="onboarding-actions">
        <button type="button" data-open="terminal">Open Command Shell</button>
        <button type="button" data-open="explorer">Open Node Directory</button>
        <button type="button" data-open="help">Open Operations Manual</button>
      </div>
      <button type="button" class="onboarding-dismiss" data-action="dismiss">${COPY.shell.onboarding.dismiss}</button>
    `;

    panel.querySelector('[data-open="terminal"]').onclick = () => openTerminal(appContext);
    panel.querySelector('[data-open="explorer"]').onclick = () => {
      openExplorer(appContext);
      completeOnboardingObjective("onboarding_open_explorer");
      save();
    };
    panel.querySelector('[data-open="help"]').onclick = () => openHelp(appContext);
    panel.querySelector('[data-action="dismiss"]').onclick = () => {
      state.uiHints.onboardingDismissed = true;
      state.uiHints.onboardingDismissedChapter = state.chapter;
      panel.style.display = "none";
      save();
    };
  };

  render();
  return render;
}

function mountRecapPanel() {
  const panel = document.createElement("aside");
  panel.className = "recap-panel";
  panel.id = "recapPanel";
  desktopRoot.appendChild(panel);

  const render = () => {
    const recap = state.lastRecap;
    if (!recap) {
      panel.style.display = "none";
      return;
    }
    panel.style.display = "block";
    panel.innerHTML = `
      <div class="system-label">chapter recap</div>
      <div class="objective-title">Act ${recap.chapter} Transition</div>
      <div class="objective-subtitle">What was discovered</div>
      <p>${recap.discovered}</p>
      <div class="objective-subtitle">What changed in world state</div>
      <p>${recap.worldState}</p>
      <div class="objective-subtitle">Why next objectives matter</div>
      <p>${recap.nextObjective}</p>
      <div class="onboarding-actions">
        <button type="button" data-open="help">Review in Operations Manual</button>
      </div>
    `;
    panel.querySelector('[data-open="help"]').onclick = () => openHelp(appContext);
  };

  render();
  return render;
}

const apps = [
  { id: "explorer", name: COPY.apps.explorer, icon: "📁", roles: ["operator", "observer"], open: () => openExplorer(appContext) },
  { id: "terminal", name: COPY.apps.terminal, icon: "⌨", roles: ["operator", "observer"], open: () => openTerminal(appContext) },
  { id: "notes", name: COPY.apps.notes, icon: "📝", roles: ["operator", "observer"], open: () => openNotes(appContext) },
  { id: "media", name: COPY.apps.media, icon: "▶", roles: ["operator"], open: () => openMedia(appContext) },
  { id: "settings", name: COPY.apps.settings, icon: "⚙", roles: ["operator"], open: () => openSettings(appContext) },
  { id: "help", name: COPY.apps.help, icon: "?", roles: ["operator", "observer"], open: () => openHelp(appContext) },
  { id: "chat", name: COPY.apps.chat, icon: "💬", roles: ["operator", "observer"], open: () => openChat(appContext) },
  { id: "calculator", name: COPY.apps.calculator, icon: "🧮", roles: ["operator", "observer"], open: () => openCalculator(appContext) },
  { id: "calendar", name: COPY.apps.calendar, icon: "📆", roles: ["operator", "observer"], open: () => openCalendar(appContext) },
  { id: "sysmon", name: COPY.apps.sysmon, icon: "📈", roles: ["operator", "observer"], open: () => openSystemMonitor(appContext) },
  { id: "simulation", name: COPY.apps.simulation, icon: "🧪", roles: ["operator", "observer"], open: () => openSimulationConsole(appContext) }
];


function openApp(app) {
  app.open();
  if (app.id === "explorer") {
    completeOnboardingObjective("onboarding_open_explorer");
  }
  if (!Array.isArray(state.recentApps)) state.recentApps = [];
  state.recentApps.push({ id: app.id || app.name, name: app.name, at: Date.now() });
  state.recentApps = state.recentApps.slice(-20);
  save();
}

function openStartupNotification() {
  const startupText = COPY.notifications.startup[Math.min(state.chapter - 1, 2)];

  notify(startupText);
}

function triggerLifecycle(eventType) {
  if (state.sessionMode === "coop") {
    notify(COPY.notifications.lifecycleBlocked);
    return;
  }
  const report = applyLifecycleEvent(state, eventType);
  if (!Array.isArray(state.lifecycleHistory)) state.lifecycleHistory = [];
  state.lifecycleHistory.push({
    id: report.id,
    eventType,
    timestamp: report.timestamp,
    summary: report.summary
  });
  state.lifecycleHistory = state.lifecycleHistory.slice(-8);
  saveState(state);
  window.location.reload();
}

function initDesktop() {
  if (desktopInitialized) return;
  desktopInitialized = true;
  ensureUiHintsState();
  syncOnboardingDismissalByChapter();
  renderObjectivePanel = mountObjectivePanel();
  renderOnboardingPanel = mountOnboardingPanel();
  renderRecapPanel = mountRecapPanel();

  startBtn.textContent = COPY.apps.menuLabel;
  desktopIcons.textContent = "";
  startMenuItems.textContent = "";

  for (const app of apps) {
    if (Array.isArray(app.roles) && !app.roles.includes(state.activeRole)) continue;
    const icon = document.createElement("button");
    icon.className = "icon";
    icon.type = "button";
    icon.setAttribute("aria-label", `Open ${app.name}`);
    icon.innerHTML = `<div class="glyph" aria-hidden="true">${app.icon}</div><div class="system-label">${app.name}</div>`;
    icon.ondblclick = (e) => {
      e.preventDefault();
      openApp(app);
    };
    icon.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openApp(app);
      }
    };
    desktopIcons.appendChild(icon);

    const item = document.createElement("button");
    item.className = "start-item";
    item.type = "button";
    item.textContent = app.name;
    item.onclick = () => {
      startMenu.classList.remove("is-open");
      openApp(app);
    };
    startMenuItems.appendChild(item);
  }

  const reset = document.createElement("button");
  reset.className = "start-item";
  reset.type = "button";
  reset.textContent = COPY.apps.reset;
  reset.onclick = () => {
    if (state.sessionMode === "coop") {
      notify(COPY.lobby.freshSessionHint);
      return;
    }
    const ok = window.confirm(COPY.notifications.resetConfirm);
    if (!ok) return;
    resetSessionAndReboot({ announce: false });
  };
  startMenuItems.appendChild(reset);

  const restart = document.createElement("button");
  restart.className = "start-item";
  restart.type = "button";
  restart.textContent = COPY.apps.restart;
  restart.onclick = () => {
    triggerLifecycle("restart");
  };
  startMenuItems.appendChild(restart);

  const crash = document.createElement("button");
  crash.className = "start-item";
  crash.type = "button";
  crash.textContent = COPY.apps.crash;
  crash.onclick = () => {
    triggerLifecycle("crash");
  };
  startMenuItems.appendChild(crash);

  startBtn.onclick = () => {
    startMenu.classList.toggle("is-open");
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") startMenu.classList.remove("is-open");
  });

  desktopRoot.onclick = (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("#startMenu") && !target.closest("#startBtn")) startMenu.classList.remove("is-open");
  };

  setInterval(() => {
    const now = new Date(Date.now() + state.driftMinutes * 60_000);
    const baseClock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    trayClock.textContent = isManifestationActive(state, "labelShift") ? `${baseClock} ?` : baseClock;
    setTrayHealth(trayClock, trayClock.textContent);
    trayState.textContent = `${getTrayWarningText(state)} | ${getSystemTraySummary()}`;
    setTrayHealth(trayState, trayState.textContent);

    const glitch = getAppGlitchStyle(state);
    desktopRoot.style.filter = glitch.filter;
    desktopRoot.style.transform = glitch.transform;
  }, 1000);

  setInterval(() => {
    tickSystemSimulation(state);
    rehydrateContentFromState(state);
    if (state.sessionMode === "solo") persist();
  }, 2500);
}

createRoomBtn.onclick = () => {
  const room = (roomIdInput.value || `room-${Math.random().toString(36).slice(2, 8)}`).trim();
  const code = (accessCodeInput.value || "").trim();
  const name = (displayNameInput.value || playerId).trim();
  const roomLabel = (roomNameInput.value || `Node ${room.slice(0, 6)}`).trim();
  const privateFlag = privateRoomInput.checked;
  const next = new URL(buildSessionUrl({ room, code, name, host: true }));
  next.searchParams.set("roomName", roomLabel);
  if (privateFlag) next.searchParams.set("private", "1"); else next.searchParams.delete("private");
  window.location.href = next.toString();
};

joinRoomBtn.onclick = () => {
  const room = (roomIdInput.value || "").trim();
  if (!room) {
    notify(COPY.lobby.joinError);
    return;
  }
  const code = (accessCodeInput.value || "").trim();
  const name = (displayNameInput.value || playerId).trim();
  window.location.href = buildSessionUrl({ room, code, name, host: false });
};

copyInviteBtn.onclick = async () => {
  const room = (roomIdInput.value || roomId || "").trim();
  if (!room) {
    notify(COPY.lobby.copyError);
    return;
  }
  const code = (accessCodeInput.value || "").trim();
  const name = (displayNameInput.value || playerId).trim();
  const inviteUrl = buildSessionUrl({ room, code, name, host: false });
  try {
    await navigator.clipboard.writeText(inviteUrl);
    notify(COPY.lobby.copied);
  } catch {
    notify(COPY.lobby.clipboardUnavailable);
  }
};

loginBtn.onclick = () => {
  presentation.startAmbient();
  login.style.display = "none";
  desktopRoot.style.display = "block";
  initDesktop();
  if (state.bootCount > 1) openExplorer(appContext);
  if (state.bootCount > 2) setTimeout(() => openTerminal(appContext), 500);
  openStartupNotification();
  for (const message of bootServiceNotifications) notify(message);
  if (state.pendingRecoveryNotice && state.lastBootReport) {
    notify(`Recovered previous session — diagnostics: /logs/diagnostics/last_boot_report.log`);
    if (state.panicFragment) notify(`panic fragment captured: /logs/diagnostics/panic_fragment.log`);
    state.pendingRecoveryNotice = false;
  }
  save();
};

runBoot({
  state,
  bootText,
  bootEl,
  splash,
  login,
  lastSession,
  onService: (service) => {
    bootServiceNotifications.push(`boot service ${service.name}: ${service.status}`);
  }
});
