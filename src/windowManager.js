export function createWindowManager({ desktopRoot, taskList, state = null, persistState = () => {} }) {
  const windows = new Map();
  let zCounter = 20;
  let dragState = null;
  let resizeState = null;
  let activeWindowId = null;

  const TASKBAR_HEIGHT = 36;
  const MIN_WIDTH = 280;
  const MIN_HEIGHT = 200;
  const TITLEBAR_HEIGHT = 30;
  const VISIBLE_TITLEBAR = 42;

  if (state && (!state.windowLayout || typeof state.windowLayout !== "object")) {
    state.windowLayout = {};
  }

  function getDesktopMetrics() {
    const width = desktopRoot.clientWidth || window.innerWidth;
    const height = desktopRoot.clientHeight || window.innerHeight;
    return {
      width,
      height,
      workHeight: Math.max(TITLEBAR_HEIGHT, height - TASKBAR_HEIGHT)
    };
  }

  function clampPosition(left, top, width, height) {
    const metrics = getDesktopMetrics();
    const minLeft = VISIBLE_TITLEBAR - width;
    const maxLeft = metrics.width - VISIBLE_TITLEBAR;
    const maxTop = Math.max(0, metrics.workHeight - TITLEBAR_HEIGHT);
    return {
      left: Math.min(Math.max(left, minLeft), maxLeft),
      top: Math.min(Math.max(top, 0), maxTop)
    };
  }

  function clampSize(width, height) {
    const metrics = getDesktopMetrics();
    return {
      width: Math.min(Math.max(width, MIN_WIDTH), metrics.width),
      height: Math.min(Math.max(height, MIN_HEIGHT), metrics.workHeight)
    };
  }

  function updateTaskStates() {
    for (const [id, win] of windows.entries()) {
      const isActive = id === activeWindowId && win.state !== "minimized";
      win.task.classList.toggle("is-active", isActive);
      win.task.classList.toggle("is-minimized", win.state === "minimized");
    }
  }



  function applyWindowHealth(win) {
    const health = win.health || "active";
    win.el.dataset.health = health;
    win.task.dataset.health = health;
    const dots = win.el.querySelectorAll(".window-indicators .indicator-dot");
    dots.forEach((dot) => dot.classList.toggle("is-on", dot.dataset.health === health));
    const badge = win.el.querySelector("[data-window-health]");
    if (badge) {
      badge.className = `status-badge ${health}`;
      badge.textContent = health;
    }
  }

  function persistWindow(win) {
    if (!state) return;
    if (!state.windowLayout || typeof state.windowLayout !== "object") {
      state.windowLayout = {};
    }
    state.windowLayout[win.id] = {
      left: win.el.offsetLeft,
      top: win.el.offsetTop,
      width: win.el.offsetWidth,
      height: win.el.offsetHeight,
      state: win.state,
      restoreBounds: win.restoreBounds ? { ...win.restoreBounds } : null
    };
    persistState();
  }

  function applyBounds(win, nextBounds) {
    const size = clampSize(nextBounds.width, nextBounds.height);
    const pos = clampPosition(nextBounds.left, nextBounds.top, size.width, size.height);
    win.el.style.width = `${size.width}px`;
    win.el.style.height = `${size.height}px`;
    win.el.style.left = `${pos.left}px`;
    win.el.style.top = `${pos.top}px`;
  }

  function setWindowState(win, nextState) {
    if (nextState === "maximized" && win.state !== "maximized") {
      win.restoreBounds = {
        left: win.el.offsetLeft,
        top: win.el.offsetTop,
        width: win.el.offsetWidth,
        height: win.el.offsetHeight
      };
      const metrics = getDesktopMetrics();
      win.el.style.left = "0px";
      win.el.style.top = "0px";
      win.el.style.width = `${metrics.width}px`;
      win.el.style.height = `${metrics.workHeight}px`;
      win.state = "maximized";
      win.health = "active";
      win.el.style.display = "flex";
      activeWindowId = win.id;
    } else if (nextState === "minimized") {
      if (win.state !== "minimized") {
        win.restoreBounds = {
          left: win.el.offsetLeft,
          top: win.el.offsetTop,
          width: win.el.offsetWidth,
          height: win.el.offsetHeight
        };
      }
      win.state = "minimized";
      win.health = "stale";
      win.el.style.display = "none";
      if (activeWindowId === win.id) activeWindowId = null;
    } else {
      const restore = win.restoreBounds;
      if (restore) {
        applyBounds(win, restore);
      }
      win.state = "normal";
      win.health = "active";
      win.el.style.display = "flex";
      activeWindowId = win.id;
    }

    win.el.dataset.state = win.state;
    updateTaskStates();
    applyWindowHealth(win);
    persistWindow(win);
  }

  function focusWindow(el) {
    const win = [...windows.values()].find((item) => item.el === el);
    if (!win) return;
    if (win.state === "minimized") {
      setWindowState(win, "normal");
    }
    el.style.zIndex = ++zCounter;
    activeWindowId = win.id;
    win.health = "active";
    updateTaskStates();
    applyWindowHealth(win);
  }

  function attachGlobalPointerHandlers() {
    window.addEventListener("pointermove", (e) => {
      if (dragState) {
        const { win, ox, oy } = dragState;
        const left = e.clientX - ox;
        const top = e.clientY - oy;
        const pos = clampPosition(left, top, win.el.offsetWidth, win.el.offsetHeight);
        win.el.style.left = `${pos.left}px`;
        win.el.style.top = `${pos.top}px`;
        persistWindow(win);
      }

      if (resizeState) {
        const { win, direction, startX, startY, startLeft, startTop, startWidth, startHeight } = resizeState;
        let left = startLeft;
        let top = startTop;
        let width = startWidth;
        let height = startHeight;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (direction.includes("e")) width = startWidth + dx;
        if (direction.includes("s")) height = startHeight + dy;
        if (direction.includes("w")) {
          width = startWidth - dx;
          left = startLeft + dx;
        }
        if (direction.includes("n")) {
          height = startHeight - dy;
          top = startTop + dy;
        }

        const clampedSize = clampSize(width, height);
        if (direction.includes("w")) {
          left = startLeft + (startWidth - clampedSize.width);
        }
        if (direction.includes("n")) {
          top = startTop + (startHeight - clampedSize.height);
        }
        const clampedPos = clampPosition(left, top, clampedSize.width, clampedSize.height);

        win.el.style.left = `${clampedPos.left}px`;
        win.el.style.top = `${clampedPos.top}px`;
        win.el.style.width = `${clampedSize.width}px`;
        win.el.style.height = `${clampedSize.height}px`;
        persistWindow(win);
      }
    });

    window.addEventListener("pointerup", () => {
      dragState = null;
      resizeState = null;
    });
  }

  attachGlobalPointerHandlers();

  function makeDraggable(win) {
    const bar = win.querySelector(".titlebar");
    bar.onpointerdown = (e) => {
      if (e.target.closest(".win-controls")) return;
      const record = [...windows.values()].find((entry) => entry.el === win);
      if (!record || record.state !== "normal") return;
      dragState = {
        win,
        ox: e.clientX - win.offsetLeft,
        oy: e.clientY - win.offsetTop
      };
      bar.setPointerCapture?.(e.pointerId);
      focusWindow(win);
    };
  }

  function addResizeHandles(el, win) {
    const directions = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
    for (const direction of directions) {
      const handle = document.createElement("div");
      handle.className = `resize-handle resize-${direction}`;
      handle.dataset.resize = direction;
      handle.onpointerdown = (e) => {
        if (win.state !== "normal") return;
        e.preventDefault();
        e.stopPropagation();
        resizeState = {
          win,
          direction,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: el.offsetLeft,
          startTop: el.offsetTop,
          startWidth: el.offsetWidth,
          startHeight: el.offsetHeight
        };
        handle.setPointerCapture?.(e.pointerId);
        focusWindow(el);
      };
      el.appendChild(handle);
    }
  }

  function makeWindow(id, title, renderer) {
    if (windows.has(id)) {
      const existing = windows.get(id);
      if (existing.state === "minimized") setWindowState(existing, "normal");
      focusWindow(existing.el);
      return existing;
    }

    const remembered = state?.windowLayout?.[id] || null;
    const el = document.createElement("section");
    el.className = "window";
    const defaultBounds = {
      left: 80 + Math.random() * 220,
      top: 40 + Math.random() * 120,
      width: remembered?.width || 560,
      height: remembered?.height || 360
    };
    applyBounds({ el }, {
      left: remembered?.left ?? defaultBounds.left,
      top: remembered?.top ?? defaultBounds.top,
      width: defaultBounds.width,
      height: defaultBounds.height
    });
    el.style.zIndex = ++zCounter;
    el.innerHTML = `<div class="titlebar"><span class="title-main">${title}</span><span class="status-badge active" data-window-health>active</span><div class="window-indicators"><span class="indicator-dot" data-health="active"></span><span class="indicator-dot" data-health="stale"></span><span class="indicator-dot" data-health="fault"></span></div><div class="win-controls"><button data-minimize aria-label="Minimize window">_</button><button data-maximize aria-label="Maximize or restore window">▢</button><button data-close aria-label="Close window">×</button></div></div><div class="content"></div>`;
    desktopRoot.appendChild(el);

    const task = document.createElement("button");
    task.className = "task";
    task.type = "button";
    task.textContent = title;
    taskList.appendChild(task);

    const win = {
      id,
      el,
      task,
      content: el.querySelector(".content"),
      state: "normal",
      restoreBounds: remembered?.restoreBounds || null,
      health: "active",
      setHealth(nextHealth = "active") {
        this.health = nextHealth;
        applyWindowHealth(this);
      }
    };

    windows.set(id, win);
    applyWindowHealth(win);
    makeDraggable(el);
    addResizeHandles(el, win);
    renderer(win.content, win);

    task.onclick = () => {
      if (win.state === "minimized") {
        setWindowState(win, "normal");
        focusWindow(el);
        return;
      }
      if (activeWindowId === id) {
        setWindowState(win, "minimized");
        return;
      }
      focusWindow(el);
    };

    el.querySelector("[data-close]").onclick = () => {
      if (dragState?.win === el) dragState = null;
      if (resizeState?.win === win) resizeState = null;
      el.remove();
      task.remove();
      windows.delete(id);
      if (state?.windowLayout) {
        delete state.windowLayout[id];
        persistState();
      }
      if (activeWindowId === id) activeWindowId = null;
      updateTaskStates();
    };

    el.querySelector("[data-minimize]").onclick = () => setWindowState(win, "minimized");

    el.querySelector("[data-maximize]").onclick = () => {
      if (win.state === "maximized") {
        setWindowState(win, "normal");
      } else {
        setWindowState(win, "maximized");
      }
      focusWindow(el);
    };

    el.onmousedown = () => focusWindow(el);

    const restoredState = remembered?.state;
    if (restoredState === "maximized") {
      setWindowState(win, "maximized");
    } else if (restoredState === "minimized") {
      setWindowState(win, "minimized");
    } else {
      setWindowState(win, "normal");
      focusWindow(el);
    }

    return win;
  }

  window.addEventListener("resize", () => {
    for (const win of windows.values()) {
      if (win.state === "maximized") {
        const metrics = getDesktopMetrics();
        win.el.style.left = "0px";
        win.el.style.top = "0px";
        win.el.style.width = `${metrics.width}px`;
        win.el.style.height = `${metrics.workHeight}px`;
      } else if (win.state === "normal") {
        applyBounds(win, {
          left: win.el.offsetLeft,
          top: win.el.offsetTop,
          width: win.el.offsetWidth,
          height: win.el.offsetHeight
        });
      }
      persistWindow(win);
    }
  });

  return { makeWindow, focusWindow, makeDraggable, windows };
}
