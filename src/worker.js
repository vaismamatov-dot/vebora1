const SITE_TYPES = new Set([
  "Сайт для бизнеса",
  "Лендинг",
  "Сайт-визитка",
  "Портфолио",
  "Другое",
]);
const PLANS = new Set(["", "START", "PRO", "PREMIUM"]);
const MAX_BODY_BYTES = 16_384;
const MIN_FORM_AGE_MS = 2_500;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function textField(value, label, maxLength, required = false) {
  if (typeof value !== "string") throw new Error(`Поле «${label}» должно быть текстом.`);
  const text = value.trim();
  if (required && !text) throw new Error(`Заполните поле «${label}».`);
  if (text.length > maxLength) throw new Error(`Поле «${label}» слишком длинное.`);
  return text;
}

function validate(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Ожидается JSON-объект.");
  }
  const lead = {
    name: textField(payload.name, "Имя", 80, true),
    business: textField(payload.business ?? "", "Название бизнеса", 120),
    siteType: textField(payload.siteType, "Тип сайта", 40, true),
    budget: textField(payload.budget ?? "", "Бюджет", 80),
    task: textField(payload.task, "Описание задачи", 2000, true),
    contact: textField(payload.contact, "Контакт", 160, true),
    plan: textField(payload.plan ?? "", "Тариф", 20),
  };
  if (lead.name.length < 2) throw new Error("Имя должно содержать минимум 2 символа.");
  if (lead.task.length < 10) throw new Error("Опишите задачу минимум 10 символами.");
  if (!SITE_TYPES.has(lead.siteType)) throw new Error("Выберите допустимый тип сайта.");
  if (!PLANS.has(lead.plan)) throw new Error("Выберите допустимый тариф.");
  if (lead.contact.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.contact)) {
    throw new Error("Проверьте email или укажите другой способ связи.");
  }
  return lead;
}

async function submitLead(request, env, url) {
  if (request.method !== "POST") {
    return json({ success: false, message: "Используйте POST." }, 405);
  }
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) {
    return json({ success: false, message: "Недопустимый источник запроса." }, 403);
  }
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return json({ success: false, message: "Используйте JSON." }, 415);
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ success: false, message: "Заявка слишком большая." }, 413);
  }
  let payload;
  try {
    const body = await request.text();
    if (!body || new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return json({ success: false, message: "Пустой или слишком большой запрос." }, 413);
    }
    payload = JSON.parse(body);
  } catch {
    return json({ success: false, message: "Не удалось прочитать данные формы." }, 400);
  }
  let lead;
  try {
    if (typeof payload.website !== "string" || payload.website.trim()) {
      return json({ success: false, message: "Запрос отклонён." }, 400);
    }
    const formAge = Date.now() - Number(payload.formStartedAt);
    if (!Number.isFinite(formAge) || formAge < MIN_FORM_AGE_MS || formAge > MAX_FORM_AGE_MS) {
      return json({ success: false, message: "Форма отправлена слишком быстро. Обновите страницу и попробуйте снова." }, 400);
    }
    lead = validate(payload);
  } catch (error) {
    return json({ success: false, message: error.message }, 400);
  }
  const now = Date.now();
  for (const [key, window] of RATE_LIMIT) if (now - window.startedAt > 60_000) RATE_LIMIT.delete(key);
  const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
  const attempt = RATE_LIMIT.get(clientKey);
  if (attempt && now - attempt.startedAt < 60_000 && attempt.count >= 3) {
    return json({ success: false, message: "Слишком много заявок. Подождите минуту." }, 429);
  }
  if (!attempt || now - attempt.startedAt >= 60_000) RATE_LIMIT.set(clientKey, { startedAt: now, count: 1 });
  else attempt.count += 1;
  try {
    const result = await env.DB.prepare(
      "INSERT INTO leads (name, business, site_type, budget, task, contact, plan) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      lead.name,
      lead.business,
      lead.siteType,
      lead.budget,
      lead.task,
      lead.contact,
      lead.plan,
    ).run();
    if (!result.success) throw new Error("D1 did not confirm the insert");
    let notificationStatus = "not_configured";
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      try {
        const message = [
          "Новая заявка VEBORA",
          `Имя: ${lead.name}`,
          `Бизнес: ${lead.business || "не указано"}`,
          `Тип: ${lead.siteType}`,
          `Бюджет: ${lead.budget || "не указан"}`,
          `Тариф: ${lead.plan || "не выбран"}`,
          `Контакт: ${lead.contact}`,
          `Задача: ${lead.task}`,
        ].join("\n");
        const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message }),
          signal: AbortSignal.timeout(5_000),
        });
        notificationStatus = telegramResponse.ok ? "sent" : "failed";
      } catch {
        notificationStatus = "failed";
      }
    }
    while (RATE_LIMIT.size > 5_000) RATE_LIMIT.delete(RATE_LIMIT.keys().next().value);
    return json({ success: true, saved: true, id: result.meta?.last_row_id ?? null, notificationStatus }, 201);
  } catch {
    return json({ success: false, message: "Не удалось сохранить заявку. Попробуйте позже." }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return json({ success: false, message: "Используйте GET." }, 405);
      }
      try {
        await env.DB.prepare("SELECT 1 FROM leads LIMIT 1").first();
        return json({ success: true, service: "vebora-leads", database: "connected" });
      } catch {
        return json({ success: false, message: "База данных недоступна." }, 503);
      }
    }
    if (url.pathname === "/api/leads") return submitLead(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
