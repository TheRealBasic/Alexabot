import { applyProgressionFlags, clearState, getActiveObjectives, getProgressSignature, loadState, saveState } from "./state.js";
import { fs, files, getDirectoryEntries, getDynamicFile as getDynamicFileBase, isContentVisible, rehydrateContentFromState } from "./content.js";
import { createWindowManager } from "./windowManager.js";
import { runBoot } from "./boot.js";
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

const state = applyProgressionFlags(loadState());
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
const cinematicOverlay = document.getElementById("cinematicOverlay");
const taskbar = document.querySelector(".taskbar");
const notificationCenter = document.getElementById("notificationCenter");

let desktopInitialized = false;

const notify = (message) => {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  notificationCenter.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
};

const presentation = createPresentationController({
  state,
  desktopRoot,
  taskbar,
  overlay: cinematicOverlay
});

const persist = () => saveState(state);
let previousSnapshot = JSON.parse(JSON.stringify(state));
let lastProgressSignature = getProgressSignature(state);
let renderObjectivePanel = () => {};

const save = () => {
  const prev = previousSnapshot;
  evaluateBehaviorReactions({ state, fs, saveState: persist });
  rehydrateContentFromState(state);
  presentation.handleStateTransition(prev, state);
  persist();
  previousSnapshot = JSON.parse(JSON.stringify(state));

  const signature = getProgressSignature(state);
  if (signature !== lastProgressSignature) {
    lastProgressSignature = signature;
    renderObjectivePanel();
  }
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
    const active = getActiveObjectives(state);
    panel.innerHTML = `
      <div class="objective-title">${getChapterLabel(state.chapter)}</div>
      <div class="objective-subtitle">Active Objectives</div>
      <ul>${active.map((objective) => `<li>${objective.label}</li>`).join("") || "<li>All objectives complete.</li>"}</ul>
    `;
  };

  render();
  return render;
}

const apps = [
  { name: "File Explorer", icon: "📁", open: () => openExplorer(appContext) },
  { name: "Terminal", icon: "⌨", open: () => openTerminal(appContext) },
  { name: "Notes", icon: "📝", open: () => openNotes(appContext) },
  { name: "Media Player", icon: "▶", open: () => openMedia(appContext) },
  { name: "System Settings", icon: "⚙", open: () => openSettings(appContext) },
  { name: "Help", icon: "?", open: () => openHelp(appContext) }
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
