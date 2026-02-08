import { getOnboardingChecklistItems } from "../onboarding.js";
import { COPY } from "../ui/copy.js";

export function openHelp({ makeWindow, state }) {
  makeWindow("help", COPY.apps.help, (content, win) => {
    const chapterHint = COPY.help.chapterHints[state.chapter] || COPY.help.chapterHints[3];

    const quickStartItems = getOnboardingChecklistItems(state, state.activeRole, 4);
    const quickStartHtml = quickStartItems.length
      ? `<ul>${quickStartItems.map((item) => `<li>${item.hint}${item.command ? ` <code>${item.command}</code>` : ""}</li>`).join("")}</ul>`
      : `<p class='notice'>${COPY.help.noSteps}</p>`;

    content.innerHTML = `<div class='app-shell'><div class='system-label'>operations manual</div><div class='panel-dense'><h4 style='margin:0 0 6px'>${COPY.help.title}</h4>
      <p>${COPY.help.intro}</p>
      <ul>
        <li>${COPY.help.topics[0]}</li>
        <li>${COPY.help.topics[1]}</li>
        <li class='danger'>${COPY.help.topics[2]}</li>
        <li class='danger'>${COPY.help.topics[3]}</li>
      </ul>
      <h5 style='margin:10px 0 6px'>${COPY.help.quickStart} (${state.activeRole})</h5>
      ${quickStartHtml}
      <p class='notice'>${chapterHint}</p></div></div>`;
    win?.setHealth?.('active');
  });
}
