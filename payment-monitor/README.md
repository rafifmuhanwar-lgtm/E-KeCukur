# ecukur Payment Monitor

## Progress checkpoint — 2026-11-08

### Verified working

- Telegram bot starts and Bot API responds: `Telegram Bot: ONLINE`,
  `Telegram Connection: CONNECTED`.
- Telegram group ID is configured, and sending to the group has succeeded:
  `Telegram Group Connection: CONNECTED`.
- Bot reaches the deployed ecukur QRIS API. Its existing per-reference status
  route responded successfully during a non-payment probe.
- `/status` accurately reports the current boundary:
  `Backend ecukur: API REACHABLE (health endpoint not deployed)`,
  `Supabase: UNKNOWN`, `Payment Monitoring: NOT CONNECTED`,
  `Payment Provider: NOT VERIFIED`, `PayHook Android: NOT VERIFIED`.
- The bot's local unit suite last passed with 17 tests; Python compilation
  passed. Rerun the checks below after further changes.
- Bot-side monitoring commands are admin-restricted. No secrets or `.env`
  values belong in this document.

### Not implemented or not verified

- `/api/health` is not deployed on the public ecukur API host (HTTP 404). The
  QRIS API being reachable does not mean the separate Express backend health
  route is deployed.
- Supabase connectivity has not been checked by an API health route.
- `/today`, `/pending`, `/failed`, `/alerts`, and `/transactions` cannot show
  real data because no monitoring history/query API exists.
- `/details REF` calls the existing QRIS status route, but that route is
  unauthenticated and may return `PENDING` for an unknown reference. Treat the
  result as backend-reported only, not payment proof.
- Persistent payment events, trusted status transitions, pending/expiry
  detection, alert deduplication, and notification retry/outbox are not
  connected.
- Provider verification and PayHook are not verified. Do not treat Android
  notification text as proof of `PAID`.
- The backend QRIS schema does not yet include all monitoring statuses or the
  event/alert/notification log tables.

### Suggested next steps

1. Keep the bot on the existing reachable API URL; do not change it to a
   Supabase URL. Restart the bot after local `.env` changes.
2. Decide whether to deploy the Express service separately or intentionally
   add and secure equivalent health/monitoring routes to the deployed API.
   Do not expose a credential to current unauthenticated endpoints.
3. Before writing migrations, review the existing QRIS schema and approve the
   status/event/outbox data model with the backend owner.
4. Implement a backend-authenticated monitoring contract for admin queries,
   health checks, trusted payment events, idempotency, and durable notification
   retries. Only backend-verified payment evidence may set `PAID`.
5. Add contract tests and end-to-end tests with non-financial test events
   before enabling automatic alerts. Until then, monitoring remains explicitly
   inactive.

## Current scope

The Telegram bot supports the existing commands and the monitoring commands
`/today`, `/pending`, `/failed`, `/alerts`, `/details REF`, and `/health`.
Monitoring commands are restricted to Telegram user IDs in
`TELEGRAM_ADMIN_IDS`. They report that payment data is unavailable until an
authenticated backend monitoring API exists; they do not return sample data.

The configured backend health check uses the existing `GET /api/health` route.
The `/details REF` command uses the existing
`GET /api/payment/qris/status/:referenceId` route. That route is not
authenticated and may report `PENDING` for a reference it did not find, so
details must be treated as backend-reported information, not independent proof
of payment. The health endpoint reports backend process health only; neither
route verifies Supabase or provides payment history, event, alert, or retry
operations.

The current QRIS schema migration contains `PENDING`, `PAID`, `EXPIRED`, and
`CANCELLED`, but not the complete monitoring status set. It does not define
`payment_events`, `payment_alerts`, or `notification_logs`. No database
migration or payment endpoint is changed by this bot.

The existing QRIS webhook processes Android notification data and can update a
payment to `PAID`. That behavior is not used as a trusted payment source by this
bot. It must not be treated as proof of payment under the monitoring rules in
this document; changing that payment flow is outside this bot-only change.

## Environment

Keep all values in `payment-monitor/.env`, which must not be committed:

