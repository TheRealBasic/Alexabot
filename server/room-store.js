import path from "node:path";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";

const STORE_DIR = path.resolve(process.env.ROOM_STORE_DIR || "server/.room-store");
const ARCHIVE_DIR = path.join(STORE_DIR, "archive");
const HISTORY_LIMIT = Number(process.env.ROOM_HISTORY_LIMIT || 100);
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS || 1000 * 60 * 60 * 24 * 7);
const ARCHIVE_EXPIRED = process.env.ROOM_ARCHIVE_EXPIRED === "1";

function roomPath(roomId) {
  const safeRoomId = encodeURIComponent(String(roomId));
  return path.join(STORE_DIR, `${safeRoomId}.json`);
}

function normalizeVersionHistory(versionHistory = [], maxVersion = 0) {
  const history = Array.isArray(versionHistory) ? versionHistory : [];
  const normalized = history
    .filter((entry) => entry && Number.isInteger(entry.version))
    .slice(-HISTORY_LIMIT);

  if (maxVersion > 0 && !normalized.find((entry) => entry.version === maxVersion)) {
    normalized.push({ version: maxVersion, timestamp: Date.now() });
  }

  return normalized.slice(-HISTORY_LIMIT);
}

function isExpired(record) {
  const lastSavedAt = Number(record?.lastSavedAt || 0);
  if (!lastSavedAt) return false;
  return Date.now() - lastSavedAt > ROOM_TTL_MS;
}

async function archiveOrDeleteRoom(filename) {
  const sourcePath = path.join(STORE_DIR, filename);
  if (ARCHIVE_EXPIRED) {
    await mkdir(ARCHIVE_DIR, { recursive: true });
    await rename(sourcePath, path.join(ARCHIVE_DIR, filename));
    return;
  }
  await rm(sourcePath, { force: true });
}

export async function loadRoom(roomId) {
  try {
    const file = await readFile(roomPath(roomId), "utf8");
    const record = JSON.parse(file);
    if (!record || typeof record !== "object" || !record.state || !Number.isInteger(record.version)) return null;

    if (isExpired(record)) {
      await archiveOrDeleteRoom(`${encodeURIComponent(String(roomId))}.json`);
      return null;
    }

    return {
      roomId: String(record.roomId || roomId),
      state: record.state,
      version: record.version,
      lastSavedAt: Number(record.lastSavedAt || 0) || null,
      versionHistory: normalizeVersionHistory(record.versionHistory, record.version)
    };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    console.error(`[room-store] failed loading room ${roomId}`, error);
    return null;
  }
}

export async function saveRoom(roomState, version, timestamp, existingHistory = []) {
  if (!roomState || typeof roomState !== "object") return null;
  const roomId = String(roomState.roomId || "");
  if (!roomId) return null;

  const lastSavedAt = Number(timestamp || Date.now());
  const versionHistory = normalizeVersionHistory([
    ...existingHistory,
    { version, timestamp: lastSavedAt }
  ], version);

  const record = {
    roomId,
    version,
    lastSavedAt,
    expiresAt: lastSavedAt + ROOM_TTL_MS,
    state: roomState,
    versionHistory
  };

  try {
    await mkdir(STORE_DIR, { recursive: true });
    await writeFile(roomPath(roomId), `${JSON.stringify(record)}\n`, "utf8");
    return { lastSavedAt, versionHistory };
  } catch (error) {
    console.error(`[room-store] failed saving room ${roomId}`, error);
    return null;
  }
}

export async function preloadActiveRooms() {
  try {
    await mkdir(STORE_DIR, { recursive: true });
    const entries = await readdir(STORE_DIR);
    const activeRooms = [];

    for (const filename of entries) {
      if (!filename.endsWith(".json")) continue;
      const roomId = decodeURIComponent(filename.replace(/\.json$/, ""));
      const room = await loadRoom(roomId);
      if (room) activeRooms.push(room);
    }

    return activeRooms;
  } catch (error) {
    console.error("[room-store] preload failed", error);
    return [];
  }
}

export async function cleanupExpiredRooms() {
  try {
    await mkdir(STORE_DIR, { recursive: true });
    const entries = await readdir(STORE_DIR);
    for (const filename of entries) {
      if (!filename.endsWith(".json")) continue;
      const filePath = path.join(STORE_DIR, filename);
      const fileStat = await stat(filePath);
      if (Date.now() - fileStat.mtimeMs > ROOM_TTL_MS) {
        await archiveOrDeleteRoom(filename);
      }
    }
  } catch (error) {
    console.error("[room-store] cleanup failed", error);
  }
}
