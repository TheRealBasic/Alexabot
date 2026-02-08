import { WebSocketServer } from "ws";
import crypto from "node:crypto";
import { defaultState } from "../src/state.js";
import { applyAction } from "../src/progression/reducer.js";

const PORT = Number(process.env.MULTIPLAYER_PORT || 8787);
const JWT_SECRET = process.env.MULTIPLAYER_JWT_SECRET;
const rooms = new Map();
const CLOSE_CODES = {
  badRequest: 1008,
  unauthorized: 4001,
  forbidden: 4003
};

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function verifyJoinToken(token) {
  if (!JWT_SECRET || typeof token !== "string") return null;
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64Url(encodedHeader).toString("utf8"));
    payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8"));
  } catch {
    return null;
  }

  if (header.alg !== "HS256" || header.typ !== "JWT") return null;
  if (!payload || typeof payload !== "object") return null;
  if (!payload.playerId || !payload.roomId) return null;
  if (!["host", "player", "spectator"].includes(payload.role)) return null;
  if (payload.exp && Date.now() >= payload.exp * 1000) return null;

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(signingInput).digest();
  const actual = decodeBase64Url(encodedSignature);
  if (actual.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(actual, expected)) return null;

  return {
    roomId: String(payload.roomId),
    playerId: String(payload.playerId),
    role: payload.role
  };
}

function closeUnauthorized(socket, reason) {
  socket.close(CLOSE_CODES.unauthorized, reason);
}

function canPerformAction(role, action = {}) {
  if (role === "spectator") return false;
  if (action.type === "state.patch") return role === "host";
  return role === "host" || role === "player";
}

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
  let joinedSession = null;

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      socket.close(CLOSE_CODES.badRequest, "invalid json");
      return;
    }

    if (message.type === "join") {
      if (typeof message.roomId !== "string" || typeof message.playerId !== "string" || typeof message.token !== "string") {
        closeUnauthorized(socket, "missing auth payload");
        return;
      }

      const tokenClaims = verifyJoinToken(message.token);
      if (!tokenClaims) {
        closeUnauthorized(socket, "invalid join token");
        return;
      }
      if (tokenClaims.roomId !== message.roomId) {
        closeUnauthorized(socket, "room mismatch");
        return;
      }
      if (message.playerId !== tokenClaims.playerId) {
        closeUnauthorized(socket, "player mismatch");
        return;
      }

      const room = getRoom(tokenClaims.roomId);
      joinedRoomId = tokenClaims.roomId;
      joinedSession = Object.freeze({
        playerId: tokenClaims.playerId,
        role: tokenClaims.role,
        roomId: tokenClaims.roomId
      });
      room.sockets.add(socket);
      socket.send(JSON.stringify({
        type: "snapshot",
        state: room.state,
        meta: {
          roomId: room.roomId,
          version: room.version,
          playerId: joinedSession.playerId,
          role: joinedSession.role
        }
      }));
      return;
    }

    if (!joinedRoomId) return;
    const room = getRoom(joinedRoomId);

    if (message.type === "snapshot.request") {
      socket.send(JSON.stringify({
        type: "snapshot",
        state: room.state,
        meta: {
          roomId: room.roomId,
          version: room.version,
          playerId: joinedSession.playerId,
          role: joinedSession.role
        }
      }));
      return;
    }

    if (message.type !== "action") return;
    if (!joinedSession) return;

    const previous = structuredClone(room.state);
    const action = { ...(message.action || {}), senderPlayerId: joinedSession.playerId };

    if (!canPerformAction(joinedSession.role, action)) {
      socket.close(CLOSE_CODES.forbidden, "insufficient role permissions");
      return;
    }

    if (action.type === "state.patch") {
      applyClientPatch(room, action.patch);
    } else {
      applyAction(room.state, action);
    }

    room.version += 1;
    const meta = { roomId: room.roomId, version: room.version, playerId: joinedSession.playerId, role: joinedSession.role };

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
