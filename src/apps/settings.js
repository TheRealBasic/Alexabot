function parseTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function openSettings({ makeWindow, state, saveState, notify }) {
  makeWindow("settings", "System Settings", (content) => {
    content.innerHTML = `<div><strong>Realtime Clock Offset:</strong> <span id='offset'></span> minutes</div>
      <div style='margin-top:10px; display:flex; gap:6px; align-items:center'>
        <input id='manualTime' type='time' value='03:11' />
        <button id='applyTime'>Apply</button>
      </div>
      <button id='sync311' style='margin-top:10px'>Sync clock to 03:11</button>
      <div class='notice'>Warning: Time changes may affect archival integrity.</div>
      <div id='setMsg' class='notice'></div>`;

    const offset = content.querySelector("#offset");
    const msg = content.querySelector("#setMsg");
    const manual = content.querySelector("#manualTime");

    const applyClock = (hours, minutes) => {
      const now = new Date();
      state.driftMinutes = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes) - now) / 60000);
      if (hours === 3 && minutes === 11) {
        state.unlocked.redactedLog = true;
        msg.textContent = "Clock synchronized to maintenance window.";
      } else {
        msg.textContent = `Clock synchronized to ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}.`;
      }
      saveState();
      notify?.("RTC offset updated.");
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
        msg.textContent = "Invalid time.";
        return;
      }
      applyClock(parsed.hours, parsed.minutes);
    };
  });
}
