# AI-Profigrup v2 — release gate

## Already committed
- Preview of five planned microproducts without touching the existing checkout.
- PostgreSQL draft schema (not applied).
- Pricing, loyalty, referral and margin calculation primitives.
- Payment adapter contract, deliberately disabled.
- Reactive AI and AI Radar input/report foundations.
- Unit test source (not executed).

## Next implementation sequence
1. Confirm actual production deployment repository and build workflow. Regenerate TanStack routes and run lint/build.
2. Choose an existing authorized database or provision a Russian-hosted PostgreSQL database; review draft migration with staging credentials. No production migration before backup and verification.
3. Implement authentication, session security, owner-only/admin authorization, customer mapping and server-side transaction layer. No public table access.
4. Implement order creation with trusted price snapshots, product activation and entitlements.
5. Obtain official Monecle merchant protocol and sandbox details. Use server secrets only, verify webhook authenticity and amount/order/currency, enforce unique event ID and atomic settlement. Keep existing manual payment flow. Refunds must support amount reconciliation and entitlement policy.
6. Implement bonus ledger with row locks, FIFO allocation, expiry and reservation rollback, no negative spendable balance; handle duplicate callbacks and refunds. Reward amounts must be agreed at checkout and never silently changed afterward.
7. Implement partner attribution (30 days), prevent self-referrals, hold rewards 14 days and reverse on refund. Keep cash payouts disabled until legal/tax review, verified payee details, and atomic payout reservation. Integrate existing partner bot only after inspecting storage and permission checks.
8. Account and admin UI: orders, downloads, bonus history, partner links, pending/available rewards, product flags, refund reconciliation, access audit. Do not expose other customers' data.
9. Reactive AI: authenticated brief form, bounded AI calls, validated result, retries/idempotency, private delivery and demo example. No personal customer data.
10. Radar: approved web-search providers, timestamped actual observations, source URLs, no invented rankings. Never fetch arbitrary user URLs without SSRF safeguards.
11. Add remaining products only after validation and unit economics. Use feature flags default off.
12. Launch organic content on permitted channels; track conversion and costs. Paid ads only after validating contribution.

## Commercial guardrail
300% markup means all variable costs <= 25% of net cash price. Include discounts, fees, tax reserve, production, support, acquisition and reward liabilities; avoid double-counting discounts/rewards in realized accounting. Proposed reward percentages are ceilings, not active offers. With high payment fees and tax reserve, even zero rewards may fail the target. No automatic cash payouts.
Existing bundle price 24,900 RUB; individual total 31,500 RUB.

## Release checks
- Test checkout catalog tampering, duplicate webhooks, wrong signatures, wrong amounts, concurrent bonus redemption, refunds, expired referral, self-referral, blocked partner, access isolation, payout duplication, AI failure and recovery.
- No real customer data or live payment secrets in GitHub.
- Confirm seller agreement, taxation, receipts, refund terms, privacy/localization and partner terms before accepting live payments.
- No merge or production deployment until tests and release checks pass.

## Current blockers
Production database/hosting and merchant account configuration not verified. Live payments and report generation not connected. This branch is a development foundation, not a launch-ready store.

## Neural employee product integration (2026-11-26)
The customer-facing OpenClaw distribution and five separately maintained package repositories are private, according to the owner. The sales/support bot is a separate local Git repository with no configured remote, according to the owner. Current GitHub connection cannot read the six private repositories (404); actual dependency graph, licenses, installation scripts and release mechanisms remain unverified. Keep private repository identifiers and operational details in restricted documentation, not this public repository.

### SKU mapping (commercial catalog, not verified installation dependencies)
- base: Base, 9,900 RUB
- photo: Photo, 4,900 RUB
- video: Video, 6,900 RUB
- design: Design, 3,900 RUB
- dev: Dev, 5,900 RUB
- all: all five packages, 24,900 RUB (individual total 31,500 RUB)
- updates: 1,490 RUB / month; confirm scope and whether extension applies to existing purchased packages only.
The main customer distribution is not an extra paid SKU. Confirm whether each package requires access to it and Base before automating fulfillment.

