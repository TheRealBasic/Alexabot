import { WebSocketServer } from "ws";
import { defaultState } from "../src/state.js";
import { applyAction } from "../src/progression/reducer.js";

const PORT = Number(process.env.MULTIPLAYER_PORT || 8787);
const rooms = new Map();

function createRoom(roomId) {
  const room = {
    roomId,
    version: 1,
    state: {
      ...defaultState,
      sessionMode: "coop",
      roomId,
      playerId: "server"
    },
    sockets: new Set()
  };
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId) || createRoom(roomId);
}

function computePatch(previous, next) {
  const patch = {};
  for (const key of Object.keys(next)) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) {
      patch[key] = next[key];
    }
  }
  return patch;
}

function applyClientPatch(room, payload = {}) {
  const blockedKeys = new Set(["chapter", "completedObjectives", "objectives"]);
  for (const [key, value] of Object.entries(payload)) {
    if (blockedKeys.has(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value) && typeof room.state[key] === "object" && room.state[key] !== null && !Array.isArray(room.state[key])) {
      room.state[key] = { ...room.state[key], ...value };
    } else {
      room.state[key] = value;
    }
  }
}

function broadcast(room, message) {
  const raw = JSON.stringify(message);
  for (const socket of room.sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(raw);
    }
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket) => {
  let joinedRoomId = null;

  socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));

    if (message.type === "join") {
      const room = getRoom(message.roomId);
      joinedRoomId = message.roomId;
      room.sockets.add(socket);
      socket.send(JSON.stringify({
        type: "snapshot",
        state: room.state,
        meta: { roomId: room.roomId, version: room.version }
      }));
      return;
    }

    if (!joinedRoomId) return;
    const room = getRoom(joinedRoomId);

    if (message.type === "snapshot.request") {
      socket.send(JSON.stringify({
        type: "snapshot",
        state: room.state,
        meta: { roomId: room.roomId, version: room.version }
      }));
      return;
    }

    if (message.type !== "action") return;

    const previous = structuredClone(room.state);
    const action = message.action || {};

    if (action.type === "state.patch") {
      applyClientPatch(room, action.patch);
    } else {
      applyAction(room.state, action);
    }

    room.version += 1;
    const meta = { roomId: room.roomId, version: room.version };

    broadcast(room, {
      type: "action.applied",
      action,
      meta
    });

    const patch = computePatch(previous, room.state);
    broadcast(room, {
      type: "patch",
      patch,
      meta
    });
  });

  socket.on("close", () => {
    if (!joinedRoomId) return;
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    room.sockets.delete(socket);
  });
});

console.log(`multiplayer websocket server listening on :${PORT}`);
