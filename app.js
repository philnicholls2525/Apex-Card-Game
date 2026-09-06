const PLAYERS = [
  {id:'kane',name:'Harry Kane',club:'Bayern Munich',tier:'common'},
  {id:'dembele',name:'Ousmane Dembélé',club:'Paris Saint-Germain',tier:'common'},
  {id:'dowman',name:'Max Dowman',club:'Arsenal',tier:'common',rookie:true},
  {id:'haaland',name:'Erling Haaland',club:'Manchester City',tier:'common'},
  {id:'estevao',name:'Estêvão Willian',club:'Chelsea FC',tier:'uncommon',rookie:true},
  {id:'karl',name:'Lennart Karl',club:'Bayern Munich',tier:'uncommon',rookie:true},
  {id:'vini',name:'Vinícius Jr.',club:'Real Madrid',tier:'uncommon'},
  {id:'palmer',name:'Cole Palmer',club:'Chelsea FC',tier:'uncommon'},
  {id:'messi',name:'Lionel Messi',club:'Inter Miami',tier:'scarce'},
  {id:'ronaldo',name:'Cristiano Ronaldo',club:'Al-Nassr',tier:'scarce'},
  {id:'yamal',name:'Lamine Yamal',club:'Barcelona',tier:'scarce',rookie:true},
  {id:'bellingham',name:'Jude Bellingham',club:'Real Madrid',tier:'scarce'}
];
const WEIGHTS={common:1,uncommon:.65,scarce:.35};
const CORE_HITS={
  elevation:['kane','dembele','ronaldo','haaland'],
  afterimage:['messi','bellingham','palmer'],
  frameless:['dowman','yamal','estevao','karl'],
  road:['dembele','karl','estevao','ronaldo'],
  stage:['vini','messi','palmer','yamal']
};
const TYPE_META={
  base:{label:'Base',rank:0}, green:{label:'Green',rank:1}, blue:{label:'Blue',rank:2},
  apex:{label:'APEX',rank:3}, red:{label:'Red',rank:4}, neon:{label:'Neon Nights',rank:4}, ice:{label:'Black Ice',rank:4},
  road:{label:'Road to Glory',rank:5}, stage:{label:'The Stage',rank:5}, elevation:{label:'Elevation',rank:5}, afterimage:{label:'Afterimage',rank:6}, frameless:{label:'Frameless: Breakthrough',rank:7},
  onlyone:{label:'Gold Only One',rank:8}, theapex:{label:'THE APEX',rank:9}, reward:{label:'APEX Reward',rank:10}
};

// Finished card artwork assets. Every portrait master is standardized to 1000×1400 (5:7).
// Horizontal masters such as The Stage will use 1400×1000 — the exact same ratio rotated 90°.
const PLAYER_BASE_ART={
  kane:'assets/cards/debut-edition/base/kane.png',
  dembele:'assets/cards/debut-edition/base/dembele.png',
  dowman:'assets/cards/debut-edition/base/dowman.png',
  haaland:'assets/cards/debut-edition/base/haaland.png',
  estevao:'assets/cards/debut-edition/base/estevao.png',
  karl:'assets/cards/debut-edition/base/karl.png',
  vini:'assets/cards/debut-edition/base/vini.png',
  palmer:'assets/cards/debut-edition/base/palmer.png',
  messi:'assets/cards/debut-edition/base/messi.png',
  ronaldo:'assets/cards/debut-edition/base/ronaldo.png',
  yamal:'assets/cards/debut-edition/base/yamal.png',
  bellingham:'assets/cards/debut-edition/base/bellingham.png'
};
const PARALLEL_FRAMES={
  green:'assets/cards/debut-edition/frame-green.png',
  blue:'assets/cards/debut-edition/frame-blue.png',
  apex:'assets/cards/debut-edition/frame-apex.png',
  red:'assets/cards/debut-edition/frame-red.png'
};
function cardArt(card){
  const base=PLAYER_BASE_ART[card.playerId];
  if(!base||!['base','green','blue','apex','red'].includes(card.type))return null;
  return {
    src:base,
    frame:PARALLEL_FRAMES[card.type]||null,
    effect:card.type==='apex'?'assets/cards/debut-edition/effect-apex.png':null,
    orientation:'portrait'
  };
}

const PRODUCTS={
  normal:{name:'Normal Pack',price:200,kind:'pack',packs:1,desc:'3 cards · standard Debut Edition odds'},
  plus:{name:'Plus Pack',kind:'reward',packs:1,desc:'Green+ guaranteed · modestly boosted hit chance'},
  premium:{name:'Premium Pack',kind:'reward',packs:1,desc:'Blue+ guaranteed · boosted hit chance'},
  elite:{name:'Elite Pack',kind:'reward',packs:1,desc:'Red+ guaranteed · 12% Set Hit · 2.5% Only One · 0.1% THE APEX'},
  hanger:{name:'Hanger Box',price:800,kind:'box',packs:3,desc:'3 packs · 1 Neon Nights guaranteed · Road to Glory live'},
  value:{name:'Value Box',price:1750,kind:'box',packs:5,desc:'5 packs · 1 Black Ice · 1 APEX · 1 Green+ guaranteed · The Stage live'},
  hobby:{name:'Hobby Box',price:4500,kind:'box',packs:8,desc:'8 packs · 1 Green+ · 1 Blue+ · 1 APEX+ · 1 Red+ guaranteed'}
};

const DEFAULT_SAVE={
  version:10,
  coins:100000,
  inventory:{normal:100,plus:15,premium:8,elite:3,hanger:10,value:6,hobby:5},
  stats:{draftStars:34,perfectDrafts:2,perfectRushes:1,packsOpened:0,boxesOpened:0,cardsPulled:0,onlyOnes:0,theApex:0,quickSellCoins:0},
  cards:{}, discovered:{}, gallery:[], recent:[], lastOpening:[], onlyOnesPulled:[],
  objectivesReady:3, claimedObjectives:{}, pendingDraftReward:null, sbc:{completed:{},claimed:{},submitted:0}
};
const SAVE_KEY='apex-v010-save';
const OPENING_KEY=`${SAVE_KEY}-active-opening`;
const save=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||structuredClone(DEFAULT_SAVE);
save.sbc=save.sbc||{completed:{},claimed:{},submitted:0}; save.sbc.completed=save.sbc.completed||{}; save.sbc.claimed=save.sbc.claimed||{}; save.sbc.submitted=save.sbc.submitted||0;
save.stats.rushesPlayed=save.stats.rushesPlayed||0; save.stats.rushPacksOpened=save.stats.rushPacksOpened||0; save.stats.perfectRushes=save.stats.perfectRushes||0; save.stats.rushBest=save.stats.rushBest||0; save.stats.rushPerfectStreak=save.stats.rushPerfectStreak||0; save.stats.rushLongestStreak=save.stats.rushLongestStreak||0; save.pendingRushReward=save.pendingRushReward||null;
save.stats.draftsPlayed=save.stats.draftsPlayed||0; save.stats.sbcCompleted=save.stats.sbcCompleted||0; save.stats.coinsEarned=save.stats.coinsEarned||0; save.stats.coinsSpent=save.stats.coinsSpent||0; save.stats.hangersOpened=save.stats.hangersOpened||0; save.stats.valuesOpened=save.stats.valuesOpened||0; save.stats.hobbiesOpened=save.stats.hobbiesOpened||0;
save.stats.quickSellCoins=save.stats.quickSellCoins||0;
save.objectiveSystem=save.objectiveSystem||{claimed:{},xp:0,levelClaims:{},hiddenUnlocked:{},hiddenClaimed:{},daily:null,weekly:null};
save.roadToDebut=save.roadToDebut||{claimed:{}}; save.roadToDebut.claimed=save.roadToDebut.claimed||{};
const DAY_KEY=()=>new Date().toISOString().slice(0,10); const WEEK_KEY=()=>{const d=new Date(),x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));const y=new Date(Date.UTC(x.getUTCFullYear(),0,1));return x.getUTCFullYear()+'-W'+String(Math.ceil((((x-y)/86400000)+1)/7)).padStart(2,'0')};
function statSnapshot(){return {packs:save.stats.packsOpened,drafts:save.stats.draftsPlayed,rushes:save.stats.rushesPlayed,sbcs:save.stats.sbcCompleted,green:pullCount('green'),blue:pullCount('blue'),apex:pullCount('apex'),red:pullCount('red'),scarce:pullTierCount('scarce')}}
function ensureObjectivePeriods(){if(!save.objectiveSystem.daily||save.objectiveSystem.daily.key!==DAY_KEY())save.objectiveSystem.daily={key:DAY_KEY(),base:statSnapshot(),claimed:{},bonus:false};if(!save.objectiveSystem.weekly||save.objectiveSystem.weekly.key!==WEEK_KEY())save.objectiveSystem.weekly={key:WEEK_KEY(),base:statSnapshot(),claimed:{},milestones:{}}}

const persist=()=>localStorage.setItem(SAVE_KEY,JSON.stringify(save));
const app=document.getElementById('app');
let openingSession=JSON.parse(localStorage.getItem(OPENING_KEY)||'null');
let draftSession=null;
let rushSession=null;

function persistOpeningSession(){if(openingSession)localStorage.setItem(OPENING_KEY,JSON.stringify(openingSession));else localStorage.removeItem(OPENING_KEY)}
function setOpeningLock(locked){document.body.classList.toggle('opening-locked',locked)}
window.addEventListener('beforeunload',e=>{if(!openingSession)return;e.preventDefault();e.returnValue=''})

function byId(id){return document.getElementById(id)}
function weighted(items,weightFn){const total=items.reduce((s,x)=>s+weightFn(x),0);let r=Math.random()*total;for(const x of items){r-=weightFn(x);if(r<=0)return x}return items[items.length-1]}
function pickPlayer(exclude=[]){const pool=PLAYERS.filter(p=>!exclude.includes(p.id));return weighted(pool,p=>WEIGHTS[p.tier])}
function cardId(type,playerId){return `${type}:${playerId}`}
function makeCard(type,playerId,extra={}){const p=PLAYERS.find(x=>x.id===playerId)||{id:playerId,name:extra.name||'Zinedine Zidane',club:extra.club||'Legend',tier:'legend'};return {id:cardId(type,playerId),type,playerId:p.id,name:p.name,club:p.club,tier:p.tier,rookie:!!p.rookie,...extra}}
function chooseHitPlayer(type){return CORE_HITS[type][Math.floor(Math.random()*CORE_HITS[type].length)]}
function roll(percent){return Math.random()*100<percent}
function rollSlot2(){const r=Math.random()*100;if(r<25)return'green';if(r<36.111)return'blue';if(r<41.374)return'apex';return'base'}
function rollSlot2Value(){const r=Math.random()*100;if(r<2)return'green';if(r<3)return'blue';return'base'}
function rollSlot2Hobby(){const r=Math.random()*100;if(r<10)return'green';if(r<15)return'blue';if(r<17)return'apex';return'base'}
function rollSlot3(mult=1,exclusive=null){
  // one mutually-exclusive hit roll; any unused probability returns Base
  const rows=[];
  if(exclusive==='road') rows.push(['road',2.5]); // 1:40
  if(exclusive==='stage') rows.push(['stage',100/60]); // 1:60
  rows.push(['red',(100/42)*mult],['elevation',(100/76)*mult],['afterimage',(100/198)*mult],['frameless',(100/364)*mult],['onlyone',(100/1000)*mult],['theapex',(100/5000)*mult]);
  const total=rows.reduce((s,x)=>s+x[1],0);let r=Math.random()*100;if(r>=Math.min(total,95))return'base';
  for(const [t,w] of rows){if(r<w)return t;r-=w}return'base';
}
function remainingOnlyOnes(){return PLAYERS.filter(p=>!save.onlyOnesPulled.includes(p.id))}
function chooseOnlyOne(exclude=[]){const pool=remainingOnlyOnes().filter(p=>!exclude.includes(p.id));if(!pool.length)return null;return weighted(pool,p=>WEIGHTS[p.tier])}
function makeByType(type,exclude=[]){
  if(type==='theapex')return makeCard('theapex','zidane',{name:'Zinedine Zidane',club:'THE APEX'});
  if(type==='onlyone'){
    const p=chooseOnlyOne(exclude); if(!p)return makeByType('base',exclude); return makeCard('onlyone',p.id);
  }
  if(CORE_HITS[type])return makeCard(type,chooseHitPlayer(type));
  return makeCard(type,pickPlayer(exclude).id);
}
function weightedValueGreenPlus(){
  // Value's third guarantee is deliberately a modest colour floor, not a hidden hit slot.
  // Red/Set Hits remain live only through the normal rare Slot 3 roll.
  return Math.random()*100<82?'green':'blue';
}
function weightedPlus(minType){
  const tables={
    green:[['green',76],['blue',17],['apex',5],['red',1.4],['sethit',.4],['onlyone',.18],['theapex',.02]],
    blue:[['blue',79],['apex',15],['red',4],['sethit',1.5],['onlyone',.45],['theapex',.05]],
    apex:[['apex',82],['red',13],['sethit',4],['onlyone',.9],['theapex',.1]],
    red:[['red',90],['sethit',8],['onlyone',1.8],['theapex',.2]]
  };
  const table=tables[minType],r=Math.random()*100;let n=r;let out=table[0][0];for(const [k,w] of table){if(n<w){out=k;break}n-=w}
  if(out==='sethit'){const rr=Math.random()*100;out=rr<66?'elevation':rr<91?'afterimage':'frameless'}
  return out;
}
function generateNormalPack(opts={}){
  const used=[];
  const c1=makeByType('base',used); used.push(c1.playerId);
  const t2=opts.force2||(opts.valueOdds?rollSlot2Value():opts.hobbyOdds?rollSlot2Hobby():rollSlot2()); let c2=makeByType(t2,used);
  // Core set hits may repeat a player across different packs, but never duplicate a player inside one pack.
  if(used.includes(c2.playerId)){ const alt=PLAYERS.find(p=>!used.includes(p.id)); c2=makeCard(t2,alt.id); }
  used.push(c2.playerId);
  const t3=opts.force3||rollSlot3(opts.hitMult||1,opts.exclusiveHit||null);
  let c3=makeByType(t3,used);
  if(used.includes(c3.playerId)){
    if(CORE_HITS[t3]){ const eligible=CORE_HITS[t3].filter(id=>!used.includes(id)); c3=eligible.length?makeCard(t3,eligible[Math.floor(Math.random()*eligible.length)]):makeByType('base',used); }
    else { c3=makeByType(t3,used); }
  }
  return [c1,c2,c3];
}

