export function createWindowManager({ desktopRoot, taskList }) {
  const windows = new Map();
  let zCounter = 20;
  let dragState = null;

  function focusWindow(el) {
    el.style.zIndex = ++zCounter;
  }

  window.addEventListener("mousemove", (e) => {
    if (!dragState) return;
    const { win, ox, oy } = dragState;
    win.style.left = `${Math.max(0, e.clientX - ox)}px`;
    win.style.top = `${Math.max(0, e.clientY - oy)}px`;
  });

  window.addEventListener("mouseup", () => {
    dragState = null;
  });

  function makeDraggable(win) {
    const bar = win.querySelector(".titlebar");
    bar.onmousedown = (e) => {
      dragState = {
        win,
        ox: e.clientX - win.offsetLeft,
        oy: e.clientY - win.offsetTop
      };
      focusWindow(win);
    };
  }

  function makeWindow(id, title, renderer) {
    if (windows.has(id)) {
      focusWindow(windows.get(id).el);
      return windows.get(id);
    }

    const el = document.createElement("section");
    el.className = "window";
    el.style.left = `${80 + Math.random() * 220}px`;
    el.style.top = `${40 + Math.random() * 120}px`;
    el.style.zIndex = ++zCounter;
    el.innerHTML = `<div class="titlebar"><span>${title}</span><div class="win-controls"><button data-close aria-label="Close window">×</button></div></div><div class="content"></div>`;
    desktopRoot.appendChild(el);

    makeDraggable(el);
    focusWindow(el);

    const task = document.createElement("button");
    task.className = "task";
    task.type = "button";
    task.textContent = title;
    task.onclick = () => focusWindow(el);
    taskList.appendChild(task);

    const win = { id, el, task, content: el.querySelector(".content") };
    windows.set(id, win);
    renderer(win.content, win);

    el.querySelector("[data-close]").onclick = () => {
      if (dragState?.win === el) dragState = null;
      el.remove();
      task.remove();
      windows.delete(id);
    };

    el.onmousedown = () => focusWindow(el);
    return win;
  }

  return { makeWindow, focusWindow, makeDraggable, windows };
}
