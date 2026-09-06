begin;

insert into public.sets(id, slug, name, season, active, released_at, display_metadata)
values (
  '26000000-0000-4000-8000-000000000001',
  'ucl-debut-edition-26-27',
  'APEX UCL Debut Edition 26/27',
  '26/27',
  true,
  '2026-09-01T00:00:00Z',
  '{"orientation":"portrait","ratio":"5:7","width":1000,"height":1400}'::jsonb
)
on conflict (id) do update set name=excluded.name, active=excluded.active, display_metadata=excluded.display_metadata;

insert into public.players(id, player_key, name, club, tier, rookie) values
  ('26000000-0000-4000-8100-000000000001','kane','Harry Kane','Bayern Munich','common',false),
  ('26000000-0000-4000-8100-000000000002','dembele','Ousmane Dembélé','Paris Saint-Germain','common',false),
  ('26000000-0000-4000-8100-000000000003','dowman','Max Dowman','Arsenal','common',true),
  ('26000000-0000-4000-8100-000000000004','haaland','Erling Haaland','Manchester City','common',false),
  ('26000000-0000-4000-8100-000000000005','estevao','Estêvão Willian','Chelsea FC','uncommon',true),
  ('26000000-0000-4000-8100-000000000006','karl','Lennart Karl','Bayern Munich','uncommon',true),
  ('26000000-0000-4000-8100-000000000007','vini','Vinícius Jr.','Real Madrid','uncommon',false),
  ('26000000-0000-4000-8100-000000000008','palmer','Cole Palmer','Chelsea FC','uncommon',false),
  ('26000000-0000-4000-8100-000000000009','messi','Lionel Messi','Inter Miami','scarce',false),
  ('26000000-0000-4000-8100-000000000010','ronaldo','Cristiano Ronaldo','Al-Nassr','scarce',false),
  ('26000000-0000-4000-8100-000000000011','yamal','Lamine Yamal','Barcelona','scarce',true),
  ('26000000-0000-4000-8100-000000000012','bellingham','Jude Bellingham','Real Madrid','scarce',false),
  ('26000000-0000-4000-8100-000000000013','zidane','Zinedine Zidane','THE APEX','legend',false),
  ('26000000-0000-4000-8100-000000000014','drogba','Didier Drogba','APEX REWARD','legend',false),
  ('26000000-0000-4000-8100-000000000015','kaka','Kaká','APEX REWARD','legend',false),
  ('26000000-0000-4000-8100-000000000016','r9','Ronaldo Nazário','APEX REWARD','legend',false),
  ('26000000-0000-4000-8100-000000000017','henry','Thierry Henry','APEX REWARD','legend',false),
  ('26000000-0000-4000-8100-000000000018','ronaldinho','Ronaldinho','APEX REWARD','legend',false),
  ('26000000-0000-4000-8100-000000000019','iniesta','Andrés Iniesta','APEX REWARD','legend',false),
  ('26000000-0000-4000-8100-000000000020','cruyff','Johan Cruyff','APEX REWARD','legend',false),
  ('26000000-0000-4000-8100-000000000021','pele','Pelé','APEX REWARD','legend',false)
on conflict (player_key) do update set
  name=excluded.name, club=excluded.club, tier=excluded.tier, rookie=excluded.rookie;

with variants(card_type, rarity_rank, protected, unique_per_user, quick_sell_value, label) as (
  values
    ('base',0,false,false,25,'Base'),
    ('green',1,false,false,50,'Green'),
    ('blue',2,false,false,90,'Blue'),
    ('apex',3,false,false,150,'APEX'),
    ('red',4,false,false,275,'Red'),
    ('onlyone',8,true,true,0,'Gold Only One'),
    ('neon',4,false,false,175,'Neon Nights'),
    ('ice',4,false,false,175,'Black Ice')
)
insert into public.card_definitions(
  set_id, player_id, card_code, card_type, rarity_rank, protected,
  unique_per_user, quick_sell_value, asset_key, display_metadata, active
)
select
  '26000000-0000-4000-8000-000000000001', p.id,
  v.card_type || ':' || p.player_key, v.card_type, v.rarity_rank, v.protected,
  v.unique_per_user, v.quick_sell_value,
  case when v.card_type in ('base','green','blue','apex','red')
    then 'assets/cards/debut-edition/base/' || p.player_key || '.png'
    else 'generated:' || v.card_type || ':' || p.player_key end,
  jsonb_build_object(
    'label',v.label,
    'playerKey',p.player_key,
    'frame',case v.card_type
      when 'green' then 'assets/cards/debut-edition/frame-green.png'
      when 'blue' then 'assets/cards/debut-edition/frame-blue.png'
      when 'apex' then 'assets/cards/debut-edition/frame-apex.png'
      when 'red' then 'assets/cards/debut-edition/frame-red.png'
      else null end,
    'effect',case when v.card_type='apex' then 'assets/cards/debut-edition/effect-apex.png' else null end
  ), true
