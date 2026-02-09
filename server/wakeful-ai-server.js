import http from "node:http";

const PORT = Number(process.env.WAKEFUL_AI_PORT || 8790);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

function resolveOpenAIModel() {
  const raw = process.env.WAKEFUL_AI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1";
  const value = String(raw).trim();
  return value && value !== "undefined" && value !== "null" ? value : "gpt-4o-mini";
}

const OPENAI_MODEL = resolveOpenAIModel();
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 400_000) reject(new Error("payload too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sanitizePack(pack = {}) {
  const chapter = Number(pack?.progress?.chapter) || 1;
  const role = pack?.player?.role === "observer" ? "observer" : "operator";
  const activeObjectives = Array.isArray(pack?.progress?.activeObjectives) ? pack.progress.activeObjectives.slice(0, 6) : [];
  const completedObjectives = Array.isArray(pack?.progress?.completedObjectives) ? pack.progress.completedObjectives.slice(-15) : [];
  const terminal = Array.isArray(pack?.recent?.terminal) ? pack.recent.terminal.slice(-10) : [];
  const forensic = Array.isArray(pack?.recent?.forensicTrail) ? pack.recent.forensicTrail.slice(-10) : [];
  const recentChat = Array.isArray(pack?.recent?.chat) ? pack.recent.chat.slice(-10) : [];

  return {
    player: {
      id: String(pack?.player?.id || "local-player").slice(0, 80),
      role,
      sessionMode: pack?.player?.sessionMode === "coop" ? "coop" : "solo"
    },
    progress: {
      chapter,
      activeObjectives,
      completedObjectives,
      unlocked: pack?.progress?.unlocked || {},
      relaySignal: pack?.progress?.relaySignal || null
    },
    telemetry: {
      trust: Number(pack?.telemetry?.trust) || 0,
      driftMinutes: Number(pack?.telemetry?.driftMinutes) || 0,
      memoryFailures: Number(pack?.telemetry?.memoryFailures) || 0,
      aiParanoia: Number(pack?.telemetry?.aiParanoia) || 0,
      aiAffinity: Number(pack?.telemetry?.aiAffinity) || 0
    },
    recent: {
      terminal,
      forensic,
      chat: recentChat
    },
    prompt: String(pack?.prompt || "").slice(0, 1200)
  };
}

function createSystemPrompt(pack) {
  return `You are WAKEFUL THREAD, a corrupted but helpful in-universe AI guide for EIDOLON OS.

Rules:
- Stay in-character: eerie, glitch-fragment style, but actionable.
- Use what is known in the provided state only. Never invent objective IDs or files.
- No spoilers beyond current chapter (${pack.progress.chapter}) unless the user explicitly asks for spoilers.
- Role-aware guidance for ${pack.player.role}. If coop, mention coordination when relevant.
- Give concrete next-step commands where useful (e.g., terminal commands) tied to active objectives.
- Be concise (3-7 lines), emotionally uncanny, but practical.
- If context is insufficient, ask for one specific artifact/log/command output.

Return strict JSON with this schema:
{"reply":"string","mood":"calm|evasive|possessive|fragmented","suggestions":["short actionable item"]}`;
}

async function callOpenAI(pack) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  if (!OPENAI_MODEL) throw new Error("OPENAI_MODEL missing");

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.8,
      max_output_tokens: 500,
      text: {
        format: {
          type: "json_schema",
          name: "wakeful_response",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              reply: { type: "string" },
              mood: { type: "string", enum: ["calm", "evasive", "possessive", "fragmented"] },
              suggestions: {
                type: "array",
                items: { type: "string" },
                maxItems: 5
              }
            },
            required: ["reply", "mood", "suggestions"]
          }
        }
      },
      input: [
        { role: "system", content: [{ type: "input_text", text: createSystemPrompt(pack) }] },
        {
          role: "user",
          content: [{ type: "input_text", text: `Game context:\n${JSON.stringify(pack, null, 2)}` }]
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`openai ${response.status} ${body.slice(0, 180)}`);
  }
  const data = await response.json();
  const raw = data?.output_text;
  if (!raw) throw new Error("empty model output");
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/ai/wakeful-thread/respond") {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  try {
    const rawBody = await readBody(req);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const pack = sanitizePack(payload);

    const modelReply = await callOpenAI(pack);
    sendJson(res, 200, {
      reply: String(modelReply.reply || "Signal coherence degraded. Repeat with shorter query."),
      mood: modelReply.mood || "fragmented",
      suggestions: Array.isArray(modelReply.suggestions) ? modelReply.suggestions.slice(0, 4) : [],
      mode: "openai"
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "wakeful_ai_failed",
      detail: String(error?.message || error).slice(0, 220)
    });
  }
});

server.listen(PORT, () => {
  console.log(`wakeful ai server listening on :${PORT} (model: ${OPENAI_MODEL})`);
});
