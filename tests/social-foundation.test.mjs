import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260907121341_social_teams_competitions_cache.sql';

test('Friend Teams and competitions have constrained, indexed, RLS-protected tables', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const tables = [
    'friend_teams', 'friend_team_members', 'friend_team_invites',
    'competitions', 'competition_periods', 'competition_entries', 'competition_scores',
    'football_data_sources', 'football_cache_state', 'football_player_performances',
    'daily_reward_settings',
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table} \\(`), `${table} must be created explicitly`);
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enable RLS`);
  }
  assert.match(sql, /revoke all on table[\s\S]*public\.friend_teams[\s\S]*from anon, authenticated/);
  assert.match(sql, /friend_team_members_one_active_team/);
  assert.match(sql, /competition_entries_friend_team_unique/);
  assert.match(sql, /football_fixtures_source_kickoff_idx/);
  assert.match(sql, /football_player_performances_player_verified_idx/);
});

test('all new social mutations remain behind service-role-only RPC gateways', async () => {
  const [sql, edge] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile('supabase/functions/game-api/index.ts', 'utf8'),
  ]);
  const actions = [
    'friend.cancel', 'social.profile', 'friendTeam.status', 'friendTeam.create',
    'friendTeam.invite', 'friendTeam.respond', 'friendTeam.cancelInvite',
    'friendTeam.leave', 'friendTeam.removeMember', 'competition.overview',
  ];
  for (const action of actions) assert.match(edge, new RegExp(`case "${action.replace('.', '\\.')}"`));
  assert.match(sql, /revoke all on function[\s\S]*public\.api_friend_team_create[\s\S]*from public,anon,authenticated/);
  assert.match(sql, /grant execute on function[\s\S]*public\.api_friend_team_create[\s\S]*to service_role/);
  assert.match(sql, /Only current friends can be invited/);
  assert.match(sql, /Only the team captain can remove members/);
});

test('Friends UI supports profile details, pending cancellation and Friend Teams navigation', async () => {
  const [social, teams, main] = await Promise.all([
    readFile('src/social-ui.js', 'utf8'),
    readFile('src/teams-ui.js', 'utf8'),
    readFile('src/main.js', 'utf8'),
  ]);
  assert.match(social, /social\.profile/);
  assert.match(social, /friend\.cancel/);
  assert.match(social, /navigate\('friend-team'\)/);
  assert.match(teams, /friendTeam\.create/);
  assert.match(teams, /friendTeam\.invite/);
  assert.match(teams, /friendTeam\.removeMember/);
  assert.match(main, /renderCompetitions/);
});

test('daily rewards expose configurable continuity and explicit streak state', async () => {
  const [sql, main] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile('src/main.js', 'utf8'),
  ]);
  assert.match(sql, /continuity_mode text not null default 'reset_on_miss'/);
  assert.match(sql, /streak_count integer not null default 0/);
  assert.match(sql, /next_eligible_at timestamptz/);
  assert.match(sql, /'nextEligibleAt',v_progress\.next_eligible_at/);
  assert.match(main, /completed tracks/);
});
