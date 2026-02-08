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
  return role === "host" || role === "player";
}

const TERMINAL_COMMAND_TYPES = new Set([
  "CMD_OBSERVER_PING",
  "CMD_EXEC_RELAY",
  "CMD_UNLOCK_ARCHIVE",
  "CMD_SET_TIME",
  "CMD_RECOVER_MANIFEST",
  "CMD_STRINGS"
]);

const ACTION_HANDLERS = {
  "cursor.move": applyCursorMove,
  "terminal.command": applyTerminalCommand,
  "objective.interact": applyObjectiveInteract
};

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeString(value, maxLength = 200) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function rejectAction(socket, reason, { roomId, playerId, role, rawAction }) {
  console.warn(`[action.rejected] room=${roomId} player=${playerId} role=${role} reason=${reason} actionType=${rawAction?.type || "unknown"}`);
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({
      type: "action.rejected",
      reason,
      action: rawAction || null,
      meta: { roomId, playerId, role }
    }));
  }
}

function applyCursorMove(room, normalizedAction) {
  if (!room.state.presence || typeof room.state.presence !== "object") room.state.presence = {};
  const previous = room.state.presence[normalizedAction.playerId] || {};
  room.state.presence[normalizedAction.playerId] = {
    ...previous,
    cursor: {
      x: normalizedAction.x,
      y: normalizedAction.y,
      view: normalizedAction.view,
      updatedAt: normalizedAction.timestamp
    }
  };
}

function applyTerminalCommand(room, normalizedAction) {
  applyAction(room.state, normalizedAction.command);
}

function applyObjectiveInteract(room, normalizedAction) {
  applyAction(room.state, { type: "objective.complete", objectiveId: normalizedAction.objectiveId });
}

function normalizeAction(rawAction, joinedSession) {
  if (!rawAction || typeof rawAction !== "object" || Array.isArray(rawAction)) {
    return { error: "action must be an object" };
  }

  if (!Object.hasOwn(ACTION_HANDLERS, rawAction.type)) {
    return { error: "unknown action type" };
  }

  if (rawAction.type === "cursor.move") {
    const x = Number(rawAction.x);
    const y = Number(rawAction.y);
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return { error: "cursor.move requires numeric x and y" };
    return {
      action: {
        type: "cursor.move",
        playerId: joinedSession.playerId,
        x,
        y,
        view: sanitizeString(rawAction.view, 80) || null,
        timestamp: isFiniteNumber(Number(rawAction.timestamp)) ? Number(rawAction.timestamp) : Date.now()
      }
    };
  }

  if (rawAction.type === "objective.interact") {
    const objectiveId = sanitizeString(rawAction.objectiveId, 120);
    if (!objectiveId) return { error: "objective.interact requires objectiveId" };
    return {
      action: {
        type: "objective.interact",
        playerId: joinedSession.playerId,
        objectiveId,
        timestamp: Date.now()
      }
    };
  }

  const command = rawAction.command;
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    return { error: "terminal.command requires a command object" };
  }
  if (!TERMINAL_COMMAND_TYPES.has(command.type)) {
    return { error: "terminal.command contains unsupported command type" };
  }

  const normalizedCommand = {
    type: command.type,
    actor: sanitizeString(command.actor, 64) || joinedSession.playerId,
    role: sanitizeString(command.role, 32) || undefined,
    timestamp: isFiniteNumber(Number(command.timestamp)) ? Number(command.timestamp) : Date.now(),
    commandLine: sanitizeString(command.commandLine, 160) || undefined
  };

  if (command.type === "CMD_EXEC_RELAY") {
    normalizedCommand.code = sanitizeString(command.code, 16) || "";
  }
  if (command.type === "CMD_SET_TIME") {
    if (!Number.isInteger(command.hours) || !Number.isInteger(command.minutes)) {
      return { error: "CMD_SET_TIME requires integer hours and minutes" };
    }
    normalizedCommand.hours = command.hours;
    normalizedCommand.minutes = command.minutes;
  }
  if (command.type === "CMD_STRINGS") {
    normalizedCommand.path = sanitizeString(command.path, 200) || "";
    normalizedCommand.decodedText = typeof command.decodedText === "string" ? command.decodedText.slice(0, 2000) : "";
  }

  return {
    action: {
      type: "terminal.command",
      playerId: joinedSession.playerId,
      command: normalizedCommand
    }
  };
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
    const rawAction = message.action || {};

    if (!canPerformAction(joinedSession.role, rawAction)) {
      socket.close(CLOSE_CODES.forbidden, "insufficient role permissions");
      return;
    }

    const normalized = normalizeAction(rawAction, joinedSession);
    if (normalized.error) {
      rejectAction(socket, normalized.error, {
        roomId: room.roomId,
        playerId: joinedSession.playerId,
        role: joinedSession.role,
        rawAction
      });
      return;
    }
    const action = normalized.action;
    ACTION_HANDLERS[action.type](room, action);

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