from public.players p cross join variants v
where p.player_key in ('kane','dembele','dowman','haaland','estevao','karl','vini','palmer','messi','ronaldo','yamal','bellingham')
on conflict (card_code) do update set
  rarity_rank=excluded.rarity_rank, protected=excluded.protected,
  unique_per_user=excluded.unique_per_user, quick_sell_value=excluded.quick_sell_value,
  asset_key=excluded.asset_key, display_metadata=excluded.display_metadata, active=true;

with hit_rows(card_type, rarity_rank, quick_sell_value, player_key, label) as (
  values
    ('elevation',5,300,'kane','Elevation'),('elevation',5,300,'dembele','Elevation'),
    ('elevation',5,300,'ronaldo','Elevation'),('elevation',5,300,'haaland','Elevation'),
    ('afterimage',6,350,'messi','Afterimage'),('afterimage',6,350,'bellingham','Afterimage'),
    ('afterimage',6,350,'palmer','Afterimage'),
    ('frameless',7,450,'dowman','Frameless: Breakthrough'),
    ('frameless',7,450,'yamal','Frameless: Breakthrough'),
    ('frameless',7,450,'estevao','Frameless: Breakthrough'),
    ('frameless',7,450,'karl','Frameless: Breakthrough'),
    ('road',5,250,'dembele','Road to Glory'),('road',5,250,'karl','Road to Glory'),
    ('road',5,250,'estevao','Road to Glory'),('road',5,250,'ronaldo','Road to Glory'),
    ('stage',5,250,'vini','The Stage'),('stage',5,250,'messi','The Stage'),
    ('stage',5,250,'palmer','The Stage'),('stage',5,250,'yamal','The Stage')
)
insert into public.card_definitions(
  set_id, player_id, card_code, card_type, rarity_rank, protected,
  unique_per_user, quick_sell_value, asset_key, display_metadata, active
)
select
  '26000000-0000-4000-8000-000000000001', p.id,
  h.card_type || ':' || h.player_key, h.card_type, h.rarity_rank, false, false,
  h.quick_sell_value, 'generated:' || h.card_type || ':' || h.player_key,
  jsonb_build_object('label',h.label,'playerKey',h.player_key), true
from hit_rows h join public.players p on p.player_key=h.player_key
on conflict (card_code) do update set
  rarity_rank=excluded.rarity_rank, quick_sell_value=excluded.quick_sell_value,
  display_metadata=excluded.display_metadata, active=true;

insert into public.card_definitions(
  set_id, player_id, card_code, card_type, rarity_rank, protected,
  unique_per_user, quick_sell_value, asset_key, display_metadata, active
)
select '26000000-0000-4000-8000-000000000001', p.id, 'theapex:zidane',
  'theapex', 9, true, false, 0, 'generated:theapex:zidane',
  '{"label":"THE APEX","playerKey":"zidane"}'::jsonb, true
from public.players p where p.player_key='zidane'
on conflict (card_code) do update set protected=true, active=true;

with rewards(player_key, card_name) as (
  values
    ('drogba','Didier Drogba — APEX Reward'),('kaka','Kaká — APEX Reward'),
    ('r9','Ronaldo Nazário — APEX Reward'),('henry','Thierry Henry — APEX Reward'),
    ('ronaldinho','Ronaldinho — APEX Reward'),('iniesta','Andrés Iniesta — APEX Reward'),
    ('cruyff','Johan Cruyff — APEX IMMORTAL'),('pele','Pelé — APEX MASTER')
)
insert into public.card_definitions(
  set_id, player_id, card_code, card_type, rarity_rank, protected,
  unique_per_user, quick_sell_value, asset_key, display_metadata, active
)
select '26000000-0000-4000-8000-000000000001', p.id,
  'reward:' || r.player_key, 'reward', 10, false, false, 0,
  'generated:reward:' || r.player_key,
  jsonb_build_object('label','APEX Reward','playerKey',r.player_key,'name',r.card_name), true
