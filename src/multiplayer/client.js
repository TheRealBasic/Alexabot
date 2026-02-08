function applyIncrementalPatch(state, patch = {}) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof state[key] === "object" && state[key] !== null && !Array.isArray(state[key])) {
      state[key] = { ...state[key], ...value };
    } else {
      state[key] = value;
    }
  }
}

const TERMINAL_COMMAND_TYPES = new Set([
  "CMD_OBSERVER_PING",
  "CMD_EXEC_RELAY",
  "CMD_UNLOCK_ARCHIVE",
  "CMD_SET_TIME",
  "CMD_RECOVER_MANIFEST",
  "CMD_STRINGS"
]);

function sanitizeString(value, maxLength = 200) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeOutgoingAction(action = {}) {
  if (!action || typeof action !== "object" || Array.isArray(action)) return null;

  if (action.type === "cursor.move") {
    const x = Number(action.x);
    const y = Number(action.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      type: "cursor.move",
      x,
      y,
      view: sanitizeString(action.view, 80) || null,
      timestamp: Number.isFinite(Number(action.timestamp)) ? Number(action.timestamp) : Date.now()
    };
  }

  if (action.type === "objective.complete") {
    const objectiveId = sanitizeString(action.objectiveId, 120);
    if (!objectiveId) return null;
    return {
      type: "objective.interact",
      objectiveId,
      timestamp: Date.now()
    };
  }

  if (!TERMINAL_COMMAND_TYPES.has(action.type)) return null;

  const command = {
    type: action.type,
    actor: sanitizeString(action.actor, 64) || undefined,
    role: sanitizeString(action.role, 32) || undefined,
    timestamp: Number.isFinite(Number(action.timestamp)) ? Number(action.timestamp) : Date.now(),
    commandLine: sanitizeString(action.commandLine, 160) || undefined
  };

  if (action.type === "CMD_EXEC_RELAY") command.code = sanitizeString(action.code, 16) || "";
  if (action.type === "CMD_SET_TIME") {
    if (!Number.isInteger(action.hours) || !Number.isInteger(action.minutes)) return null;
    command.hours = action.hours;
    command.minutes = action.minutes;
  }
  if (action.type === "CMD_STRINGS") {
    command.path = sanitizeString(action.path, 200) || "";
    command.decodedText = typeof action.decodedText === "string" ? action.decodedText.slice(0, 2000) : "";
  }

  return {
    type: "terminal.command",
    command
  };
}

export function createMultiplayerClient({ roomId, playerId, authToken, url, onSnapshot, onPatch, onAction, onStatus }) {
  let ws;
  let reconnectTimer;
  let closed = false;

  const notifyStatus = (status) => onStatus?.(status);

  const connect = () => {
    if (closed) return;
    notifyStatus("connecting");
    ws = new WebSocket(url);

    ws.onopen = () => {
      notifyStatus("connected");
      ws.send(JSON.stringify({ type: "join", roomId, playerId, token: authToken }));
      ws.send(JSON.stringify({ type: "snapshot.request", roomId, playerId }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "snapshot") onSnapshot?.(message.state, message.meta || {});
      if (message.type === "patch") onPatch?.(message.patch, message.meta || {});
      if (message.type === "action.applied") onAction?.(message.action, message.meta || {});
      if (message.type === "action.rejected") onStatus?.(`action rejected: ${message.reason || "invalid"}`);
    };

    ws.onclose = (event) => {
      if (event?.code === 4001) {
        notifyStatus("unauthorized");
        closed = true;
        return;
      }
      notifyStatus("disconnected");
      if (closed) return;
      reconnectTimer = setTimeout(connect, 1200);
    };

    ws.onerror = () => notifyStatus("error");
  };

  connect();

  return {
    sendAction(action) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      const normalized = normalizeOutgoingAction(action);
      if (!normalized) return false;
      ws.send(JSON.stringify({ type: "action", roomId, action: normalized }));
      return true;
    },
    close() {
      closed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    }
  };
}

export { applyIncrementalPatch };
