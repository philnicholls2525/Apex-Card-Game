# APEX online beta

This ZIP is the Supabase-backed checkpoint for the existing vanilla APEX game. It deliberately contains no Git remote and does not touch the empty GitHub repository.

## What is live

- Email/password Supabase Auth.
- RLS-protected game schema, Debut Edition seed (124 cards, 7 products, 206 objectives and 7 SBC definitions).
- A JWT-protected `game-api` Edge Function.
- Server-owned onboarding, purchases, sealed pack reservation, one-at-a-time card reveals, opening resume state, gallery changes, duplicate-only quick sells and one-time bounded local-save import.
- Protected Only One/THE APEX database constraints and immutable audit ledgers.

## Configure and run

1. Open `src/apex-config.js`. This checkpoint already contains only the project URL and safe browser publishable key; never add a service-role key to it.
2. From this folder run `npx serve .` and visit the printed local URL.
3. Create an email/password account. Confirmations are disabled in the Supabase local configuration; check the hosted Auth email settings before a public launch.
4. Run `npm test` and `npm run check` for the offline checks. With the Supabase CLI installed, run `supabase db reset` and `supabase test db` for migration/pgTAP checks.

## Database deployment order

The connected project has already received the same migration content in this order:

1. `20260906202000_apex_core_schema.sql`
2. `20260906202100_apex_rls.sql`
3. `supabase/seed.sql` (applied as the `apex_debut_seed` migration)
4. `20260906202200_apex_transactions.sql`
5. `20260906202300_apex_opening_idempotency.sql`
6. `20260906202400_apex_import_and_indexes.sql`

Deploy the function from `supabase/functions/game-api/index.ts` with JWT verification enabled. Its service-role credential stays only in Supabase Edge Function secrets.

## Security guarantees

- The browser cannot write wallets, cards, sealed inventory, openings, rewards or run records directly.
- Opening results are stored before reveal and `api_bootstrap` serializes only rows already revealed.
- The client receives a single next card from `open.reveal`, never the `result_json` stored in `public.openings`.
- Only One cards are unique per account and protected; THE APEX is protected too. Neither can be quick-sold or removed through normal ownership changes.
- The only browser key is publishable. Do not expose the service role key or database URL.

## Current rollout boundary

`src/main.js` intentionally gates the old localStorage UI after account connection. It does not launch `app.js`, because doing so would make the old browser-authoritative mutation paths available again. The old views require a full call-by-call UI migration before this becomes a playable public release.
