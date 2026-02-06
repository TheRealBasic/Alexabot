import { completeObjective } from "../state.js";

export function openExplorer({ makeWindow, fs, getDynamicFile, getDirectoryEntries, state, saveState }) {
  makeWindow("explorer", "File Explorer", (content) => {
    content.innerHTML = `<div class="explorer-layout"><div class="tree" id="dirTree"></div><div class="file-view"><div id="pathLabel" class="muted"></div><div id="fileList" style="margin-top:8px"></div><pre id="preview" style="white-space:pre-wrap; border-top:1px solid #2b4968; margin-top:8px; padding-top:8px;"></pre></div></div>`;
    const tree = content.querySelector("#dirTree");
    const pathLabel = content.querySelector("#pathLabel");
    const fileList = content.querySelector("#fileList");
    const preview = content.querySelector("#preview");
    let current = "/";

    for (const d of Object.keys(fs)) {
      const t = document.createElement("div");
      t.className = "tree-item";
      t.textContent = d;
      t.onclick = () => {
        current = d;
        renderList();
      };
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
        const row = document.createElement("div");
        row.className = "file-item";
        row.textContent = `${isDir ? "[DIR]" : "[FILE]"} ${entry}`;
        row.onclick = () => {
          if (isDir) {
            current = full;
            renderList();
            return;
          }

          if (full === "/logs/audit_redacted.log" && !state.unlocked.redactedLog) {
            preview.innerHTML = "<span class='err'>ACCESS DENIED</span>\nHint: Synchronize local clock to 03:11 in System Settings.";
            return;
          }

          if (full === "/media/cam2_20030418.dat" && !state.unlocked.mediaReveal) {
            preview.innerHTML = "Binary data unreadable. Try terminal command: strings /media/cam2_20030418.dat";
            return;
          }

          preview.textContent = getDynamicFile(full) || "[empty]";
          if (full === "/logs/audit_redacted.log" && state.unlocked.redactedLog) {
            completeObjective(state, "access_redacted_audit");
          }
          state.viewed[full] = (state.viewed[full] || 0) + 1;
          saveState();
        };
        fileList.appendChild(row);
      }
    }

    renderList();
  });
}
