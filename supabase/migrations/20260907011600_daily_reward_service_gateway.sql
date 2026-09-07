begin;

-- The Edge Function calls public RPCs through the Data API. These wrappers are
-- deliberately executable only by service_role; browser roles retain no access.
create or replace function public.api_daily_reward_status(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return private.api_daily_reward_status(p_user);
end $$;

create or replace function public.api_claim_daily_reward(p_user uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return private.api_claim_daily_reward(p_user,p_key);
end $$;

revoke all on function public.api_daily_reward_status(uuid) from public, anon, authenticated;
revoke all on function public.api_claim_daily_reward(uuid,text) from public, anon, authenticated;
grant execute on function public.api_daily_reward_status(uuid) to service_role;
grant execute on function public.api_claim_daily_reward(uuid,text) to service_role;

commit;
