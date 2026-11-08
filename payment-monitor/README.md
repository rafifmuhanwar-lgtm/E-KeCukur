# ecukur Payment Monitor

## Progress checkpoint — 2026-11-08

### Previously verified

- Telegram bot starts and Bot API responds: `Telegram Bot: ONLINE`,
  `Telegram Connection: CONNECTED`.
- Telegram group ID is configured, and sending to the group has succeeded:
  `Telegram Group Connection: CONNECTED`.
- Bot-side monitoring commands are admin-restricted. No secrets or `.env`
  values belong in this document.

### Implemented in source; deployment/configuration still required

- Added authenticated Vercel actions at
  `GET /api/monitoring/{health,today,pending,failed,transactions,details,alerts}`.
  The function is mirrored in `api/` and `frontend/api/` to match both existing
  Vercel function roots.
- Connected `/today`, `/pending`, `/failed`, `/transactions`, `/details REF`,
  `/alerts`, `/status`, and `/health` to the monitoring API.
- API uses `BACKEND_API_KEY` via `x-api-key`, constant-time key comparison,
  no-store responses, safe payment-field selection, and bounded lists.
- Health checks read access to existing `qris_payments`; no schema migration
  or database write is performed.
- **Not yet deployed or live-verified:** configure the same strong random
  `BACKEND_API_KEY` in Vercel and the bot's local `.env`, deploy, then test the
  authenticated endpoints.

### Still not implemented or verified

- `/alerts` remains unavailable because there is no alert table/outbox.
- Payment event history, automatic pending/expiry alerts, persistent
  deduplication, and notification retry/outbox are not implemented.
- Provider verification and PayHook are not verified. Do not treat Android
  notification text as proof of `PAID`.
- Current schema only permits `PENDING`, `PAID`, `EXPIRED`, and `CANCELLED`.
  `/failed` reports `FAILED`, `EXPIRED`, and `CANCELLED` if present.

### Suggested next steps

1. Generate a dedicated random API secret locally. Configure it as
   `BACKEND_API_KEY` in Vercel Project Settings and in
   `payment-monitor/.env`; never commit or paste the value into chat.
2. Deploy the Vercel functions. Verify `/api/monitoring/health` returns HTTP
   401 without a key and health JSON with the configured key.
3. Restart the bot and test `/status`, `/today`, `/pending`, `/failed`,
   `/transactions`, and `/details REF` as an allowed Telegram admin.
4. Keep `/alerts` inactive until durable alert storage is approved and
   implemented.
5. Before automatic alerts, agree on database changes and trusted payment
   verification. Only independently verified backend evidence may set `PAID`.

## Current scope

The Telegram bot supports the existing commands and the monitoring commands
`/today`, `/pending`, `/failed`, `/alerts`, `/details REF`, and `/health`.
Monitoring commands are restricted to Telegram user IDs in
`TELEGRAM_ADMIN_IDS`.

The new `/api/monitoring/[action]` function reads existing `qris_payments` rows
only after `BACKEND_API_KEY` authentication. It returns only payment metadata
needed for monitoring; it excludes customer names, phone numbers, and raw
notifications. `/details REF` uses this authenticated endpoint instead of the
public QRIS status route.

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
  `/api/monitoring/*` routes. Set it to the API origin/base URL only.
- `BACKEND_API_KEY` — dedicated shared secret; set the same value in the bot
  `.env` and Vercel project environment.

The bot sends this key only in the `x-api-key` header to
`/api/monitoring/*`; it never logs the key or sends it to the old public routes.
Do not reuse the Telegram token, Supabase key, or webhook secret.

## Requirements before automatic alerts

The read-only query API does not provide authoritative payment event ingestion.
Before enabling automatic alerts, backend owners must agree on and implement:

1. A trusted payment lifecycle event with a globally unique event ID, event
   type, reference, event time, and validated amount. Enforce idempotency and
   persist every accepted event. Android notification data may indicate
   `PAYMENT_DETECTED` or `REVIEW_REQUIRED`, but may never establish `PAID`.
   Only independent trusted verification may set `PAID`.
2. An approved schema migration for the remaining statuses and durable
   `payment_events`, `payment_alerts`, and `notification_logs`/outbox records.
3. Server-side pending thresholds and expiry detection. Do not infer failure
   from silence. Resolve alerts on verified payment, and avoid repeat alerts
   unless the issue changes or escalates.
4. Durable Telegram retry state with idempotent alert keys so a delivery
   failure never changes payment status and retries survive restarts.
5. Health reporting for backend, Supabase, trusted payment verification, and
   PayHook source separately. Keep service authentication and Telegram admin
   authorization as separate controls.

This first API stage provides read-only query access to existing QRIS rows.
Payment event storage, automatic pending/error alerts, alert
deduplication/retry, and alert history remain inactive. `/details REF` reports
the stored backend status and does not independently verify payment. No
SQLite transaction store, simulated payment, or database migration is used by
this bot.

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