function rewardEliteType(){const r=Math.random()*100;if(r<85.4)return'red';if(r<97.4){const x=Math.random()*100;return x<66?'elevation':x<91?'afterimage':'frameless'}if(r<99.9)return'onlyone';return'theapex'}
function generateRewardPack(kind){
  if(kind==='plus') return generateNormalPack({force2:weightedPlus('green')});
  if(kind==='premium') return generateNormalPack({force2:weightedPlus('blue')});
  if(kind==='elite') return generateNormalPack({force3:rewardEliteType()});
  return generateNormalPack();
}
function injectExactGuarantee(pack,type){
  const current=pack[2];
  const toSlot3=((TYPE_META[type]?.rank||0) >= (TYPE_META[current.type]?.rank||0) || ['neon','ice'].includes(type));
  const slot=toSlot3?2:1;
  const exclude=pack.filter((_,i)=>i!==slot).filter(c=>!CORE_HITS[c.type]&&c.type!=='theapex').map(c=>c.playerId);
  pack[slot]=makeByType(type,(CORE_HITS[type]||type==='theapex')?[]:exclude);
  return pack;
}
function injectValueGreenGuarantee(pack){
  return injectExactGuarantee(pack,weightedValueGreenPlus());
}
function injectGuarantee(pack,type,minType=null){
  const actual=minType?weightedPlus(minType):type;
  const current=pack[2];
  const toSlot3=((TYPE_META[actual]?.rank||0) >= (TYPE_META[current.type]?.rank||0) || ['neon','ice'].includes(actual));
  const slot=toSlot3?2:1;
  const exclude=pack.filter((_,i)=>i!==slot).filter(c=>!CORE_HITS[c.type]&&c.type!=='theapex').map(c=>c.playerId);
  pack[slot]=makeByType(actual,(CORE_HITS[actual]||actual==='theapex')?[]:exclude);
  return pack;
}
function enforceBoxCardUniqueness(packs){
  // Avoid pulling the exact same player + parallel/hit twice in one sealed box where an alternative exists.
  // Different versions of the same player are still allowed (e.g. Base Haaland + APEX Haaland).
  const seenByType={};
  for(const pack of packs){
    for(let slot=0;slot<pack.length;slot++){
      let card=pack[slot];
      const type=card.type;
      if(!seenByType[type]) seenByType[type]=new Set();
      if(!seenByType[type].has(card.playerId)){
        seenByType[type].add(card.playerId);
        continue;
      }
      const otherPlayers=pack.filter((_,i)=>i!==slot).map(c=>c.playerId);
      let candidates=[];
      if(CORE_HITS[type]){
        candidates=CORE_HITS[type].filter(id=>!seenByType[type].has(id)&&!otherPlayers.includes(id));
      } else if(type==='onlyone'){
        candidates=remainingOnlyOnes().map(p=>p.id).filter(id=>!seenByType[type].has(id)&&!otherPlayers.includes(id));
      } else if(type!=='theapex'){
        candidates=PLAYERS.map(p=>p.id).filter(id=>!seenByType[type].has(id)&&!otherPlayers.includes(id));
      }
      if(candidates.length){
        const chosen=weighted(candidates,id=>WEIGHTS[(PLAYERS.find(p=>p.id===id)||{tier:'common'}).tier]||1);
        card=makeCard(type,chosen);
        pack[slot]=card;
      }
      seenByType[type].add(card.playerId);
    }
  }
  return packs;
}
function enforceOpeningOnlyOneUniqueness(packEntries){
  const unavailable=new Set(save.onlyOnesPulled);
  for(const entry of packEntries){
    const cards=entry.cards||entry;
    for(let slot=0;slot<cards.length;slot++){
      const card=cards[slot];if(card.type!=='onlyone')continue;
      const otherPlayers=cards.filter((_,i)=>i!==slot).map(c=>c.playerId);
      if(unavailable.has(card.playerId)){
        const candidates=PLAYERS.filter(p=>!unavailable.has(p.id)&&!otherPlayers.includes(p.id));
        cards[slot]=candidates.length?makeCard('onlyone',weighted(candidates,p=>WEIGHTS[p.tier]).id):makeByType('base',otherPlayers);
      }
      if(cards[slot].type==='onlyone')unavailable.add(cards[slot].playerId);
    }
  }
  return packEntries;
}
function limitExactTypePerBox(packs,type,maxCount=1){
  let seen=0;
  for(const pack of packs){
    for(let i=0;i<pack.length;i++){
      if(pack[i].type!==type) continue;
      seen++;
      if(seen<=maxCount) continue;
      // Value boxes have one APEX-parallel ceiling. Extra natural APEX rolls step down to Blue.
      const otherPlayers=pack.filter((_,j)=>j!==i).map(c=>c.playerId);
      pack[i]=makeByType('blue',otherPlayers);
    }
  }
  return packs;
}
function limitValueNaturalColor(packs,maxCount=1){
  // Before guarantees are injected, allow at most one naturally rolled ordinary Green/Blue/APEX in a Value Box.
  let kept=0;
  for(const pack of packs){
    for(let i=0;i<pack.length;i++){
      if(!['green','blue','apex'].includes(pack[i].type)) continue;
      kept++;
      if(kept<=maxCount) continue;
      const others=pack.filter((_,j)=>j!==i).map(c=>c.playerId);
      pack[i]=makeByType('base',others);
    }
  }
  return packs;
}
function generateBox(kind){
  const p=PRODUCTS[kind];const packs=Array.from({length:p.packs},()=>generateNormalPack({exclusiveHit:kind==='hanger'?'road':kind==='value'?'stage':null,valueOdds:kind==='value',hobbyOdds:kind==='hobby'}));
  if(kind==='value') limitValueNaturalColor(packs,1);
  const indices=[...Array(p.packs).keys()].sort(()=>Math.random()-.5);
  if(kind==='hanger') injectGuarantee(packs[indices[0]],'neon');
  if(kind==='value'){
    // Value identity: exactly one Black Ice, exactly one standard APEX, and one mostly-Green Green+ guarantee.
    injectExactGuarantee(packs[indices[0]],'ice');
    injectExactGuarantee(packs[indices[1]],'apex');
    injectValueGreenGuarantee(packs[indices[2]]);
  }
  if(kind==='hobby'){
    injectGuarantee(packs[indices[0]],null,'green');injectGuarantee(packs[indices[1]],null,'blue');injectGuarantee(packs[indices[2]],null,'apex');injectGuarantee(packs[indices[3]],null,'red');
  }
  if(kind==='value') limitExactTypePerBox(packs,'apex',1);
  return enforceBoxCardUniqueness(packs);
}
function acquire(card,source){
  const id=card.id;if(!save.cards[id]) save.cards[id]={count:0,lifetime:0,history:[]};
  save.cards[id].count++;save.cards[id].lifetime++;save.cards[id].history.unshift({at:new Date().toISOString(),source});
  save.discovered[id]=true;save.stats.cardsPulled++;
  if(card.type==='onlyone'&&!save.onlyOnesPulled.includes(card.playerId)){save.onlyOnesPulled.push(card.playerId);save.stats.onlyOnes++}
  if(card.type==='theapex')save.stats.theApex++;
  save.recent.unshift({...card,source,at:new Date().toISOString()});save.recent=save.recent.slice(0,100);
}
function ownedUnique(){return Object.values(save.cards).filter(x=>x.count>0).length}
function packableDefs(){return allPackableDefs().filter(c=>c.type!=='reward')}
function ownedPackableUnique(){return packableDefs().filter(c=>save.cards[c.id]?.count>0).length}
function packableCards(){return packableDefs().length}
function updateChrome(){byId('coinBalance').textContent=save.coins.toLocaleString();byId('objBadge').textContent=save.objectivesReady}
function bindRoutes(root=document){root.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>navigate(b.dataset.route))}
function setActive(route){document.querySelectorAll('.bottom-nav [data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route))}
function navigate(route='home'){if(openingSession){setOpeningLock(true);renderOpeningPack();return}setOpeningLock(false);setActive(route);if(route==='home')renderHome();else if(route==='open')renderOpen();else if(route==='collection')renderCollection();else if(route==='duplicates')renderCollection('duplicates');else if(route==='store')renderStore();else if(route==='draft')renderDraft();else if(route==='rush')renderRush();else if(route==='sbc')renderSBC();else if(route==='objectives')renderObjectives();else if(route==='profile')renderProfile();window.scrollTo({top:0,behavior:'smooth'})}
function page(title,eyebrow='APEX'){app.innerHTML='';const node=byId('genericTemplate').content.cloneNode(true);app.append(node);byId('genericTitle').textContent=title;byId('genericEyebrow').textContent=eyebrow;bindRoutes(app);return byId('genericContent')}
function renderHome(){
  app.innerHTML='';app.append(byId('homeTemplate').content.cloneNode(true));const packCount=['normal','plus','premium','elite'].reduce((s,k)=>s+save.inventory[k],0),boxCount=['hanger','value','hobby'].reduce((s,k)=>s+save.inventory[k],0);
  const packableOwned=ownedPackableUnique();byId('heroPackCount').textContent=`${packCount} pack${packCount===1?'':'s'}`;byId('heroBoxCount').textContent=`${boxCount} box${boxCount===1?'':'es'}`;byId('draftStars').textContent=save.stats.draftStars;byId('perfectRushes').textContent=save.stats.perfectRushes;byId('collectionOwned').textContent=packableOwned;byId('collectionPct').textContent=Math.round(packableOwned/packableCards()*100)+'%';
  byId('roadToDebut').innerHTML=roadToDebutHomeHTML();byId('homeFocus').innerHTML=homeFocusHTML();
  byId('roadAction').onclick=()=>{const chapter=activeRoadChapter();if(chapter.done)claimRoadToDebut(chapter.id);else navigate(chapter.route)};
  byId('roadDetails').onclick=()=>showRoadToDebut();
  byId('homeObjectives').onclick=()=>{objectiveTab='daily';navigate('objectives')};
  if(byId('homeDuplicates'))byId('homeDuplicates').onclick=()=>navigate('duplicates');
  const track=byId('heroTrack'),dots=byId('heroDots');let idx=0;[...track.children].forEach((_,i)=>{const d=document.createElement('button');d.className=i===0?'active':'';d.onclick=()=>go(i);dots.append(d)});const go=i=>{idx=i;track.style.transform=`translateX(-${i*100}%)`;[...dots.children].forEach((d,j)=>d.classList.toggle('active',i===j))};let timer=setInterval(()=>go((idx+1)%track.children.length),5500);track.onmouseenter=()=>clearInterval(timer);bindRoutes(app);updateChrome();
}
function renderOpen(){
  const c=page('Open Packs','SEALED INVENTORY');c.innerHTML=`<div class="notice">v0.41 test balance is loaded with coins, packs and boxes. Everything you pull now saves into the real binder.</div><div class="inventory-grid" style="margin-top:16px">${[['normal','Normal Pack'],['plus','Plus Pack'],['premium','Premium Pack'],['elite','Elite Pack'],['hanger','Hanger Box'],['value','Value Box'],['hobby','Hobby Box']].map(([k,n])=>`<div class="inventory-item"><p class="eyebrow">UCL DEBUT EDITION</p><h3>${n}</h3><div class="qty">×${save.inventory[k]}</div><div class="button-row">${save.inventory[k]?`<button class="tiny-btn primary-mini" data-open="${k}">Open 1</button><button class="tiny-btn" data-open-many="${k}">Choose amount</button>`:'<span class="muted">None owned</span>'}</div></div>`).join('')}</div>`;
  c.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>startOpening(b.dataset.open,1));c.querySelectorAll('[data-open-many]').forEach(b=>b.onclick=()=>showAmountPicker(b.dataset.openMany))
}
function startOpening(kind,count){
  if(save.inventory[kind]<count)return;save.inventory[kind]-=count;
  const packs=[];let boxes=0;
  if(PRODUCTS[kind].kind==='box'){
    for(let b=0;b<count;b++){const boxPacks=generateBox(kind);boxes++;boxPacks.forEach((cards,i)=>packs.push({cards,source:`${PRODUCTS[kind].name} · Pack ${i+1}/${boxPacks.length}`,box:b+1,packNo:i+1,boxSize:boxPacks.length}))}
  } else {
    for(let i=0;i<count;i++)packs.push({cards:generateRewardPack(kind),source:PRODUCTS[kind].name,packNo:i+1,boxSize:count});
  }
  enforceOpeningOnlyOneUniqueness(packs);openingSession={kind,packs,index:0,reveal:0,pulled:[],boxes};persist();persistOpeningSession();setOpeningLock(true);renderOpeningPack();
}
function renderOpeningPack(){
  const s=openingSession;if(!s||s.index>=s.packs.length)return finishOpening();const pk=s.packs[s.index];
  setOpeningLock(true);app.innerHTML=`<section class="opening-page"><div class="opening-top"><div class="opening-lock-status">🔒 Opening locked</div><div><p class="eyebrow">${pk.source}</p><h2>Pack ${s.index+1} of ${s.packs.length}</h2></div><div class="opening-progress">${s.pulled.length} cards pulled</div></div><div class="pack-stage"><div class="foil interactive-pack" id="ripPack"><img class="pack-wordmark" src="assets/brand/apex-wordmark-primary.svg" alt="APEX"><small>DEBUT EDITION 26/27</small><em>TAP TO RIP</em></div><div class="reveal-area" id="revealArea"></div></div></section>`;
  byId('ripPack').onclick=()=>{byId('ripPack').classList.add('ripped');setTimeout(()=>showCardBack(),250)};
}
function showCardBack(){
  const s=openingSession,pk=s.packs[s.index],area=byId('revealArea');
  if(s.reveal>=3){s.index++;s.reveal=0;renderOpeningPack();return}
  area.innerHTML=`<button class="card-back-wrap" id="cardBack" aria-label="Tap to reveal card"><div class="reveal-card"><img class="reveal-layer reveal-base" src="assets/brand/reveal/debut-edition-26-27/reveal-card-base.png" alt=""><img class="reveal-layer reveal-foil" src="assets/brand/reveal/debut-edition-26-27/reveal-card-foil-pattern.png" alt=""><img class="reveal-layer reveal-glow" src="assets/brand/reveal/debut-edition-26-27/reveal-card-idle-glow.png" alt=""><img class="reveal-layer reveal-set" src="assets/brand/reveal/debut-edition-26-27/debut-edition-set-lockup.png" alt="Debut Edition 26/27"><img class="reveal-layer reveal-mark" src="assets/brand/reveal/debut-edition-26-27/reveal-card-central-mark.png" alt="APEX"><img class="reveal-layer reveal-scan" src="assets/brand/reveal/debut-edition-26-27/reveal-card-scan-overlay.png" alt="" aria-hidden="true"><div class="reveal-ucl-lockup" aria-label="UEFA Champions League"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="uclStar" d="M0-13 3-5 12-5 5 1 8 10 0 5-8 10-5 1-12-5-3-5Z"/></defs><g fill="currentColor"><use href="#uclStar" transform="translate(50 20)"/><use href="#uclStar" transform="translate(71 29) rotate(45 71 29)"/><use href="#uclStar" transform="translate(80 50) rotate(90 80 50)"/><use href="#uclStar" transform="translate(71 71) rotate(135 71 71)"/><use href="#uclStar" transform="translate(50 80) rotate(180 50 80)"/><use href="#uclStar" transform="translate(29 71) rotate(225 29 71)"/><use href="#uclStar" transform="translate(20 50) rotate(270 20 50)"/><use href="#uclStar" transform="translate(29 29) rotate(315 29 29)"/></g></svg><span>CHAMPIONS<br>LEAGUE</span></div><em class="reveal-instruction">TAP TO REVEAL</em></div></button>`;
  byId('cardBack').onclick=beginCardReveal;
}
function beginCardReveal(){const back=byId('cardBack');if(!back||back.disabled)return;back.disabled=true;back.classList.add('is-revealing');const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;setTimeout(revealNextCard,reduced?200:740)}
function revealNextCard(){
  const s=openingSession,pk=s.packs[s.index];const area=byId('revealArea');
  const card=pk.cards[s.reveal];
  if(!s.pulled.find(x=>x.sessionKey===`${s.index}:${s.reveal}`)){acquire(card,pk.source);s.pulled.push({...card,source:pk.source,sessionKey:`${s.index}:${s.reveal}`});if(s.reveal===0)save.stats.packsOpened++;persist();persistOpeningSession();}
  const last=s.reveal===2, finalPack=s.index===s.packs.length-1;
  area.innerHTML=`<button class="revealed-card-click" id="cardAdvance">${cardHTML(card,true)}</button><div class="reveal-caption"><span class="reveal-count">${s.reveal+1}/3</span><strong>${TYPE_META[card.type].label.toUpperCase()} · ${tierLabel(card.tier)}</strong><em>Tap card to ${last?(finalPack?'finish':'open next pack'):'reveal next'}</em></div>`;
  s.reveal++;persistOpeningSession();byId('cardAdvance').onclick=()=>{ if(s.reveal>=3){s.index++;s.reveal=0;persistOpeningSession();if(s.index>=s.packs.length)finishOpening();else renderOpeningPack();} else showCardBack(); };
}

function finishOpening(){
  const s=openingSession;if(!s){setOpeningLock(false);return navigate('open')}save.lastOpening=s.pulled.map(({sessionKey,...x})=>x);if(s.boxes){save.stats.boxesOpened+=s.boxes;if(s.kind==='hanger')save.stats.hangersOpened+=s.boxes;if(s.kind==='value')save.stats.valuesOpened+=s.boxes;if(s.kind==='hobby')save.stats.hobbiesOpened+=s.boxes;}evaluateOpeningAchievements(s);persist();
  const hits=s.pulled.filter(c=>TYPE_META[c.type].rank>=4);const newCount=new Set(s.pulled.map(c=>c.id)).size;
  openingSession=null;persistOpeningSession();setOpeningLock(false);const c=page('Opening Complete','RIP RECAP');c.innerHTML=`<div class="recap-hero"><div><p class="eyebrow">${s.packs.length} PACK${s.packs.length===1?'':'S'} OPENED</p><h2>${s.pulled.length} cards added</h2><p class="muted">${hits.length} Red-or-better / exclusive hits · ${newCount} unique cards seen in this opening.</p></div><div class="button-row"><button class="primary" data-route="open">← Back to Open Packs</button><button class="ghost" data-route="store">Go to Store</button><button class="ghost" data-route="collection">View Collection</button></div></div><div class="binder-grid recap-grid">${s.pulled.map(c=>cardTile(c)).join('')}</div>`;bindRoutes(c);updateChrome();
}
function tierLabel(tier){return tier==='common'?'Common':tier==='uncommon'?'Uncommon':tier==='scarce'?'Scarce':'Special'}
function tierShort(tier){return tier==='common'?'C':tier==='uncommon'?'U':tier==='scarce'?'S':'★'}
function tierPill(card,extra=''){return `<span class="tier-pill tier-${card.tier} ${extra}"><b>${tierShort(card.tier)}</b> ${tierLabel(card.tier)}</span>`}
function cardHTML(card,large=false){
  const art=cardArt(card);
  if(art){
    return `<div class="apex-card art-card ${art.frame?'layered-parallel-art':''} ${art.orientation==='landscape'?'horizontal-art-card':''} ${large?'large-card':''}" data-card-id="${card.id}"><img class="finished-card-art" src="${art.src}" alt="${card.name} — ${TYPE_META[card.type].label}" draggable="false">${art.effect?`<img class="finished-card-art parallel-effect-art" src="${art.effect}" alt="" aria-hidden="true" draggable="false">`:''}${art.frame?`<img class="finished-card-art parallel-frame-art" src="${art.frame}" alt="" aria-hidden="true" draggable="false">`:''}</div>`;
  }
  const meta=TYPE_META[card.type];return `<div class="apex-card type-${card.type} ${large?'large-card':''}" data-card-id="${card.id}"><div class="card-brand"><span class="brand-a mini-card">◇a</span><span class="ucl-ball">✦</span></div>${card.rookie?'<span class="rc-mini">RC</span>':''}<span class="debut-stamp">DEBUT</span><div class="player-figure"><span>${card.name.split(' ')[0]}</span></div><div class="card-name"><strong>${card.name}</strong><small>${card.club}</small></div><span class="rarity-line">${meta.label}</span></div>`
}
function cardTile(card){const d=save.cards[card.id],qty=d?.count||0;return `<button class="binder-item card-button" data-card="${card.id}">${cardHTML(card)}${tierPill(card,'card-tier-pill')}${qty>1?`<span class="dupe">×${qty}</span>`:''}</button>`}
function renderStore(){const c=page('Store','SEALED PRODUCTS');c.innerHTML=`<div class="notice">Test balance: ${save.coins.toLocaleString()} coins. Buy as much sealed product as you need for testing.</div><div class="store-grid" style="margin-top:16px">${Object.entries(PRODUCTS).filter(([,p])=>p.price).map(([k,p])=>`<article class="store-item"><p class="eyebrow">APEX UCL DEBUT EDITION</p><h3>${p.name}</h3><div class="product-visual ${k}">apex<span class="seal">◇ SEALED</span></div><p class="muted">${p.desc}</p><div class="button-row"><button class="tiny-btn primary-mini" data-buy="${k}">Buy 1 · ${p.price.toLocaleString()} ◉</button><button class="tiny-btn" data-buy-many="${k}">Select amount</button></div></article>`).join('')}</div>`;c.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>confirmPurchase(b.dataset.buy,1));c.querySelectorAll('[data-buy-many]').forEach(b=>b.onclick=()=>showPurchasePicker(b.dataset.buyMany))}
function modal(html){let m=document.getElementById('apexModal');if(m)m.remove();m=document.createElement('div');m.id='apexModal';m.className='modal-shell';m.innerHTML=`<div class="modal-card">${html}</div>`;document.body.appendChild(m);return m}
function quantityPicker({eyebrow,title,subtitle,max,start=1,confirmLabel='Confirm',onConfirm}){
  let qty=Math.max(1,Math.min(max,start));
  const m=modal(`<p class="eyebrow">${eyebrow}</p><h3>${title}</h3><p class="muted">${subtitle}</p><div class="qty-stepper"><button class="qty-btn" id="qtyMinus">−</button><strong id="qtyValue">${qty}</strong><button class="qty-btn" id="qtyPlus">＋</button></div><div class="qty-shortcuts"><button class="tiny-btn" id="qtyMax">MAX</button></div><div class="button-row"><button class="primary" id="qtyConfirm">${confirmLabel}</button><button class="ghost" id="modalCancel">Cancel</button></div>`);
  const paint=()=>{m.querySelector('#qtyValue').textContent=qty;m.querySelector('#qtyMinus').disabled=qty<=1;m.querySelector('#qtyPlus').disabled=qty>=max};
  m.querySelector('#qtyMinus').onclick=()=>{qty=Math.max(1,qty-1);paint()};
  m.querySelector('#qtyPlus').onclick=()=>{qty=Math.min(max,qty+1);paint()};
  m.querySelector('#qtyMax').onclick=()=>{qty=max;paint()};
  m.querySelector('#modalCancel').onclick=()=>m.remove();
  m.querySelector('#qtyConfirm').onclick=()=>{m.remove();onConfirm(qty)};paint();
}
function showAmountPicker(key){const max=save.inventory[key]||0;if(!max)return;quantityPicker({eyebrow:'OPEN PACKS',title:`Choose ${PRODUCTS[key].name} quantity`,subtitle:`${max} available`,max,start:Math.min(5,max),confirmLabel:'Open',onConfirm:n=>startOpening(key,n)})}
function showPurchasePicker(key){const p=PRODUCTS[key],max=Math.floor(save.coins/p.price);if(max<1){confirmPurchase(key,1);return}quantityPicker({eyebrow:'STORE',title:p.name,subtitle:`${p.price.toLocaleString()} coins each · ${max} affordable`,max,start:1,confirmLabel:'Continue',onConfirm:n=>confirmPurchase(key,n)})}
function confirmPurchase(key,count){const p=PRODUCTS[key],cost=p.price*count;if(save.coins<cost){modal(`<h3>Not enough coins</h3><p class="muted">You need ${cost.toLocaleString()} coins.</p><button class="primary" onclick="this.closest('.modal-shell').remove()">OK</button>`);return}const m=modal(`<p class="eyebrow">CONFIRM PURCHASE</p><h3>${count} × ${p.name}</h3><p>Spend <b>${cost.toLocaleString()} coins</b>?</p><div class="button-row"><button class="primary" id="confirmBuy">Confirm purchase</button><button class="ghost" id="modalCancel">Cancel</button></div>`);m.querySelector('#modalCancel').onclick=()=>m.remove();m.querySelector('#confirmBuy').onclick=()=>{save.coins-=cost;save.stats.coinsSpent+=cost;save.inventory[key]=(save.inventory[key]||0)+count;persist();updateChrome();m.innerHTML=`<div class="modal-card"><p class="eyebrow">PURCHASE COMPLETE</p><h3>Added to sealed inventory</h3><p>${count} × ${p.name}</p><button class="primary" id="doneBuy">Done</button></div>`;m.querySelector('#doneBuy').onclick=()=>{m.remove();renderStore()}}}

