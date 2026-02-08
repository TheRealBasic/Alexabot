import test from "node:test";
import assert from "node:assert/strict";
import { generateAiReply } from "../src/apps/chat.js";

test("generateAiReply returns diegetic guidance for help intents", () => {
  const reply = generateAiReply("I need help");
  assert.match(reply, /Command Shell/i);
  assert.doesNotMatch(reply, /Eidolon AI|guidance/i);
});

test("generateAiReply falls back to chapter-toned guidance", () => {
  const reply = generateAiReply("random question", { chapter: 2 });
  assert.match(reply, /Phase II:/);
  assert.match(reply, /cleaner trace/i);
});