from rewards r join public.players p on p.player_key=r.player_key
on conflict (card_code) do update set display_metadata=excluded.display_metadata, active=true;

insert into public.products(id,set_id,product_key,name,price,kind,pack_count,active,active_collation_version,display_metadata) values
  ('26000000-0000-4000-8200-000000000001','26000000-0000-4000-8000-000000000001','normal','Normal Pack',200,'pack',1,true,1,'{"description":"3 cards · standard Debut Edition odds"}'),
  ('26000000-0000-4000-8200-000000000002','26000000-0000-4000-8000-000000000001','plus','Plus Pack',null,'reward',1,true,1,'{"description":"Green+ guaranteed · modestly boosted hit chance"}'),
  ('26000000-0000-4000-8200-000000000003','26000000-0000-4000-8000-000000000001','premium','Premium Pack',null,'reward',1,true,1,'{"description":"Blue+ guaranteed · boosted hit chance"}'),
  ('26000000-0000-4000-8200-000000000004','26000000-0000-4000-8000-000000000001','elite','Elite Pack',null,'reward',1,true,1,'{"description":"Red+ guaranteed · 12% Set Hit · 2.5% Only One · 0.1% THE APEX"}'),
  ('26000000-0000-4000-8200-000000000005','26000000-0000-4000-8000-000000000001','hanger','Hanger Box',800,'box',3,true,1,'{"description":"3 packs · 1 Neon Nights guaranteed · Road to Glory live"}'),
  ('26000000-0000-4000-8200-000000000006','26000000-0000-4000-8000-000000000001','value','Value Box',1750,'box',5,true,1,'{"description":"5 packs · 1 Black Ice · 1 APEX · 1 Green+ guaranteed · The Stage live"}'),
  ('26000000-0000-4000-8200-000000000007','26000000-0000-4000-8000-000000000001','hobby','Hobby Box',4500,'box',8,true,1,'{"description":"8 packs · 1 Green+ · 1 Blue+ · 1 APEX+ · 1 Red+ guaranteed"}')
on conflict (product_key) do update set
  name=excluded.name, price=excluded.price, kind=excluded.kind, pack_count=excluded.pack_count,
  active=excluded.active, active_collation_version=excluded.active_collation_version,
  display_metadata=excluded.display_metadata;

insert into private.product_collation_versions(product_id, version, config)
select p.id, 1,
  jsonb_build_object(
    'engineVersion',1,
    'productKey',p.product_key,
    'playerWeights',jsonb_build_object('common',1,'uncommon',0.65,'scarce',0.35),
    'slot2',case p.product_key
      when 'value' then '{"green":2,"blue":1,"apex":0}'::jsonb
      when 'hobby' then '{"green":10,"blue":5,"apex":2}'::jsonb
      else '{"green":25,"blue":11.111,"apex":5.263}'::jsonb end,
    'slot3',jsonb_build_object(
      'red',100.0/42,'elevation',100.0/76,'afterimage',100.0/198,
      'frameless',100.0/364,'onlyone',100.0/1000,'theapex',100.0/5000
    ),
    'exclusiveHit',case p.product_key when 'hanger' then 'road' when 'value' then 'stage' else null end,
    'guarantees',case p.product_key
      when 'plus' then '[{"minimum":"green"}]'::jsonb
      when 'premium' then '[{"minimum":"blue"}]'::jsonb
      when 'elite' then '[{"minimum":"red","elite":true}]'::jsonb
      when 'hanger' then '[{"exact":"neon"}]'::jsonb
      when 'value' then '[{"exact":"ice"},{"exact":"apex"},{"minimum":"green","valueFloor":true}]'::jsonb
      when 'hobby' then '[{"minimum":"green"},{"minimum":"blue"},{"minimum":"apex"},{"minimum":"red"}]'::jsonb
      else '[]'::jsonb end,
    'boxUniqueCard',p.kind='box',
    'cardsPerPack',3
  )
from public.products p
on conflict (product_id,version) do update set config=excluded.config;

insert into private.game_settings(setting_key,value) values
  ('beta_start_state','{"coins":100000,"inventory":{"normal":100,"plus":15,"premium":8,"elite":3,"hanger":10,"value":6,"hobby":5},"draftStars":34,"perfectDrafts":2,"perfectRushes":1}'::jsonb),
  ('local_import_limits','{"maxCoins":10000000,"maxProductQuantity":100000,"maxCardQuantity":100000,"maxLifetime":10000000}'::jsonb),
  ('game_version','{"saveVersion":10,"frontend":"0.42.0-beta.1","set":"ucl-debut-edition-26-27"}'::jsonb)