function allPackableDefs(){
  const out=[];for(const p of PLAYERS){for(const t of ['base','green','blue','apex','red','onlyone','neon','ice'])out.push(makeCard(t,p.id))}
  for(const t of ['elevation','afterimage','frameless','road','stage'])for(const pid of CORE_HITS[t])out.push(makeCard(t,pid));out.push(makeCard('theapex','zidane',{name:'Zinedine Zidane',club:'THE APEX'}));for(const [id,name] of [['drogba','Didier Drogba — APEX Reward'],['kaka','Kaká — APEX Reward'],['r9','Ronaldo Nazário — APEX Reward'],['henry','Thierry Henry — APEX Reward'],['ronaldinho','Ronaldinho — APEX Reward'],['iniesta','Andrés Iniesta — APEX Reward'],['cruyff','Johan Cruyff — APEX IMMORTAL'],['pele','Pelé — APEX MASTER']])out.push(makeCard('reward',id,{name,club:'APEX REWARD',tier:'legend'}));return out;
}
const ROAD_TO_DEBUT=[
  {id:'first_touch',number:'01',name:'First Touch',desc:'Open your first real pack.',target:1,progress:()=>save.stats.packsOpened,route:'open',action:'Open a pack',reward:{coins:250,packs:{normal:1},xp:25}},
  {id:'build_core',number:'02',name:'Build the Core',desc:'Own 5 Debut Edition cards.',target:5,progress:()=>ownedPackableUnique(),route:'collection',action:'View collection',reward:{coins:300,packs:{normal:1},xp:35}},
  {id:'rising_stars',number:'03',name:'Rising Stars',desc:'Finish a Quick Draft.',target:1,progress:()=>save.stats.draftsPlayed,route:'draft',action:'Start Quick Draft',reward:{coins:350,packs:{plus:1},xp:50}},
  {id:'chasing_colour',number:'04',name:'Chasing Colour',desc:'Own a Green parallel or better.',target:1,progress:()=>allPackableDefs().filter(c=>TYPE_META[c.type].rank>=1&&TYPE_META[c.type].rank<8&&save.cards[c.id]?.count>0).length,route:'collection',action:'Chase colour',reward:{coins:500,packs:{plus:1},xp:65}},
  {id:'reach_apex',number:'05',name:'Reach the APEX',desc:'Complete any SBC.',target:1,progress:()=>save.stats.sbcCompleted,route:'sbc',action:'Build an SBC',reward:{coins:750,packs:{premium:1},xp:100}}
];
function roadChapterState(ch){const progress=Math.min(ch.target,ch.progress());return {...ch,progress,done:progress>=ch.target,claimed:!!save.roadToDebut.claimed[ch.id]}}
function activeRoadChapter(){return ROAD_TO_DEBUT.map(roadChapterState).find(x=>!x.claimed)||{id:'complete',number:'✓',name:'Road Complete',desc:'Your Debut Edition journey is underway. Keep completing daily objectives and Set mastery.',target:1,progress:1,done:false,claimed:true,route:'objectives',action:'View objectives',reward:{}}}
function roadToDebutHomeHTML(){const ch=activeRoadChapter(),completed=ROAD_TO_DEBUT.filter(x=>save.roadToDebut.claimed[x.id]).length,pct=Math.round(completed/ROAD_TO_DEBUT.length*100);return `<div class="road-top"><div><p class="eyebrow">ROAD TO DEBUT · ${completed}/5</p><h2>${ch.number} · ${ch.name}</h2><p>${ch.desc}</p></div><button class="tiny-btn" id="roadDetails">Full path</button></div><div class="progress road-progress"><i style="width:${pct}%"></i></div><div class="road-bottom"><span>${ch.claimed?'Complete':`${ch.progress}/${ch.target} · ${rewardLabel(ch.reward)}`}</span><button class="primary road-action" id="roadAction">${ch.done&&!ch.claimed?'Claim reward':ch.action+' →'}</button></div>`}
function duplicateCount(){return allPackableDefs().filter(c=>{const r=save.cards[c.id];return r?.count>1&&!save.gallery.includes(c.id)&&!['onlyone','theapex','reward'].includes(c.type)}).reduce((n,c)=>n+(save.cards[c.id].count-1),0)}
function homeFocusHTML(){ensureObjectivePeriods();const daily=dailyDefs(),ready=daily.find(x=>x.done&&!isObjectiveClaimed(x.id)),next=daily.find(x=>!x.done)||daily[0],focus=ready||next,dupes=duplicateCount();return `<p class="eyebrow">TODAY IN APEX</p><h3>${ready?'Reward ready: ':''}${focus.name}</h3><p>${focus.desc}</p><div class="progress"><i style="width:${Math.min(100,Math.round(focus.progress/focus.target*100))}%"></i></div><p class="muted focus-meta">${focus.progress}/${focus.target} · ${ready?rewardLabel(focus.reward):'Daily objective'}</p><div class="button-row"><button class="tiny-btn primary-mini" id="homeObjectives">${ready?'Claim reward':'View daily objectives'}</button>${dupes?`<button class="tiny-btn" id="homeDuplicates">${dupes} spare card${dupes===1?'':'s'} in Vault</button>`:''}</div>`}
function showRoadToDebut(){const chapters=ROAD_TO_DEBUT.map(roadChapterState),c=page('Road to Debut','YOUR APEX START');c.innerHTML=`<div class="generic-card"><h3>Your starting path</h3><p class="muted">Five milestones teach the core loop: rip packs, collect, play, chase colour, then turn spare cards into SBC rewards.</p></div><div class="road-chapter-list">${chapters.map(ch=>`<article class="road-chapter ${ch.claimed?'road-claimed':''} ${ch.done&&!ch.claimed?'road-ready':''}"><span class="road-number">${ch.claimed?'✓':ch.number}</span><div><p class="eyebrow">${ch.claimed?'COMPLETED':ch.done?'REWARD READY':'NEXT MILESTONE'}</p><h3>${ch.name}</h3><p>${ch.desc}</p><div class="progress"><i style="width:${Math.round(ch.progress/ch.target*100)}%"></i></div><small>${ch.progress}/${ch.target} · ${rewardLabel(ch.reward)}</small></div><button class="tiny-btn ${ch.done&&!ch.claimed?'primary-mini':''}" data-road-chapter="${ch.id}">${ch.claimed?'Done':ch.done?'Claim':'Go'}</button></article>`).join('')}</div>`;c.querySelectorAll('[data-road-chapter]').forEach(b=>b.onclick=()=>{const ch=roadChapterState(ROAD_TO_DEBUT.find(x=>x.id===b.dataset.roadChapter));if(ch.claimed)return;if(ch.done)claimRoadToDebut(ch.id);else navigate(ch.route)})}
function claimRoadToDebut(id){const definition=ROAD_TO_DEBUT.find(x=>x.id===id);if(!definition)return;const ch=roadChapterState(definition);if(!ch.done||ch.claimed)return;save.roadToDebut.claimed[id]=true;giveReward(ch.reward);persist();updateChrome();const m=modal(`<p class="eyebrow">ROAD TO DEBUT COMPLETE</p><h3>${ch.name}</h3><p>You earned <b>${rewardLabel(ch.reward)}</b>.</p><button class="primary" id="roadRewardDone">Continue</button>`);m.querySelector('#roadRewardDone').onclick=()=>{m.remove();renderHome()}}
const QUICK_SELL_VALUES={base:25,green:50,blue:90,apex:150,red:275,neon:175,ice:175,road:250,stage:250,elevation:300,afterimage:350,frameless:450};
function quickSellValue(card){return QUICK_SELL_VALUES[card.type]||0}
const duplicateSellSelections={};
const DUPLICATE_TYPE_ORDER=['base','green','blue','apex','red','neon','ice','road','stage','elevation','afterimage','frameless'];
function duplicateVaultCards(){return allPackableDefs().filter(c=>{const r=save.cards[c.id];return r?.count>1&&!save.gallery.includes(c.id)&&!['onlyone','theapex','reward'].includes(c.type)&&quickSellValue(c)>0}).sort((a,b)=>DUPLICATE_TYPE_ORDER.indexOf(a.type)-DUPLICATE_TYPE_ORDER.indexOf(b.type)||a.name.localeCompare(b.name))}
function sellSelectedDuplicates(id,amount){const card=allPackableDefs().find(c=>c.id===id),rec=save.cards[id],max=Math.max(0,(rec?.count||0)-1);amount=Math.min(amount,max);if(!card||amount<1)return;const value=quickSellValue(card)*amount;save.cards[id].count-=amount;save.coins+=value;save.stats.coinsEarned+=value;save.stats.quickSellCoins+=value;delete duplicateSellSelections[id];persist();updateChrome();renderCollection('duplicates')}
function renderCollection(tab='sets'){
  const c=page('Collection','BINDER');const all=allPackableDefs(),packable=all.filter(card=>card.type!=='reward'),owned=packable.filter(card=>save.cards[card.id]?.count>0).length,discovered=packable.filter(card=>save.discovered[card.id]).length,pct=Math.round(owned/packable.length*100);
  c.innerHTML=`<div class="section-tabs"><button data-tab="sets" class="${tab==='sets'?'active':''}">Sets</button><button data-tab="duplicates" class="${tab==='duplicates'?'active':''}">Duplicate Vault</button><button data-tab="discovery" class="${tab==='discovery'?'active':''}">Discovery</button><button data-tab="gallery" class="${tab==='gallery'?'active':''}">Gallery</button><button data-tab="recent" class="${tab==='recent'?'active':''}">Recent</button><button data-tab="last" class="${tab==='last'?'active':''}">Last Opening</button></div><div id="collectionBody"></div>`;
  c.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>renderCollection(b.dataset.tab));const body=byId('collectionBody');
  if(tab==='sets'){
    body.innerHTML=`<div class="generic-card"><p class="eyebrow">APEX UCL DEBUT EDITION 26/27</p><h3>${owned} / ${packable.length} owned</h3><p class="muted">${discovered} discovered · ${pct}% packable collection complete</p><div class="progress"><i style="width:${pct}%"></i></div><div class="rarity-guide"><span class="tier-pill tier-common"><b>C</b> Common</span><span class="tier-pill tier-uncommon"><b>U</b> Uncommon</span><span class="tier-pill tier-scarce"><b>S</b> Scarce</span></div></div>${sectionHTML('Base',['base'])}${sectionHTML('Green',['green'])}${sectionHTML('Blue',['blue'])}${sectionHTML('Neon Nights',['neon'])}${sectionHTML('Black Ice',['ice'])}${sectionHTML('APEX',['apex'])}${sectionHTML('Red',['red'])}${sectionHTML('Only One',['onlyone'])}${sectionHTML('Elevation',['elevation'])}${sectionHTML('Afterimage',['afterimage'])}${sectionHTML('Frameless: Breakthrough',['frameless'])}${sectionHTML('Road to Glory',['road'])}${sectionHTML('The Stage',['stage'])}${sectionHTML('THE APEX',['theapex'])}${sectionHTML('APEX Rewards',['reward'])}`;
  } else if(tab==='duplicates'){
    const cards=duplicateVaultCards(),spares=cards.reduce((n,card)=>n+(save.cards[card.id].count-1),0),value=cards.reduce((n,card)=>n+(save.cards[card.id].count-1)*quickSellValue(card),0),groups=cards.reduce((map,card)=>{(map[card.type]||=[]).push(card);return map},{});const duplicateCard=card=>{const extras=save.cards[card.id].count-1,selected=Math.min(extras,Math.max(1,duplicateSellSelections[card.id]||1)),coins=selected*quickSellValue(card);duplicateSellSelections[card.id]=selected;return `<article class="duplicate-card" data-duplicate-row="${card.id}">${cardHTML(card)}<div class="duplicate-copy"><p class="eyebrow">${TYPE_META[card.type].label.toUpperCase()}</p><h3>${card.name}</h3><p class="muted">Own ${save.cards[card.id].count} · keeping 1</p><div class="duplicate-sell-row"><div class="inline-stepper"><button class="qty-btn" data-dup-minus="${card.id}" ${selected<=1?'disabled':''} aria-label="Sell fewer ${card.name}">−</button><output data-dup-qty>${selected}</output><button class="qty-btn" data-dup-plus="${card.id}" ${selected>=extras?'disabled':''} aria-label="Sell more ${card.name}">＋</button></div><button class="tiny-btn primary-mini" data-sell-selected="${card.id}">Sell ${selected} · ${coins} ◉</button></div></div></article>`};body.innerHTML=`<div class="generic-card vault-intro"><p class="eyebrow">DUPLICATE VAULT</p><h3>${spares} spare card${spares===1?'':'s'} · ${value.toLocaleString()} coins available</h3><p class="muted">Use spare cards in duplicate-only SBCs, or sell a selected amount. One copy always remains in your binder.</p><div class="button-row"><button class="tiny-btn primary-mini" data-route="sbc">Use in SBCs</button></div></div>${cards.length?DUPLICATE_TYPE_ORDER.filter(type=>groups[type]?.length).map(type=>`<section class="collection-section duplicate-section"><div class="section-heading"><h2>${TYPE_META[type].label}</h2><span>${groups[type].reduce((n,card)=>n+save.cards[card.id].count-1,0)} spare</span></div><div class="duplicate-grid">${groups[type].map(duplicateCard).join('')}</div></section>`).join(''):'<div class="notice">No spare cards yet. Any card beyond your first copy will appear here automatically.</div>'}`;const paintSelection=id=>{const card=allPackableDefs().find(c=>c.id===id),extras=(save.cards[id]?.count||1)-1;if(!card||extras<1)return;duplicateSellSelections[id]=Math.max(1,Math.min(extras,duplicateSellSelections[id]||1));body.querySelectorAll('[data-duplicate-row]').forEach(row=>{if(row.dataset.duplicateRow!==id)return;const selected=duplicateSellSelections[id];row.querySelector('[data-dup-qty]').textContent=selected;const minus=row.querySelector('[data-dup-minus]'),plus=row.querySelector('[data-dup-plus]'),sell=row.querySelector('[data-sell-selected]');minus.disabled=selected<=1;plus.disabled=selected>=extras;sell.textContent=`Sell ${selected} · ${(selected*quickSellValue(card)).toLocaleString()} ◉`})};body.querySelectorAll('[data-dup-minus]').forEach(b=>b.onclick=()=>{duplicateSellSelections[b.dataset.dupMinus]=(duplicateSellSelections[b.dataset.dupMinus]||1)-1;paintSelection(b.dataset.dupMinus)});body.querySelectorAll('[data-dup-plus]').forEach(b=>b.onclick=()=>{duplicateSellSelections[b.dataset.dupPlus]=(duplicateSellSelections[b.dataset.dupPlus]||1)+1;paintSelection(b.dataset.dupPlus)});body.querySelectorAll('[data-sell-selected]').forEach(b=>b.onclick=()=>sellSelectedDuplicates(b.dataset.sellSelected,duplicateSellSelections[b.dataset.sellSelected]||1));
  } else if(tab==='discovery'){
    body.innerHTML=`<div class="generic-card"><h3>Discovery</h3><p class="muted">Cards are discovered when you pull them or when they appear among your Quick Draft choices. You do not need to select the card.</p></div><div class="binder-grid">${all.map(card=>save.discovered[card.id]?cardTile(card):`<div class="binder-item undiscovered"><div class="mystery-card">?</div><strong>Undiscovered</strong><small class="muted">???</small></div>`).join('')}</div>`;
  } else if(tab==='gallery'){
    const cards=save.gallery.map(id=>all.find(c=>c.id===id)).filter(Boolean);body.innerHTML=`<div class="generic-card"><h3>Your Gallery</h3><p class="muted">Gallery cards are protected from future SBCs. Add or remove them from Card Details.</p></div><div class="gallery-grid">${cards.length?cards.map(cardTile).join(''):'<div class="notice">Your gallery is empty. Open a card and choose Add to Gallery.</div>'}</div>`;
  } else if(tab==='recent') body.innerHTML=`<div class="binder-grid">${save.recent.length?save.recent.slice(0,50).map(cardTile).join(''):'<div class="notice">No pulls yet.</div>'}</div>`;
  else body.innerHTML=`<div class="binder-grid">${save.lastOpening.length?save.lastOpening.map(cardTile).join(''):'<div class="notice">No completed opening yet.</div>'}</div>`;
  bindCardClicks(body);
}
function sectionHTML(title,types){const defs=allPackableDefs().filter(c=>types.includes(c.type));return `<div class="collection-section"><div class="section-heading"><h2>${title}</h2><span>${defs.filter(c=>save.cards[c.id]?.count>0).length}/${defs.length}</span></div><div class="binder-grid">${defs.map(c=>save.cards[c.id]?.count>0?cardTile(c):`<div class="binder-item empty"><div class="empty-slot"></div><strong>Empty slot</strong><small class="muted">Not owned</small></div>`).join('')}</div></div>`}
function bindCardClicks(root){root.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>showCardDetails(b.dataset.card))}
function showCardDetails(id){const card=allPackableDefs().find(c=>c.id===id)||save.recent.find(c=>c.id===id);if(!card)return;const rec=save.cards[id]||{count:0,lifetime:0,history:[]},inGallery=save.gallery.includes(id);const c=page(card.name,TYPE_META[card.type].label.toUpperCase());c.innerHTML=`<div class="card-detail-layout">${cardHTML(card,true)}<div class="generic-card detail-panel"><h3>${TYPE_META[card.type].label}</h3><p>${card.club}${card.rookie?' · Rookie':''}</p><div class="list"><div class="list-row"><span>Owned</span><b>×${rec.count}</b></div><div class="list-row"><span>Lifetime pulled</span><b>${rec.lifetime}</b></div><div class="list-row"><span>Player rarity</span><b>${tierShort(card.tier)} · ${tierLabel(card.tier)}</b></div><div class="list-row"><span>Status</span><b>${save.discovered[id]?'Discovered':'Undiscovered'}</b></div></div><div class="button-row"><button class="primary" id="galleryToggle">${inGallery?'Remove from Gallery':'Add to Gallery'}</button><button class="ghost" data-route="collection">Back to Binder</button></div></div></div><div class="generic-card"><h3>Pull history</h3><div class="list">${rec.history.length?rec.history.slice(0,20).map((h,i)=>`<div class="list-row"><span>Copy #${rec.lifetime-i}</span><b>${h.source}</b></div>`).join(''):'<p class="muted">No owned copies yet.</p>'}</div></div>`;byId('galleryToggle').onclick=()=>{if(inGallery)save.gallery=save.gallery.filter(x=>x!==id);else save.gallery.push(id);persist();showCardDetails(id)};bindRoutes(c)}
const DRAFT_OBJECTIVES=[
  {id:'green2',name:'GREEN LIGHT',desc:'2 Green+ in your Starting 8',d:'easy',test:a=>a.filter(c=>TYPE_META[c.type].rank>=1).length>=2},
  {id:'rookie2',name:'THE FUTURE',desc:'2 Rookies in your Starting 8',d:'easy',test:a=>a.filter(c=>c.rookie).length>=2},
  {id:'scarce2',name:'SCARCE COMPANY',desc:'2 Scarce players',d:'easy',test:a=>a.filter(c=>c.tier==='scarce').length>=2},
  {id:'mix',name:'MIX IT UP',desc:'Common + Uncommon + Scarce',d:'easy',test:a=>['common','uncommon','scarce'].every(t=>a.some(c=>c.tier===t))},
  {id:'blue1',name:'SEEING BLUE',desc:'1 Blue+ card',d:'easy',test:a=>a.some(c=>TYPE_META[c.type].rank>=2)},
  {id:'rookie3',name:'ROOKIE CLASS',desc:'3 Rookies',d:'medium',test:a=>a.filter(c=>c.rookie).length>=3},
  {id:'scarce3',name:'TOP TIER',desc:'3 Scarce players',d:'medium',test:a=>a.filter(c=>c.tier==='scarce').length>=3},
  {id:'spectrum',name:'FULL SPECTRUM',desc:'2 Common + 2 Uncommon + 2 Scarce',d:'medium',test:a=>['common','uncommon','scarce'].every(t=>a.filter(c=>c.tier===t).length>=2)},
  {id:'doubleblue',name:'DOUBLE BLUE',desc:'2 Blue+ cards',d:'medium',test:a=>a.filter(c=>TYPE_META[c.type].rank>=2).length>=2},
  {id:'blues',name:'THE BLUES',desc:'Palmer + Estêvão',d:'medium',test:a=>['palmer','estevao'].every(id=>a.some(c=>c.playerId===id))},
  {id:'nextup',name:'NEXT UP',desc:'Yamal + Estêvão',d:'medium',test:a=>['yamal','estevao'].every(id=>a.some(c=>c.playerId===id))},
  {id:'engfuture',name:"ENGLAND'S FUTURE",desc:'Bellingham + Dowman',d:'medium',test:a=>['bellingham','dowman'].every(id=>a.some(c=>c.playerId===id))},
  {id:'colourclass',name:'COLOUR & CLASS',desc:'Blue+ Scarce player',d:'medium',test:a=>a.some(c=>c.tier==='scarce'&&TYPE_META[c.type].rank>=2)},
  {id:'allrookies',name:'ALL FOUR',desc:'All 4 Rookies',d:'hard',test:a=>['dowman','estevao','karl','yamal'].every(id=>a.some(c=>c.playerId===id))},
  {id:'scarce4',name:'SCARCE FOUR',desc:'All 4 Scarce players',d:'hard',test:a=>['messi','ronaldo','yamal','bellingham'].every(id=>a.some(c=>c.playerId===id))},
  {id:'goatscolour',name:'GOATS IN COLOUR',desc:'Messi + Ronaldo, one Blue+',d:'hard',test:a=>['messi','ronaldo'].every(id=>a.some(c=>c.playerId===id))&&a.some(c=>['messi','ronaldo'].includes(c.playerId)&&TYPE_META[c.type].rank>=2)},
  {id:'tripleblue',name:'TRIPLE BLUE',desc:'3 Blue+ cards',d:'hard',test:a=>a.filter(c=>TYPE_META[c.type].rank>=2).length>=3},
  {id:'apexmat',name:'APEX MATERIAL',desc:'1 APEX+ card',d:'hard',test:a=>a.some(c=>TYPE_META[c.type].rank>=3)},
  {id:'rare',name:'RARE COMPANY',desc:'1 Red+ card',d:'hard',test:a=>a.some(c=>TYPE_META[c.type].rank>=4)},
  {id:'bighit',name:'BIG HITTER',desc:'Any core Set Hit',d:'hard',test:a=>a.some(c=>['elevation','afterimage','frameless'].includes(c.type))},
  {id:'doubleapex',name:'DOUBLE TROUBLE',desc:'2 APEX+ cards',d:'hard',test:a=>a.filter(c=>TYPE_META[c.type].rank>=3).length>=2},
  {id:'ladder',name:'COLOUR LADDER',desc:'Green + Blue + APEX+ in the Starting 8',d:'hard',test:a=>a.some(c=>c.type==='green')&&a.some(c=>c.type==='blue')&&a.some(c=>TYPE_META[c.type].rank>=3)},
  {id:'youthcolour',name:'YOUTH IN COLOUR',desc:'3 Rookie cards at Green+',d:'hard',test:a=>a.filter(c=>c.rookie&&TYPE_META[c.type].rank>=1).length>=3},
  {id:'topheavy',name:'TOP HEAVY',desc:'3 Scarce + 2 Blue+',d:'hard',test:a=>a.filter(c=>c.tier==='scarce').length>=3&&a.filter(c=>TYPE_META[c.type].rank>=2).length>=2}
];
function draftType(){const r=Math.random()*100;if(r<68)return'base';if(r<86)return'green';if(r<96)return'blue';if(r<98)return'apex';if(r<99)return'red';if(r<99.8){const x=Math.random()*100;return x<66?'elevation':x<91?'afterimage':'frameless'}if(r<99.95)return'onlyone';return Math.random()<.1?'theapex':'base'}
function draftCard(type,exclude=[]){
  if(type==='theapex'){
    if(exclude.includes('zidane')) return draftCard('base',exclude);
    return makeCard('theapex','zidane',{name:'Zinedine Zidane',club:'THE APEX'});
  }
  if(type==='onlyone')return makeCard('onlyone',pickPlayer(exclude).id); // Draft never removes Only Ones from circulation.
  if(CORE_HITS[type]){
    const eligible=CORE_HITS[type].filter(id=>!exclude.includes(id));
    if(!eligible.length)return draftCard('base',exclude);
    return makeCard(type,eligible[Math.floor(Math.random()*eligible.length)]);
  }
  return makeCard(type,pickPlayer(exclude).id);
}
function makeDraftObjectives(){
  const take=(d,n)=>DRAFT_OBJECTIVES.filter(o=>o.d===d).sort(()=>Math.random()-.5).slice(0,n);
  return [...take('easy',1),...take('medium',1),...take('hard',3)].sort(()=>Math.random()-.5);
}
function startDraft(){draftSession={slots:Array(12).fill(null),objectives:makeDraftObjectives(),pick:0,target:null,options:[],rerolled:false,rerollsUsed:0,superSub:false,swapFrom:null};renderDraftBoard()}
function activeDraftCards(){return draftSession?draftSession.slots.slice(0,8).filter(Boolean):[]}
function draftObjectiveState(){const a=activeDraftCards();return draftSession.objectives.map(o=>({...o,done:o.test(a)}))}
function generateDraftOptions(){
  const selected=new Set(draftSession.slots.filter(Boolean).map(c=>c.playerId));
  let opts=[];
  // Every selection must show three different players. Versions may vary, players may not.
  for(let i=0;i<3;i++){
    let card=null,tries=0;
    const optionPlayers=opts.map(c=>c.playerId);
    do{
      card=draftCard(draftType(),optionPlayers);
      tries++;
    }while(optionPlayers.includes(card.playerId)&&tries<100);
    opts.push(card);
  }
  // Previously drafted players may block slots, but never allow all three options to be blocked.
  if(opts.every(c=>selected.has(c.playerId))){
    const free=PLAYERS.filter(p=>!selected.has(p.id)&&!opts.some(c=>c.playerId===p.id));
    if(free.length){
      const replace=Math.floor(Math.random()*3);
      opts[replace]=makeCard('base',weighted(free,p=>WEIGHTS[p.tier]).id);
    }
  }
  return opts;
}
function renderDraft(){
  if(save.pendingDraftReward){if(save.pendingDraftReward.claimed){save.pendingDraftReward=null;persist()}else return renderDraftResult()}
  if(draftSession)return renderDraftBoard();
  const c=page('Quick Draft','PLAY');c.innerHTML=`<div class="draft-intro generic-card"><h3>12 picks · build your best 8</h3><p class="muted">Pick any empty Starting or Bench slot first, then choose 1 of 3 cards. Only your Starting 8 score the five live objectives. Every card you encounter becomes Discovered, but never Owned.</p><button class="primary" id="startDraft">Start Quick Draft</button></div><div class="stat-grid"><div class="stat-item"><span class="qty">${save.stats.draftStars}</span><p>Draft Stars</p></div><div class="stat-item"><span class="qty">${save.stats.perfectDrafts}</span><p>Perfect Drafts</p></div></div>`;byId('startDraft').onclick=startDraft;
}
function renderDraftBoard(){
  const c=page('Quick Draft',`PICK ${Math.min(draftSession.pick+1,12)} / 12`),states=draftObjectiveState();
  c.innerHTML=`<div class="draft-layout"><div><div class="draft-board"><h3>Starting 8</h3><div class="draft-slots starters">${draftSession.slots.slice(0,8).map((x,i)=>draftSlotHTML(x,i)).join('')}</div><h3>Bench</h3><div class="draft-slots bench">${draftSession.slots.slice(8).map((x,i)=>draftSlotHTML(x,i+8)).join('')}</div></div><div class="generic-card draft-help"><b>${draftSession.pick<12?'Choose any empty slot to make your next pick.':'All 12 picks complete — arrange your final 8, then finalise.'}</b><p class="muted">Occupied cards can only swap with other occupied cards. They cannot move into an empty slot.</p><div class="rarity-guide compact"><span class="tier-pill tier-common"><b>C</b> Common</span><span class="tier-pill tier-uncommon"><b>U</b> Uncommon</span><span class="tier-pill tier-scarce"><b>S</b> Scarce</span></div>${draftSession.pick>=12?'<button class="primary" id="finaliseDraft">Finalise Draft</button>':''}</div></div><aside class="draft-objectives"><p class="eyebrow">LIVE OBJECTIVES</p>${states.map(rushObjectiveHTML).join('')}<div class="draft-star-total">${states.filter(o=>o.done).length} / 5 ★</div></aside></div>`;
  c.querySelectorAll('[data-dslot]').forEach(b=>b.onclick=()=>draftSlotClick(+b.dataset.dslot));if(byId('finaliseDraft'))byId('finaliseDraft').onclick=finishDraft;
}
function draftSlotHTML(card,i){return `<button class="draft-slot ${card?'filled':'empty'} ${draftSession.swapFrom===i?'swap-selected':''}" data-dslot="${i}">${card?`${cardHTML(card)}${tierPill(card,'draft-slot-tier')}`:`<span>+</span><small>${i<8?'STARTER':'BENCH'} ${i<8?i+1:i-7}</small>`}</button>`}
function draftSlotClick(i){
  const card=draftSession.slots[i];
  // If a drafted card is selected for a swap, an empty slot is NEVER a valid destination.
  if(!card&&draftSession.swapFrom!==null){
    const m=modal(`<p class="eyebrow">INVALID SWAP</p><h3>You can't move into an empty slot</h3><p class="muted">Draft a player into this slot first. You can only swap two occupied slots.</p><button class="primary" id="invalidSwapOk">Got it</button>`);
    m.querySelector('#invalidSwapOk').onclick=()=>m.remove();
    return;
  }
  if(!card){if(draftSession.pick>=12)return;draftSession.target=i;draftSession.options=generateDraftOptions();draftSession.rerolled=false;return renderDraftChoice()}
  if(draftSession.swapFrom===null){draftSession.swapFrom=i;return renderDraftBoard()}
  if(draftSession.swapFrom===i){draftSession.swapFrom=null;return renderDraftBoard()}
  const a=draftSession.swapFrom,before=draftObjectiveState().filter(o=>o.done).length,crossesBench=(a<8)!==(i<8);[draftSession.slots[a],draftSession.slots[i]]=[draftSession.slots[i],draftSession.slots[a]];const after=draftObjectiveState().filter(o=>o.done).length;if(crossesBench&&before<5&&after===5)draftSession.superSub=true;draftSession.swapFrom=null;renderDraftBoard();
}
function renderDraftChoice(){
  const selected=new Set(draftSession.slots.filter(Boolean).map(c=>c.playerId)),newlyDiscovered=new Set();
  for(const card of draftSession.options){if(!save.discovered[card.id]){save.discovered[card.id]=true;newlyDiscovered.add(card.id)}}
  if(newlyDiscovered.size)persist();
  const c=page('Choose Your Card',`PICK ${draftSession.pick+1} / 12 · SLOT ${draftSession.target+1}`);
  c.innerHTML=`<div class="generic-card"><p class="muted">All three choices are now Discovered. Select one to fill the slot you chose.</p></div><div class="draft-choices">${draftSession.options.map((card,i)=>`<button class="draft-choice ${selected.has(card.playerId)?'blocked':''}" data-choice="${i}" ${selected.has(card.playerId)?'disabled':''}>${newlyDiscovered.has(card.id)?'<span class="draft-new-label">NEW</span>':''}${cardHTML(card,true)}${tierPill(card,'draft-choice-tier')}<strong>${selected.has(card.playerId)?'🔒 ALREADY DRAFTED':'SELECT'}</strong></button>`).join('')}</div><div class="button-row draft-choice-actions"><button class="ghost" id="draftReroll" ${draftSession.rerolled?'disabled':''}>↻ ${draftSession.rerolled?'Reroll used':'Reroll choices'}</button><button class="ghost" id="draftShowObj">★ Show objectives</button></div>`;
  c.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>selectDraftCard(+b.dataset.choice));
  byId('draftShowObj').onclick=()=>{
    const states=draftObjectiveState();
    const m=modal(`<p class="eyebrow">DRAFT OBJECTIVES</p><h3>${states.filter(o=>o.done).length} / 5 complete</h3><div class="list">${states.map(o=>`<div class="list-row"><span>${o.done?'★':'○'} ${o.name}</span><b>${o.desc}</b></div>`).join('')}</div><button class="primary" id="closeDraftObj">Back to pick</button>`);
    m.querySelector('#closeDraftObj').onclick=()=>m.remove();
  };
  byId('draftReroll').onclick=()=>{if(draftSession.rerolled)return;draftSession.rerolled=true;draftSession.rerollsUsed=(draftSession.rerollsUsed||0)+1;draftSession.options=generateDraftOptions();renderDraftChoice()};
}
function selectDraftCard(i){const card=draftSession.options[i];if(!card)return;draftSession.slots[draftSession.target]=card;save.discovered[card.id]=true;draftSession.pick++;draftSession.target=null;draftSession.options=[];persist();renderDraftBoard()}
function finishDraft(){
  const stars=draftObjectiveState().filter(o=>o.done).length;if(draftSession.slots.some(x=>!x))return;
  const rewards={0:{coins:0,packs:0},1:{coins:150,packs:0},2:{coins:100,packs:1},3:{coins:0,packs:2},4:{coins:200,packs:2},5:{coins:300,packs:4}}[stars];
  save.stats.draftsPlayed++;save.stats.draftStars+=stars;if(stars===5){save.stats.perfectDrafts++;if(!(draftSession.rerollsUsed||0))unlockHidden('noreroll');if(draftSession.superSub)unlockHidden('supersub')}
  const final8=draftSession.slots.slice(0,8);const objectives=draftObjectiveState();
  save.pendingDraftReward={stars,rewards,final8,objectives,claimed:false};draftSession=null;persist();updateChrome();renderDraftResult();
}
function renderDraftResult(){
  const result=save.pendingDraftReward;if(!result)return navigate('draft');const {stars,rewards,final8,objectives}=result;
  const rewardText=`${rewards.packs?`${rewards.packs} Normal Pack${rewards.packs>1?'s':''}${rewards.coins?' + ':''}`:''}${rewards.coins?`${rewards.coins} coins`:''}${!rewards.packs&&!rewards.coins?'no reward':''}`;
  const c=page('Draft Complete','QUICK DRAFT');c.innerHTML=`<div class="draft-result generic-card"><div class="draft-result-stars">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div><h2>${stars===5?'PERFECT DRAFT':`${stars} STAR DRAFT`}</h2><p>Your reward is <b>${rewardText}</b>.</p><div class="button-row">${!result.claimed?'<button class="primary" id="claimDraftReward">Claim Rewards</button>':'<button class="primary" data-route="draft">← Back to Quick Draft</button>'}</div>${result.claimed?'<p class="muted">Reward claimed · packs sent to your Sealed Inventory.</p>':''}</div><div class="draft-slots result-eight">${final8.map(x=>`<div class="draft-slot filled">${cardHTML(x)}${tierPill(x,'draft-slot-tier')}</div>`).join('')}</div><div class="generic-card"><h3>Objectives</h3>${objectives.map(o=>`<div class="list-row"><span>${o.done?'★':'○'} ${o.name}</span><b>${o.done?'Complete':'Missed'}</b></div>`).join('')}</div>`;
  if(byId('claimDraftReward'))byId('claimDraftReward').onclick=claimDraftReward;bindRoutes(c);
}
function claimDraftReward(){
  const result=save.pendingDraftReward;if(!result||result.claimed)return;save.coins+=result.rewards.coins;save.stats.coinsEarned+=result.rewards.coins;save.inventory.normal+=result.rewards.packs;result.claimed=true;persist();updateChrome();
  const text=`${result.rewards.packs?`${result.rewards.packs} Normal Pack${result.rewards.packs>1?'s':''}${result.rewards.coins?' + ':''}`:''}${result.rewards.coins?`${result.rewards.coins} coins`:''}`;
  const m=modal(`<p class="eyebrow">DRAFT REWARD CLAIMED</p><h3>${result.stars}★ reward added</h3><p><b>${text}</b></p><p class="muted">Any packs have been sent to your Sealed Inventory. Stack them for later or open them whenever you like.</p><button class="primary" id="draftRewardDone">Done</button>`);m.querySelector('#draftRewardDone').onclick=()=>{m.remove();renderDraftResult()};
}

