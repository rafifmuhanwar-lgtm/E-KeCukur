# React + Vite

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
