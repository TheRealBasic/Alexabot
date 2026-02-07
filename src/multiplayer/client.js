function applyIncrementalPatch(state, patch = {}) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof state[key] === "object" && state[key] !== null && !Array.isArray(state[key])) {
      state[key] = { ...state[key], ...value };
    } else {
      state[key] = value;
    }
  }
}

export function createMultiplayerClient({ roomId, playerId, url, onSnapshot, onPatch, onStatus }) {
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
      ws.send(JSON.stringify({ type: "join", roomId, playerId }));
      ws.send(JSON.stringify({ type: "snapshot.request", roomId, playerId }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "snapshot") onSnapshot?.(message.state, message.meta || {});
      if (message.type === "patch") onPatch?.(message.patch, message.meta || {});
    };

    ws.onclose = () => {
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
      ws.send(JSON.stringify({ type: "action", roomId, playerId, action }));
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
