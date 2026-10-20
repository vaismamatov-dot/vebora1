# API заявок

`POST /api/leads` принимает JSON через HTTPS. Схема проверяется в Worker, затем заявка записывается в D1 через binding `DB`.

```json
{
  "name": "Имя",
  "business": "Компания или пустая строка",
  "siteType": "Лендинг",
  "budget": "Ориентир или пустая строка",
  "task": "Описание задачи минимум 10 символов",
  "contact": "Контакт для ответа",
  "plan": "START, PRO, PREMIUM или пустая строка",
  "website": "",
  "formStartedAt": 1792450000000
}
```

`website` — honeypot, поле должно оставаться пустым. `formStartedAt` — Unix timestamp в миллисекундах, форма должна быть открыта не менее 2.5 секунд и не более суток.

Успешная запись возвращает HTTP 201:

```json
{"success":true,"saved":true,"id":123,"notificationStatus":"not_configured"}
```

`notificationStatus` принимает `sent`, `failed` или `not_configured`. Сбой Telegram не откатывает сохранённую заявку. Ошибки валидации возвращают 400, превышение лимита — 429, сбой базы — 500. `GET /api/health` делает read-only запрос к таблице и возвращает `database: connected` при доступной D1.

Для Telegram задаются Worker secrets `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`; токен не передаётся в frontend.
