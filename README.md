# APEX online beta

This ZIP is the Supabase-backed checkpoint for the existing vanilla APEX game. It deliberately contains no Git remote and does not touch the empty GitHub repository.

## What is live

- Email/password Supabase Auth.
- RLS-protected game schema, Debut Edition seed (124 cards, 7 products, 206 objectives and 7 SBC definitions).
- A JWT-protected `game-api` Edge Function.
- Server-owned onboarding, purchases, sealed pack reservation, one-at-a-time card reveals, opening resume state, gallery changes, duplicate-only quick sells and one-time bounded local-save import.
- Protected Only One/THE APEX database constraints and immutable audit ledgers.
- Secure collector discovery, complete friend-request management, privacy-aware social profiles and Friend Teams.
- Configurable 7-day login rewards, competition/entrant/period/score foundations and server-owned football-data cache metadata.

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
7. `20260907011500_social_clubs_rewards_foundation.sql`
8. `20260907011600_daily_reward_service_gateway.sql`
9. `20260907014500_social_profiles_friends.sql`
10. `20260907121341_social_teams_competitions_cache.sql`
11. `20260907123652_seed_debut_football_sources.sql`

Deploy the function from `supabase/functions/game-api/index.ts` with JWT verification enabled. Its service-role credential stays only in Supabase Edge Function secrets.

## Security guarantees

- The browser cannot write wallets, cards, sealed inventory, openings, rewards or run records directly.
- Opening results are stored before reveal and `api_bootstrap` serializes only rows already revealed.
- The client receives a single next card from `open.reveal`, never the `result_json` stored in `public.openings`.
- Only One cards are unique per account and protected; THE APEX is protected too. Neither can be quick-sold or removed through normal ownership changes.
- The only browser key is publishable. Do not expose the service role key or database URL.
- Social/team mutations and competition/cache projections are service-role-only RPCs reached through the JWT-verified Edge Function.
- Cached football tables retain the last verified payload; browser clients never call the future external provider directly.

## Current rollout boundary

The account-aware responsive UI is in `src/main.js`. It provides sign-in, registration, password reset, collector onboarding, optional one-time local-save import, and cloud-backed versions of the original v0.41 Home, binder, store, sealed inventory and animated one-card-at-a-time reveal flow. The original localStorage `app.js` is retained as design/source reference but is not loaded by the online app.

The finished card artwork and layered reveal assets in `assets/` are the original full files from the approved v0.41 package. `npm test` includes a truncation check so incomplete PNG uploads cannot silently ship again.

Friends, Friend Teams and the initial competition/cache hub are online. External football-provider selection and ingestion, administrator competition creation, team competition entry/scoring, Quick Draft, Pack Rush, SBCs, objectives and leaderboards remain future server-action work; their buttons must not use the old local browser state.