const RUSH_OBJECTIVES=[
  // Tier 1 — objectives that should normally fall during the first half of a Rush.
  {id:'green4',name:'GREEN MACHINE',desc:'Pack 4 Green Parallels',tier:1,tags:['green','parallel'],test:r=>r.filter(c=>c.type==='green').length>=4},
  {id:'rookie3',name:'THE FUTURE',desc:'Pack 3 different Rookies',tier:1,tags:['rookie','player'],test:r=>new Set(r.filter(c=>c.rookie).map(c=>c.playerId)).size>=3},
  {id:'scarce4',name:'STAR POWER',desc:'Pack 4 Scarce-player cards',tier:1,tags:['scarce','player'],test:r=>r.filter(c=>c.tier==='scarce').length>=4},
  {id:'blue2',name:'SEEING BLUE',desc:'Pack 2 Blue Parallels',tier:1,tags:['blue','parallel'],test:r=>r.filter(c=>c.type==='blue').length>=2},
  {id:'chelsea2',name:'THE BLUES',desc:'Pack 2 different Chelsea players',tier:1,tags:['chelsea','player'],test:r=>new Set(r.filter(c=>c.club==='Chelsea FC').map(c=>c.playerId)).size>=2},

  // Tier 2 — middle-distance objectives designed to stay live into packs 5–8.
  {id:'parallel6',name:'COLOUR RUSH',desc:'Pack 6 total Parallels',tier:2,tags:['parallel','count'],test:r=>r.filter(c=>['green','blue','apex','red'].includes(c.type)).length>=6},
  {id:'parallelPlayers4',name:'COLOUR CREW',desc:'Pack Parallels of 4 different players',tier:2,tags:['parallel','player'],test:r=>new Set(r.filter(c=>['green','blue','apex','red'].includes(c.type)).map(c=>c.playerId)).size>=4},
  {id:'blue3',name:'BLUE WAVE',desc:'Pack 3 Blue Parallels',tier:2,tags:['blue','parallel'],test:r=>r.filter(c=>c.type==='blue').length>=3},
  {id:'rookiePar2',name:'ROOKIE COLOUR',desc:'Pack 2 different Rookie Parallels',tier:2,tags:['rookie','parallel'],test:r=>new Set(r.filter(c=>c.rookie&&['green','blue','apex','red'].includes(c.type)).map(c=>c.playerId)).size>=2},
  {id:'scarcePar2',name:'SCARCE COLOUR',desc:'Pack 2 different Scarce-player Parallels',tier:2,tags:['scarce','parallel'],test:r=>new Set(r.filter(c=>c.tier==='scarce'&&['green','blue','apex','red'].includes(c.type)).map(c=>c.playerId)).size>=2},
  {id:'gba',name:'COLOUR CLIMB',desc:'Pack a Green, Blue and APEX Parallel',tier:2,tags:['rainbow','parallel'],test:r=>['green','blue','apex'].every(t=>r.some(c=>c.type===t))},
  {id:'tierRainbow',name:'ALL WALKS',desc:'Pack Parallels featuring Common, Uncommon and Scarce players',tier:2,tags:['scarcity','parallel'],test:r=>['common','uncommon','scarce'].every(t=>r.some(c=>c.tier===t&&['green','blue','apex','red'].includes(c.type)))},
  {id:'royalPair',name:'ROYAL PAIR',desc:'Pack Vinícius Jr. and Jude Bellingham',tier:2,tags:['pair','realmadrid'],test:r=>r.some(c=>c.playerId==='vini')&&r.some(c=>c.playerId==='bellingham')},
  {id:'chelseaFuture',name:'CHELSEA FUTURE',desc:'Pack Estêvão and Cole Palmer',tier:2,tags:['pair','chelsea'],test:r=>r.some(c=>c.playerId==='estevao')&&r.some(c=>c.playerId==='palmer')},

  // Tier 3 — hard objectives. These should usually be the last normal objective to fall.
  {id:'apex2',name:'DOUBLE APEX',desc:'Pack 2 APEX Parallels',tier:3,tags:['apex','parallel'],test:r=>r.filter(c=>c.type==='apex').length>=2},
  {id:'parallelPlayers5',name:'FIVE ALIVE',desc:'Pack Parallels of 5 different players',tier:3,tags:['parallel','player'],test:r=>new Set(r.filter(c=>['green','blue','apex','red'].includes(c.type)).map(c=>c.playerId)).size>=5},
  {id:'rookiePar3',name:'YOUTH IN COLOUR',desc:'Pack 3 different Rookie Parallels',tier:3,tags:['rookie','parallel'],test:r=>new Set(r.filter(c=>c.rookie&&['green','blue','apex','red'].includes(c.type)).map(c=>c.playerId)).size>=3},
  {id:'scarcePar3',name:'RARE COLOUR',desc:'Pack 3 different Scarce-player Parallels',tier:3,tags:['scarce','parallel'],test:r=>new Set(r.filter(c=>c.tier==='scarce'&&['green','blue','apex','red'].includes(c.type)).map(c=>c.playerId)).size>=3},
  {id:'blueChelsea',name:'BLUE BLOOD',desc:'Pack a Blue Chelsea player',tier:3,tags:['blue','chelsea'],test:r=>r.some(c=>c.type==='blue'&&c.club==='Chelsea FC')},
  {id:'blueScarce2',name:'SCARCE IN BLUE',desc:'Pack 2 different Scarce players as Blue+',tier:3,tags:['blue','scarce'],test:r=>new Set(r.filter(c=>c.tier==='scarce'&&['blue','apex','red'].includes(c.type)).map(c=>c.playerId)).size>=2},
  {id:'apexPlus2',name:'APEX MATERIAL',desc:'Pack 2 different APEX+ players',tier:3,tags:['apex','high'],test:r=>new Set(r.filter(c=>['apex','red','elevation','afterimage','frameless','onlyone','theapex'].includes(c.type)).map(c=>c.playerId)).size>=2},
  {id:'gbar',name:'FULL RAINBOW',desc:'Pack Green, Blue, APEX and Red Parallels',tier:3,tags:['rainbow','red'],test:r=>['green','blue','apex','red'].every(t=>r.some(c=>c.type===t))},
  {id:'red1',name:'SEEING RED',desc:'Pack a Red Parallel',tier:3,tags:['red','parallel'],test:r=>r.some(c=>c.type==='red')},
  {id:'goats',name:'GOAT HUNT',desc:'Pack Lionel Messi and Cristiano Ronaldo',tier:3,tags:['pair','scarce'],test:r=>r.some(c=>c.playerId==='messi')&&r.some(c=>c.playerId==='ronaldo')},
  {id:'rookieTrio',name:'ROOKIE TRIO',desc:'Pack Max Dowman, Lamine Yamal and Lennart Karl',tier:3,tags:['trio','rookie'],test:r=>['dowman','yamal','karl'].every(id=>r.some(c=>c.playerId===id))},

  // Tier 4 — jackpot objectives. Only a minority of Rushes receive one of these.
  {id:'sethit',name:'BIG HITTER',desc:'Pack any Set Hit',tier:4,tags:['sethit','jackpot'],test:r=>r.some(c=>['elevation','afterimage','frameless'].includes(c.type))},
  {id:'red2',name:'DOUBLE RED',desc:'Pack 2 Red Parallels',tier:4,tags:['red','jackpot'],test:r=>r.filter(c=>c.type==='red').length>=2},
  {id:'scarceHit',name:'STAR HIT',desc:'Pack a Set Hit featuring a Scarce player',tier:4,tags:['sethit','scarce'],test:r=>r.some(c=>['elevation','afterimage','frameless'].includes(c.type)&&c.tier==='scarce')},
  {id:'redPlayers2',name:'RED PAIR',desc:'Pack Red Parallels of 2 different players',tier:4,tags:['red','player'],test:r=>new Set(r.filter(c=>c.type==='red').map(c=>c.playerId)).size>=2}
];
function rushObjectives(){
  const patterns=[
    {tiers:[1,2,2,3],weight:60},
    {tiers:[1,1,2,3],weight:20},
    {tiers:[1,2,2,4],weight:15},
    {tiers:[2,2,3,3],weight:5}
  ];
  let roll=Math.random()*100,pattern=patterns[0].tiers;
  for(const p of patterns){roll-=p.weight;if(roll<=0){pattern=p.tiers;break}}
  const chosen=[];
  const overlapScore=(candidate)=>chosen.reduce((n,o)=>n+candidate.tags.filter(t=>o.tags.includes(t)).length,0);
  for(const tier of pattern){
    let pool=RUSH_OBJECTIVES.filter(o=>o.tier===tier&&!chosen.some(c=>c.id===o.id));
    // Prefer variety: avoid boards where every objective is simply another colour-count task.
    const clean=pool.filter(o=>overlapScore(o)<=1);
    if(clean.length)pool=clean;
    chosen.push(pool[Math.floor(Math.random()*pool.length)]);
  }
  return chosen.sort(()=>Math.random()-.5).map(o=>({...o}));
}
function rollRushSlot2(){const r=Math.random()*100;return r<30?'green':r<45?'blue':r<50?'apex':'base'}
function rollRushSlot3(){const r=Math.random()*100;if(r<12)return'green';if(r<19)return'blue';if(r<22.5)return'apex';if(r<24.5)return'red';if(r<26.06)return'elevation';if(r<26.59)return'afterimage';if(r<26.80)return'frameless';if(r<26.98)return'onlyone';if(r<27.00)return'theapex';return'base'}
function generateRushPack(){
  const used=[];const c1=makeByType('base',used);used.push(c1.playerId);
  let c2=makeByType(rollRushSlot2(),used);if(used.includes(c2.playerId))c2=makeByType('base',used);used.push(c2.playerId);
  const t3=rollRushSlot3();let c3;
  if(t3==='onlyone'){const p=weighted(PLAYERS,x=>WEIGHTS[x.tier]);c3=makeCard('onlyone',p.id)}
  else c3=makeByType(t3,used);
  if(used.includes(c3.playerId)&&!['elevation','afterimage','frameless'].includes(t3))c3=makeByType('base',used);
  return[c1,c2,c3];
}
function rushProgress(o,r){
  const parallels=c=>['green','blue','apex','red'].includes(c.type);
  const sethits=c=>['elevation','afterimage','frameless'].includes(c.type);
  const unique=(arr,key='playerId')=>new Set(arr.map(c=>c[key])).size;
  const simple={green4:[r.filter(c=>c.type==='green').length,4],scarce4:[r.filter(c=>c.tier==='scarce').length,4],blue2:[r.filter(c=>c.type==='blue').length,2],parallel6:[r.filter(parallels).length,6],blue3:[r.filter(c=>c.type==='blue').length,3],apex2:[r.filter(c=>c.type==='apex').length,2],red1:[r.filter(c=>c.type==='red').length,1],red2:[r.filter(c=>c.type==='red').length,2],sethit:[r.filter(sethits).length,1]};
  if(simple[o.id]){const [n,t]=simple[o.id];return {text:`${Math.min(n,t)} / ${t}`,value:Math.min(n,t),target:t}}
  const uniques={rookie3:[r.filter(c=>c.rookie),3],chelsea2:[r.filter(c=>c.club==='Chelsea FC'),2],parallelPlayers4:[r.filter(parallels),4],rookiePar2:[r.filter(c=>c.rookie&&parallels(c)),2],scarcePar2:[r.filter(c=>c.tier==='scarce'&&parallels(c)),2],parallelPlayers5:[r.filter(parallels),5],rookiePar3:[r.filter(c=>c.rookie&&parallels(c)),3],scarcePar3:[r.filter(c=>c.tier==='scarce'&&parallels(c)),3],blueScarce2:[r.filter(c=>c.tier==='scarce'&&['blue','apex','red'].includes(c.type)),2],apexPlus2:[r.filter(c=>['apex','red','elevation','afterimage','frameless','onlyone','theapex'].includes(c.type)),2],redPlayers2:[r.filter(c=>c.type==='red'),2]};
  if(uniques[o.id]){const [arr,t]=uniques[o.id],n=unique(arr);return {text:`${Math.min(n,t)} / ${t}`,value:Math.min(n,t),target:t}}
  const pieces={
    gba:[['Green',r.some(c=>c.type==='green')],['Blue',r.some(c=>c.type==='blue')],['APEX',r.some(c=>c.type==='apex')]],
    gbar:[['Green',r.some(c=>c.type==='green')],['Blue',r.some(c=>c.type==='blue')],['APEX',r.some(c=>c.type==='apex')],['Red',r.some(c=>c.type==='red')]],
    tierRainbow:[['Common',r.some(c=>c.tier==='common'&&parallels(c))],['Uncommon',r.some(c=>c.tier==='uncommon'&&parallels(c))],['Scarce',r.some(c=>c.tier==='scarce'&&parallels(c))]],
    royalPair:[['Vinícius',r.some(c=>c.playerId==='vini')],['Bellingham',r.some(c=>c.playerId==='bellingham')]],
    chelseaFuture:[['Estêvão',r.some(c=>c.playerId==='estevao')],['Palmer',r.some(c=>c.playerId==='palmer')]],
    goats:[['Messi',r.some(c=>c.playerId==='messi')],['Ronaldo',r.some(c=>c.playerId==='ronaldo')]],
    rookieTrio:[['Dowman',r.some(c=>c.playerId==='dowman')],['Yamal',r.some(c=>c.playerId==='yamal')],['Karl',r.some(c=>c.playerId==='karl')]]
  };
  if(pieces[o.id]){const a=pieces[o.id],n=a.filter(x=>x[1]).length;return {text:a.map(([x,ok])=>`${x} ${ok?'✓':'○'}`).join(' · '),value:n,target:a.length}}
  if(o.id==='blueChelsea')return {text:r.some(c=>c.type==='blue'&&c.club==='Chelsea FC')?'Found ✓':'Still hunting',value:r.some(c=>c.type==='blue'&&c.club==='Chelsea FC')?1:0,target:1};
  if(o.id==='scarceHit')return {text:r.some(c=>sethits(c)&&c.tier==='scarce')?'Found ✓':'Still hunting',value:r.some(c=>sethits(c)&&c.tier==='scarce')?1:0,target:1};
  return {text:o.test(r)?'Complete ✓':'Still hunting',value:o.test(r)?1:0,target:1};
}
function rushState(){return rushSession.objectives.map(o=>{const progress=rushProgress(o,rushSession.seen);return {...o,progress,done:o.test(rushSession.seen)}})}
function rushObjectiveHTML(o){const pulse=rushSession?.progressedIds?.includes(o.id)?' progressed':'',progress=o.progress?`<small class="rush-progress">${o.progress.text}</small>`:'';return `<div class="draft-objective ${o.done?'done':''}${pulse}"><span>${o.done?'★':'○'}</span><div><b>${o.name}</b><small>${o.desc}</small>${progress}</div></div>`}
function renderRush(){
  if(save.pendingRushReward&&!save.pendingRushReward.claimed)return renderRushResult();
  if(rushSession)return renderRushPlay();
  const c=page('Pack Rush','PLAY');c.innerHTML=`<div class="generic-card"><h3>10 packs · 4 objectives · 4★ maximum</h3><p class="muted">A fast objective chase using separate Pack Rush packs. Cards seen here are not Owned or Discovered and do not count towards normal pack stats.</p><button class="primary" id="startRush">Start Pack Rush</button></div><div class="stat-grid"><div class="stat-item"><span class="qty">${save.stats.rushesPlayed}</span><p>Rushes Played</p></div><div class="stat-item"><span class="qty">${save.stats.perfectRushes}</span><p>Perfect Rushes</p></div><div class="stat-item"><span class="qty">${save.stats.rushBest}★</span><p>Best Rush</p></div><div class="stat-item"><span class="qty">${save.stats.rushLongestStreak}</span><p>Longest 4★ Streak</p></div></div><div class="generic-card"><h3>Rewards</h3><div class="list-row"><span>★</span><b>50 coins</b></div><div class="list-row"><span>★★</span><b>100 coins</b></div><div class="list-row"><span>★★★</span><b>150 coins</b></div><div class="list-row"><span>★★★★</span><b>1 Normal Pack + 200 coins</b></div></div>`;byId('startRush').onclick=startRush;
}
function startRush(){rushSession={objectives:rushObjectives(),seen:[],pack:0,current:null,revealed:false,progressedIds:[]};renderRushPlay()}
function renderRushPlay(){
  if(rushSession.pack>=10)return finishRush();
  if(!rushSession.current)rushSession.current=generateRushPack();const states=rushState(),c=page('Pack Rush',`PACK ${rushSession.pack+1} / 10`);
  c.innerHTML=`<div class="rush-layout"><div><div class="generic-card rush-pack"><p class="eyebrow">PACK ${rushSession.pack+1} OF 10</p><h3>${rushSession.revealed?'Pack revealed':'Click to reveal all 3 cards'}</h3><div class="rush-cards ${rushSession.revealed?'revealed':''}">${rushSession.current.map(card=>rushSession.revealed?`<div class="rush-card">${cardHTML(card)}${tierPill(card,'rush-tier')}</div>`:`<div class="rush-back"><span class="brand-a">◇a</span><b>APEX</b></div>`).join('')}</div><div class="button-row">${rushSession.revealed?'<button class="primary" id="rushNext">Next Pack</button>':'<button class="primary" id="rushReveal">Reveal Pack</button>'}<button class="ghost" id="rushShowObj">★ Show Objectives</button></div></div></div><aside class="draft-objectives"><p class="eyebrow">PACK RUSH OBJECTIVES</p>${states.map(rushObjectiveHTML).join('')}<div class="draft-star-total">${states.filter(o=>o.done).length} / 4 ★</div></aside></div>`;
  if(byId('rushReveal'))byId('rushReveal').onclick=()=>{const beforeState=rushState(),before=Object.fromEntries(beforeState.map(o=>[o.id,o.progress.value])),beforeStars=beforeState.filter(o=>o.done).length;rushSession.revealed=true;rushSession.seen.push(...rushSession.current);const after=rushState(),afterStars=after.filter(o=>o.done).length;if(rushSession.pack===9&&beforeStars<4&&afterStars===4)unlockHidden('timing');rushSession.progressedIds=after.filter(o=>o.progress.value>before[o.id]).map(o=>o.id);save.stats.rushPacksOpened++;persist();renderRushPlay();setTimeout(()=>{if(rushSession){rushSession.progressedIds=[];document.querySelectorAll('.draft-objective.progressed').forEach(el=>el.classList.remove('progressed'))}},900)};
  if(byId('rushNext'))byId('rushNext').onclick=()=>{rushSession.pack++;rushSession.current=null;rushSession.revealed=false;rushSession.progressedIds=[];renderRushPlay()};
  byId('rushShowObj').onclick=()=>{const st=rushState(),m=modal(`<p class="eyebrow">PACK RUSH OBJECTIVES</p><h3>${st.filter(o=>o.done).length} / 4 complete</h3>${st.map(o=>`<div class="list-row"><span>${o.done?'★':'○'} ${o.name}<small class="rush-modal-progress">${o.progress.text}</small></span><b>${o.desc}</b></div>`).join('')}<button class="primary" id="closeRushObj">Back to Rush</button>`);m.querySelector('#closeRushObj').onclick=()=>m.remove()};
}
function finishRush(){
  const objectives=rushState(),stars=objectives.filter(o=>o.done).length,rewards={0:{coins:0,packs:0},1:{coins:50,packs:0},2:{coins:100,packs:0},3:{coins:150,packs:0},4:{coins:200,packs:1}}[stars];
  save.stats.rushesPlayed++;save.stats.rushBest=Math.max(save.stats.rushBest,stars);if(stars===4){save.stats.perfectRushes++;save.stats.rushPerfectStreak++;save.stats.rushLongestStreak=Math.max(save.stats.rushLongestStreak,save.stats.rushPerfectStreak)}else save.stats.rushPerfectStreak=0;
  save.pendingRushReward={stars,rewards,objectives,claimed:false};rushSession=null;persist();updateChrome();renderRushResult();
}
function renderRushResult(){
  const r=save.pendingRushReward;if(!r)return renderRush();const rewardText=`${r.rewards.packs?'1 Normal Pack + ':''}${r.rewards.coins} coins`;
  const c=page('Rush Complete','PACK RUSH');c.innerHTML=`<div class="draft-result generic-card"><div class="draft-result-stars">${'★'.repeat(r.stars)}${'☆'.repeat(4-r.stars)}</div><h2>${r.stars===4?'PERFECT RUSH':`${r.stars} STAR RUSH`}</h2><p>Reward: <b>${rewardText}</b></p><div class="button-row">${!r.claimed?'<button class="primary" id="claimRushReward">Claim Reward</button>':'<button class="primary" data-route="rush">← Back to Pack Rush</button>'}</div>${r.claimed?'<p class="muted">Reward claimed · any pack has been sent to Sealed Inventory.</p>':''}</div><div class="generic-card"><h3>Objectives</h3>${r.objectives.map(o=>`<div class="list-row"><span>${o.done?'★':'○'} ${o.name}</span><b>${o.done?'Complete':'Missed'}</b></div>`).join('')}</div>`;
  if(byId('claimRushReward'))byId('claimRushReward').onclick=claimRushReward;bindRoutes(c)
}
function claimRushReward(){const r=save.pendingRushReward;if(!r||r.claimed)return;save.coins+=r.rewards.coins;save.stats.coinsEarned+=r.rewards.coins;save.inventory.normal+=r.rewards.packs;r.claimed=true;persist();updateChrome();const m=modal(`<p class="eyebrow">PACK RUSH REWARD CLAIMED</p><h3>${r.stars}★ reward added</h3><p><b>${r.rewards.packs?'1 Normal Pack + ':''}${r.rewards.coins} coins</b></p><p class="muted">Any pack has been sent to your Sealed Inventory.</p><button class="primary" id="rushRewardDone">Done</button>`);m.querySelector('#rushRewardDone').onclick=()=>{m.remove();renderRushResult()}}

