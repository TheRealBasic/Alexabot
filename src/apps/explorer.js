import { incrementFileView } from "../state.js";

function buildVisibleDirectories(fs, state) {
  return Object.keys(fs)
    .filter((path) => state.unlocked.archive || !path.startsWith("/."))
    .sort((a, b) => a.localeCompare(b));
}

function getDepth(path) {
  if (path === "/") return 0;
  return path.split("/").filter(Boolean).length - 1;
}

export function openExplorer({ makeWindow, fs, getDynamicFile, getDirectoryEntries, state, completeObjective, saveState }) {
  makeWindow("explorer", "File Explorer", (content) => {
    content.innerHTML = `<div class="explorer-layout"><div class="tree" id="dirTree"></div><div class="file-view"><div id="pathLabel" class="muted"></div><div id="fileList" style="margin-top:8px"></div><pre id="preview" style="white-space:pre-wrap; border-top:1px solid #2b4968; margin-top:8px; padding-top:8px;"></pre></div></div>`;
    const tree = content.querySelector("#dirTree");
    const pathLabel = content.querySelector("#pathLabel");
    const fileList = content.querySelector("#fileList");
    const preview = content.querySelector("#preview");
    let current = "/";

    const selectDir = (path) => {
      current = path;
      renderList();
    };

    for (const d of buildVisibleDirectories(fs, state)) {
      const t = document.createElement("button");
      t.className = "tree-item";
      t.type = "button";
      t.style.paddingLeft = `${6 + getDepth(d) * 12}px`;
      t.textContent = d;
      t.onclick = () => selectDir(d);
      tree.appendChild(t);
    }

    function renderList() {
      pathLabel.textContent = current;
      fileList.innerHTML = "";
      preview.textContent = "";
      const entries = getDirectoryEntries(current, state);

      for (const entry of entries) {
        if (entry.startsWith(".") && !state.unlocked.archive) continue;
        const full = current === "/" ? `/${entry}` : `${current}/${entry}`;
        const isDir = !!fs[full];
        const row = document.createElement("button");
        row.className = "file-item";
        row.type = "button";
        row.textContent = `${isDir ? "[DIR]" : "[FILE]"} ${entry}`;
        row.onclick = () => {
          if (isDir) {
            current = full;
            renderList();
            return;
          }

          if (full === "/logs/audit_redacted.log" && !state.unlocked.redactedLog && state.activeRole !== "observer") {
            preview.innerHTML = "<span class='err'>ACCESS DENIED</span>\nHint: Synchronize local clock to 03:11 in System Settings.";
            return;
          }

          if (full === "/media/cam2_20030418.dat" && !state.unlocked.mediaReveal) {
            preview.innerHTML = "Binary data unreadable. Try terminal command: strings /media/cam2_20030418.dat";
            return;
          }

          preview.textContent = getDynamicFile(full) || "[empty]";
          if (full === "/logs/audit_redacted.log" && (state.unlocked.redactedLog || state.activeRole === "observer")) {
            completeObjective({ type: "objective.complete", objectiveId: "access_redacted_audit" });
          }
          if (full === "/logs/incident.log" && state.activeRole === "observer") {
            completeObjective({ type: "objective.complete", objectiveId: "observer_anomaly_trace" });
          }
          incrementFileView(state, full);
          saveState();
        };
        fileList.appendChild(row);
      }
    }

    renderList();
  });
}
