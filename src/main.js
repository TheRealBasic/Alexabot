import { applyProgressionFlags, clearState, getActiveObjectives, getProgressSignature, loadState, refreshChapterFromState, saveState } from "./state.js";
import { fs, files, getDirectoryEntries, getDynamicFile as getDynamicFileBase, isContentVisible, rehydrateContentFromState } from "./content.js";
import { createWindowManager } from "./windowManager.js";
import { runBoot } from "./boot.js";
import { createMultiplayerClient, applyIncrementalPatch } from "./multiplayer/client.js";
import { applyAction } from "./progression/reducer.js";
import {
  evaluateBehaviorReactions,
  getAppGlitchStyle,
  getTrayWarningText
} from "./progression/reactions.js";
import { openExplorer } from "./apps/explorer.js";
import { openTerminal } from "./apps/terminal.js";
import { openNotes } from "./apps/notes.js";
import { openMedia } from "./apps/media.js";
import { openSettings } from "./apps/settings.js";
import { openHelp } from "./apps/help.js";
import { createPresentationController } from "./presentation.js";

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

function updateConnectionIndicators() {
  trayConnection.textContent = `NET: ${connectionQuality.toUpperCase()}`;
  traySync.textContent = `SYNC: ${syncState.toUpperCase()}`;
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
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = actor ? `[${actor}] ${message}` : message;
  notificationCenter.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
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
  previousSnapshot = JSON.parse(JSON.stringify(state));
  const signature = getProgressSignature(state);
  if (signature !== lastProgressSignature) {
    lastProgressSignature = signature;
    renderObjectivePanel();
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
      refreshChapterFromState(state);
      for (const note of result.notifications || []) notify(note.message, { actor: note.actor });
      rehydrateContentFromState(state);
      evaluateBehaviorReactions({ state, fs, saveState: persist });
      presentation.handleStateTransition(previousSnapshot, state);
      previousSnapshot = JSON.parse(JSON.stringify(state));
      const signature = getProgressSignature(state);
      if (signature !== lastProgressSignature) {
        lastProgressSignature = signature;
        renderObjectivePanel();
      }
    },
    onPresence: (presence) => {
      const connected = presence?.connectedCount || 0;
      lobbyStatus.textContent = `Room presence: ${connected}/${presence?.capacity || 0}`;
    },
    onRoomEvent: (event) => {
      if (event.type === "player.joined") notify(`${event.player?.displayName || event.player?.playerId} joined room`);
      if (event.type === "player.left") notify(`${event.player?.playerId} disconnected (grace window active)`);
    },
    onLobby: (rooms) => {
      if (!lobbyList) return;
      if (!Array.isArray(rooms) || !rooms.length) {
        lobbyList.innerHTML = '<div class="notice">No public rooms yet.</div>';
        return;
      }
      lobbyList.innerHTML = rooms.map((entry) => `<button class="start-item" data-room="${entry.roomId}" style="margin-bottom:4px;">${entry.displayName} · ${entry.connectedCount}/${entry.seats}${entry.hasAccessCode ? " · code" : ""}</button>`).join("");
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
      if (desktopInitialized) notify(`coop ${status}`);
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
  refreshChapterFromState(state);
  for (const note of result.notifications || []) notify(note.message, { actor: note.actor });
  return { accepted: true, ...result };
};

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
    }
    return;
  }

  // In coop mode, progression and shared state are server-authoritative via validated actions.
  // Local-only UI changes are not patched directly by clients.
};

const getDynamicFile = (path) => getDynamicFileBase(path, state);

evaluateBehaviorReactions({ state, fs, saveState: persist });
rehydrateContentFromState(state);

const { makeWindow } = createWindowManager({ desktopRoot, taskList });

const appContext = {
  makeWindow,
  fs,
  files,
  state,
  saveState: save,
  completeObjective: (action) => dispatchAction(action),
  sendAction: (action) => dispatchAction(action),
  notify,
  getDynamicFile,
  getDirectoryEntries,
  isContentVisible
};

function getChapterLabel(chapter) {
  if (chapter === 1) return "Act I // Orientation";
  if (chapter === 2) return "Act II // Retrieval";
  return "Act III // Disclosure";
}

function mountObjectivePanel() {
  const panel = document.createElement("aside");
  panel.className = "objective-panel";
  panel.id = "objectivePanel";
  desktopRoot.appendChild(panel);

  const render = () => {
    const active = getActiveObjectives(state, state.activeRole);
    const teammateRole = state.activeRole === "operator" ? "observer" : "operator";
    const teammateId = state.roles?.[teammateRole] || "unassigned";
    const teammateActivity = [...(state.terminalHistory || [])]
      .reverse()
      .find((entry) => typeof entry !== "string" && entry.actor !== state.playerId);
    const relayCue = state.relaySignal
      ? (state.relaySignal.resolvedBy
          ? `Relay acknowledged by ${state.relaySignal.resolvedBy}.`
          : `Relay pending (${Math.max(0, Math.ceil((state.relaySignal.expiresAt - Date.now()) / 1000))}s remaining).`)
      : "No active relay.";
    panel.innerHTML = `
      <div class="objective-title">${getChapterLabel(state.chapter)}</div>
      <div class="objective-subtitle">Role: ${state.activeRole}</div>
      <div class="notice">Team Trust: ${state.teamTrustScore || 0}</div>
      <div class="notice">Teammate (${teammateRole}): ${teammateId}</div>
      <div class="notice">${teammateActivity ? `Last teammate command: ${teammateActivity.command}` : "No teammate activity yet."}</div>
      <div class="notice">${relayCue}</div>
      <div class="objective-subtitle">Active Objectives</div>
      <ul>${active.map((objective) => `<li><strong>[${(objective.roles || ["operator"]).join("/")}]</strong> ${objective.label}</li>`).join("") || "<li>All objectives complete.</li>"}</ul>
    `;
  };

  render();
  return render;
}