const SBCS=[
{id:'welcome_exchange',cat:'Welcome',name:'First Exchange',desc:'Learn the basics with any 3 Debut Edition cards.',segments:[{id:'exchange',name:'First Exchange',slots:3,req:{},reward:{coins:100}}],groupReward:{packs:{normal:1}}},
{id:'welcome_colour',cat:'Welcome',name:'A Touch of Colour',desc:'Use a parallel in a simple 4-card squad.',segments:[{id:'colour',name:'Going Green',slots:4,req:{greenPlus:1},reward:{coins:125}}],groupReward:{packs:{normal:1}}},
{id:'welcome_scarcity',cat:'Welcome',name:'Know Your Players',desc:'Build around the player scarcity system.',segments:[{id:'scarcity',name:'Scarcity Lesson',slots:4,req:{uncommon:1,scarce:1},reward:{coins:150}}],groupReward:{packs:{normal:1},coins:100}},
{id:'upgrade_duplicates',cat:'Upgrades',name:'Duplicate Upgrade',desc:'Repeatable duplicate sink. All submitted cards must have another owned copy.',repeatable:true,segments:[{id:'dupes',name:'Duplicate Exchange',slots:5,req:{duplicates:true},reward:{packs:{normal:1}}}],groupReward:{coins:50}},
{id:'upgrade_colour',cat:'Upgrades',name:'Colour Upgrade',desc:'Trade spare colour for a Plus Pack.',repeatable:true,segments:[{id:'colourup',name:'Colour Exchange',slots:5,req:{greenPlus:2},reward:{packs:{plus:1}}}],groupReward:{coins:75}},
{id:'debut_rising',cat:'Debut Edition',name:'Rising Through APEX',desc:'Two Debut Edition segments with individual rewards.',segments:[{id:'foundation',name:'Foundation',slots:5,req:{uncommon:2,greenPlus:1},reward:{packs:{normal:1},coins:100}},{id:'stepup',name:'Step Up',slots:6,req:{scarce:1,bluePlus:1},reward:{packs:{plus:1}}}],groupReward:{packs:{premium:1},coins:250}},
{id:'debut_elite',cat:'Debut Edition',name:'Road to the Elite',desc:'A tougher three-segment Debut Edition challenge.',segments:[{id:'colour',name:'Colour Base',slots:6,req:{greenPlus:2},reward:{packs:{normal:1},coins:150}},{id:'scarce',name:'Scarce Company',slots:7,req:{scarce:2,bluePlus:1},reward:{packs:{plus:1}}},{id:'apex',name:'At The APEX',slots:8,req:{apexPlus:1,scarce:2},reward:{packs:{premium:1}}}],groupReward:{packs:{elite:1},coins:400}}
];
let sbcTab='Welcome',sbcOpen=null,sbcSegment=null,sbcSlots=[];
function rewardText(r={}){const bits=[];if(r.coins)bits.push(`${r.coins} coins`);for(const [k,n] of Object.entries(r.packs||{}))bits.push(`${n} ${PRODUCTS[k]?.name||k}${n>1?'s':''}`);return bits.join(' + ')||'—'}
function giveReward(r={}){save.coins+=r.coins||0;save.stats.coinsEarned+=r.coins||0;for(const [k,n] of Object.entries(r.packs||{}))save.inventory[k]=(save.inventory[k]||0)+n;}
function sbcKey(id,seg){return `${id}:${seg}`}
function sbcSegmentDone(ch,seg){return !!save.sbc.completed[sbcKey(ch.id,seg.id)]}
function sbcGroupDone(ch){return ch.segments.every(seg=>sbcSegmentDone(ch,seg))}
function eligibleOwnedCards(dupesOnly=false){return allPackableDefs().filter(c=>{const rec=save.cards[c.id];if(!rec?.count)return false;if(save.gallery.includes(c.id)||['onlyone','theapex'].includes(c.type))return false;if(dupesOnly&&rec.count<2)return false;return true})}
function isGreenPlus(c){return ['green','blue','apex','red','neon','ice','road','stage','elevation','afterimage','frameless'].includes(c.type)}
function isBluePlus(c){return ['blue','apex','red','road','stage','elevation','afterimage','frameless'].includes(c.type)}
function isApexPlus(c){return ['apex','red','road','stage','elevation','afterimage','frameless'].includes(c.type)}
function checkSbcReq(seg,cards){const r=seg.req||{},filled=cards.filter(Boolean);return [
['Cards',filled.length,seg.slots,filled.length===seg.slots],
...(r.duplicates?[['Duplicates',filled.filter(c=>(save.cards[c.id]?.count||0)>=2).length,seg.slots,filled.length===seg.slots&&filled.every(c=>(save.cards[c.id]?.count||0)>=2)]]:[]),
...(r.uncommon?[['Uncommon+',filled.filter(c=>['uncommon','scarce'].includes(c.tier)).length,r.uncommon,filled.filter(c=>['uncommon','scarce'].includes(c.tier)).length>=r.uncommon]]:[]),
...(r.scarce?[['Scarce',filled.filter(c=>c.tier==='scarce').length,r.scarce,filled.filter(c=>c.tier==='scarce').length>=r.scarce]]:[]),
...(r.greenPlus?[['Green+',filled.filter(isGreenPlus).length,r.greenPlus,filled.filter(isGreenPlus).length>=r.greenPlus]]:[]),
...(r.bluePlus?[['Blue+',filled.filter(isBluePlus).length,r.bluePlus,filled.filter(isBluePlus).length>=r.bluePlus]]:[]),
...(r.apexPlus?[['APEX+',filled.filter(isApexPlus).length,r.apexPlus,filled.filter(isApexPlus).length>=r.apexPlus]]:[]),
['All Debut Edition',filled.length,filled.length,filled.length>0]
]}
function isStandaloneSbc(ch){return ch.segments.length===1}
function renderSBC(){const c=page('SBCs','BUILD');const tabs=['Welcome','Upgrades','Debut Edition','Completed'];const list=SBCS.filter(ch=>sbcTab==='Completed'?sbcGroupDone(ch):ch.cat===sbcTab&&!(!ch.repeatable&&sbcGroupDone(ch)));c.innerHTML=`<div class="section-tabs">${tabs.map(t=>`<button data-sbctab="${t}" class="${sbcTab===t?'active':''}">${t}</button>`).join('')}</div><div class="generic-card"><h3>Squad Building Challenges</h3><p class="muted">Submitted cards are permanently removed. Gallery cards are protected, and Only One / THE APEX can never be submitted. Only one version of each player can be used per segment.</p></div><div class="sbc-grid">${list.length?list.map(ch=>`<button class="sbc-card" data-sbc="${ch.id}"><span class="tile-kicker">${ch.cat.toUpperCase()}${ch.repeatable?' · REPEATABLE':''}</span><h3>${ch.name}</h3><p>${ch.desc}</p><div class="sbc-progress">${ch.segments.filter(x=>sbcSegmentDone(ch,x)).length}/${ch.segments.length} ${isStandaloneSbc(ch)?'challenge':'segments'}</div><strong>${sbcGroupDone(ch)&&!ch.repeatable?'Completed ✓':`${isStandaloneSbc(ch)?'Reward':'Group reward'}: ${rewardText(isStandaloneSbc(ch)?ch.segments[0].reward:ch.groupReward)}`}</strong></button>`).join(''):'<div class="notice">Nothing here yet.</div>'}</div>`;c.querySelectorAll('[data-sbctab]').forEach(b=>b.onclick=()=>{sbcTab=b.dataset.sbctab;renderSBC()});c.querySelectorAll('[data-sbc]').forEach(b=>b.onclick=()=>openSbc(b.dataset.sbc));}
function openSbc(id){const ch=SBCS.find(x=>x.id===id);if(!ch)return;sbcOpen=id;const standalone=isStandaloneSbc(ch);const c=page(ch.name,ch.cat.toUpperCase());c.innerHTML=`<div class="generic-card"><p>${ch.desc}</p><p><b>${standalone?'Reward':'Group reward'}:</b> ${rewardText(standalone?ch.segments[0].reward:ch.groupReward)}</p></div><div class="list">${ch.segments.map(seg=>`<button class="list-row sbc-seg" data-seg="${seg.id}"><div><b>${seg.name}</b><div class="muted">${seg.slots} cards · ${reqSummary(seg.req)}</div></div><strong>${sbcSegmentDone(ch,seg)?'COMPLETE ✓':rewardText(seg.reward)}</strong></button>`).join('')}</div>${!standalone&&sbcGroupDone(ch)&&!save.sbc.claimed[ch.id]?'<div class="generic-card"><h3>SBC Complete</h3><button class="primary" id="claimGroup">Claim Group Reward</button></div>':''}<div class="button-row"><button class="ghost" id="backSbc">← SBCs</button></div>`;c.querySelectorAll('[data-seg]').forEach(b=>b.onclick=()=>openSbcSegment(ch,b.dataset.seg));byId('backSbc').onclick=renderSBC;if(byId('claimGroup'))byId('claimGroup').onclick=()=>claimSbcGroup(ch);}
function reqSummary(r={}){const a=['All Debut Edition'];if(r.duplicates)a.push('duplicates only');if(r.uncommon)a.push(`${r.uncommon} Uncommon+`);if(r.scarce)a.push(`${r.scarce} Scarce`);if(r.greenPlus)a.push(`${r.greenPlus} Green+`);if(r.bluePlus)a.push(`${r.bluePlus} Blue+`);if(r.apexPlus)a.push(`${r.apexPlus} APEX+`);return a.join(' · ')}
function openSbcSegment(ch,segId){const seg=ch.segments.find(x=>x.id===segId);if(!seg||sbcSegmentDone(ch,seg))return;sbcSegment=segId;sbcSlots=Array(seg.slots).fill(null);renderSbcBuilder(ch,seg)}
function renderSbcBuilder(ch,seg){const c=page(seg.name,isStandaloneSbc(ch)?'SBC':'SBC SEGMENT');const checks=checkSbcReq(seg,sbcSlots),valid=checks.every(x=>x[3]);c.innerHTML=`<div class="sbc-builder"><div class="generic-card"><h3>Requirements</h3>${checks.map(x=>`<div class="list-row"><span>${x[0]}</span><b class="${x[3]?'req-ok':'req-no'}">${x[1]}/${x[2]} ${x[3]?'✓':''}</b></div>`).join('')}<p class="muted">Reward: ${rewardText(seg.reward)}</p></div><div class="sbc-slots">${sbcSlots.map((card,i)=>`<button class="sbc-slot ${card?'filled':''}" data-slot="${i}">${card?`${cardHTML(card)}${tierPill(card,'card-tier-pill')}<span class="dupe">×${save.cards[card.id]?.count||0}</span><small>Tap to change/remove</small>`:`<span>＋</span><small>Add card</small>`}</button>`).join('')}</div><div class="button-row"><button class="primary" id="submitSbc" ${valid?'':'disabled'}>Submit ${isStandaloneSbc(ch)?'SBC':'Squad'}</button><button class="ghost" id="backChallenge">← Challenge</button></div></div>`;c.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>handleSbcSlot(ch,seg,+b.dataset.slot));byId('backChallenge').onclick=()=>openSbc(ch.id);byId('submitSbc').onclick=()=>confirmSbc(ch,seg);}
function handleSbcSlot(ch,seg,slot){if(!sbcSlots[slot])return chooseSbcCard(ch,seg,slot);const card=sbcSlots[slot];const m=modal(`<p class="eyebrow">SBC SLOT</p><h3>${card.name}</h3><p>${TYPE_META[card.type]?.name||card.type}</p><div class="button-row"><button class="primary" id="replaceSbcCard">Replace Card</button><button class="ghost" id="removeSbcCard">Remove Card</button><button class="ghost" id="cancelSbcCard">Cancel</button></div>`);m.querySelector('#replaceSbcCard').onclick=()=>{m.remove();chooseSbcCard(ch,seg,slot)};m.querySelector('#removeSbcCard').onclick=()=>{sbcSlots[slot]=null;m.remove();renderSbcBuilder(ch,seg)};m.querySelector('#cancelSbcCard').onclick=()=>m.remove();}
function chooseSbcCard(ch,seg,slot){showSbcPicker(ch,seg,slot,true)}
function showSbcPicker(ch,seg,slot,dupesOnly){const usedPlayers=new Set(sbcSlots.map((c,i)=>i===slot?null:c?.playerId).filter(Boolean));const cards=eligibleOwnedCards(dupesOnly).filter(c=>!usedPlayers.has(c.playerId));const c=page('Choose Card','SBC PLAYER PICKER');c.innerHTML=`<div class="button-row"><button class="tiny-btn ${dupesOnly?'primary-mini':''}" id="dupFilter">Duplicates</button><button class="tiny-btn ${!dupesOnly?'primary-mini':''}" id="allFilter">All Cards</button><button class="ghost" id="cancelPick">← Squad</button></div><p class="muted">Once a player is selected, every other version of that player is hidden for this segment. Gallery cards and protected chase cards are also hidden.</p><div class="binder-grid sbc-picker">${cards.length?cards.map(card=>`<button class="binder-item card-button" data-pickcard="${card.id}">${cardHTML(card)}${tierPill(card,'card-tier-pill')}<span class="dupe">×${save.cards[card.id].count}</span></button>`).join(''):'<div class="notice">No eligible cards in this filter.</div>'}</div>`;byId('dupFilter').onclick=()=>showSbcPicker(ch,seg,slot,true);byId('allFilter').onclick=()=>showSbcPicker(ch,seg,slot,false);byId('cancelPick').onclick=()=>renderSbcBuilder(ch,seg);c.querySelectorAll('[data-pickcard]').forEach(b=>b.onclick=()=>{sbcSlots[slot]=allPackableDefs().find(x=>x.id===b.dataset.pickcard);renderSbcBuilder(ch,seg)});}
function confirmSbc(ch,seg){if(!checkSbcReq(seg,sbcSlots).every(x=>x[3]))return;const lastCopies=sbcSlots.filter(card=>(save.cards[card.id]?.count||0)===1);const warning=lastCopies.length?`<div class="notice"><b>⚠ Last-copy warning</b><br>${lastCopies.map(c=>`${c.name} — ${TYPE_META[c.type]?.name||c.type}`).join('<br>')}<br><span class="muted">Submitting will leave these binder slots empty.</span></div>`:'';const m=modal(`<p class="eyebrow">CONFIRM SUBMISSION</p><h3>Submit ${seg.name}?</h3><p>These ${seg.slots} cards will be permanently removed from your Collection.</p>${warning}<p class="muted">Gallery cards, Only Ones and THE APEX cannot be submitted.</p><div class="button-row"><button class="primary" id="yesSubmit">${lastCopies.length?'Submit Anyway':'Submit'}</button><button class="ghost" id="noSubmit">Cancel</button></div>`);m.querySelector('#noSubmit').onclick=()=>m.remove();m.querySelector('#yesSubmit').onclick=()=>{m.remove();submitSbc(ch,seg)}}
function submitSbc(ch,seg){const duplicatesOnly=sbcSlots.every(card=>(save.cards[card.id]?.count||0)>=2),lastOwnedRed=sbcSlots.some(card=>card.type==='red'&&(save.cards[card.id]?.count||0)===1);if(duplicatesOnly)unlockHidden('waste');if(lastOwnedRed)unlockHidden('turning');for(const card of sbcSlots){if(save.cards[card.id]?.count>0)save.cards[card.id].count--;}save.sbc.completed[sbcKey(ch.id,seg.id)]=true;save.sbc.submitted++;save.stats.sbcCompleted++; persist();const standalone=isStandaloneSbc(ch);const m=modal(`<p class="eyebrow">${standalone?'SBC COMPLETE':'SEGMENT COMPLETE'}</p><h3>${standalone?ch.name:seg.name}</h3><p>Reward ready: <b>${rewardText(seg.reward)}</b></p><button class="primary" id="claimSeg">Claim Reward</button>`);m.querySelector('#claimSeg').onclick=()=>{giveReward(seg.reward);save.sbc.claimed[sbcKey(ch.id,seg.id)]=true;if(standalone&&ch.repeatable){delete save.sbc.completed[sbcKey(ch.id,seg.id)];delete save.sbc.claimed[sbcKey(ch.id,seg.id)];}persist();updateChrome();m.remove();openSbc(ch.id)}}
function claimSbcGroup(ch){if(isStandaloneSbc(ch)||!sbcGroupDone(ch)||save.sbc.claimed[ch.id])return;giveReward(ch.groupReward);save.sbc.claimed[ch.id]=true;persist();updateChrome();const m=modal(`<p class="eyebrow">SBC COMPLETE</p><h3>${ch.name}</h3><p>You earned <b>${rewardText(ch.groupReward)}</b>.</p><p class="muted">Packs were sent to Sealed Inventory.</p><button class="primary" id="sbcDone">Done</button>`);m.querySelector('#sbcDone').onclick=()=>{m.remove();renderSBC()}}
function pullCount(type){return Object.entries(save.cards).filter(([id])=>id.startsWith(type+':')).reduce((n,[,r])=>n+(r.lifetime||0),0)}
function pullTierCount(tier){return Object.entries(save.cards).reduce((n,[id,r])=>{const pid=id.split(':')[1],p=PLAYERS.find(x=>x.id===pid);return n+(p?.tier===tier?(r.lifetime||0):0)},0)}
function ownedType(type){return allPackableDefs().filter(c=>c.type===type&&save.cards[c.id]?.count>0).length}
function rewardLabel(r={}){const bits=[];if(r.coins)bits.push(`${r.coins.toLocaleString()} coins`);for(const [k,n] of Object.entries(r.packs||{}))bits.push(`${n>1?n+' × ':''}${PRODUCTS[k].name}`);if(r.card)bits.push(r.card.name);if(r.xp)bits.push(`${r.xp} XP`);return bits.join(' + ')||'Reward'}
function grantObjectiveReward(r={}){giveReward(r);if(r.card){const card=makeCard('reward',r.card.id,{name:r.card.name,club:'APEX REWARD',tier:'legend'});if(!save.cards[card.id])save.cards[card.id]={count:0,lifetime:0,history:[]};if(!save.cards[card.id].count){save.cards[card.id].count=1;save.cards[card.id].lifetime=1;save.discovered[card.id]=true}}save.objectiveSystem.xp+=(r.xp||0);}
const DAILY_POOL={
 packs:[['rip5','RIP IT','Open 5 real packs',s=>s.packs,5,{coins:100}],['rip10','KEEP RIPPING','Open 10 real packs',s=>s.packs,10,{coins:150}],['green3','COLOUR ME IN','Pull 3 Green parallels',s=>s.green,3,{coins:125}],['blue1','BLUE SKIES','Pull a Blue parallel',s=>s.blue,1,{coins:150}],['scarce2','SCARCE FIND','Pull 2 Scarce-player cards',s=>s.scarce,2,{coins:150}]],
 draft:[['draft1','QUICK THINKING','Complete 1 Quick Draft',s=>s.drafts,1,{coins:125}],['draft2','DOUBLE DRAFT','Complete 2 Quick Drafts',s=>s.drafts,2,{coins:200}]],
 rush:[['rush1','RUSH HOUR','Complete 1 Pack Rush',s=>s.rushes,1,{coins:125}],['rush2','DOUBLE RUSH','Complete 2 Pack Rushes',s=>s.rushes,2,{coins:175}]],
 sbc:[['sbc1','SQUAD BUILDER','Complete 1 SBC',s=>s.sbcs,1,{coins:150}],['sbc2','BUILD AGAIN','Complete 2 SBCs',s=>s.sbcs,2,{coins:225}]]};
