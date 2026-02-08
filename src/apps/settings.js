import { appendForensicTrace, appendManifestationEvent, appendTerminalEvent } from "../state.js";
import { consumeManifestation, isManifestationActive } from "../progression/reactions.js";
import { COPY, formatCopy } from "../ui/copy.js";

function parseTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function statusBadge(status) {
  return `<span class='status-badge ${status.level}'>${status.label}</span>`;
}

export function openSettings({ makeWindow, state, saveState, notify }) {
  makeWindow("settings", COPY.apps.settings, (content, win) => {
    content.innerHTML = `<div class='app-shell'>
      <div class='system-label' id='clockLabel'>clock discipline controls</div>
      <div class='panel-dense'>
        <div><span class='field-legend'>${COPY.settings.title}</span><span id='offset'></span> minutes</div>
        <div style='margin-top:10px; display:flex; gap:6px; align-items:center'>
          <input id='manualTime' type='time' value='03:11' />
          <button id='applyTime'>${COPY.settings.apply}</button>
        </div>
        <button id='sync311' style='margin-top:10px'>${COPY.settings.syncMaintenance}</button>
        <div class='notice'>${COPY.settings.warning}</div>
        <div id='setMsg' class='notice'></div>
      </div>
      <div class='panel-dense'>
        <div class='field-legend'>workstation subsystems</div>
        <div class='kv-diagnostics' id='servicesPanel'></div>
        <div style='display:flex; gap:6px; margin-top:8px; flex-wrap:wrap'>
          <button id='toggleRtcLock'>toggle rtc lock</button>
          <button id='runStorageScan'>run smart short scan</button>
          <button id='cycleSession'>cycle session daemon</button>
          <button id='renewDhcp'>renew adapter lease</button>
        </div>
        <div class='notice' id='serviceMsg'>controls constrained by narrative guardrails</div>
      </div>
    </div>`;
    win?.setHealth?.("active");

    const offset = content.querySelector("#offset");
    const msg = content.querySelector("#setMsg");
    const serviceMsg = content.querySelector("#serviceMsg");
    const manual = content.querySelector("#manualTime");
    const servicesPanel = content.querySelector("#servicesPanel");
    const clockLabel = content.querySelector("#clockLabel");

    if (typeof state.rtcLocked !== "boolean") state.rtcLocked = true;
    if (!state.serviceHealth || typeof state.serviceHealth !== "object") {
      state.serviceHealth = {
        rtc: "stale",
        storage: "active",
        sessiond: "active",
        net: "stale"
      };
    }

    const statuses = () => ({
      rtc: {
        level: state.rtcLocked ? "stale" : "active",
        label: state.rtcLocked ? "disciplined" : "manual"
      },
      storage: {
        level: state.recoveredFiles ? "active" : "stale",
        label: state.recoveredFiles ? "surface clean" : "reallocated sectors: 12"
      },
      sessiond: {
        level: state.relaySignal ? "fault" : "active",
        label: state.relaySignal ? "bridge contention" : "synchronized"
      },
      net: {
        level: state.unlocked.archive ? "active" : "stale",
        label: state.unlocked.archive ? "archive route open" : "archive vlan isolated"
      }
    });

    const updateServices = () => {
      const s = statuses();
      servicesPanel.innerHTML = `
        <div class='kv-row'><span class='kv-key'>rtc discipline</span><span class='kv-value'>${statusBadge(s.rtc)} lock=${state.rtcLocked ? "on" : "off"}</span></div>
        <div class='kv-row'><span class='kv-key'>storage health</span><span class='kv-value'>${statusBadge(s.storage)} ${s.storage.label}</span></div>
        <div class='kv-row'><span class='kv-key'>session daemon</span><span class='kv-value'>${statusBadge(s.sessiond)} ${s.sessiond.label}</span></div>
        <div class='kv-row'><span class='kv-key'>network adapter</span><span class='kv-value'>${statusBadge(s.net)} ${s.net.label}</span></div>`;
    };

    const applyClock = (hours, minutes) => {
      const now = new Date();
      state.driftMinutes = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes) - now) / 60000);
      if (hours === 3 && minutes === 11) {
        state.unlocked.redactedLog = true;
        msg.textContent = COPY.settings.maintenanceSuccess;
      } else {
        msg.textContent = formatCopy(COPY.settings.synced, { time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` });
      }
      appendForensicTrace(state, "settings.clock", `set ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
      appendTerminalEvent(state, `settings: set-time ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
      saveState();
      const notifyLine = isManifestationActive(state, "delayedNotification")
        ? `${COPY.settings.notify} (queue latency detected)`
        : COPY.settings.notify;
      notify?.(notifyLine);
      update();
    };

    const update = () => {
      offset.textContent = state.driftMinutes;
      clockLabel.textContent = isManifestationActive(state, "labelShift")
        ? "clock discipline (calibrating memory)"
        : "clock discipline controls";
      if (isManifestationActive(state, "clockWhisper") && consumeManifestation(state, "clockWhisper")) {
        msg.textContent = state.manifestationState.pendingClockLine || "clock discipline accepted // residual drift remains";
        state.manifestationState.pendingClockLine = null;
        appendManifestationEvent(state, "clockWhisper", "clock panel whisper surfaced");
      }
      updateServices();
    };

    update();
    content.querySelector("#sync311").onclick = () => applyClock(3, 11);
    content.querySelector("#applyTime").onclick = () => {
      const parsed = parseTime(manual.value);
      if (!parsed) {
        msg.textContent = COPY.settings.invalid;
        win?.setHealth?.("fault");
        return;
      }
      applyClock(parsed.hours, parsed.minutes);
      win?.setHealth?.("active");
    };

    content.querySelector("#toggleRtcLock").onclick = () => {
      state.rtcLocked = !state.rtcLocked;
      serviceMsg.textContent = `rtc lock ${state.rtcLocked ? "engaged" : "released"} (${state.rtcLocked ? "time discipline enforced" : "manual drift allowed"})`;
      appendForensicTrace(state, "settings.rtc", serviceMsg.textContent);
      appendTerminalEvent(state, `settings: rtc-lock ${state.rtcLocked ? "on" : "off"}`);
      saveState();
      updateServices();
    };

    content.querySelector("#runStorageScan").onclick = () => {
      serviceMsg.textContent = state.recoveredFiles
        ? "smart short scan complete: no new reallocations"
        : "smart short scan: pending anomalies near deleted manifest sectors";
      appendForensicTrace(state, "settings.storage", serviceMsg.textContent);
      appendTerminalEvent(state, "settings: smartctl --short");
      saveState();
      updateServices();
    };

    content.querySelector("#cycleSession").onclick = () => {
      serviceMsg.textContent = "session daemon cycled in constrained mode; observer/operator bindings preserved";
      appendForensicTrace(state, "settings.sessiond", serviceMsg.textContent);
      appendTerminalEvent(state, "settings: systemctl restart sessiond --safe");
      saveState();
      updateServices();
    };

    content.querySelector("#renewDhcp").onclick = () => {
      serviceMsg.textContent = state.unlocked.archive
        ? "dhcp renew accepted; archive vlan route still pinned"
        : "dhcp renew constrained; archive vlan remains quarantined";
      appendForensicTrace(state, "settings.net", serviceMsg.textContent);
      appendTerminalEvent(state, "settings: dhclient -r && dhclient");
      saveState();
      updateServices();
    };
  });
}