on conflict (setting_key) do update set value=excluded.value, updated_at=now();

insert into public.sbc_definitions(id,set_id,category,name,description,repeatable,group_reward,sort_order) values
 ('welcome_exchange','26000000-0000-4000-8000-000000000001','Welcome','First Exchange','Learn the basics with any 3 Debut Edition cards.',false,'{"packs":{"normal":1}}',10),
 ('welcome_colour','26000000-0000-4000-8000-000000000001','Welcome','A Touch of Colour','Use a parallel in a simple 4-card squad.',false,'{"packs":{"normal":1}}',20),
 ('welcome_scarcity','26000000-0000-4000-8000-000000000001','Welcome','Know Your Players','Build around the player scarcity system.',false,'{"packs":{"normal":1},"coins":100}',30),
 ('upgrade_duplicates','26000000-0000-4000-8000-000000000001','Upgrades','Duplicate Upgrade','Repeatable duplicate sink. All submitted cards must have another owned copy.',true,'{"coins":50}',40),
 ('upgrade_colour','26000000-0000-4000-8000-000000000001','Upgrades','Colour Upgrade','Trade spare colour for a Plus Pack.',true,'{"coins":75}',50),
 ('debut_rising','26000000-0000-4000-8000-000000000001','Debut Edition','Rising Through APEX','Two Debut Edition segments with individual rewards.',false,'{"packs":{"premium":1},"coins":250}',60),
 ('debut_elite','26000000-0000-4000-8000-000000000001','Debut Edition','Road to the Elite','A tougher three-segment Debut Edition challenge.',false,'{"packs":{"elite":1},"coins":400}',70)
on conflict (id) do update set name=excluded.name,description=excluded.description,group_reward=excluded.group_reward,active=true;

insert into public.sbc_segments(sbc_id,id,name,slot_count,requirements,reward,sort_order) values
 ('welcome_exchange','exchange','First Exchange',3,'{}','{"coins":100}',10),
 ('welcome_colour','colour','Going Green',4,'{"greenPlus":1}','{"coins":125}',10),
 ('welcome_scarcity','scarcity','Scarcity Lesson',4,'{"uncommon":1,"scarce":1}','{"coins":150}',10),
 ('upgrade_duplicates','dupes','Duplicate Exchange',5,'{"duplicates":true}','{"packs":{"normal":1}}',10),
 ('upgrade_colour','colourup','Colour Exchange',5,'{"greenPlus":2}','{"packs":{"plus":1}}',10),
 ('debut_rising','foundation','Foundation',5,'{"uncommon":2,"greenPlus":1}','{"packs":{"normal":1},"coins":100}',10),
 ('debut_rising','stepup','Step Up',6,'{"scarce":1,"bluePlus":1}','{"packs":{"plus":1}}',20),
 ('debut_elite','colour','Colour Base',6,'{"greenPlus":2}','{"packs":{"normal":1},"coins":150}',10),
 ('debut_elite','scarce','Scarce Company',7,'{"scarce":2,"bluePlus":1}','{"packs":{"plus":1}}',20),
 ('debut_elite','apex','At The APEX',8,'{"apexPlus":1,"scarce":2}','{"packs":{"premium":1}}',30)
on conflict (sbc_id,id) do update set
  name=excluded.name,slot_count=excluded.slot_count,requirements=excluded.requirements,reward=excluded.reward;

insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward,sort_order,repeat_period) values
 ('first_touch','26000000-0000-4000-8000-000000000001','road','First Touch','Open your first real pack.','{"kind":"stat","stat":"packs_opened","target":1}','{"coins":250,"packs":{"normal":1},"xp":25}',10,null),
 ('build_core','26000000-0000-4000-8000-000000000001','road','Build the Core','Own 5 Debut Edition cards.','{"kind":"owned_unique","target":5}','{"coins":300,"packs":{"normal":1},"xp":35}',20,null),
 ('rising_stars','26000000-0000-4000-8000-000000000001','road','Rising Stars','Finish a Quick Draft.','{"kind":"stat","stat":"drafts_played","target":1}','{"coins":350,"packs":{"plus":1},"xp":50}',30,null),
 ('chasing_colour','26000000-0000-4000-8000-000000000001','road','Chasing Colour','Own a Green parallel or better.','{"kind":"owned_rank","minimum":1,"maximum":7,"target":1}','{"coins":500,"packs":{"plus":1},"xp":65}',40,null),
 ('reach_apex','26000000-0000-4000-8000-000000000001','road','Reach the APEX','Complete any SBC.','{"kind":"stat","stat":"sbcs_completed","target":1}','{"coins":750,"packs":{"premium":1},"xp":100}',50,null)
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

