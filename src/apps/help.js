import { completeObjective } from "../state.js";

export function openHelp({ makeWindow, state, saveState, fs }) {
  makeWindow("help", "Help and Documentation", (content) => {
    const chapterHint = {
      1: "Act I Hint: open continuity docs in Explorer, then request archive authorization from this console.",
      2: "Act II Hint: combine Settings maintenance sync + Explorer evidence to unlock assisted recovery workflows.",
      3: "Act III Hint: merge clues from Explorer, Terminal, and Settings to expose composite witness records."
    }[state.chapter] || "No contextual hint available.";

    const canAuthorizeArchive =
      !state.unlocked.archive && (state.viewed["/home/operator/docs/continuity_overview.txt"] || 0) > 0;
    const canRunGuidedRecovery =
      state.chapter >= 2 &&
      state.unlocked.redactedLog &&
      !state.recoveredFiles &&
      (state.viewed["/.cache/deleted_manifest.tmp"] || 0) > 0;
    const canEnableWitnessMap =
      state.chapter >= 3 &&
      state.unlocked.redactedLog &&
      state.terminalHistory.some((line) => /^recover\s+--manifest/i.test(line || "")) &&
      (state.viewed["/home/operator/docs/triangulation_protocol.txt"] || 0) > 0 &&
      !state.unlocked.witnessMap;

    content.innerHTML = `<h4 style='margin:0 0 8px'>Eidolon Help Center</h4>
      <p>Some topics are unavailable due to archive decay.</p>
      <ul>
        <li>Using the shell — see <code>/system/help/shell_help.txt</code></li>
        <li>Recovering deleted objects — see <code>/system/help/recovery_help.txt</code></li>
        <li>Composite witness map — see <code>/home/operator/docs/triangulation_protocol.txt</code></li>
        <li class='danger'>Identity mismatch after resume [article missing]</li>
      </ul>
      <p class='notice'>${chapterHint}</p>
      <div id='helpActions'></div>`;

    const actions = content.querySelector("#helpActions");

    if (canAuthorizeArchive) {
      const btn = document.createElement("button");
      btn.textContent = "Authorize archive channel (guided)";
      btn.onclick = () => {
        state.unlocked.archive = true;
        completeObjective(state, "unlock_archive");
        saveState();
        btn.disabled = true;
        btn.textContent = "Archive channel authorized.";
      };
      actions.appendChild(btn);
    }


    if (canRunGuidedRecovery) {
      const btn = document.createElement("button");
      btn.style.marginLeft = "8px";
      btn.textContent = "Run guided manifest recovery";
      btn.onclick = () => {
        state.recoveredFiles = true;
        if (!fs["/home/operator/docs"].includes("postmortem.txt")) fs["/home/operator/docs"].push("postmortem.txt");
        if (!fs["/home/operator/mail"].includes("draft_9.eml")) fs["/home/operator/mail"].push("draft_9.eml");
        completeObjective(state, "recover_manifest");
        btn.disabled = true;
        btn.textContent = "Recovered: postmortem.txt + draft_9.eml";
        saveState();
      };
      actions.appendChild(btn);
    }

    if (canEnableWitnessMap) {
      const btn = document.createElement("button");
      btn.style.marginLeft = "8px";
      btn.textContent = "Compile composite witness map";
      btn.onclick = () => {
        state.unlocked.witnessMap = true;
        saveState();
        btn.disabled = true;
        btn.textContent = "Witness map published to /logs/chimera_clearance.log";
      };
      actions.appendChild(btn);
    }
  });
}
