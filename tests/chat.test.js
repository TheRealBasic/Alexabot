import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMessage, buildContext, composeReply, generateAiReply } from "../src/apps/chat.js";

test("analyzeMessage identifies intent, tone, certainty, and repeated topic", () => {
  const features = analyzeMessage("I need help now, maybe the archive is stuck!", {
    chatHistory: [{ role: "user", text: "the archive is stuck again" }]
  });

  assert.equal(features.intent, "help");
  assert.equal(features.emotionalTone, "urgent");
  assert.ok(features.certainty < 0.6);
  assert.equal(features.repeatedTopic, "archive");
});

test("buildContext shifts voice weighting from state markers", () => {
  const context = buildContext(
    { intent: "trust", emotionalTone: "urgent", certainty: 0.25, repeatedTopic: "trust" },
    { chapter: 3, activeRole: "operator", trust: 1, conflict: 3 }
  );

  assert.ok(context.voiceWeights.fragmented > context.voiceWeights.calm);
  assert.ok(context.voiceWeights.possessive > 1);
  assert.ok(context.strategyWeights.relational >= 3);
});

test("composeReply is deterministic when a seed is provided", () => {
  const features = {
    intentCue: "the archive routes",
    repeatedTopic: null
  };
  const context = {
    guidance: "Phase II: recover what vanished and compare every residue left behind.",
    voiceWeights: { calm: 2, evasive: 3, possessive: 1, fragmented: 1 },
    strategyWeights: { directive: 1, cryptic: 4, relational: 1, warning: 1 }
  };

  const a = composeReply(features, context, { seed: "fixed-seed" });
  const b = composeReply(features, context, { seed: "fixed-seed" });
  const c = composeReply(features, context, { seed: "other-seed" });

  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("generateAiReply table-driven strategy checks", () => {
  const cases = [
    {
      name: "help prompt keeps phase guidance",
      message: "help, I'm stuck",
      state: { chapter: 1, activeRole: "observer" },
      seed: "help-case",
      pattern: /Phase I:/
    },
    {
      name: "trust prompt can become relational",
      message: "can I trust the team?",
      state: { chapter: 2, trust: 4, conflict: 0, activeRole: "observer" },
      seed: "trust-case",
      pattern: /(trust|alignment|cohesion|shared logs)/i
    },
    {
      name: "urgent conflict prompt becomes warning flavored",
      message: "we need to unlock it now!",
      state: { chapter: 3, trust: 0, conflict: 4, activeRole: "operator" },
      seed: "conflict-case",
      pattern: /(Phase III:|containment|unstable|volatile|jagged)/i
    }
  ];

  for (const scenario of cases) {
    const reply = generateAiReply(scenario.message, scenario.state, { seed: scenario.seed });
    assert.match(reply, scenario.pattern, scenario.name);
  }
});

test("generateAiReply uses variation slots for non-seeded calls", () => {
  const message = "archive route?";
  const state = { chapter: 2 };

  const samples = new Set(Array.from({ length: 10 }, () => generateAiReply(message, state)));
  assert.ok(samples.size > 1);
});