### Fulfillment workstream (P0)
1. Audit private READMEs, installation scripts, dependency manifests, licenses and release tags; verify the exact package/access matrix.
2. Keep the commerce app authoritative for paid orders and entitlements. Snapshot purchased SKU and release version. Use verified payment settlement, including audited manual payments, to enqueue idempotent fulfillment jobs.
3. Link customer GitHub identity by verified ownership, not a free-text username alone. Grant only necessary access; start with manual fulfillment. Evaluate restricted GitHub App permissions or authenticated package delivery in staging. No broad organization membership or tokens in client code.
4. Distinguish pending invitation, accepted access, fulfillment failure and retry; record external IDs and audit events. Never automatically grant all packages for an add-on purchase. Check Base prerequisite and update rights first.
5. Keep purchased version rights separate from update expiration. On refunds or expiry, apply contractual policy, check overlapping valid purchases and avoid removing unrelated access. Repository access cannot erase copies already downloaded.
6. Audit the local sales/support bot before linking to the order API. Back up the local repository, review .gitignore and history for secrets; only then consider a private remote with owner approval. Do not duplicate the existing partner bot or mix support privileges with payment administration.
7. Test duplicate payment events, failed invitations, repeated jobs, partial fulfillment, overlapping licenses, refunds, update renewal and unauthorized requests. Do not activate automatic grants until these pass.
8. Add account UI for purchased modules, install instructions, access status, update expiry and support ticket link. No public links to restricted artifacts.

### Access blocker
Authorize the GitHub connection for the studio account and selected six private repositories, or supply sanitized READMEs and repository trees. The local support bot cannot be inspected through GitHub until an authorized source is supplied. No private code or repository permissions changed.
# Подключение оформления заказа

Маршрут `POST /api/profi-checkout` включается только при `PROFI_CHECKOUT_ENABLED=1`.
Для изолированной проверки задайте `PROFI_DATABASE_URL` тестовой базы и
`PROFI_CHECKOUT_ORIGIN` с точным адресом сайта. Для HTTP разрешён только
`127.0.0.1`. Примените миграции 001–004 только к тестовой базе.

После проверки личности поставщиком входа сервер вызывает `createSessionIssuer`
с подтверждённым идентификатором покупателя. Сессия выпускается для покупателя,
который уже есть в базе. Сервер создаёт случайный 32-байтовый токен на 24 часа.
В PostgreSQL сохраняется SHA-256 токена, ссылка на покупателя и срок действия.
В браузер отправляется
`__Host-profi_session` с атрибутами `Secure`, `HttpOnly`, `Path=/` и `SameSite=Lax`,
без `Domain`. Серверный обработчик выхода должен вызвать `createSessionRevoker`
и передать возвращённый заголовок `Set-Cookie` браузеру после отзыва в базе.
Эти операции пока доступны только серверному коду, публичные вход и выход
будут подключены вместе с выбранным поставщиком входа.

Запрос JSON принимает `requestKey` и `skus`. Один ключ следует повторно использовать
при сетевом сбое для той же корзины. Ответ содержит `orderId`. Создание заказа
не подтверждает платёж и не запускает выдачу.

## Вход через Telegram

На тестовом HTTPS-домене в BotFather зарегистрируйте точный адрес
`/api/profi-login/telegram/callback`. На сервере задайте
`PROFI_TELEGRAM_LOGIN_ENABLED=1`, `PROFI_TELEGRAM_CLIENT_ID`,
`PROFI_TELEGRAM_CLIENT_SECRET`, `PROFI_CHECKOUT_ORIGIN` и `PROFI_DATABASE_URL`.
Начало входа — `GET /api/profi-login/telegram/`.

Покупатель должен уже существовать с `auth_subject` вида `telegram:<OIDC sub>`.
Привязку создают по подтверждённой личности из Telegram Login. Telegram ID из бота,
логин, имя и почту нельзя использовать как замену OIDC sub. Автоматического
объединения учётных записей нет.

Резервный вход будет принимать одноразовый код, отправленный на заранее
подтверждённую почту того же покупателя. GitHub используется отдельно для
подтверждения аккаунта при выдаче доступа к репозиториям.

## Тестовый вход по почте

`POST /api/profi-login/email/request` принимает `{email}`, а
`POST /api/profi-login/email/confirm` принимает `{code}`. Идентификатор
запроса хранится в защищённом cookie браузера и очищается при входе.

Маршруты выключены по умолчанию. Для теста требуется `PROFI_EMAIL_TEST_ENABLED=1`
и один явно заданный адрес `PROFI_EMAIL_TEST_RECIPIENT`, предварительно
внесённый в тестовую таблицу подтверждённых адресов. Настройки отправки
отдельные от уведомлений сайта: `PROFI_EMAIL_SMTP_HOST`, `PROFI_EMAIL_SMTP_PORT`,
`PROFI_EMAIL_SMTP_USER`, `PROFI_EMAIL_SMTP_PASSWORD`. SMTP использует TLS.
Хеширование кодов требует отдельного `PROFI_EMAIL_CODE_SECRET`.
