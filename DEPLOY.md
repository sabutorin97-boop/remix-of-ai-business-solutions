# Деплой сайта AI-Profigrup на Timeweb Cloud

## Контекст
Репозиторий: https://github.com/sabutorin97-boop/remix-of-ai-business-solutions (ветка `main`)
Стек: TanStack Start (React 19 + SSR) + Nitro, менеджер пакетов — bun.
Сайт студии AI-Profigrup: лендинги, услуги, блог, кейсы + AI-чат-бот «Макс»
(серверный роут `/api/chat`, требует ключ `OPENROUTER_API_KEY`).

## Что УЖЕ сделано и закоммичено в main (трогать не нужно)
1. Сборка переключена с Cloudflare Workers на Node.js-сервер
   — в `vite.config.ts` добавлено: `nitro: { preset: "node-server" }`.
   Причина: Cloudflare замедляется Роскомнадзором в РФ, сайт для рунета.
2. `bun.lock` пересобран под публичный реестр npm
   (старый ссылался на приватный реестр Lovable — на чужом хостинге не собрался бы).
3. В `package.json` добавлен скрипт `"start": "node .output/server/index.mjs"`.
4. Добавлены `Dockerfile` и `.dockerignore` для сборки хостингом «из коробки».

## Проверка локально (по желанию, для уверенности)
```
bun install
bun run build
bun run start
```
Открыть http://localhost:3000 — должна отдаться главная страница.
(Порт берётся из переменной `PORT`, по умолчанию 3000.)

## Деплой на Timeweb Cloud Apps
1. Личный кабинет Timeweb Cloud → раздел «Приложения» (Cloud Apps) → создать.
2. Источник: GitHub → выбрать репозиторий `remix-of-ai-business-solutions`, ветка `main`.
   (Приложение Timeweb Cloud Apps уже подключено к GitHub-аккаунту.)
3. Тип сборки: **Dockerfile** (панель подхватит его из корня репозитория).
   — Если Timeweb попросит команды вручную вместо Docker:
     - Install: `bun install --frozen-lockfile`
     - Build:   `bun run build`
     - Start:   `node .output/server/index.mjs`
4. Переменные окружения (Environment variables):
   - `OPENROUTER_API_KEY` = `<ключ от сервиса OpenRouter.ai>`  ← без него чат-бот не отвечает
   - `VITE_YANDEX_METRIKA_ID` = `<ID счётчика>`          ← опционально, для аналитики

   ВНИМАНИЕ: `VITE_*` переменные нужны на этапе **СБОРКИ**, а не только запуска —
   если Timeweb разделяет build/runtime env, `VITE_YANDEX_METRIKA_ID` добавить в build.
5. Порт: приложение слушает переменную `PORT` (Timeweb пробрасывает автоматически).
6. Запустить деплой. Дальше каждый push в `main` обновляет сайт автоматически.

## После первого успешного деплоя (SEO для рунета)
1. Подключить свой домен (лучше `.ru`) вместо технического адреса `*.timeweb`.
   — Не забыть обновить `BASE_URL` в `src/routes/sitemap[.]xml.ts` и ссылку
     `Sitemap` в `public/robots.txt` на новый домен.
2. Яндекс.Вебмастер (webmaster.yandex.ru): добавить сайт, подтвердить, отдать sitemap.xml.
3. Google Search Console: то же самое.
4. Яндекс.Метрика (metrika.yandex.ru): создать счётчик, его ID → `VITE_YANDEX_METRIKA_ID`.
   Код Метрики в проекте уже готов (`src/components/site/YandexMetrika.tsx`),
   включается автоматически при наличии ID.

## Ключ OPENROUTER_API_KEY
Это доступ к сервису **OpenRouter.ai** (единый шлюз к AI-моделям; в коде
используется модель `anthropic/claude-haiku-4.5` — дешёвая альтернатива
DeepSeek V4 Flash тестировалась, но ненадёжно следовала системному промпту
на реальных вопросах). Ключ создаётся в личном кабинете на openrouter.ai →
раздел «Keys». Нужен только для работы чат-бота «Макс»; сам сайт откроется
и без него.
Ответы бота ограничены ~550 символами (жёстко обрезаются в коде) и темой
услуг AI-Profigrup — это задано в `src/routes/api/chat.ts`, менять
модель/лимит можно там.

## Если сборка на Timeweb упадёт
Прислать лог сборки — разобрать по нему. Частые причины:
- не выбран тип «Dockerfile»;
- `OPENROUTER_API_KEY` не задан (на сборку не влияет, но чат-бот вернёт 500 при обращении);
- нехватка памяти на дешёвом тарифе при сборке (React SSR — поднять тариф/лимит).
