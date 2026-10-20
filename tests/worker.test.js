import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

function environment({ telegram = false } = {}) {
  const inserted = [];
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return { run: async () => { inserted.push({ sql, values }); return { success: true, meta: { last_row_id: inserted.length } }; } };
          },
          first: async () => ({ 1: 1 }),
        };
      },
    },
  };
  if (telegram) Object.assign(env, { TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_CHAT_ID: "test-chat" });
  return { env, inserted };
}

function leadRequest(ip, overrides = {}) {
  return new Request("https://vebora1.vaismamatov.workers.dev/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://vebora1.vaismamatov.workers.dev", "CF-Connecting-IP": ip },
    body: JSON.stringify({
      name: "Тест", business: "", siteType: "Лендинг", budget: "", task: "Описание тестовой задачи",
      contact: "+998901234567", plan: "", website: "", formStartedAt: Date.now() - 5_000, ...overrides,
    }),
  });
}

test("health confirms D1 query", async () => {
  const { env } = environment();
  const response = await worker.fetch(new Request("https://vebora1.vaismamatov.workers.dev/api/health"), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).database, "connected");
});

test("valid lead is inserted and response confirms database save", async () => {
  const { env, inserted } = environment();
  const response = await worker.fetch(leadRequest("198.51.100.31"), env);
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.saved, true);
  assert.equal(result.notificationStatus, "not_configured");
  assert.equal(inserted.length, 1);
});

test("honeypot, too-fast form and invalid payload do not insert", async () => {
  const { env, inserted } = environment();
  const spam = await worker.fetch(leadRequest("198.51.100.32", { website: "spam" }), env);
  const fast = await worker.fetch(leadRequest("198.51.100.33", { formStartedAt: Date.now() }), env);
  const invalid = await worker.fetch(leadRequest("198.51.100.34", { siteType: "unknown" }), env);
  assert.deepEqual([spam.status, fast.status, invalid.status], [400, 400, 400]);
  assert.equal(inserted.length, 0);
});

test("in-memory rate limit rejects fourth submission for an IP", async () => {
  const { env, inserted } = environment();
  const responses = [];
  for (let index = 0; index < 4; index += 1) responses.push(await worker.fetch(leadRequest("198.51.100.35"), env));
  assert.deepEqual(responses.map((response) => response.status), [201, 201, 201, 429]);
  assert.equal(inserted.length, 3);
});

test("Telegram failure does not undo the saved lead", async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  context.after(() => { globalThis.fetch = originalFetch; });
  const { env, inserted } = environment({ telegram: true });
  const response = await worker.fetch(leadRequest("198.51.100.36"), env);
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.saved, true);
  assert.equal(result.notificationStatus, "failed");
  assert.equal(inserted.length, 1);
});