function seededIndex(str,n){let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)%n}
function dailyDefs(){ensureObjectivePeriods();const d=save.objectiveSystem.daily,now=statSnapshot(),cats=['packs','draft','rush','sbc'];const arr=cats.map((cat,i)=>DAILY_POOL[cat][seededIndex(d.key+cat,DAILY_POOL[cat].length)]);arr.push(DAILY_POOL.packs[seededIndex(d.key+'wild',DAILY_POOL.packs.length)]);return arr.map((x,i)=>{const [id,name,desc,get,target,reward]=x,base=get(d.base),cur=Math.max(0,get(now)-base);return {id:'daily:'+d.key+':'+i+':'+id,name,desc,progress:cur,target,done:cur>=target,reward:{...reward,xp:25}}})}
const WEEKLY_BASE=[
 ['pack40','PACK ADDICT','Open 40 real packs',s=>s.packs,40,{coins:400}],['green10','GREEN MACHINE','Pull 10 Green parallels',s=>s.green,10,{coins:400}],['blue5','BLUE MOON','Pull 5 Blue parallels',s=>s.blue,5,{coins:450}],['apex2','APEX HUNTER','Pull 2 APEX parallels',s=>s.apex,2,{coins:500}],['red1','SEEING RED','Pull 1 Red parallel',s=>s.red,1,{coins:500}],['draft5','DRAFT WEEK','Complete 5 Quick Drafts',s=>s.drafts,5,{coins:450}],['rush8','RUSH WEEK','Complete 8 Pack Rushes',s=>s.rushes,8,{coins:450}],['sbc5','SBC GRINDER','Complete 5 SBCs',s=>s.sbcs,5,{coins:450}]];
