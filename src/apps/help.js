import { getOnboardingChecklistItems } from "../onboarding.js";

export function openHelp({ makeWindow, state }) {
  makeWindow("help", "Help and Documentation", (content) => {
    const chapterHint = state.chapter === 1
      ? "Tip: Review continuity docs before attempting unlock commands."
      : state.chapter === 2
        ? "Tip: Use maintenance window behavior to recover deleted objects."
        : "Tip: Cross-check logs and recovered mail to complete accounting.";

    const quickStartItems = getOnboardingChecklistItems(state, state.activeRole, 4);
    const quickStartHtml = quickStartItems.length
      ? `<ul>${quickStartItems.map((item) => `<li>${item.hint}${item.command ? ` <code>${item.command}</code>` : ""}</li>`).join("")}</ul>`
      : "<p class='notice'>No active quick-start steps for this role.</p>";

    content.innerHTML = `<h4 style='margin:0 0 8px'>Eidolon Help Center</h4>
      <p>Some topics are unavailable due to archive decay.</p>
      <ul>
        <li>Using the shell — see <code>/system/help/shell_help.txt</code></li>
        <li>Recovering deleted objects — see <code>/system/help/recovery_help.txt</code></li>
        <li class='danger'>Identity mismatch after resume [article missing]</li>
        <li class='danger'>Why does the system call me by someone else? [article missing]</li>
      </ul>
      <h5 style='margin:10px 0 6px'>Quick Start (${state.activeRole})</h5>
      ${quickStartHtml}
      <p class='notice'>${chapterHint}</p>`;
  });
}
