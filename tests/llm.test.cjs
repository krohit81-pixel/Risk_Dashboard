const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the real provider module in isolation: no keys, network, or generated files.
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../lib/llm.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
).outputText;

function load(env = {}, responses = []) {
  const calls = [];
  const exports = {};
  const context = {
    exports,
    module: { exports },
    process: { env },
    console: { log() {}, warn() {}, error() {} },
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      assert.ok(responses.length, "unexpected provider request");
      return responses.shift();
    },
  };
  vm.runInNewContext(compiled, context);
  return { api: exports, calls };
}

const gemini = (text) => new Response(JSON.stringify({
  candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
}));
const anthropic = (data) => new Response(JSON.stringify({
  content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: "end_turn",
}));
const image = { mimeType: "image/png", data: "mock-image" };

test("all three Gemini paths use the new model and compatible request settings", async () => {
  const { api, calls } = load({ GEMINI_API_KEY: "test-key" }, [
    gemini("Visible article text"),
    gemini('{"title":"TEST","metrics":[{"label":"P/E","value":15.59}]}'),
    gemini('```json\n{"summary":"Grounded assessment"}\n```'),
  ]);
  const transcript = await api.extractFromImage([image]);
  assert.equal(transcript.text, "Visible article text");
  const stock = await api.extractStockMetrics([image]);
  assert.equal(stock.data.metrics[0].value, "15.59");
  const interpretation = await api.interpretWithProvider("System", "Source");
  assert.equal(interpretation.data.summary, "Grounded assessment");
  assert.equal(interpretation.provider, "gemini");
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.match(call.url, /\/models\/gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(call.body.generationConfig.thinkingConfig.thinkingLevel, "minimal");
    assert.equal(call.body.generationConfig.maxOutputTokens, 8192);
    assert.equal("thinkingBudget" in call.body.generationConfig.thinkingConfig, false);
    assert.equal("temperature" in call.body.generationConfig, false);
    assert.equal(call.body.contents.at(-1).role, "user");
  }
  assert.equal(calls[1].body.generationConfig.responseMimeType, "application/json");
  assert.equal(calls[2].body.generationConfig.responseMimeType, "application/json");
  assert.equal(calls[0].body.contents[0].parts[1].inline_data.mime_type, "image/png");
});

test("GEMINI_MODEL override is honored and trimmed; blank uses the default", async () => {
  for (const [override, expected] of [
    [" gemini-3.5-flash-lite ", "gemini-3.5-flash-lite"],
    ["compatible-test-model", "compatible-test-model"],
    ["   ", "gemini-3.5-flash-lite"],
  ]) {
    const { api, calls } = load({ GEMINI_API_KEY: "test-key", GEMINI_MODEL: override }, [gemini("{}")]);
    await api.interpretWithProvider("System", "Source");
    assert.ok(calls[0].url.endsWith(`/models/${expected}:generateContent`));
  }
});

test("transient Gemini failure retries once then falls back to Anthropic", async () => {
  const unavailable = () => new Response('{"error":{"message":"Unavailable"}}', { status: 503 });
  const { api, calls } = load({
    GEMINI_API_KEY: "test-key", ANTHROPIC_API_KEY: "test-backup", GEMINI_RETRY_MS: "0",
  }, [unavailable(), unavailable(), anthropic({ summary: "Backup assessment" })]);
  const result = await api.interpretWithProvider("System", "Source");
  assert.equal(result.provider, "anthropic");
  assert.equal(result.data.summary, "Backup assessment");
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, calls[1].url);
  assert.equal(calls[2].url, "https://api.anthropic.com/v1/messages");
});

test("invalid Gemini JSON falls back without a transient retry", async () => {
  const { api, calls } = load({ GEMINI_API_KEY: "test-key", ANTHROPIC_API_KEY: "test-backup" }, [
    gemini("not JSON"), anthropic({ ok: true }),
  ]);
  const result = await api.interpretWithProvider("System", "Source");
  assert.equal(result.provider, "anthropic");
  assert.equal(calls.length, 2);
});

test("weekly forced-Anthropic path bypasses Gemini", async () => {
  const { api, calls } = load({ GEMINI_API_KEY: "test-key", ANTHROPIC_API_KEY: "test-backup" }, [anthropic({ ok: true })]);
  const result = await api.interpretWithProvider("System", "Source", { forceProvider: "anthropic" });
  assert.equal(result.provider, "anthropic");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
});

test("missing keys return disabled results without network calls", async () => {
  const { api, calls } = load();
  assert.equal((await api.interpretWithProvider("System", "Source")).reason, "no_key");
  assert.equal((await api.extractFromImage([image])).reason, "no_key");
  assert.equal((await api.extractStockMetrics([image])).reason, "no_key");
  assert.equal(calls.length, 0);
});