const FEATURED=[['featureblue','BLUE PERIOD','FEATURED: Pull 10 Blue parallels',s=>s.blue,10,{coins:750,packs:{plus:1}}],['featuredraft','DRAFT KING','FEATURED: Complete 10 Quick Drafts',s=>s.drafts,10,{coins:750,packs:{plus:1}}],['featurerush','RUSH MASTER','FEATURED: Complete 15 Pack Rushes',s=>s.rushes,15,{coins:750,packs:{plus:1}}],['featuresbc','SBC CLEAROUT','FEATURED: Complete 10 SBCs',s=>s.sbcs,10,{coins:750,packs:{plus:1}}]];
function weeklyDefs(){ensureObjectivePeriods();const w=save.objectiveSystem.weekly,now=statSnapshot();const feature=FEATURED[seededIndex(w.key,FEATURED.length)];let regs=WEEKLY_BASE.filter(x=>!(feature[0].includes('blue')&&x[0].includes('blue'))&&!(feature[0].includes('draft')&&x[0].includes('draft'))&&!(feature[0].includes('rush')&&x[0].includes('rush'))&&!(feature[0].includes('sbc')&&x[0].includes('sbc'))).slice(0,7);return [...regs,feature].map((x,i)=>{const[id,name,desc,get,target,reward]=x,cur=Math.max(0,get(now)-get(w.base));return{id:'weekly:'+w.key+':'+i+':'+id,name,desc,progress:cur,target,done:cur>=target,reward:{...reward,xp:i===7?100:50},featured:i===7}})}
const SET_TRACKS=[
 ['base','Base',[3,6,9,12],[{coins:100},{coins:150},{packs:{normal:1}},{coins:250,packs:{plus:1}}]],
 ['green','Green',[3,6,9,12],[{coins:150},{packs:{normal:1}},{coins:150,packs:{normal:1}},{coins:300,packs:{plus:1}}]],
 ['blue','Blue',[3,6,9,12],[{coins:200},{coins:100,packs:{normal:1}},{packs:{plus:1}},{coins:300,packs:{premium:1}}]],
 ['neon','Neon Nights',[3,6,9,12],[{coins:200},{coins:150,packs:{normal:1}},{packs:{plus:1}},{coins:400,packs:{premium:1}}]],
 ['ice','Black Ice',[3,6,9,12],[{coins:200},{coins:150,packs:{normal:1}},{packs:{plus:1}},{coins:400,packs:{premium:1}}]],
 ['apex','APEX',[3,6,9,12],[{packs:{plus:1}},{coins:250,packs:{plus:1}},{packs:{premium:1}},{coins:750,packs:{elite:1}}]],
 ['red','Red',[3,6,9,12],[{coins:500,packs:{plus:1}},{coins:600,packs:{premium:1}},{coins:750,packs:{elite:1}},{coins:2000,packs:{elite:1},card:{id:'drogba',name:'Didier Drogba — APEX Reward'}}]],
 ['road','Road to Glory',[1,2,3,4],[{coins:500},{coins:300,packs:{normal:1}},{coins:300,packs:{plus:1}},{coins:750,packs:{premium:1},card:{id:'kaka',name:'Kaká — APEX Reward'}}]],
 ['stage','The Stage',[1,2,3,4],[{coins:550},{coins:400,packs:{normal:1}},{coins:400,packs:{plus:1}},{coins:850,packs:{premium:1},card:{id:'r9',name:'Ronaldo Nazário — APEX Reward'}}]],
 ['elevation','Elevation',[1,2,3,4],[{coins:550},{coins:300,packs:{plus:1}},{coins:300,packs:{premium:1}},{coins:1000,packs:{elite:1},card:{id:'henry',name:'Thierry Henry — APEX Reward'}}]],
 ['afterimage','Afterimage',[1,2,3],[{coins:300,packs:{plus:1}},{coins:500,packs:{premium:1}},{coins:1250,packs:{elite:1},card:{id:'ronaldinho',name:'Ronaldinho — APEX Reward'}}]],
 ['frameless','Frameless',[1,2,3,4],[{coins:400,packs:{plus:1}},{coins:500,packs:{premium:1}},{coins:500,packs:{elite:1}},{coins:1500,packs:{elite:1},card:{id:'iniesta',name:'Andrés Iniesta — APEX Reward'}}]],
 ['onlyone','Only One',[1,3,6,9,12],[{coins:500,packs:{premium:1}},{coins:750,packs:{elite:1}},{coins:1500,packs:{elite:1}},{coins:2500,packs:{elite:2}},{coins:5000,card:{id:'cruyff',name:'Johan Cruyff — APEX IMMORTAL'}}]]];