with rows(id,name,description,stat,target,reward) as (values
 ('rip5','RIP IT','Open 5 real packs','packs_opened',5,'{"coins":100,"xp":25}'::jsonb),
 ('rip10','KEEP RIPPING','Open 10 real packs','packs_opened',10,'{"coins":150,"xp":25}'::jsonb),
 ('green3','COLOUR ME IN','Pull 3 Green parallels','pull:green',3,'{"coins":125,"xp":25}'::jsonb),
 ('blue1','BLUE SKIES','Pull a Blue parallel','pull:blue',1,'{"coins":150,"xp":25}'::jsonb),
 ('scarce2','SCARCE FIND','Pull 2 Scarce-player cards','pull-tier:scarce',2,'{"coins":150,"xp":25}'::jsonb),
 ('draft1','QUICK THINKING','Complete 1 Quick Draft','drafts_played',1,'{"coins":125,"xp":25}'::jsonb),
 ('draft2','DOUBLE DRAFT','Complete 2 Quick Drafts','drafts_played',2,'{"coins":200,"xp":25}'::jsonb),
 ('rush1','RUSH HOUR','Complete 1 Pack Rush','rushes_played',1,'{"coins":125,"xp":25}'::jsonb),
 ('rush2','DOUBLE RUSH','Complete 2 Pack Rushes','rushes_played',2,'{"coins":175,"xp":25}'::jsonb),
 ('sbc1','SQUAD BUILDER','Complete 1 SBC','sbcs_completed',1,'{"coins":150,"xp":25}'::jsonb),
 ('sbc2','BUILD AGAIN','Complete 2 SBCs','sbcs_completed',2,'{"coins":225,"xp":25}'::jsonb)
)
insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward,repeat_period)
select id,'26000000-0000-4000-8000-000000000001','daily',name,description,
  jsonb_build_object('kind','period_delta','stat',stat,'target',target),reward,'daily'
from rows
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

with rows(id,name,description,stat,target,reward) as (values
 ('weekly:pack40','PACK ADDICT','Open 40 real packs','packs_opened',40,'{"coins":400,"xp":50}'::jsonb),
 ('weekly:green10','GREEN MACHINE','Pull 10 Green parallels','pull:green',10,'{"coins":400,"xp":50}'::jsonb),
 ('weekly:blue5','BLUE MOON','Pull 5 Blue parallels','pull:blue',5,'{"coins":450,"xp":50}'::jsonb),
 ('weekly:apex2','APEX HUNTER','Pull 2 APEX parallels','pull:apex',2,'{"coins":500,"xp":50}'::jsonb),
 ('weekly:red1','SEEING RED','Pull 1 Red parallel','pull:red',1,'{"coins":500,"xp":50}'::jsonb),
 ('weekly:draft5','DRAFT WEEK','Complete 5 Quick Drafts','drafts_played',5,'{"coins":450,"xp":50}'::jsonb),
 ('weekly:rush8','RUSH WEEK','Complete 8 Pack Rushes','rushes_played',8,'{"coins":450,"xp":50}'::jsonb),
 ('weekly:sbc5','SBC GRINDER','Complete 5 SBCs','sbcs_completed',5,'{"coins":450,"xp":50}'::jsonb),
 ('weekly:featureblue','BLUE PERIOD','Pull 10 Blue parallels','pull:blue',10,'{"coins":750,"packs":{"plus":1},"xp":100}'::jsonb),
 ('weekly:featuredraft','DRAFT KING','Complete 10 Quick Drafts','drafts_played',10,'{"coins":750,"packs":{"plus":1},"xp":100}'::jsonb),
 ('weekly:featurerush','RUSH MASTER','Complete 15 Pack Rushes','rushes_played',15,'{"coins":750,"packs":{"plus":1},"xp":100}'::jsonb),
 ('weekly:featuresbc','SBC CLEAROUT','Complete 10 SBCs','sbcs_completed',10,'{"coins":750,"packs":{"plus":1},"xp":100}'::jsonb)
)
insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward,repeat_period)
select id,'26000000-0000-4000-8000-000000000001','weekly',name,description,
  jsonb_build_object('kind','period_delta','stat',stat,'target',target),reward,'weekly'
