import assert from "node:assert/strict";
import test from "node:test";
import { buildWakefulContextPack } from "../src/apps/wakeful-ai.js";

test("buildWakefulContextPack includes role-aware progress snapshot", () => {
  const state = {
    playerId: "p-1",
    activeRole: "observer",
    chapter: 2,
    objectives: [
      { id: "decode_cam2", label: "Decode cam2", chapter: 2, roles: ["operator", "observer"] }
    ],
    completedObjectives: ["unlock_archive"],
    unlocked: { archive: true, redactedLog: false, mediaReveal: false },
    terminalHistory: [{ command: "help", outputTail: "..." }],
    chatHistory: [{ role: "user", text: "what now" }],
    forensicTrail: [{ category: "terminal", detail: "cmd help" }]
  };

  const pack = buildWakefulContextPack(state, "Need next step");

  assert.equal(pack.player.role, "observer");
  assert.equal(pack.progress.chapter, 2);
  assert.equal(pack.progress.activeObjectives[0].id, "decode_cam2");
  assert.equal(pack.prompt, "Need next step");
});