function setDefs(){const out=[];for(const [type,label,miles,rewards] of SET_TRACKS){const n=ownedType(type);miles.forEach((m,i)=>out.push({id:`set:${type}:${m}`,name:`${label} ${m}/${type==='afterimage'?3:12}`,desc:`Own ${m} unique ${label} card${m===1?'':'s'}`,progress:Math.min(n,m),target:m,done:n>=m,reward:{...rewards[i],xp:m===miles.at(-1)?150:50}}))}const apexOwned=ownedType('theapex')>=1;out.push({id:'set:theapex:1',name:'THE APEX',desc:'Own THE APEX — Zinedine Zidane',progress:apexOwned?1:0,target:1,done:apexOwned,reward:{coins:2000,packs:{elite:2},xp:250}});const master=['base','green','blue','neon','ice','apex','red','road','stage','elevation','afterimage','frameless','onlyone'].every(t=>ownedType(t)>=allPackableDefs().filter(c=>c.type===t).length)&&apexOwned;out.push({id:'set:master',name:'DEBUT MASTER',desc:'Complete every Debut Edition pack/product checklist',progress:master?1:0,target:1,done:master,reward:{card:{id:'pele',name:'Pelé — APEX MASTER'},xp:500}});return out}
const CAREER_TRACKS=[['packs','PACK VETERAN',()=>save.stats.packsOpened,[10,25,50,75,100,150,200,250,300,350,400,450,500,600,700,750,800,900,1000]],['drafts','DRAFT VETERAN',()=>save.stats.draftsPlayed,[1,5,10,15,20,25,30,40,50,60,75,100]],['rush','RUSH VETERAN',()=>save.stats.rushesPlayed,[1,10,25,50,75,100,150,200,250]],['sbc','SBC VETERAN',()=>save.stats.sbcCompleted,[1,5,10,15,20,25,30,40,50,75,100]],['hobby','HOBBY RIPPER',()=>save.stats.hobbiesOpened,[1,3,5,10,15,20,25,30,40,50,60,75,100]],['red','RED HUNTER',()=>pullCount('red'),[1,3,5,10,15,20,25,30,40,50,60,75,100]],['coins','COIN EARNER',()=>save.stats.coinsEarned,[1000,2500,5000,7500,10000,15000,20000,25000,30000,40000,50000,75000,100000]]];
function careerDefs(){return CAREER_TRACKS.map(([id,name,get,miles])=>{const cur=get(),next=miles.find(m=>!save.objectiveSystem.claimed[`career:${id}:${m}`])||miles.at(-1),major=[250,500,750,1000,2500,5000,10000,50,100].includes(next),reward={coins:major?1000:300,xp:major?150:50};if(major)reward.packs={premium:1};return{id:`career:${id}:${next}`,name:`${name} — ${next.toLocaleString()}`,desc:`Lifetime progress`,progress:Math.min(cur,next),target:next,done:cur>=next,reward}})}
const HIDDEN=[['gold','GOLD RUSH','Pull your first Only One',{coins:500,xp:100}],['peak','PEAK APEX','Pull THE APEX',{coins:1500,packs:{elite:1},xp:250}],['noway','NO WAY.','Pull THE APEX from a Normal Pack',{coins:2000,packs:{elite:1},xp:300}],['double','DOUBLE TROUBLE','Pull 2 Set Hits from one sealed box',{coins:500,packs:{plus:1},xp:100}],['jackpot','JACKPOT','Pull an Only One + Set Hit from the same box',{coins:750,packs:{premium:1},xp:150}],['rainbow','RAINBOW ROAD','Own Green, Blue, APEX & Red of one player',{coins:500,packs:{plus:1},xp:100}],['three','THREE OF A KIND','Pull 3 different parallel tiers of one player in one box',{coins:400,packs:{plus:1},xp:100}],['last','LAST PACK MAGIC','Pull a Set Hit+ from the final pack of a box',{coins:500,xp:100}],['lift','LIFT OFF','Pull a Set Hit from the first pack of a box',{coins:500,xp:100}],['back','BACK TO BACK','Pull Set Hits in consecutive real packs',{coins:750,packs:{premium:1},xp:150}],['perfect','PERFECTION','Complete your first 5★ Draft',{coins:500,packs:{plus:1},xp:100}],['supersub','SUPER SUB','Bench swap turns a Draft into 5★',{coins:750,packs:{premium:1},xp:150}],['noreroll','NAILED IT','Finish a 5★ Draft with no rerolls',{coins:1000,packs:{premium:1},xp:150}],['timing','PERFECT TIMING','Finish final Rush objective on Pack 10',{coins:500,packs:{plus:1},xp:100}],['clean','CLEAN SWEEP','Complete all 5 Dailies',{coins:300,xp:50}],['waste','WASTE NOT','Complete an SBC using only duplicate copies',{coins:400,xp:75}],['turning','NO TURNING BACK','Submit last owned Red to an SBC',{coins:500,xp:100}],['royal','ROYAL FLUSH','Own all 4 Scarce players as Red parallels',{coins:750,packs:{premium:1},xp:150}],['blackgold','BLACK GOLD','Own Neon Nights + Black Ice of one player',{coins:400,xp:75}],['boxoffice','BOX OFFICE','Open a box containing Red + APEX + Set Hit',{coins:500,packs:{plus:1},xp:100}]];
function unlockHidden(id){if(!save.objectiveSystem.hiddenUnlocked[id])save.objectiveSystem.hiddenUnlocked[id]=new Date().toISOString()}
function evaluateDerivedHidden(){if(save.stats.onlyOnes>0)unlockHidden('gold');if(save.stats.theApex>0)unlockHidden('peak');if(save.stats.perfectDrafts>0)unlockHidden('perfect');if(PLAYERS.some(p=>['green','blue','apex','red'].every(t=>save.cards[`${t}:${p.id}`]?.count>0)))unlockHidden('rainbow');if(['messi','ronaldo','yamal','bellingham'].every(id=>save.cards[`red:${id}`]?.count>0))unlockHidden('royal');if(PLAYERS.some(p=>save.cards[`neon:${p.id}`]?.count>0&&save.cards[`ice:${p.id}`]?.count>0))unlockHidden('blackgold')}
function evaluateOpeningAchievements(s){const cards=s.pulled||[],setTypes=['road','stage','elevation','afterimage','frameless'],isSetHit=c=>setTypes.includes(c.type),isSetHitPlus=c=>TYPE_META[c.type]?.rank>=5;let previous=!!save.stats.lastRealPackHadSetHit;for(const pk of s.packs||[]){const hit=(pk.cards||[]).some(isSetHit);if(previous&&hit)unlockHidden('back');previous=hit}save.stats.lastRealPackHadSetHit=previous;if(s.boxes){for(let box=1;box<=s.boxes;box++){const boxPacks=s.packs.filter(pk=>pk.box===box),boxCards=boxPacks.flatMap(pk=>pk.cards||[]),hits=boxCards.filter(isSetHit);if(hits.length>=2)unlockHidden('double');if(hits.length&&boxCards.some(c=>c.type==='onlyone'))unlockHidden('jackpot');if(boxCards.some(c=>c.type==='red')&&boxCards.some(c=>c.type==='apex')&&hits.length)unlockHidden('boxoffice');if(boxPacks[0]?.cards.some(isSetHit))unlockHidden('lift');if(boxPacks.at(-1)?.cards.some(isSetHitPlus))unlockHidden('last');const map={};for(const c of boxCards){map[c.playerId]=map[c.playerId]||new Set();if(['green','blue','apex','red','neon','ice'].includes(c.type))map[c.playerId].add(c.type)}if(Object.values(map).some(x=>x.size>=3))unlockHidden('three')}}if(s.kind==='normal'&&cards.some(c=>c.type==='theapex'))unlockHidden('noway');evaluateDerivedHidden()}
function apexLevel(){return Math.floor(save.objectiveSystem.xp/500)+1}
function levelRewardDefs(){const lvl=apexLevel(),marks=[5,10,20,30,40,50,60,70,80,90,100],rewards={5:{coins:500},10:{packs:{plus:1}},20:{coins:1000,packs:{plus:1}},30:{packs:{premium:1}},40:{coins:1500,packs:{premium:1}},50:{packs:{elite:1}},60:{coins:2000,packs:{premium:1}},70:{packs:{elite:1}},80:{coins:3000,packs:{elite:1}},90:{packs:{elite:2}},100:{coins:5000,packs:{elite:2}}};return marks.map(m=>({id:'level:'+m,name:`APEX LEVEL ${m}`,desc:m===50?'Includes exclusive profile badge':m===100?'Includes Level 100 diamond cosmetic':'Career level reward',progress:Math.min(lvl,m),target:m,done:lvl>=m,reward:{...rewards[m],xp:0}}))}
let objectiveTab='daily',objectiveReadyOnly=false;
function dailyBonusDef(){const d=dailyDefs(),done=d.filter(x=>x.done).length;return{id:'dailybonus:'+save.objectiveSystem.daily.key,name:'DAILY COMPLETE',desc:'Complete all 5 Daily Objectives',progress:done,target:5,done:done===5,reward:{coins:300,packs:{normal:1},xp:50},group:'Daily'}}
function weeklyBonusDefs(){const w=weeklyDefs(),done=w.filter(x=>x.done).length;return[{id:'weekly5:'+save.objectiveSystem.weekly.key,name:'WEEKLY 5/8',desc:'Complete 5 Weekly Objectives',progress:Math.min(done,5),target:5,done:done>=5,reward:{coins:500,packs:{plus:1},xp:100},group:'Weekly'},{id:'weekly8:'+save.objectiveSystem.weekly.key,name:'WEEKLY 8/8',desc:'Complete all 8 Weekly Objectives',progress:done,target:8,done:done>=8,reward:{coins:1000,packs:{premium:1},xp:200},group:'Weekly'}]}
function allObjectiveDefs(){ensureObjectivePeriods();evaluateDerivedHidden();return [...dailyDefs().map(x=>({...x,group:'Daily'})),dailyBonusDef(),...weeklyDefs().map(x=>({...x,group:'Weekly'})),...weeklyBonusDefs(),...setDefs().map(x=>({...x,group:'Set'})),...careerDefs().map(x=>({...x,group:'Career'})),...levelRewardDefs().map(x=>({...x,group:'Career'}))]}
function isObjectiveClaimed(o){return !!save.objectiveSystem.claimed[o.id]}
function objectiveCard(o,opts={}){const claimed=isObjectiveClaimed(o),pct=Math.min(100,Math.round(o.progress/o.target*100)),compact=opts.compact!==false;return `<div class="objective-card ${compact?'compact-objective':''} ${o.featured?'featured-objective':''} ${claimed?'claimed-objective':''}"><div><div class="objective-heading"><span class="eyebrow">${o.featured?'FEATURED WEEKLY':o.name}</span>${opts.showGroup?`<span class="objective-group">${o.group||''}</span>`:''}</div><h3>${o.featured?o.name:o.desc}</h3>${!claimed?`<div class="progress"><i style="width:${pct}%"></i></div><p class="muted objective-meta">${o.progress.toLocaleString()} / ${o.target.toLocaleString()} · ${rewardLabel(o.reward)}</p>`:`<p class="muted objective-meta">${rewardLabel(o.reward)}</p>`}</div>${claimed?'<strong class="claimed-mark">✓</strong>':o.done?`<button class="tiny-btn primary-mini" data-objclaim="${o.id}">CLAIM</button>`:'<strong class="progress-state">In progress</strong>'}</div>`}
function readyObjectiveDefs(){return allObjectiveDefs().filter(o=>o.done&&!isObjectiveClaimed(o))}
function readyHiddenDefs(){return HIDDEN.filter(([id])=>save.objectiveSystem.hiddenUnlocked[id]&&!save.objectiveSystem.hiddenClaimed[id])}
function refreshReadyCount(){save.objectivesReady=readyObjectiveDefs().length+readyHiddenDefs().length;persist();updateChrome()}
function rewardsReadyBody(){const objs=readyObjectiveDefs(),hidden=readyHiddenDefs();if(!objs.length&&!hidden.length)return `<div class="generic-card reward-empty"><h3>All caught up</h3><p class="muted">You don't have any rewards waiting to be claimed.</p></div>`;return `${objs.map(o=>objectiveCard(o,{showGroup:true})).join('')}${hidden.map(([id,name,desc,reward])=>`<div class="objective-card compact-objective"><div><div class="objective-heading"><span class="eyebrow">${name}</span><span class="objective-group">Achievement</span></div><h3>${desc}</h3><p class="muted objective-meta">${rewardLabel(reward)}</p></div><button class="tiny-btn primary-mini" data-hiddenclaim="${id}">CLAIM</button></div>`).join('')}`}
function renderObjectives(tab=objectiveTab){objectiveTab=tab;ensureObjectivePeriods();evaluateDerivedHidden();const c=page('Objectives','PROGRESS');const daily=dailyDefs(),weekly=weeklyDefs(),set=setDefs(),career=[...careerDefs(),...levelRewardDefs()];refreshReadyCount();let body='';if(objectiveReadyOnly){body=rewardsReadyBody()}else if(tab==='daily'){body=daily.map(objectiveCard).join('')+objectiveCard(dailyBonusDef())}else if(tab==='weekly'){body=weekly.map(objectiveCard).join('')+weeklyBonusDefs().map(objectiveCard).join('')}else if(tab==='set')body=set.map(objectiveCard).join('');else if(tab==='career')body=`<div class="generic-card career-summary"><p class="eyebrow">APEX LEVEL ${apexLevel()}</p><h3>${save.objectiveSystem.xp.toLocaleString()} Career XP</h3><p class="muted">Rewards at Level 5, then every 10 levels.</p></div>`+career.map(objectiveCard).join('');else {body=`<div class="generic-card achievement-summary"><h3>${Object.keys(save.objectiveSystem.hiddenUnlocked).length} / ${HIDDEN.length} discovered</h3><p class="muted">Locked achievements remain secret until you trigger them.</p></div>`+HIDDEN.map(([id,name,desc,reward])=>{const unlocked=save.objectiveSystem.hiddenUnlocked[id],claimed=save.objectiveSystem.hiddenClaimed[id];return `<div class="objective-card compact-objective ${claimed?'claimed-objective':''}"><div><p class="eyebrow">${unlocked?name:'???'}</p><h3>${unlocked?desc:'Hidden achievement'}</h3>${!claimed?`<p class="muted objective-meta">${unlocked?rewardLabel(reward):'???'}</p>`:''}</div>${!unlocked?'<strong class="progress-state">LOCKED</strong>':claimed?'<strong class="claimed-mark">✓</strong>':`<button class="tiny-btn primary-mini" data-hiddenclaim="${id}">CLAIM</button>`}</div>`}).join('')}
 const ready=save.objectivesReady;c.innerHTML=`<div class="objective-toolbar"><button id="globalReady" class="rewards-ready-btn ${objectiveReadyOnly?'active':''}">🎁 Rewards Ready <b>${ready}</b></button>${objectiveReadyOnly?'<button class="ghost" id="backObjectives">← All Objectives</button>':''}</div>${objectiveReadyOnly?'':`<div class="section-tabs objective-tabs"><button data-otab="daily" class="${tab==='daily'?'active':''}">Daily</button><button data-otab="weekly" class="${tab==='weekly'?'active':''}">Weekly</button><button data-otab="set" class="${tab==='set'?'active':''}">Set</button><button data-otab="career" class="${tab==='career'?'active':''}">Career</button><button data-otab="hidden" class="${tab==='hidden'?'active':''}">Achievements</button></div>`}<div class="objective-list compact-list">${body}</div>`;c.querySelectorAll('[data-otab]').forEach(b=>b.onclick=()=>{objectiveReadyOnly=false;renderObjectives(b.dataset.otab)});byId('globalReady').onclick=()=>{objectiveReadyOnly=true;renderObjectives(tab)};if(byId('backObjectives'))byId('backObjectives').onclick=()=>{objectiveReadyOnly=false;renderObjectives(tab)};c.querySelectorAll('[data-objclaim]').forEach(b=>b.onclick=()=>claimObjectiveNew(b.dataset.objclaim));c.querySelectorAll('[data-hiddenclaim]').forEach(b=>b.onclick=()=>claimHidden(b.dataset.hiddenclaim))}

function findObjective(id){const defs=allObjectiveDefs();let o=defs.find(x=>x.id===id);if(o)return o;const daily=dailyDefs(),weekly=weeklyDefs();if(id.startsWith('dailybonus:'))return{id,name:'DAILY COMPLETE',desc:'Complete all 5 Daily Objectives',progress:daily.filter(x=>x.done).length,target:5,done:daily.every(x=>x.done),reward:{coins:300,packs:{normal:1},xp:50}};if(id.startsWith('weekly5:'))return{id,name:'WEEKLY 5/8',desc:'Complete 5 Weekly Objectives',progress:weekly.filter(x=>x.done).length,target:5,done:weekly.filter(x=>x.done).length>=5,reward:{coins:500,packs:{plus:1},xp:100}};if(id.startsWith('weekly8:'))return{id,name:'WEEKLY 8/8',desc:'Complete all 8 Weekly Objectives',progress:weekly.filter(x=>x.done).length,target:8,done:weekly.every(x=>x.done),reward:{coins:1000,packs:{premium:1},xp:200}}}
function claimObjectiveNew(id){const o=findObjective(id);if(!o||!o.done||save.objectiveSystem.claimed[id])return;save.objectiveSystem.claimed[id]=true;grantObjectiveReward(o.reward);if(id.startsWith('dailybonus:'))unlockHidden('clean');persist();updateChrome();const m=modal(`<p class="eyebrow">OBJECTIVE CLAIMED</p><h3>${o.name}</h3><p>You earned <b>${rewardLabel(o.reward)}</b>.</p><button class="primary" id="claimDone">Done</button>`);m.querySelector('#claimDone').onclick=()=>{m.remove();renderObjectives()}}
function claimHidden(id){const h=HIDDEN.find(x=>x[0]===id);if(!h||!save.objectiveSystem.hiddenUnlocked[id]||save.objectiveSystem.hiddenClaimed[id])return;save.objectiveSystem.hiddenClaimed[id]=true;grantObjectiveReward(h[3]);persist();const m=modal(`<p class="eyebrow">SECRET ACHIEVEMENT</p><h3>${h[1]}</h3><p>${h[2]}</p><p><b>${rewardLabel(h[3])}</b></p><button class="primary" id="hiddenDone">Done</button>`);m.querySelector('#hiddenDone').onclick=()=>{m.remove();renderObjectives('hidden')}}

function renderProfile(){const c=page('Profile & Stats','YOUR APEX CAREER');c.innerHTML=`<div class="stat-grid"><div class="stat-item"><span class="qty">${save.stats.packsOpened}</span><p>Real packs opened</p></div><div class="stat-item"><span class="qty">${save.stats.boxesOpened}</span><p>Boxes opened</p></div><div class="stat-item"><span class="qty">${save.stats.cardsPulled}</span><p>Cards pulled</p></div><div class="stat-item"><span class="qty">${ownedUnique()}</span><p>Unique cards owned</p></div><div class="stat-item"><span class="qty">${save.stats.onlyOnes}</span><p>Only Ones owned</p></div><div class="stat-item"><span class="qty">${save.stats.theApex}</span><p>THE APEX pulled</p></div><div class="stat-item"><span class="qty">${save.stats.quickSellCoins.toLocaleString()}</span><p>Coins from spares</p></div></div><div class="generic-card" style="margin-top:14px"><h3>v0.41 test controls</h3><p class="muted">Reset gives you 100,000 coins plus a large stack of every test product.</p><button class="tiny-btn" id="resetSave">Reset v0.41 test save</button></div>`;byId('resetSave').onclick=()=>{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(OPENING_KEY);location.reload()}}

document.addEventListener('click',e=>{const r=e.target.closest('[data-route]');if(r&&r.closest('#app')){e.preventDefault();navigate(r.dataset.route)}});
updateChrome();bindRoutes();if(openingSession){setOpeningLock(true);renderOpeningPack()}else navigate('home');