from rows
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward,repeat_period) values
 ('dailybonus','26000000-0000-4000-8000-000000000001','daily','DAILY COMPLETE','Complete all 5 Daily Objectives','{"kind":"claim_count","category":"daily","target":5}','{"coins":300,"packs":{"normal":1},"xp":50}','daily'),
 ('weekly5','26000000-0000-4000-8000-000000000001','weekly','WEEKLY 5/8','Complete 5 Weekly Objectives','{"kind":"claim_count","category":"weekly","target":5}','{"coins":500,"packs":{"plus":1},"xp":100}','weekly'),
 ('weekly8','26000000-0000-4000-8000-000000000001','weekly','WEEKLY 8/8','Complete all 8 Weekly Objectives','{"kind":"claim_count","category":"weekly","target":8}','{"coins":1000,"packs":{"premium":1},"xp":200}','weekly')
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

-- The full v0.41 Set, Career, Level and hidden-achievement definitions are kept as
-- versioned server content so future sets can add rows rather than alter the schema.
insert into private.game_settings(setting_key,value)
values ('legacy_objective_config', $json$
{
  "setTracks": [
    ["base",[3,6,9,12]],["green",[3,6,9,12]],["blue",[3,6,9,12]],
    ["neon",[3,6,9,12]],["ice",[3,6,9,12]],["apex",[3,6,9,12]],
    ["red",[3,6,9,12]],["road",[1,2,3,4]],["stage",[1,2,3,4]],
    ["elevation",[1,2,3,4]],["afterimage",[1,2,3]],["frameless",[1,2,3,4]],
    ["onlyone",[1,3,6,9,12]],["theapex",[1]]
  ],
  "careerTracks": {
    "packs":[10,25,50,75,100,150,200,250,300,350,400,450,500,600,700,750,800,900,1000],
    "drafts":[1,5,10,15,20,25,30,40,50,60,75,100],
    "rush":[1,10,25,50,75,100,150,200,250],
    "sbc":[1,5,10,15,20,25,30,40,50,75,100],
    "hobby":[1,3,5,10,15,20,25,30,40,50,60,75,100],
    "red":[1,3,5,10,15,20,25,30,40,50,60,75,100],
    "coins":[1000,2500,5000,7500,10000,15000,20000,25000,30000,40000,50000,75000,100000]
  },
  "levelMilestones":[5,10,20,30,40,50,60,70,80,90,100],
  "hidden":["gold","peak","noway","double","jackpot","rainbow","three","last","lift","back","perfect","supersub","noreroll","timing","clean","waste","turning","royal","blackgold","boxoffice"]
}
$json$::jsonb)
on conflict (setting_key) do update set value=excluded.value,updated_at=now();

