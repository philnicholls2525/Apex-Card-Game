# APEX v0.42 Supabase Backend — Implementation Handoff

## Current status

This is a **partial checkpoint**, not a runnable backend release. Work stopped to preserve the user's remaining usage allowance.

### Completed

- Unpacked and inspected the complete `APEX_v0.41.zip` source.
- Confirmed the frontend is vanilla HTML/CSS/JavaScript: `index.html`, `styles.css`, `app.js`.
- Mapped the existing local save (`apex-v010-save`) and active opening key.
- Extracted the exact 12-player checklist, card types, product prices, pack odds, box collation, Quick Draft, Pack Rush, SBC, Road to Debut and objective rules from `app.js`.
- Added Supabase project scaffolding in `supabase/config.toml`.
- Added `package.json`, `.gitignore`, and safe public browser config templates in `src/`.
- Added initial normalized Postgres schema migration:
  - `supabase/migrations/20260906202000_apex_core_schema.sql`
- Added explicit RLS/grants migration:
  - `supabase/migrations/20260906202100_apex_rls.sql`
- Added full Debut Edition seed foundation:
  - `supabase/seed.sql`
  - 12 current footballers plus Zidane/reward subjects
  - Base, Green, Blue, APEX, Red, Only One, Neon Nights and Black Ice per player
  - Elevation, Afterimage, Frameless, Road to Glory and The Stage checklists
  - THE APEX — Zinedine Zidane and reward cards
  - all seven current products and current v0.41 prices
  - versioned server-side collation configuration
  - current SBC definitions/segments
  - Road, Daily, Weekly, Set, Career, Level and hidden objective foundations

### Not completed

- SQL transaction/action migration.
- Edge Function implementation.
- Pure server pack, Draft and Rush engines.
- One-time local-save validation/import implementation.
- Frontend Supabase client, account screens and state synchronization.
- Replacement of local authoritative mutations in `app.js`.
- Persistent/resumable server opening integration.
- Friends and leaderboard screens.
- pgTAP RLS/privacy tests and Node game-engine tests.
- End-to-end validation against a real/local Supabase project.
- README deployment/setup instructions.

## Required architecture decisions already made

1. Keep the existing frontend and artwork intact; do not convert to React.
2. Use one authenticated Edge Function named `game-api` with an `action` field and shared handlers.
3. Use current Supabase authenticated Edge Function handling (`verify_jwt = true`).
4. Keep valuable writes server-only. RLS grants clients read access to permitted own state but no direct writes to wallets, inventory, cards, openings, rewards, runs or SBC submissions.
5. Do not directly expose `openings`, `draft_runs` or `rush_runs`; they contain concealed outcomes/options.
6. Put odds in `private.product_collation_versions` and never return the table to the browser.
7. Store opening results before reveal, deduct sealed inventory at opening start, reveal one card per idempotent server request, and enforce one active opening with a partial unique index.
8. Keep `card_ownership_events` as an immutable audit ledger so future trading can be added without redesigning ownership.
9. `Only One` uses `unique_per_user=true`, is protected, and is guarded against quantity greater than one. THE APEX is protected but is not assumed unique per account.
10. Database triggers prevent reductions of protected or Gallery card quantities and prevent mutation of immutable ledgers.
11. Friend profile/binder and leaderboard data must be returned by privileged, privacy-filtering server reads rather than broad cross-user RLS access.
12. Current v0.41 test start state is preserved in `private.game_settings.beta_start_state`; change that seed before a production launch if the test balance/inventory should be reduced.

## Important Supabase 2026 compatibility notes

- New public tables are no longer automatically exposed to the Data API on new projects, so the RLS migration contains explicit grants.
- Use a browser publishable key only; never put secret/service-role keys in `src/apex-config.js`.
- Hosted Edge Functions expose `SUPABASE_DB_URL`, which can be used for private transactional database functions.
- The current official Edge Function approach supports `@supabase/server` with authenticated user context; pin the chosen package version.
- Supabase CLI was unavailable in the build environment, so migration filenames were created manually and have not been applied or advisor-checked.

## Immediate next steps

1. Run the existing SQL through a real local Supabase stack and fix any syntax/advisor findings before adding more code.
2. Add `20260906202200_apex_transactions.sql` containing private transactional functions for onboarding/import, purchase, opening start/reveal/complete, rewards, Draft, Rush, SBC, quick sell, Gallery and friendships. Every mutation must record/check an idempotency key.
3. Build `supabase/functions/game-api/index.ts` plus `_shared/pack-engine.ts`, `_shared/draft-engine.ts`, `_shared/rush-engine.ts`, `_shared/import-validator.ts` and response/error helpers.
4. Return only already revealed opening cards from bootstrap/resume. Never serialize unrevealed `result_json` to the client.
5. Add `src/supabase-client.js`, `src/auth.js`, `src/game-api.js`, `src/state-sync.js`, and `src/main.js`.
6. Change `index.html` to load the module bootstrap. Load `app.js` only after a valid session/onboarding decision.
7. Refactor every authoritative mutation currently in `app.js`; do not leave a localStorage persistence fallback once online accounts are enabled.
8. Add Friends and Leaderboards routes using the existing APEX CSS vocabulary.
9. Add Node tests for deterministic engines/import validation and pgTAP tests for RLS/privacy/protected-card constraints.
10. Add the exact free-tier setup/deploy/reset README and complete an end-to-end two-user privacy test.

## Existing frontend mutation map

The principal browser-authoritative functions that must be replaced are:

- `startOpening`, `revealNextCard`, `finishOpening`
- `confirmPurchase`
- `sellSelectedDuplicates`
- Gallery toggle inside `showCardDetails`
- `claimRoadToDebut`
- `startDraft`, Draft offer/pick/reroll/swap, `finishDraft`, `claimDraftReward`
- `startRush`, Rush reveal/advance, `finishRush`, `claimRushReward`
- `submitSbc`, segment/group reward claims
- `claimObjectiveNew`, `claimHidden`
- test-save reset in `renderProfile`

The browser may continue to animate and maintain temporary screen state, but none of these actions may permanently trust `save` or `localStorage`.

## Validation warning

Do not deploy this checkpoint as-is. The schema and seed need a clean `supabase db reset`, database advisors, and security tests. The frontend is still the original localStorage build at this checkpoint.
