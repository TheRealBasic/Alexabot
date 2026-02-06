export function openSettings({ makeWindow, state, saveState }) {
  makeWindow("settings", "System Settings", (content) => {
    content.innerHTML = `<div><strong>Realtime Clock Offset:</strong> <span id='offset'></span> minutes</div>
      <button id='sync311' style='margin-top:10px'>Sync clock to 03:11</button>
      <div class='notice'>Warning: Time changes may affect archival integrity.</div>
      <div id='setMsg' class='notice'></div>`;

    const offset = content.querySelector("#offset");
    const msg = content.querySelector("#setMsg");
    const update = () => {
      offset.textContent = state.driftMinutes;
    };

    update();
    content.querySelector("#sync311").onclick = () => {
      const now = new Date();
      state.driftMinutes = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 11) - now) / 60000);
      state.unlocked.redactedLog = true;
      msg.textContent = "Clock synchronized to maintenance window.";
      saveState();
      update();
    };
  });
}