with track(type, milestones, rewards) as (values
 ('base','[3,6,9,12]'::jsonb,'[{"coins":100},{"coins":150},{"packs":{"normal":1}},{"coins":250,"packs":{"plus":1}}]'::jsonb),
 ('green','[3,6,9,12]'::jsonb,'[{"coins":150},{"packs":{"normal":1}},{"coins":150,"packs":{"normal":1}},{"coins":300,"packs":{"plus":1}}]'::jsonb),
 ('blue','[3,6,9,12]'::jsonb,'[{"coins":200},{"coins":100,"packs":{"normal":1}},{"packs":{"plus":1}},{"coins":300,"packs":{"premium":1}}]'::jsonb),
 ('neon','[3,6,9,12]'::jsonb,'[{"coins":200},{"coins":150,"packs":{"normal":1}},{"packs":{"plus":1}},{"coins":400,"packs":{"premium":1}}]'::jsonb),
 ('ice','[3,6,9,12]'::jsonb,'[{"coins":200},{"coins":150,"packs":{"normal":1}},{"packs":{"plus":1}},{"coins":400,"packs":{"premium":1}}]'::jsonb),
 ('apex','[3,6,9,12]'::jsonb,'[{"packs":{"plus":1}},{"coins":250,"packs":{"plus":1}},{"packs":{"premium":1}},{"coins":750,"packs":{"elite":1}}]'::jsonb),
 ('red','[3,6,9,12]'::jsonb,'[{"coins":500,"packs":{"plus":1}},{"coins":600,"packs":{"premium":1}},{"coins":750,"packs":{"elite":1}},{"coins":2000,"packs":{"elite":1},"card":"reward:drogba"}]'::jsonb),
 ('road','[1,2,3,4]'::jsonb,'[{"coins":500},{"coins":300,"packs":{"normal":1}},{"coins":300,"packs":{"plus":1}},{"coins":750,"packs":{"premium":1},"card":"reward:kaka"}]'::jsonb),
 ('stage','[1,2,3,4]'::jsonb,'[{"coins":550},{"coins":400,"packs":{"normal":1}},{"coins":400,"packs":{"plus":1}},{"coins":850,"packs":{"premium":1},"card":"reward:r9"}]'::jsonb),
 ('elevation','[1,2,3,4]'::jsonb,'[{"coins":550},{"coins":300,"packs":{"plus":1}},{"coins":300,"packs":{"premium":1}},{"coins":1000,"packs":{"elite":1},"card":"reward:henry"}]'::jsonb),
 ('afterimage','[1,2,3]'::jsonb,'[{"coins":300,"packs":{"plus":1}},{"coins":500,"packs":{"premium":1}},{"coins":1250,"packs":{"elite":1},"card":"reward:ronaldinho"}]'::jsonb),
 ('frameless','[1,2,3,4]'::jsonb,'[{"coins":400,"packs":{"plus":1}},{"coins":500,"packs":{"premium":1}},{"coins":500,"packs":{"elite":1}},{"coins":1500,"packs":{"elite":1},"card":"reward:iniesta"}]'::jsonb),
 ('onlyone','[1,3,6,9,12]'::jsonb,'[{"coins":500,"packs":{"premium":1}},{"coins":750,"packs":{"elite":1}},{"coins":1500,"packs":{"elite":1}},{"coins":2500,"packs":{"elite":2}},{"coins":5000,"card":"reward:cruyff"}]'::jsonb)
), expanded as (
 select t.type, (m.value #>> '{}')::integer threshold,
   t.rewards -> (m.ordinality - 1)::integer reward, m.ordinality::integer ord,
   jsonb_array_length(t.milestones) last_ord
 from track t
 cross join lateral jsonb_array_elements(t.milestones) with ordinality as m(value,ordinality)
)
insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward,sort_order)
select 'set:'||type||':'||threshold,
  '26000000-0000-4000-8000-000000000001','set',upper(type)||' '||threshold,
  'Own '||threshold||' unique '||type||' card'||case when threshold=1 then '' else 's' end,
  jsonb_build_object('kind','owned_type','cardType',type,'target',threshold),
  reward || jsonb_build_object('xp',case when ord=last_ord then 150 else 50 end), ord
from expanded
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward) values
 ('set:theapex:1','26000000-0000-4000-8000-000000000001','set','THE APEX','Own THE APEX — Zinedine Zidane','{"kind":"owned_type","cardType":"theapex","target":1}','{"coins":2000,"packs":{"elite":2},"xp":250}'),
 ('set:master','26000000-0000-4000-8000-000000000001','set','DEBUT MASTER','Complete every Debut Edition pack/product checklist','{"kind":"set_master"}','{"card":"reward:pele","xp":500}')
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

with track(track_key, stat, milestones) as (values
 ('packs','packs_opened',array[10,25,50,75,100,150,200,250,300,350,400,450,500,600,700,750,800,900,1000]),
 ('drafts','drafts_played',array[1,5,10,15,20,25,30,40,50,60,75,100]),
 ('rush','rushes_played',array[1,10,25,50,75,100,150,200,250]),
 ('sbc','sbcs_completed',array[1,5,10,15,20,25,30,40,50,75,100]),
 ('hobby','hobbies_opened',array[1,3,5,10,15,20,25,30,40,50,60,75,100]),
 ('red','pull:red',array[1,3,5,10,15,20,25,30,40,50,60,75,100]),
 ('coins','coins_earned',array[1000,2500,5000,7500,10000,15000,20000,25000,30000,40000,50000,75000,100000])
), expanded as (
 select track_key,stat,unnest(milestones) threshold from track
)
insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward)
select 'career:'||track_key||':'||threshold,
 '26000000-0000-4000-8000-000000000001','career',upper(track_key)||' VETERAN — '||threshold,
 'Lifetime progress',jsonb_build_object('kind','stat','stat',stat,'target',threshold),
 jsonb_build_object(
   'coins',case when threshold in (50,100,250,500,750,1000,2500,5000,10000) then 1000 else 300 end,
   'xp',case when threshold in (50,100,250,500,750,1000,2500,5000,10000) then 150 else 50 end
 ) || case when threshold in (50,100,250,500,750,1000,2500,5000,10000)
      then '{"packs":{"premium":1}}'::jsonb else '{}'::jsonb end
