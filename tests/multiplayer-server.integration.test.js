import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { WebSocket } from 'ws';

const CLOSE_CODES = {
  malformedPayload: 4400,
  rateLimited: 4429,
  roomFull: 4413
};

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function createJoinToken({ roomId, playerId, role, secret, expSeconds = 120 }) {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({
    roomId,
    playerId,
    role,
    exp: Math.floor(Date.now() / 1000) + expSeconds
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

async function getEphemeralPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  server.close();
  await once(server, 'close');
  return port;
}

async function startServer({ maxRoomSize = 2, rateLimit = 12, rateWindowMs = 1000 } = {}) {
  const port = await getEphemeralPort();
  const storeDir = await mkdtemp(path.join(os.tmpdir(), 'alexabot-room-store-'));
  const secret = 'test-secret';

  const serverProcess = spawn(process.execPath, ['server/multiplayer-server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MULTIPLAYER_PORT: String(port),
      MULTIPLAYER_JWT_SECRET: secret,
      ROOM_STORE_DIR: storeDir,
      WS_MAX_ROOM_SIZE: String(maxRoomSize),
      WS_MESSAGE_RATE_LIMIT: String(rateLimit),
      WS_MESSAGE_RATE_WINDOW_MS: String(rateWindowMs),
      WS_HEARTBEAT_INTERVAL_MS: '1000',
      WS_HEARTBEAT_TIMEOUT_MS: '10000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('server did not start in time')), 5000);
    const onOutput = (data) => {
      if (String(data).includes('multiplayer websocket server listening on')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    serverProcess.stdout.on('data', onOutput);
    serverProcess.stderr.on('data', onOutput);
    serverProcess.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`server exited early with code ${code}`));
    });
  });

  await ready;

  return {
    port,
    secret,
    async stop() {
      serverProcess.kill('SIGTERM');
      await once(serverProcess, 'exit');
    }
  };
}

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const timeout = setTimeout(() => {
      socket.terminate();
      reject(new Error('websocket open timeout'));
    }, 3000);
    socket.once('open', () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function createInbox(socket) {
  const queue = [];
  socket.on('message', (raw) => {
    queue.push(JSON.parse(String(raw)));
  });

  return {
    async waitFor(predicate, timeoutMs = 2000) {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const index = queue.findIndex(predicate);
        if (index >= 0) {
          return queue.splice(index, 1)[0];
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error('timed out waiting for message');
    }
  };
}

function waitForClose(socket) {
  return new Promise((resolve) => {
    socket.once('close', (code, reason) => resolve({ code, reason: String(reason) }));
  });
}

test('join/create flow, snapshot+patch contract, and action.rejected payload', async (t) => {
  const server = await startServer({ maxRoomSize: 2, rateLimit: 20, rateWindowMs: 1000 });
  t.after(async () => {
    await server.stop();
  });

  const roomId = 'room-contract';
  const host = await connectClient(server.port);
  const hostInbox = createInbox(host);
  const hostToken = createJoinToken({ roomId, playerId: 'host-1', role: 'host', secret: server.secret });

  host.send(JSON.stringify({
    type: 'join',
    roomId,
    playerId: 'host-1',
    token: hostToken,
    meta: {
      displayName: 'Contract Room',
      accessCode: 'ALX1',
      isPrivate: false
    }
  }));

  const hostSnapshot = await hostInbox.waitFor((msg) => msg.type === 'snapshot');
  assert.equal(hostSnapshot.meta.roomId, roomId);
  assert.equal(hostSnapshot.meta.role, 'host');
  assert.equal(hostSnapshot.meta.playerId, 'host-1');
  assert.equal(hostSnapshot.meta.roomMeta.displayName, 'Contract Room');
  assert.equal(hostSnapshot.meta.roomMeta.hostId, 'host-1');

  const player = await connectClient(server.port);
  const playerInbox = createInbox(player);
  const playerToken = createJoinToken({ roomId, playerId: 'player-1', role: 'player', secret: server.secret });
  player.send(JSON.stringify({
    type: 'join',
    roomId,
    playerId: 'player-1',
    token: playerToken,
    accessCode: 'ALX1'
  }));

  const playerSnapshot = await playerInbox.waitFor((msg) => msg.type === 'snapshot');
  assert.equal(playerSnapshot.meta.roomId, roomId);
  assert.equal(playerSnapshot.meta.role, 'player');
  assert.equal(playerSnapshot.meta.roomMeta.hostId, 'host-1');

  host.send(JSON.stringify({
    type: 'action',
    expectedVersion: hostSnapshot.meta.version,
    action: {
      type: 'not.real',
      clientSequence: 1
    }
  }));

  const rejected = await hostInbox.waitFor((msg) => msg.type === 'action.rejected');
  assert.equal(rejected.reason, 'unknown action type');
  assert.equal(rejected.action.type, 'not.real');
  assert.equal(rejected.meta.roomId, roomId);

  host.send(JSON.stringify({
    type: 'action',
    expectedVersion: hostSnapshot.meta.version,
    action: {
      type: 'cursor.move',
      x: 25,
      y: 75,
      clientSequence: 2
    }
  }));

  const hostApplied = await hostInbox.waitFor((msg) => msg.type === 'action.applied' && msg.action.clientSequence === 2);
  const playerApplied = await playerInbox.waitFor((msg) => msg.type === 'action.applied' && msg.action.clientSequence === 2);
  const hostPatch = await hostInbox.waitFor((msg) => msg.type === 'patch' && msg.meta.version === hostApplied.meta.version);
  const playerPatch = await playerInbox.waitFor((msg) => msg.type === 'patch' && msg.meta.version === playerApplied.meta.version);

  assert.equal(hostApplied.action.type, 'cursor.move');
  assert.equal(hostApplied.action.playerId, 'host-1');
  assert.equal(playerApplied.meta.roomId, roomId);
  assert.deepEqual(hostPatch.patch.presence['host-1'].cursor.x, 25);
  assert.deepEqual(playerPatch.patch.presence['host-1'].cursor.y, 75);

  host.close();
  player.close();
});

test('room capacity limit closes extra client with CLOSE_CODES.roomFull', async (t) => {
  const server = await startServer({ maxRoomSize: 2, rateLimit: 20, rateWindowMs: 1000 });
  t.after(async () => {
    await server.stop();
  });

  const roomId = 'room-capacity';
  const host = await connectClient(server.port);
  const hostInbox = createInbox(host);
  host.send(JSON.stringify({
    type: 'join',
    roomId,
    playerId: 'host-cap',
    token: createJoinToken({ roomId, playerId: 'host-cap', role: 'host', secret: server.secret })
  }));
  await hostInbox.waitFor((msg) => msg.type === 'snapshot');

  const player = await connectClient(server.port);
  const playerInbox = createInbox(player);
  player.send(JSON.stringify({
    type: 'join',
    roomId,
    playerId: 'player-cap',
    token: createJoinToken({ roomId, playerId: 'player-cap', role: 'player', secret: server.secret })
  }));
  await playerInbox.waitFor((msg) => msg.type === 'snapshot');

  const overflow = await connectClient(server.port);
  const closePromise = waitForClose(overflow);
  overflow.send(JSON.stringify({
    type: 'join',
    roomId,
    playerId: 'player-overflow',
    token: createJoinToken({ roomId, playerId: 'player-overflow', role: 'player', secret: server.secret })
  }));

  const closeEvent = await closePromise;
  assert.equal(closeEvent.code, CLOSE_CODES.roomFull);

  host.close();
  player.close();
});

test('malformed payload closes connection with CLOSE_CODES.malformedPayload', async (t) => {
  const server = await startServer({ maxRoomSize: 2, rateLimit: 20, rateWindowMs: 1000 });
  t.after(async () => {
    await server.stop();
  });

  const client = await connectClient(server.port);
  const closePromise = waitForClose(client);
  client.send('this is not json');

  const closeEvent = await closePromise;
  assert.equal(closeEvent.code, CLOSE_CODES.malformedPayload);
  assert.equal(closeEvent.reason, 'invalid json');
});

test('message rate limiting enforces CLOSE_CODES.rateLimited and WS_* env settings', async (t) => {
  const server = await startServer({ maxRoomSize: 2, rateLimit: 3, rateWindowMs: 10_000 });
  t.after(async () => {
    await server.stop();
  });

  const client = await connectClient(server.port);
  const closePromise = waitForClose(client);

  client.send(JSON.stringify({ type: 'noop-1' }));
  client.send(JSON.stringify({ type: 'noop-2' }));
  client.send(JSON.stringify({ type: 'noop-3' }));
  client.send(JSON.stringify({ type: 'noop-4' }));

  const closeEvent = await closePromise;
  assert.equal(closeEvent.code, CLOSE_CODES.rateLimited);
  assert.equal(closeEvent.reason, 'message rate exceeded');
});
