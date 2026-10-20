const SITE_TYPES = new Set([
  "Сайт для бизнеса",
  "Лендинг",
  "Сайт-визитка",
  "Портфолио",
  "Другое",
]);
const PLANS = new Set(["", "START", "PRO", "PREMIUM"]);
const MAX_BODY_BYTES = 16_384;

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
    lead = validate(payload);
  } catch (error) {
    return json({ success: false, message: error.message }, 400);
  }
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
    return json({ success: true, id: result.meta?.last_row_id ?? null }, 201);
  } catch {
    return json({ success: false, message: "Не удалось сохранить заявку. Попробуйте позже." }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return request.method === "GET"
        ? json({ success: true, service: "vebora-leads" })
        : json({ success: false, message: "Используйте GET." }, 405);
    }
    if (url.pathname === "/api/leads") return submitLead(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
