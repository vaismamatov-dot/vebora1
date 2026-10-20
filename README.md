# VEBORA DIGITAL STUDIO

Русскоязычный сайт веб-студии, раздаваемый Cloudflare Worker из `public/`. Worker обрабатывает `/api/*`; заявки записываются в Cloudflare D1 (`vebora-leads`, binding `DB`). Vite приложение в `vebora/` — отдельная папка проекта и не является указанным production deploy target.

## Настройка сайта

- `public/config.js`: проверенные контакты, данные концепций, `pricingUzs` и локаль. Цены задаются числом UZS или `null` для «Стоимость по запросу».
- Все карточки портфолио помечены Concept / Demo. Ссылки Демо и Исходный код появляются только когда указаны настоящие HTTPS-URL.
- Клиентские файлы содержат только публичные настройки; Telegram токен сюда добавлять нельзя.
- Bootstrap, Bootstrap Icons и Google Fonts загружаются через CDN.

## Форма и база

`POST /api/leads` валидирует данные, применяет honeypot, проверку минимального времени заполнения и ограничение частоты на экземпляр Worker, затем записывает в D1. Успех отправки показывается только после подтверждения записи. Ошибка Telegram-уведомления не отменяет запись и отражается отдельным статусом.

Проверка базы: открыть `https://vebora1.vaismamatov.workers.dev/api/health` (ожидается `database: connected`) либо Cloudflare Dashboard → Storage & databases → D1 → `vebora-leads` → Explore Data → `leads`. Не отправляйте тестовую заявку с реальными персональными данными.

## Telegram secrets

Создайте Telegram бота через BotFather, получите chat ID личного чата или группы, затем задайте secrets из корня репозитория:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Worker использует их только на сервере. Для удаления уведомлений можно удалить secrets в Cloudflare Dashboard → Worker → Settings → Variables and Secrets.

Перед отправкой уведомлений в личный чат откройте своего бота в Telegram и нажмите **Start** или отправьте `/start`: Telegram запрещает боту первым начинать личный диалог. Для группы добавьте бота в нужную группу и укажите её chat ID. Если уведомление не пришло, форма покажет безопасную категорию ошибки (например, неверный токен, чат не найден или пользователь ещё не запустил бота); подробности без текста заявки и секретов также попадут в Worker logs.

## Проверки и публикация

```powershell
npm run check
npm test
npx wrangler deploy
```

После деплоя проверьте главную страницу, `/api/health` и форму без отправки личных данных. В Cloudflare D1 заявки доступны в таблице `leads`.

## Структура

- `public/index.html`, `styles.css`, `script.js`, `config.js`, `favicon.svg` — production frontend.
- `src/worker.js` — Worker API и опциональное Telegram уведомление.
- `migrations/0001_create_leads.sql` — схема таблицы D1.
- `wrangler.jsonc` — Worker, assets и binding базы.
- `tests/worker.test.js` — тесты Worker API.
