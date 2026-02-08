import { COPY, formatCopy } from "../ui/copy.js";

function parseTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function openSettings({ makeWindow, state, saveState, notify }) {
  makeWindow("settings", COPY.apps.settings, (content, win) => {
    content.innerHTML = `<div class='app-shell'><div class='system-label'>clock discipline controls</div><div class='panel-dense'><div><span class='field-legend'>${COPY.settings.title}</span><span id='offset'></span> minutes</div>
      <div style='margin-top:10px; display:flex; gap:6px; align-items:center'>
        <input id='manualTime' type='time' value='03:11' />
        <button id='applyTime'>${COPY.settings.apply}</button>
      </div>
      <button id='sync311' style='margin-top:10px'>${COPY.settings.syncMaintenance}</button>
      <div class='notice'>${COPY.settings.warning}</div>
      <div id='setMsg' class='notice'></div></div></div>`;
    win?.setHealth?.('active');

    const offset = content.querySelector("#offset");
    const msg = content.querySelector("#setMsg");
    const manual = content.querySelector("#manualTime");

    const applyClock = (hours, minutes) => {
      const now = new Date();
      state.driftMinutes = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes) - now) / 60000);
      if (hours === 3 && minutes === 11) {
        state.unlocked.redactedLog = true;
        msg.textContent = COPY.settings.maintenanceSuccess;
      } else {
        msg.textContent = formatCopy(COPY.settings.synced, { time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` });
      }
      saveState();
      notify?.(COPY.settings.notify);
      update();
    };

    const update = () => {
      offset.textContent = state.driftMinutes;
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
  });
}
