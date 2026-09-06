begin;
select plan(5);
select ok((select relrowsecurity from pg_class where oid='public.wallets'::regclass), 'wallets have RLS');
select ok((select relrowsecurity from pg_class where oid='public.openings'::regclass), 'openings have RLS');
select ok(not has_table_privilege('authenticated','public.wallets','INSERT, UPDATE, DELETE'), 'authenticated cannot mutate wallets');
select ok(not has_table_privilege('authenticated','public.user_cards','INSERT, UPDATE, DELETE'), 'authenticated cannot mutate cards');
select ok(not has_function_privilege('authenticated','public.api_open_reveal(uuid,uuid,text)','EXECUTE'), 'authenticated cannot directly reveal cards');
select * from finish();
rollback;
