# Attendance Bot

Телеграм-бот для учёта посещаемости сотрудников с WebApp-интерфейсом.

## Архитектура

- **backend** — Node.js + TypeScript + Fastify + Telegraf + Prisma + PostgreSQL
- **frontend** — React + Vite + TypeScript + Tailwind CSS + Telegram WebApp SDK
- **cron** — автоотправка дневных отчётов управляющему через `node-cron`

## Роли

- **SUPER_ADMIN** — вы. Задаётся через `SUPER_ADMIN_ID`. Видит всех пользователей бота, назначает управляющих.
- **MANAGER** (управляющий) — добавляет организации, ассистентов и сотрудников. Получает ежедневный отчёт.
- **ASSISTANT** (ассистент) — отмечает кто пришёл в рамках заданного окна времени.
- **STAFF** (сотрудник) — опционально привязывается к Telegram и видит свою историю.

## Как работает привязка Telegram

- **Ассистент**: управляющий добавляет ассистента через его **Telegram ID** (сам ассистент должен сначала запустить бота командой `/start`, узнать ID командой `/id`). Логина/пароля нет — только связка с телеграм-аккаунтом.
- **Сотрудник**: добавляется управляющим без привязки к Telegram. При желании управляющий может сгенерировать **код привязки** (`link:xxxxxx`); сотрудник отправит этот текст боту и его аккаунт привяжется.

## Окно отметки

Каждая организация имеет своё окно (`markStartHour:markStartMin` — `markEndHour:markEndMin`) в часовом поясе `Asia/Tashkent` (по умолчанию 07:00–08:00). Ассистент может отмечать в любой момент внутри окна. Как только `now > markEnd`, бот автоматически отправляет управляющему отчёт в телеграм и закрывает отметку на сегодня.

## Запуск локально

### 1. PostgreSQL

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# заполните BOT_TOKEN, SUPER_ADMIN_ID, WEBAPP_URL
npm install
npm run db:push      # применить схему Prisma
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # dev-сервер на http://localhost:5173
```

Для разработки WebApp используйте туннель (ngrok, cloudflared), потому что Telegram требует публичный HTTPS. Поместите полученный URL в `WEBAPP_URL` бэкенда **и** настройте WebApp URL у `@BotFather`.

### 4. Регистрация бота

1. Создайте бота у [@BotFather](https://t.me/BotFather), скопируйте токен в `BOT_TOKEN`.
2. Узнайте свой Telegram ID у [@userinfobot](https://t.me/userinfobot) и запишите в `SUPER_ADMIN_ID`.
3. У `@BotFather`: `/setmenubutton` → выберите бота → введите URL фронтенда (это позволит открывать WebApp прямо из меню).
4. Запустите бэкенд и фронт. Нажмите `/start` в вашем боте — вы автоматически получите роль `SUPER_ADMIN`.

## Сценарий использования

1. Супер-админ открывает WebApp → «Пользователи» → назначает кого-то управляющим.
2. Управляющий открывает WebApp → «Мои организации» → создаёт организацию, задаёт окно отметки.
3. В карточке организации добавляет сотрудников и ассистентов.
4. Ассистент каждый день во время окна открывает WebApp → «Отметить посещение» → выбирает кто пришёл/опоздал/отсутствует.
5. По окончании окна управляющий получает отчёт в телеграм.
6. Сотрудник (если привязан) может зайти в «Мои посещения» и посмотреть свою историю.

## Структура

```
attendance-bot/
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.ts           # точка входа: fastify + bot + scheduler
│       ├── config.ts
│       ├── db.ts
│       ├── bot/index.ts       # Telegraf: /start, /app, /id, link-код
│       ├── api/
│       │   ├── routes.ts      # все HTTP-эндпоинты
│       │   ├── auth.ts        # верификация Telegram initData
│       │   └── serialize.ts
│       ├── services/report.ts # формирование и отправка отчёта
│       └── jobs/scheduler.ts  # node-cron, проверяет окна раз в минуту
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── lib/{api,telegram}.ts
│       ├── components/{Layout,Card,Spinner}.tsx
│       └── pages/
│           ├── Home.tsx
│           ├── AdminUsers.tsx
│           ├── ManagerOrgs.tsx
│           ├── ManagerOrgDetail.tsx  # табы: персонал/ассистенты/отчёт/настройки
│           ├── AssistantPick.tsx
│           ├── AssistantMark.tsx
│           └── StaffHistory.tsx
└── docker-compose.yml
```

## Замечания по безопасности

- Все API-запросы авторизуются через `X-Telegram-Init-Data` — валидируется на сервере по HMAC согласно [официальной спецификации Telegram WebApp](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app). Токен бота нигде не отдаётся на клиент.
- `SUPER_ADMIN` определяется только через `SUPER_ADMIN_ID` в `.env` — его нельзя получить через API.
- Все роль-зависимые эндпоинты защищены `requireRole`.