from expanded
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

with levels(level,reward) as (values
 (5,'{"coins":500}'::jsonb),(10,'{"packs":{"plus":1}}'::jsonb),
 (20,'{"coins":1000,"packs":{"plus":1}}'::jsonb),(30,'{"packs":{"premium":1}}'::jsonb),
 (40,'{"coins":1500,"packs":{"premium":1}}'::jsonb),(50,'{"packs":{"elite":1}}'::jsonb),
 (60,'{"coins":2000,"packs":{"premium":1}}'::jsonb),(70,'{"packs":{"elite":1}}'::jsonb),
 (80,'{"coins":3000,"packs":{"elite":1}}'::jsonb),(90,'{"packs":{"elite":2}}'::jsonb),
 (100,'{"coins":5000,"packs":{"elite":2}}'::jsonb)
)
insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward)
select 'level:'||level,'26000000-0000-4000-8000-000000000001','career','APEX LEVEL '||level,
 'Career level reward',jsonb_build_object('kind','level','target',level),reward
from levels
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

with hidden(id,name,description,reward) as (values
 ('gold','GOLD RUSH','Pull your first Only One','{"coins":500,"xp":100}'::jsonb),
 ('peak','PEAK APEX','Pull THE APEX','{"coins":1500,"packs":{"elite":1},"xp":250}'::jsonb),
 ('noway','NO WAY.','Pull THE APEX from a Normal Pack','{"coins":2000,"packs":{"elite":1},"xp":300}'::jsonb),
 ('double','DOUBLE TROUBLE','Pull 2 Set Hits from one sealed box','{"coins":500,"packs":{"plus":1},"xp":100}'::jsonb),
 ('jackpot','JACKPOT','Pull an Only One + Set Hit from the same box','{"coins":750,"packs":{"premium":1},"xp":150}'::jsonb),
 ('rainbow','RAINBOW ROAD','Own Green, Blue, APEX & Red of one player','{"coins":500,"packs":{"plus":1},"xp":100}'::jsonb),
 ('three','THREE OF A KIND','Pull 3 different parallel tiers of one player in one box','{"coins":400,"packs":{"plus":1},"xp":100}'::jsonb),
 ('last','LAST PACK MAGIC','Pull a Set Hit+ from the final pack of a box','{"coins":500,"xp":100}'::jsonb),
 ('lift','LIFT OFF','Pull a Set Hit from the first pack of a box','{"coins":500,"xp":100}'::jsonb),
 ('back','BACK TO BACK','Pull Set Hits in consecutive real packs','{"coins":750,"packs":{"premium":1},"xp":150}'::jsonb),
 ('perfect','PERFECTION','Complete your first 5★ Draft','{"coins":500,"packs":{"plus":1},"xp":100}'::jsonb),
 ('supersub','SUPER SUB','Bench swap turns a Draft into 5★','{"coins":750,"packs":{"premium":1},"xp":150}'::jsonb),
 ('noreroll','NAILED IT','Finish a 5★ Draft with no rerolls','{"coins":1000,"packs":{"premium":1},"xp":150}'::jsonb),
 ('timing','PERFECT TIMING','Finish final Rush objective on Pack 10','{"coins":500,"packs":{"plus":1},"xp":100}'::jsonb),
 ('clean','CLEAN SWEEP','Complete all 5 Dailies','{"coins":300,"xp":50}'::jsonb),
 ('waste','WASTE NOT','Complete an SBC using only duplicate copies','{"coins":400,"xp":75}'::jsonb),
 ('turning','NO TURNING BACK','Submit last owned Red to an SBC','{"coins":500,"xp":100}'::jsonb),
 ('royal','ROYAL FLUSH','Own all 4 Scarce players as Red parallels','{"coins":750,"packs":{"premium":1},"xp":150}'::jsonb),
 ('blackgold','BLACK GOLD','Own Neon Nights + Black Ice of one player','{"coins":400,"xp":75}'::jsonb),
 ('boxoffice','BOX OFFICE','Open a box containing Red + APEX + Set Hit','{"coins":500,"packs":{"plus":1},"xp":100}'::jsonb)
)
insert into public.objective_definitions(id,set_id,category,name,description,criteria,reward)
select 'hidden:'||id,'26000000-0000-4000-8000-000000000001','hidden',name,description,
  jsonb_build_object('kind','hidden','achievement',id),reward
from hidden
on conflict (id) do update set criteria=excluded.criteria,reward=excluded.reward,active=true;

commit;