- `TELEGRAM_BOT_TOKEN` — required to start the bot.
- `TELEGRAM_GROUP_ID` — group target for alerts and `/testgroup`.
- `TELEGRAM_ADMIN_IDS` — comma-separated Telegram numeric user IDs allowed to
  run monitoring, status, transaction, balance, and group test commands.
  When absent or empty, those commands fail closed.
- `PAYMENT_PENDING_ALERT_MINUTES` — positive integer threshold; defaults to
  `10`. It is configuration only until the trusted event source and backend
  persistence are implemented.
- `BACKEND_API_URL` — backend base HTTP(S) URL. The bot probes the existing
  `/api/health` route and queries existing per-reference QRIS status. Set it
  to the origin/base URL only (for example, `https://api.example.com`).
- `BACKEND_API_KEY` — reserved for the authenticated monitoring API contract
  below. It is not sent to existing routes because they do not implement
  authentication.

The bot does not use or log `BACKEND_API_KEY` until an endpoint with a defined
authentication contract is implemented.

## Backend contract required before live monitoring

The repository currently has no authenticated monitoring API. Do not configure
the bot to read or mutate payment rows directly through the public QRIS routes.
Before enabling payment monitoring, backend owners need to agree and implement
the following operations and persistence semantics. This document intentionally
does not assign URL paths or claim these operations already exist.

1. **Trusted event ingestion:** accept validated backend payment lifecycle
   events with a globally unique event ID, event type, reference ID, event time,
   and safe amount/booking metadata. Enforce idempotency on the event ID and
   persist each accepted event. Android notification data may create
   `PAYMENT_DETECTED` or `REVIEW_REQUIRED`, but must never establish `PAID`.
   Only the backend's independently trusted verification may transition a
   payment to `PAID`.
2. **Atomic payment history:** expose payment data and event history, including
   `PENDING`, `PAYMENT_DETECTED`, `PAID`, `EXPIRED`, `FAILED`, and
   `REVIEW_REQUIRED`, with explicit transition and amount/reference validation.
   The existing QRIS schema needs an approved migration before these statuses
   can be stored there.
3. **Monitoring queries:** provide authenticated, paginated operations for
   today's summary, pending payments, failed payments, alert history, and
   payment details by reference. Return only fields needed by admins; never
   return full customer contact or credentials.
4. **Alert outbox and retry:** persist a stable alert/idempotency key and
   notification delivery state (`PENDING`, `SENT`, `FAILED`, retry metadata).
   Create an alert only for a new issue, status change, or escalation. A
   successful payment should close or resolve prior alerts. Telegram send
   failure must not change payment status; retries must reuse the stable alert
   key and be safe after process restarts.
5. **Pending monitor and health:** use server-side timestamps to alert when a
   pending payment exceeds `PAYMENT_PENDING_ALERT_MINUTES`, then separately
   report expiry. Do not infer failure from silence. Expose health checks that
   distinguish backend process health, Supabase availability, event ingestion,
   payment provider verification, and Android notification-source status.
6. **Authentication and audit:** require a dedicated service credential for
   monitor API operations, compare it server-side, rate-limit requests, validate
   payloads, and redact secrets and customer data from logs. Admin Telegram
   commands remain independently restricted by `TELEGRAM_ADMIN_IDS`.

Until that contract is implemented and tested, payment event storage,
automatic pending/error alerts, alert deduplication/retry, and transaction
history remain inactive. `/details REF` is limited to the existing public
per-reference status endpoint and clearly marks returned payment status as
unverified. No SQLite transaction store or simulated payment is used by this
bot.

## Run locally

From PowerShell:

```powershell
Set-Location D:\E-KeCukur\payment-monitor
.\venv\Scripts\python.exe .\bot.py
```

Set `TELEGRAM_ADMIN_IDS` to the admins' own numeric Telegram user IDs before
testing protected commands. Use `/testgroup` in a private chat to verify real
group delivery. No test payment is created by the bot; pending and alert
behavior can only be end-to-end tested after a trusted backend test-event
operation exists.

## Local checks

```powershell
Set-Location D:\E-KeCukur\payment-monitor
.\venv\Scripts\python.exe -m unittest -v
```
