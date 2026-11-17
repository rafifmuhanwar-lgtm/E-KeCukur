# React + Vite

## Google OAuth setup

Google sign-in uses Supabase OAuth redirects, so Vercel Preview deployments do
not need their own Google JavaScript origins. Configure the Google OAuth client
in Supabase **Authentication → Sign In / Providers → Google**. In Google Cloud,
authorize the Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).
In Supabase **Authentication → URL Configuration**, add the production URL and
the Vercel Preview URL pattern for this project to the allowed redirect URLs;
otherwise Supabase will reject the return to a Preview deployment.

## Consultation chat setup

The chat uses the existing Supabase Auth client and persists conversations and
messages in Supabase. After the existing schema setup, run
[`../backend/chat_migration.sql`](../backend/chat_migration.sql) in the Supabase
SQL Editor. The root `supabase_schema_setup.sql` intentionally does not create
chat tables. The migration adds the chat tables,
Realtime publication membership, and participant-scoped RLS policies. It also
replaces the existing unrestricted barber/user write policies so account links
and chat roles cannot be changed by anonymous clients. If an earlier chat
migration was already applied, run the updated migration again after enabling
anonymous sign-in.

No new environment variables are required. The frontend needs the existing
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configuration. To allow
consultation without customer login, the Supabase project owner must enable
Anonymous Sign-Ins under **Authentication → Sign In / Providers**. Guest chats
use a persistent Supabase anonymous-auth session. Before opening a guest chat,
the customer must enter a display name; it is saved to the guest session and
shown in the barber inbox. Common Indonesian and English profanity is rejected
both in the form and by the database. This filter is not exhaustive, and the
name-only step does not verify a person's legal identity. Re-run the updated
chat migration to install the display-name validation functions.
Booking continues to collect customer name and WhatsApp in its existing form.
Barber and capster sign-in continues to use the existing studio login.

The QRIS API also requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`QRIS_WEBHOOK_SECRET` as server-side Vercel environment variables. Never prefix
the service-role key with `VITE_` or expose it to frontend code. Apply
[`../backend/qris_payment_hardening.sql`](../backend/qris_payment_hardening.sql)
to a staging Supabase project first; it removes anonymous payment-table access
and limits payment-log reads to staff/admin users. Do not apply it to production
until the Preview API and payment flow have been verified.

To secure booking records without breaking guest booking, ticket links, or
authorized dashboards, apply
[`../backend/booking_access_hardening.sql`](../backend/booking_access_hardening.sql)
to staging after the booking-tracking migration. It removes direct anonymous
booking-table access, uses the existing booking/tracking RPCs, and exposes only
non-identifying schedule data through the availability RPC. Test guest booking
and token-based ticket links, customer-owned tickets, barber dashboards, and
the admin dashboard before applying the migration to production.
Admin accounts must be represented by the existing `users` row with role
`STAFF` or `ADMIN`, or use an email already in the application's admin
allowlist; barber accounts retain access only to their own shop's bookings.

Capster assignment and public availability require
[`../backend/capster_booking_migration.sql`](../backend/capster_booking_migration.sql)
after the booking access migration. Apply it to staging first; it adds capster
assignment to bookings and allows separate capsters in the same shop to accept
overlapping appointments. Apply it to production before deploying the matching
frontend.

The inbox is available to customers at `/messages` and to authenticated
barber/capster accounts at `/barber/messages`. Consultation starts from an
individual public profile with a database-linked barber account.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
