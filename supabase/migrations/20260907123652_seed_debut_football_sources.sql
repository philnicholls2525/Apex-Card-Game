begin;

-- The production set slug is ucl-debut-edition-26-27. Seed its configured
-- source roles without selecting or paying for an external provider yet.
insert into public.football_data_sources(set_id,provider_key,competition_code,source_role,priority,season)
select id,'unconfigured','UCL','primary',1,season
from public.sets
where slug='ucl-debut-edition-26-27'
on conflict (set_id,competition_code,source_role) do nothing;

insert into public.football_data_sources(set_id,provider_key,competition_code,source_role,priority,season)
select id,'unconfigured','DOMESTIC_BY_CLUB','fallback',10,season
from public.sets
where slug='ucl-debut-edition-26-27'
on conflict (set_id,competition_code,source_role) do nothing;

insert into public.football_cache_state(source_id)
select id from public.football_data_sources
on conflict (source_id) do nothing;

commit;
