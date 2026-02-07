export function openHelp({ makeWindow, state }) {
  makeWindow("help", "Help and Documentation", (content) => {
    const chapterHint = state.chapter === 1
      ? "Tip: Review continuity docs before attempting unlock commands."
      : state.chapter === 2
        ? "Tip: Use maintenance window behavior to recover deleted objects."
        : "Tip: Cross-check logs and recovered mail to complete accounting.";

    content.innerHTML = `<h4 style='margin:0 0 8px'>Eidolon Help Center</h4>
      <p>Some topics are unavailable due to archive decay.</p>
      <ul>
        <li>Using the shell — see <code>/system/help/shell_help.txt</code></li>
        <li>Recovering deleted objects — see <code>/system/help/recovery_help.txt</code></li>
        <li class='danger'>Identity mismatch after resume [article missing]</li>
        <li class='danger'>Why does the system call me by someone else? [article missing]</li>
      </ul>
      <p class='notice'>${chapterHint}</p>`;
  });
}