const apps = [
  { name: "File Explorer", icon: "📁", roles: ["operator", "observer"], open: () => openExplorer(appContext) },
  { name: "Terminal", icon: "⌨", roles: ["operator", "observer"], open: () => openTerminal(appContext) },
  { name: "Notes", icon: "📝", roles: ["operator", "observer"], open: () => openNotes(appContext) },
  { name: "Media Player", icon: "▶", roles: ["operator"], open: () => openMedia(appContext) },
  { name: "System Settings", icon: "⚙", roles: ["operator"], open: () => openSettings(appContext) },
  { name: "Help", icon: "?", roles: ["operator", "observer"], open: () => openHelp(appContext) }
];

function openStartupNotification() {
  const startupText = [
    "Act I initialized: verify archive pathway.",
    "Act II initialized: recover and decode withheld artifacts.",
    "Act III initialized: complete disclosure sequence."
  ][Math.min(state.chapter - 1, 2)];

  notify(startupText);
}

function initDesktop() {
  if (desktopInitialized) return;
  desktopInitialized = true;
  renderObjectivePanel = mountObjectivePanel();

  for (const app of apps) {
    if (Array.isArray(app.roles) && !app.roles.includes(state.activeRole)) continue;
    const icon = document.createElement("button");
    icon.className = "icon";
    icon.type = "button";
    icon.setAttribute("aria-label", `Open ${app.name}`);
    icon.innerHTML = `<div class="glyph">${app.icon}</div><div>${app.name}</div>`;
    icon.ondblclick = () => app.open();
    icon.onclick = () => app.open();
    icon.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        app.open();
      }
    };
    desktopIcons.appendChild(icon);

    const item = document.createElement("button");
    item.className = "start-item";
    item.type = "button";
    item.textContent = app.name;
    item.onclick = () => {
      startMenu.style.display = "none";
      app.open();
    };
    startMenu.appendChild(item);
  }

  const reset = document.createElement("button");
  reset.className = "start-item";
  reset.type = "button";
  reset.textContent = "Reset Session";
  reset.onclick = () => {
    if (state.sessionMode === "coop") {
      notify("Use a new room code to start a fresh co-op session.");
      return;
    }
    const ok = window.confirm("Clear local session data and restart?");
    if (!ok) return;
    clearState();
    window.location.reload();
  };
  startMenu.appendChild(reset);

  const shutdown = document.createElement("button");
  shutdown.className = "start-item";
  shutdown.type = "button";
  shutdown.textContent = "Shut Down";
  shutdown.onclick = () => {
    notify("Shutdown unavailable: archival cycle in progress.");
    state.complianceScore -= 1;
    save();
  };
  startMenu.appendChild(shutdown);

  startBtn.onclick = () => {
    startMenu.style.display = startMenu.style.display === "block" ? "none" : "block";
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") startMenu.style.display = "none";
  });

  desktopRoot.onclick = (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) startMenu.style.display = "none";
  };

  setInterval(() => {
    const now = new Date(Date.now() + state.driftMinutes * 60_000);
    trayClock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    trayState.textContent = getTrayWarningText(state);

    const glitch = getAppGlitchStyle(state);
    desktopRoot.style.filter = glitch.filter;
    desktopRoot.style.transform = glitch.transform;
  }, 500);
}

createRoomBtn.onclick = () => {
  const room = (roomIdInput.value || `room-${Math.random().toString(36).slice(2, 8)}`).trim();
  const code = (accessCodeInput.value || "").trim();
  const name = (displayNameInput.value || playerId).trim();
  const roomLabel = (roomNameInput.value || `Room ${room.slice(0, 6)}`).trim();
  const privateFlag = privateRoomInput.checked;
  const next = new URL(buildSessionUrl({ room, code, name, host: true }));
  next.searchParams.set("roomName", roomLabel);
  if (privateFlag) next.searchParams.set("private", "1"); else next.searchParams.delete("private");
  window.location.href = next.toString();
};

joinRoomBtn.onclick = () => {
  const room = (roomIdInput.value || "").trim();
  if (!room) {
    notify("Enter a room ID to join.");
    return;
  }
  const code = (accessCodeInput.value || "").trim();
  const name = (displayNameInput.value || playerId).trim();
  window.location.href = buildSessionUrl({ room, code, name, host: false });
};

copyInviteBtn.onclick = async () => {
  const room = (roomIdInput.value || roomId || "").trim();
  if (!room) {
    notify("Enter a room ID first.");
    return;
  }
  const code = (accessCodeInput.value || "").trim();
  const name = (displayNameInput.value || playerId).trim();
  const inviteUrl = buildSessionUrl({ room, code, name, host: false });
  try {
    await navigator.clipboard.writeText(inviteUrl);
    notify("Invite link copied.");
  } catch {
    notify("Clipboard unavailable. Copy URL manually from address bar.");
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
  save();
};

runBoot({ state, bootText, bootEl, splash, login, lastSession });
