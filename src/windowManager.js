export function createWindowManager({ desktopRoot, taskList }) {
  const windows = new Map();
  let zCounter = 20;

  function focusWindow(el) {
    el.style.zIndex = ++zCounter;
  }

  function makeDraggable(win) {
    const bar = win.querySelector(".titlebar");
    let down = false;
    let ox = 0;
    let oy = 0;

    bar.onmousedown = (e) => {
      down = true;
      ox = e.clientX - win.offsetLeft;
      oy = e.clientY - win.offsetTop;
    };

    window.addEventListener("mousemove", (e) => {
      if (!down) return;
      win.style.left = `${Math.max(0, e.clientX - ox)}px`;
      win.style.top = `${Math.max(0, e.clientY - oy)}px`;
    });

    window.addEventListener("mouseup", () => {
      down = false;
    });
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
    el.innerHTML = `<div class="titlebar"><span>${title}</span><div class="win-controls"><button data-close>×</button></div></div><div class="content"></div>`;
    desktopRoot.appendChild(el);

    makeDraggable(el);
    focusWindow(el);

    const task = document.createElement("div");
    task.className = "task";
    task.textContent = title;
    task.onclick = () => focusWindow(el);
    taskList.appendChild(task);

    const win = { id, el, task, content: el.querySelector(".content") };
    windows.set(id, win);
    renderer(win.content, win);

    el.querySelector("[data-close]").onclick = () => {
      el.remove();
      task.remove();
      windows.delete(id);
    };

    el.onmousedown = () => focusWindow(el);
    return win;
  }

  return { makeWindow, focusWindow, makeDraggable, windows };
}
