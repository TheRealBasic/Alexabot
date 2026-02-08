export function openCalendar({ makeWindow }) {
  makeWindow("calendar", "Calendar", (content) => {
    content.innerHTML = `<div class="app-shell">
      <div class="system-label">calendar-lite</div>
      <div class="panel-dense">
        <div>2003-04-20 · Facilities battery check</div>
        <div>2003-04-21 · Relay compliance review</div>
        <div>2003-04-23 · Printer toner replacement</div>
      </div>
    </div>`;
  });
}
