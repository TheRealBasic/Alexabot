import { appendForensicTrace, appendTerminalEvent, incrementFileView } from "../state.js";
import { COPY } from "../ui/copy.js";

function buildVisibleDirectories(fs, state) {
  return Object.keys(fs)
    .filter((path) => state.unlocked.archive || !path.startsWith("/."))
    .sort((a, b) => a.localeCompare(b));
}

function getDepth(path) {
  if (path === "/") return 0;
  return path.split("/").filter(Boolean).length - 1;
}

function formatBytes(text = "") {
  const bytes = new TextEncoder().encode(String(text)).length;
  return `${bytes} B`;
}

function inferType(path, isDir) {
  if (isDir) return "directory";
  const parts = path.split(".");
  return parts.length > 1 ? `${parts.pop()} file` : "file";
}

function computeFlags(path, state) {
  const flags = [];
  if (path.startsWith("/.")) flags.push("hidden");
  if (path.endsWith("audit_redacted.log") && !state.unlocked.redactedLog && state.activeRole !== "observer") flags.push("restricted");
  if (path.endsWith("cam2_20030418.dat") && !state.unlocked.mediaReveal) flags.push("encoded");
  return flags.length ? flags.join(",") : "--";
}

export function openExplorer({ makeWindow, fs, getDynamicFile, getDirectoryEntries, state, completeObjective, saveState }) {
  makeWindow("explorer", COPY.apps.explorer, (content, win) => {
    content.innerHTML = `<div class="app-shell"><div class="system-label">filesystem navigator</div><div class="explorer-layout"><div class="tree panel-dense" id="dirTree"></div><div class="file-view panel-dense"><div class="field-legend">path context</div><div id="breadcrumbs" class="breadcrumbs"></div><div class="sort-controls" id="sortControls"></div><div id="fileList" style="margin-top:6px"></div><pre id="preview" style="white-space:pre-wrap; border-top:1px solid #2b4968; margin-top:6px; padding-top:6px;"></pre></div></div></div>`;
    const tree = content.querySelector("#dirTree");
    const breadcrumbs = content.querySelector("#breadcrumbs");
    const sortControls = content.querySelector("#sortControls");
    const fileList = content.querySelector("#fileList");
    const preview = content.querySelector("#preview");
    let current = "/";
    let sortKey = "name";
    let sortDirection = "asc";
    win?.setHealth?.("active");

    const selectDir = (path) => {
      current = path;
      appendForensicTrace(state, "explorer.chdir", `cwd=${path}`);
      appendTerminalEvent(state, `explorer: cd ${path}`);
      renderList();
    };

    function renderBreadcrumbs() {
      breadcrumbs.innerHTML = "";
      const chunks = current.split("/").filter(Boolean);
      const rootCrumb = document.createElement("button");
      rootCrumb.type = "button";
      rootCrumb.textContent = "/";
      rootCrumb.className = "crumb";
      rootCrumb.onclick = () => selectDir("/");
      breadcrumbs.appendChild(rootCrumb);

      chunks.forEach((segment, index) => {
        const slash = document.createElement("span");
        slash.textContent = " / ";
        slash.className = "muted";
        breadcrumbs.appendChild(slash);
        const crumb = document.createElement("button");
        crumb.type = "button";
        crumb.className = "crumb";
        const path = `/${chunks.slice(0, index + 1).join("/")}`;
        crumb.textContent = segment;
        crumb.onclick = () => selectDir(path);
        breadcrumbs.appendChild(crumb);
      });
    }

    function setSort(nextKey) {
      if (sortKey === nextKey) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        sortKey = nextKey;
        sortDirection = "asc";
      }
      appendForensicTrace(state, "explorer.sort", `${sortKey}:${sortDirection}`);
      appendTerminalEvent(state, `explorer: sort ${sortKey} ${sortDirection}`);
      renderList();
    }

    function renderSortControls() {
      sortControls.innerHTML = "";
      ["name", "size", "type", "mtime", "flags"].forEach((key) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "crumb";
        const marker = sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : "";
        button.textContent = `${key} ${marker}`.trim();
        button.onclick = () => setSort(key);
        sortControls.appendChild(button);
      });
    }

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
      renderBreadcrumbs();
      renderSortControls();
      fileList.innerHTML = "";
      preview.textContent = "";
      const entries = getDirectoryEntries(current, state);
      const baseline = Date.now();
      const rows = entries
        .filter((entry) => state.unlocked.archive || !entry.startsWith("."))
        .map((entry, idx) => {
          const full = current === "/" ? `/${entry}` : `${current}/${entry}`;
          const isDir = !!fs[full];
          const contentText = isDir ? "" : getDynamicFile(full) || "";
          return {
            name: entry,
            full,
            isDir,
            size: formatBytes(contentText),
            type: inferType(full, isDir),
            mtime: new Date(baseline - idx * 42000).toISOString().replace("T", " ").slice(0, 19),
            flags: computeFlags(full, state)
          };
        });

      rows.sort((a, b) => {
        const aValue = String(a[sortKey] || "");
        const bValue = String(b[sortKey] || "");
        const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
        return sortDirection === "asc" ? comparison : -comparison;
      });

      const head = document.createElement("div");
      head.className = "file-grid file-grid-head";
      head.innerHTML = "<span>name</span><span>size</span><span>type</span><span>mtime</span><span>flags</span>";
      fileList.appendChild(head);

      for (const rowData of rows) {
        const row = document.createElement("button");
        row.className = "file-item file-grid";
        row.type = "button";
        row.innerHTML = `<span>${rowData.isDir ? "[DIR]" : "[FILE]"} ${rowData.name}</span><span>${rowData.size}</span><span>${rowData.type}</span><span>${rowData.mtime}</span><span>${rowData.flags}</span>`;
        row.onclick = () => {
          if (rowData.isDir) {
            selectDir(rowData.full);
            return;
          }

          if (rowData.full === "/logs/audit_redacted.log" && !state.unlocked.redactedLog && state.activeRole !== "observer") {
            preview.innerHTML = COPY.explorer.deniedAudit;
            appendForensicTrace(state, "explorer.denied", rowData.full);
            appendTerminalEvent(state, `explorer: denied ${rowData.full}`);
            win?.setHealth?.("fault");
            saveState();
            return;
          }

          if (rowData.full === "/media/cam2_20030418.dat" && !state.unlocked.mediaReveal) {
            preview.innerHTML = COPY.explorer.unreadableMedia;
            appendForensicTrace(state, "explorer.pending_decode", rowData.full);
            appendTerminalEvent(state, `explorer: unreadable ${rowData.full}`);
            win?.setHealth?.("stale");
            saveState();
            return;
          }

          preview.textContent = getDynamicFile(rowData.full) || COPY.explorer.empty;
          win?.setHealth?.("active");
          if (rowData.full === "/logs/audit_redacted.log" && (state.unlocked.redactedLog || state.activeRole === "observer")) {
            completeObjective({ type: "objective.complete", objectiveId: "access_redacted_audit" });
          }
          if (rowData.full === "/logs/incident.log" && state.activeRole === "observer") {
            completeObjective({ type: "objective.complete", objectiveId: "observer_anomaly_trace" });
          }
          incrementFileView(state, rowData.full);
          completeObjective({ type: "objective.complete", objectiveId: "onboarding_read_file" });
          appendForensicTrace(state, "explorer.open", rowData.full);
          appendTerminalEvent(state, `explorer: open ${rowData.full}`);
          saveState();
        };
        fileList.appendChild(row);
      }
    }

    renderList();
  });
}
