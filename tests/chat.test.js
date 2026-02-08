import test from "node:test";
import assert from "node:assert/strict";
import { generateAiReply } from "../src/apps/chat.js";

test("generateAiReply returns help-focused response for help intents", () => {
  const reply = generateAiReply("I need help");
  assert.match(reply, /help/i);
});

test("generateAiReply falls back to chapter guidance", () => {
  const reply = generateAiReply("random question", { chapter: 2 });
  assert.match(reply, /Phase II guidance/);
});
