# VEBORA — сайт студии

Адаптивный одностраничный сайт на HTML, CSS, JavaScript и Bootstrap 5. Для локальной проверки формы запускайте `python server.py` и открывайте `http://127.0.0.1:8000`; сервер сохраняет заявки в `data/vebora.db`. Публичный Worker использует Cloudflare D1.

## Настройка

- Контакты, тексты цен и адрес API находятся в `config.js` (`window.VEBORA_CONFIG`). Пустые контакты оставлены пустыми: заполните только подтверждённые ссылки и адреса.
- Стоимость тарифов по умолчанию показывается как «Стоимость по запросу».
- Демонстрационные карточки портфолио — CSS-концепции, а не заявления о выполненных клиентских проектах.
- Внешние ресурсы Bootstrap, Bootstrap Icons и Google Fonts подключаются по CDN.

## Форма

Форма проверяет обязательные поля в браузере и повторно проверяет их в API. Локально заявки сохраняются в SQLite. Подготовленный Cloudflare Worker сохраняет их в D1 (`vebora-leads`, binding `DB`) после публикации Worker-кода. Успех показывается только после подтверждения записи. Worker и D1 настройки находятся в `src/worker.js` и `wrangler.jsonc`; статические файлы для Cloudflare собраны в `public/`. Контракт описан в [API_CONTRACT.md](API_CONTRACT.md).

Локальные заявки доступны в `data/vebora.db`. Облачные — в Cloudflare D1 → `vebora-leads` → Explore Data → таблица `leads`. Для Telegram уведомлений серверную интеграцию нужно настроить отдельно; контакты Telegram/Instagram/email задаются в `config.js`.

## Структура

- `index.html` — содержимое секций и семантическая разметка.
- `styles.css` — палитра, компоненты, адаптивность и reduced motion.
- `script.js` — меню, анимации, тарифы, валидация и запрос формы.
- `config.js` — редактируемые контакты, цены и API endpoint.
- `server.py` — локальный веб-сервер, API формы и схема SQLite.
- `data/vebora.db` — база заявок, создаётся сервером автоматически.
- `src/worker.js` — API формы для Cloudflare Worker.
- `wrangler.jsonc` — привязки статических файлов и Cloudflare D1.
- `migrations/0001_create_leads.sql` — версия схемы таблицы.
- `public/` — копия frontend для Cloudflare deploy.

