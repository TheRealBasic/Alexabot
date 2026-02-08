import { getServiceStatusTable } from "../systems/simulator.js";

function renderBars(rows) {
  return rows.map((row) => {
    const pct = Math.max(0, Math.min(100, Math.round(row.health * 100)));
    const anomaly = row.anomaly ? "⚠ anomaly" : "ok";
    return `<div class="panel-dense" data-service="${row.name}">
      <div><strong>${row.name}</strong> · ${row.status} · ${anomaly}</div>
      <div>health ${pct}% | drift ${row.drift.toFixed(2)} | restarts ${row.restartCount}</div>
      <div style="height:8px;border:1px solid #555;background:#130f0a;">
        <div style="height:100%;width:${pct}%;background:${row.anomaly ? "#d47a32" : "#8bc34a"};"></div>
      </div>
    </div>`;
  }).join("");
}

export function openSystemMonitor({ makeWindow, state }) {
  makeWindow("sysmon", "System Monitor", (content) => {
    const root = document.createElement("div");
    root.className = "app-shell";
    content.appendChild(root);

    const render = () => {
      const rows = getServiceStatusTable(state);
      const anomalies = rows.filter((row) => row.anomaly).map((row) => row.name);
      root.innerHTML = `<div class="system-label">system monitor lite</div>
        <div class="panel-dense">tick=${state.systemSimulationState?.tick || 0} | anomalies=${anomalies.length ? anomalies.join(", ") : "none"}</div>
        ${renderBars(rows)}`;
    };

    render();
    const id = setInterval(render, 1000);
    content.closest('.window')?.addEventListener('remove', () => clearInterval(id), { once: true });
  });
}
