import { supabase } from './supabase-client.js';
import { signIn, signOut, signUp, resetPassword } from './auth.js';
import { gameApi } from './game-api.js';
import { readLegacySave } from './import-validator.js';
import { renderFriends } from './social-ui.js';
import { renderClubs } from './clubs-ui.js';

const root = document.querySelector('#app');
const PLAYERS = [
  ['kane', 'Harry Kane', 'Bayern Munich', 'common'],
  ['dembele', 'Ousmane Dembélé', 'Paris Saint-Germain', 'common'],
  ['dowman', 'Max Dowman', 'Arsenal', 'common', true],
  ['haaland', 'Erling Haaland', 'Manchester City', 'common'],
  ['estevao', 'Estêvão Willian', 'Chelsea FC', 'uncommon', true],
  ['karl', 'Lennart Karl', 'Bayern Munich', 'uncommon', true],
  ['vini', 'Vinícius Jr.', 'Real Madrid', 'uncommon'],
  ['palmer', 'Cole Palmer', 'Chelsea FC', 'uncommon'],
  ['messi', 'Lionel Messi', 'Inter Miami', 'scarce'],
  ['ronaldo', 'Cristiano Ronaldo', 'Al-Nassr', 'scarce'],
  ['yamal', 'Lamine Yamal', 'Barcelona', 'scarce', true],
  ['bellingham', 'Jude Bellingham', 'Real Madrid', 'scarce'],
].map(([id, name, club, tier, rookie = false]) => ({ id, name, club, tier, rookie }));
const CORE_HITS = {
  elevation: ['kane', 'dembele', 'ronaldo', 'haaland'],
  afterimage: ['messi', 'bellingham', 'palmer'],
  frameless: ['dowman', 'yamal', 'estevao', 'karl'],
  road: ['dembele', 'karl', 'estevao', 'ronaldo'],
  stage: ['vini', 'messi', 'palmer', 'yamal'],
};
const REWARDS = [
  ['drogba', 'Didier Drogba — APEX Reward'], ['kaka', 'Kaká — APEX Reward'],
  ['r9', 'Ronaldo Nazário — APEX Reward'], ['henry', 'Thierry Henry — APEX Reward'],
  ['ronaldinho', 'Ronaldinho — APEX Reward'], ['iniesta', 'Andrés Iniesta — APEX Reward'],
  ['cruyff', 'Johan Cruyff — APEX IMMORTAL'], ['pele', 'Pelé — APEX MASTER'],
];
const TYPES = {
  base: ['Base', 0], green: ['Green', 1], blue: ['Blue', 2], apex: ['APEX', 3],
  red: ['Red', 4], neon: ['Neon Nights', 4], ice: ['Black Ice', 4], road: ['Road to Glory', 5],
  stage: ['The Stage', 5], elevation: ['Elevation', 5], afterimage: ['Afterimage', 6],
  frameless: ['Frameless: Breakthrough', 7], onlyone: ['Gold Only One', 8],
  theapex: ['THE APEX', 9], reward: ['APEX Reward', 10],
};
const PRODUCTS = {
  normal: ['Normal Pack', 200, 1, '3 cards · standard Debut Edition odds'],
  plus: ['Plus Pack', null, 1, 'Green+ guaranteed · modestly boosted hit chance'],
  premium: ['Premium Pack', null, 1, 'Blue+ guaranteed · boosted hit chance'],
  elite: ['Elite Pack', null, 1, 'Red+ guaranteed · premium hit chance'],
  hanger: ['Hanger Box', 800, 3, '3 packs · Neon Nights guaranteed · Road to Glory live'],
  value: ['Value Box', 1750, 5, '5 packs · Black Ice + APEX guarantees · The Stage live'],
  hobby: ['Hobby Box', 4500, 8, '8 packs · Green+, Blue+, APEX+ and Red+ guarantees'],
};
const FRAMES = {
  green: 'assets/cards/debut-edition/frame-green.png',
  blue: 'assets/cards/debut-edition/frame-blue.png',
  apex: 'assets/cards/debut-edition/frame-apex.png',
  red: 'assets/cards/debut-edition/frame-red.png',
};
const SELL_VALUES = { base: 25, green: 50, blue: 90, apex: 150, red: 275, neon: 175, ice: 175, road: 250, stage: 250, elevation: 300, afterimage: 350, frameless: 450 };
let state = null;
let openingView = null;
let revealPreviewQueue = null;
let heroTimer = null;

const byId = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const inventory = () => Object.fromEntries((state?.inventory || []).map(item => [item.product, Number(item.quantity)]));
const owned = () => Object.fromEntries((state?.cards || []).map(item => [item.id, item]));

function makeCard(type, playerId, extra = {}) {
  const player = PLAYERS.find(item => item.id === playerId) || { id: playerId, name: extra.name || 'APEX Card', club: extra.club || 'APEX', tier: 'legend', rookie: false };
  return { id: `${type}:${playerId}`, type, playerId, name: player.name, club: player.club, tier: player.tier, rookie: player.rookie, ...extra };
}

function cardFromCode(code) {
  const [type = 'base', playerId = 'estevao'] = String(code || '').split(':');
  if (type === 'theapex') return makeCard(type, playerId, { name: 'Zinedine Zidane', club: 'THE APEX', tier: 'legend' });
  if (type === 'reward') return makeCard(type, playerId, { name: REWARDS.find(([id]) => id === playerId)?.[1] || 'APEX Reward', club: 'APEX REWARD', tier: 'legend' });
  return makeCard(type, playerId);
}

function definitions() {
  const cards = [];
  for (const player of PLAYERS) for (const type of ['base', 'green', 'blue', 'neon', 'ice', 'apex', 'red', 'onlyone']) cards.push(makeCard(type, player.id));
  for (const type of ['elevation', 'afterimage', 'frameless', 'road', 'stage']) for (const playerId of CORE_HITS[type]) cards.push(makeCard(type, playerId));
  cards.push(makeCard('theapex', 'zidane', { name: 'Zinedine Zidane', club: 'THE APEX', tier: 'legend' }));
  for (const [id, name] of REWARDS) cards.push(makeCard('reward', id, { name, club: 'APEX REWARD', tier: 'legend' }));
  return cards;
}

function cardArt(card) {
  if (!PLAYERS.some(player => player.id === card.playerId) || !['base', 'green', 'blue', 'apex', 'red'].includes(card.type)) return null;
  return {
    src: `assets/cards/debut-edition/base/${card.playerId}.png`,
    frame: FRAMES[card.type] || null,
    effect: card.type === 'apex' ? 'assets/cards/debut-edition/effect-apex.png' : null,
  };
}

const tierLabel = tier => tier === 'common' ? 'Common' : tier === 'uncommon' ? 'Uncommon' : tier === 'scarce' ? 'Scarce' : 'Special';
const tierShort = tier => tier === 'common' ? 'C' : tier === 'uncommon' ? 'U' : tier === 'scarce' ? 'S' : '★';
const tierPill = card => `<span class="tier-pill tier-${card.tier} card-tier-pill"><b>${tierShort(card.tier)}</b> ${tierLabel(card.tier)}</span>`;

function cardHTML(card, large = false) {
  const art = cardArt(card);
  if (art) return `<div class="apex-card art-card ${art.frame ? 'layered-parallel-art' : ''} ${large ? 'large-card' : ''}" data-card-id="${esc(card.id)}"><img class="finished-card-art" src="${art.src}" alt="${esc(card.name)} — ${esc(TYPES[card.type][0])}" draggable="false">${art.effect ? `<img class="finished-card-art parallel-effect-art" src="${art.effect}" alt="" aria-hidden="true" draggable="false">` : ''}${art.frame ? `<img class="finished-card-art parallel-frame-art" src="${art.frame}" alt="" aria-hidden="true" draggable="false">` : ''}</div>`;
  const label = TYPES[card.type]?.[0] || 'APEX';
  return `<div class="apex-card type-${esc(card.type)} ${large ? 'large-card' : ''}" data-card-id="${esc(card.id)}"><div class="card-brand"><span class="brand-a mini-card">◇a</span><span class="ucl-ball">✦</span></div>${card.rookie ? '<span class="rc-mini">RC</span>' : ''}<span class="debut-stamp">DEBUT</span><div class="player-figure"><span>${esc(card.name.split(' ')[0])}</span></div><div class="card-name"><strong>${esc(card.name)}</strong><small>${esc(card.club)}</small></div><span class="rarity-line">${esc(label)}</span></div>`;
}

function cardTile(card) {
  const quantity = Number(owned()[card.id]?.quantity || 0);
  return `<button class="binder-item card-button" data-card="${esc(card.id)}">${cardHTML(card)}${tierPill(card)}${quantity > 1 ? `<span class="dupe">×${quantity}</span>` : ''}</button>`;
}

function chrome(show) {
  document.querySelector('.app-shell').classList.toggle('account-screen', !show);
  document.querySelector('.topbar').hidden = !show;
  document.querySelector('.bottom-nav').hidden = !show;
  if (!show) setOpeningLock(false);
}
function setOpeningLock(locked) { document.body.classList.toggle('opening-locked', locked); }
function setActive(route) { document.querySelectorAll('.bottom-nav [data-route]').forEach(button => button.classList.toggle('active', button.dataset.route === route)); }
function bindRoutes(scope = root) { scope.querySelectorAll('[data-route]').forEach(button => { button.onclick = () => route(button.dataset.route); }); }
function setChrome() {
  byId('coinBalance').textContent = Number(state?.wallet?.coin_balance || 0).toLocaleString();
  document.querySelector('.profile-dot').textContent = (state?.profile?.display_name || 'P')[0].toUpperCase();
  bindRoutes(document);
}
function page(title, eyebrow = 'APEX') {
  root.innerHTML = '';
  root.append(byId('genericTemplate').content.cloneNode(true));
  byId('genericTitle').textContent = title;
  byId('genericEyebrow').textContent = eyebrow;
  bindRoutes(root);
  return byId('genericContent');
}

function auth(mode = 'signin', notice = '') {
  chrome(false);
  const signup = mode === 'signup';
  const reset = mode === 'reset';
  root.innerHTML = `<section class="account-layout"><aside class="account-art"><div class="account-copy"><p class="eyebrow">APEX UCL DEBUT EDITION 26/27</p><h1>Every pull.<br><em>Your account.</em></h1><p>Your binder, coins and unopened packs are safely saved to your APEX account—on phone, tablet and desktop.</p><div class="account-cards"><i>A</i><i>APEX</i><i>26/27</i></div></div></aside><section class="account-panel"><div class="account-panel-inner"><p class="eyebrow">${reset ? 'ACCOUNT RECOVERY' : signup ? 'NEW COLLECTOR' : 'WELCOME BACK'}</p><h2>${reset ? 'Reset your password' : signup ? 'Start your APEX account' : 'Sign in to APEX'}</h2><p class="muted">${reset ? 'We’ll email a secure reset link.' : signup ? 'Your card collection follows you everywhere.' : 'Continue your Debut Edition journey.'}</p>${!reset ? `<div class="auth-tabs"><button class="${!signup ? 'active' : ''}" data-auth="signin">Sign in</button><button class="${signup ? 'active' : ''}" data-auth="signup">Create account</button></div>` : ''}<form id="authForm" class="account-form"><label>Email<input required autocomplete="email" type="email" name="email" placeholder="you@email.com"></label>${!reset ? `<label>Password<input required minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" type="password" name="password" placeholder="At least 8 characters"></label>` : ''}<button class="primary account-submit">${reset ? 'Send reset link' : signup ? 'Create account →' : 'Sign in →'}</button></form>${!signup && !reset ? '<button class="text-button" data-auth="reset">Forgot your password?</button>' : ''}${reset ? '<button class="text-button" data-auth="signin">← Back to sign in</button>' : ''}${notice ? `<p class="form-message">${esc(notice)}</p>` : ''}<div class="preview-entry"><span>Want to check the card animation first?</span><button class="ghost preview-button" id="revealPreview">Developer reveal preview</button><small>No login · fixed demo cards · no account changes</small></div><p class="account-footnote">Your email is never visible to other collectors.</p></div></section></section>`;
  root.querySelectorAll('[data-auth]').forEach(button => { button.onclick = () => auth(button.dataset.auth); });
  byId('revealPreview').onclick = startRevealPreview;
  byId('authForm').onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      if (reset) { await resetPassword(form.get('email')); return auth('signin', 'Check your email for the reset link.'); }
      if (signup) {
        const result = await signUp(form.get('email'), form.get('password'));
        if (!result?.session) return auth('signin', 'Check your email and confirm your address. The confirmation button will return you to APEX.');
      } else await signIn(form.get('email'), form.get('password'));
      await boot();
    } catch (error) { auth(mode, error.message); }
  };
}

function startRevealPreview() {
  clearInterval(heroTimer);
  chrome(false);
  revealPreviewQueue = [
    makeCard('base', 'estevao'),
    makeCard('green', 'haaland'),
    makeCard('red', 'yamal'),
  ];
  openingView = { id: 'local-reveal-preview', productKey: 'normal', packCount: 1, pulled: [], preview: true };
  renderOpeningPack();
}

function onboarding(notice = '') {
  chrome(false);
  let legacy;
  try { legacy = readLegacySave(); } catch {}
  root.innerHTML = `<section class="onboarding page"><p class="eyebrow">WELCOME TO APEX</p><h1>Make this binder yours.</h1><p class="muted">Choose your collector name, then choose how to begin.</p><div class="onboarding-grid"><form id="onboard" class="generic-card onboarding-form"><label>Collector name<input required maxlength="40" name="name" placeholder="How should APEX know you?"></label><label>Username <span>optional</span><input pattern="[A-Za-z0-9_]{3,24}" name="username" placeholder="3–24 letters, numbers or _"></label><button class="primary">Start a new account →</button>${notice ? `<p class="form-message">${esc(notice)}</p>` : ''}</form><article class="starter-choice"><p class="eyebrow">FIRST SEASON</p><h2>Start with the beta collection</h2><p>Starter coins and sealed product are applied server-side—not on this device.</p><b>◉ Secure online save</b></article>${legacy ? `<button class="import-choice" id="import"><p class="eyebrow">EXISTING PLAYER</p><h2>Import this device’s save</h2><p>${Number(legacy.coins).toLocaleString()} coins · ${Object.keys(legacy.cards).length} card entries</p><b>Review & import →</b></button>` : '<article class="import-choice muted"><p class="eyebrow">EXISTING PLAYER</p><h2>No local save on this device</h2><p>Start fresh, then play this account everywhere.</p></article>'}</div></section>`;
  byId('onboard').onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { state = await gameApi('onboard', { displayName: form.get('name'), username: form.get('username') }); if (!(await openDailyRewardOnArrival())) route('home'); }
    catch (error) { onboarding(error.message); }
  };
  byId('import')?.addEventListener('click', async () => {
    if (!confirm('Import this local APEX save once? This cannot be undone.')) return;
    try { state = await gameApi('import.localSave', { save: legacy }); if (!(await openDailyRewardOnArrival())) route('home'); }
    catch (error) { onboarding(error.message); }
  });
}

async function refresh() { state = await gameApi('bootstrap'); }

function roadState() {
  const career = state.career || {};
  const colour = (state.cards || []).filter(item => { const rank = TYPES[cardFromCode(item.id).type]?.[1] || 0; return rank >= 1 && rank < 8; }).length;
  const chapters = [
    ['01', 'First Touch', 'Open your first real pack.', Number(career.packs_opened || 0), 1, 'open', 'Open a pack'],
    ['02', 'Build the Core', 'Own 5 Debut Edition cards.', state.cards?.length || 0, 5, 'collection', 'View collection'],
    ['03', 'Rising Stars', 'Finish a Quick Draft.', Number(career.drafts_played || 0), 1, 'draft', 'Start Quick Draft'],
    ['04', 'Chasing Colour', 'Own a Green parallel or better.', colour, 1, 'collection', 'Chase colour'],
    ['05', 'Reach the APEX', 'Complete any SBC.', Number(career.sbcs_completed || 0), 1, 'sbc', 'Build an SBC'],
  ].map(([number, name, desc, progress, target, routeName, action]) => ({ number, name, desc, progress: Math.min(progress, target), target, route: routeName, action, done: progress >= target }));
  const complete = chapters.filter(chapter => chapter.done).length;
  return { chapters, complete, active: chapters.find(chapter => !chapter.done) || { number: '✓', name: 'Road Complete', desc: 'Your Debut Edition journey is underway.', progress: 1, target: 1, route: 'objectives', action: 'View objectives' } };
}

function home() {
  clearInterval(heroTimer);
  root.innerHTML = '';
  root.append(byId('homeTemplate').content.cloneNode(true));
  const inv = inventory();
  const packCount = ['normal', 'plus', 'premium', 'elite'].reduce((sum, key) => sum + (inv[key] || 0), 0);
  const boxCount = ['hanger', 'value', 'hobby'].reduce((sum, key) => sum + (inv[key] || 0), 0);
  const unique = state.cards?.length || 0;
  byId('heroPackCount').textContent = `${packCount} pack${packCount === 1 ? '' : 's'}`;
  byId('heroBoxCount').textContent = `${boxCount} box${boxCount === 1 ? '' : 'es'}`;
  byId('draftStars').textContent = Number(state.career?.draft_stars || 0);
  byId('perfectRushes').textContent = Number(state.career?.perfect_rushes || 0);
  byId('collectionOwned').textContent = unique;
  byId('collectionPct').textContent = `${Math.round(unique / 124 * 100)}%`;
  const road = roadState();
  const chapter = road.active;
  byId('roadToDebut').innerHTML = `<div class="road-top"><div><p class="eyebrow">ROAD TO DEBUT · ${road.complete}/5</p><h2>${chapter.number} · ${chapter.name}</h2><p>${chapter.desc}</p></div><button class="tiny-btn" id="roadDetails">Full path</button></div><div class="progress road-progress"><i style="width:${road.complete * 20}%"></i></div><div class="road-bottom"><span>${chapter.progress}/${chapter.target} · Online progression</span><button class="primary road-action" id="roadAction">${chapter.action} →</button></div>`;
  byId('homeFocus').innerHTML = `<p class="eyebrow">TODAY IN APEX</p><h3>${packCount ? 'Your next pull is waiting' : 'Build your sealed inventory'}</h3><p>${packCount ? `You have ${packCount} sealed pack${packCount === 1 ? '' : 's'} ready to reveal.` : 'Visit the Store to pick up a Normal Pack.'}</p><div class="progress"><i style="width:${packCount ? 100 : 0}%"></i></div><p class="muted focus-meta">${packCount ? 'Ready' : '0/1'} · Secure online opening</p><div class="button-row"><button class="tiny-btn primary-mini" id="homeObjectives">${packCount ? 'Open packs' : 'Visit store'}</button><button class="tiny-btn" data-route="rewards">Daily reward</button></div>`;
  byId('roadAction').onclick = () => route(chapter.route);
  byId('roadDetails').onclick = showRoad;
  byId('homeObjectives').onclick = () => route(packCount ? 'open' : 'store');
  const track = byId('heroTrack');
  const dots = byId('heroDots');
  let index = 0;
  const go = next => { index = next; track.style.transform = `translateX(-${next * 100}%)`; [...dots.children].forEach((dot, dotIndex) => dot.classList.toggle('active', next === dotIndex)); };
  [...track.children].forEach((_, dotIndex) => { const dot = document.createElement('button'); dot.className = dotIndex === 0 ? 'active' : ''; dot.onclick = () => go(dotIndex); dots.append(dot); });
  heroTimer = setInterval(() => go((index + 1) % track.children.length), 5500);
  track.onmouseenter = () => clearInterval(heroTimer);
  bindRoutes(root);
}

function showRoad() {
  const content = page('Road to Debut', 'YOUR APEX START');
  const road = roadState();
  content.innerHTML = `<div class="generic-card"><h3>Your starting path</h3><p class="muted">Five milestones teach the core loop: rip packs, collect, play, chase colour, then turn spare cards into SBC rewards.</p></div><div class="road-chapter-list">${road.chapters.map(chapter => `<article class="road-chapter ${chapter.done ? 'road-claimed' : ''}"><span class="road-number">${chapter.done ? '✓' : chapter.number}</span><div><p class="eyebrow">${chapter.done ? 'COMPLETED' : 'NEXT MILESTONE'}</p><h3>${chapter.name}</h3><p>${chapter.desc}</p><div class="progress"><i style="width:${chapter.progress / chapter.target * 100}%"></i></div><small>${chapter.progress}/${chapter.target} · Online progression</small></div><button class="tiny-btn" data-road="${chapter.route}">${chapter.done ? 'Done' : 'Go'}</button></article>`).join('')}</div>`;
  content.querySelectorAll('[data-road]').forEach(button => { button.onclick = () => route(button.dataset.road); });
}

function open() {
  const inv = inventory();
  const content = page('Open Packs', 'SEALED INVENTORY');
  content.innerHTML = `<div class="notice">Your sealed products and every pull are protected by your APEX account. Refreshing cannot change an opening.</div><div class="inventory-grid" style="margin-top:16px">${Object.entries(PRODUCTS).map(([key, item]) => `<div class="inventory-item"><p class="eyebrow">UCL DEBUT EDITION</p><h3>${item[0]}</h3><div class="qty">×${inv[key] || 0}</div><div class="button-row">${inv[key] ? `<button class="tiny-btn primary-mini" data-open="${key}">Open 1</button>${inv[key] > 1 ? `<button class="tiny-btn" data-open-many="${key}">Choose amount</button>` : ''}` : '<span class="muted">None owned</span>'}</div></div>`).join('')}</div>`;
  content.querySelectorAll('[data-open]').forEach(button => { button.onclick = () => startOpening(button.dataset.open, 1, button); });
  content.querySelectorAll('[data-open-many]').forEach(button => { button.onclick = () => amountPicker(button.dataset.openMany); });
}

function modal(html) {
  byId('apexModal')?.remove();
  const shell = document.createElement('div');
  shell.id = 'apexModal';
  shell.className = 'modal-shell';
  shell.innerHTML = `<div class="modal-card">${html}</div>`;
  document.body.append(shell);
  return shell;
}

function amountPicker(key) {
  const max = Math.min(20, inventory()[key] || 0);
  let quantity = Math.min(5, max);
  const shell = modal(`<p class="eyebrow">OPEN PACKS</p><h3>Choose ${esc(PRODUCTS[key][0])} quantity</h3><p class="muted">${max} available</p><div class="qty-stepper"><button class="qty-btn" id="qtyMinus">−</button><strong id="qtyValue">${quantity}</strong><button class="qty-btn" id="qtyPlus">＋</button></div><div class="qty-shortcuts"><button class="tiny-btn" id="qtyMax">MAX</button></div><div class="button-row"><button class="primary" id="qtyConfirm">Open</button><button class="ghost" id="modalCancel">Cancel</button></div>`);
  const paint = () => { byId('qtyValue').textContent = quantity; byId('qtyMinus').disabled = quantity <= 1; byId('qtyPlus').disabled = quantity >= max; };
  byId('qtyMinus').onclick = () => { quantity = Math.max(1, quantity - 1); paint(); };
  byId('qtyPlus').onclick = () => { quantity = Math.min(max, quantity + 1); paint(); };
  byId('qtyMax').onclick = () => { quantity = max; paint(); };
  byId('modalCancel').onclick = () => shell.remove();
  byId('qtyConfirm').onclick = event => { shell.remove(); startOpening(key, quantity, event.currentTarget); };
  paint();
}

async function startOpening(productKey, quantity, button) {
  if (button) { button.disabled = true; button.textContent = 'Sealing…'; }
  try {
    await gameApi('open.start', { productKey, quantity });
    await refresh();
    prepareOpeningView();
    renderOpeningPack();
  } catch (error) {
    if (button) { button.disabled = false; button.textContent = error.message; }
  }
}

function prepareOpeningView() {
  const opening = state.activeOpening;
  openingView = {
    id: opening.id,
    productKey: opening.productKey,
    packCount: Number(opening.packCount),
    pulled: (opening.revealed || []).map(item => ({ ...item, card: cardFromCode(item.cardCode) })),
  };
}

function resumeOpening() {
  if (!state.activeOpening) return open();
  prepareOpeningView();
  renderOpeningPack(Number(state.activeOpening.currentReveal) > 0);
}

function renderOpeningPack(skipPack = false) {
  const preview = Boolean(openingView?.preview);
  const opening = preview ? { currentPack: 0 } : state?.activeOpening;
  if (!opening || !openingView) return recap();
  clearInterval(heroTimer);
  setOpeningLock(true);
  root.innerHTML = `<section class="opening-page"><div class="opening-top"><div class="opening-lock-status">${preview ? '◉ Demo preview · no save' : '🔒 Opening locked'}</div><div><p class="eyebrow">${esc(PRODUCTS[openingView.productKey]?.[0] || 'APEX Opening')}</p><h2>${preview ? 'Reveal preview' : `Pack ${Number(opening.currentPack) + 1} of ${openingView.packCount}`}</h2></div><div class="opening-progress">${openingView.pulled.length} cards pulled</div></div><div class="pack-stage"><div class="foil interactive-pack" id="ripPack"><img class="pack-wordmark" src="assets/brand/apex-wordmark-primary.svg" alt="APEX"><small>DEBUT EDITION 26/27</small><em>TAP TO RIP</em></div><div class="reveal-area" id="revealArea"></div></div></section>`;
  byId('ripPack').onclick = () => { byId('ripPack').classList.add('ripped'); setTimeout(showCardBack, 250); };
  if (skipPack) { byId('ripPack').remove(); showCardBack(); }
}

function cardBackHTML() {
  return `<button class="card-back-wrap" id="cardBack" aria-label="Tap to reveal card"><div class="reveal-card"><img class="reveal-layer reveal-base" src="assets/brand/reveal/debut-edition-26-27/reveal-card-base.png" alt=""><img class="reveal-layer reveal-foil" src="assets/brand/reveal/debut-edition-26-27/reveal-card-foil-pattern.png" alt=""><img class="reveal-layer reveal-glow" src="assets/brand/reveal/debut-edition-26-27/reveal-card-idle-glow.png" alt=""><img class="reveal-layer reveal-set" src="assets/brand/reveal/debut-edition-26-27/debut-edition-set-lockup.png" alt="Debut Edition 26/27"><img class="reveal-layer reveal-mark" src="assets/brand/reveal/debut-edition-26-27/reveal-card-central-mark.png" alt="APEX"><img class="reveal-layer reveal-scan" src="assets/brand/reveal/debut-edition-26-27/reveal-card-scan-overlay.png" alt="" aria-hidden="true"><div class="reveal-ucl-lockup" aria-label="UEFA Champions League"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="uclStar" d="M0-13 3-5 12-5 5 1 8 10 0 5-8 10-5 1-12-5-3-5Z"/></defs><g fill="currentColor"><use href="#uclStar" transform="translate(50 20)"/><use href="#uclStar" transform="translate(71 29) rotate(45 71 29)"/><use href="#uclStar" transform="translate(80 50) rotate(90 80 50)"/><use href="#uclStar" transform="translate(71 71) rotate(135 71 71)"/><use href="#uclStar" transform="translate(50 80) rotate(180 50 80)"/><use href="#uclStar" transform="translate(29 71) rotate(225 29 71)"/><use href="#uclStar" transform="translate(20 50) rotate(270 20 50)"/><use href="#uclStar" transform="translate(29 29) rotate(315 29 29)"/></g></svg><span>CHAMPIONS<br>LEAGUE</span></div><em class="reveal-instruction">TAP TO REVEAL</em></div></button>`;
}

function showCardBack() {
  const area = byId('revealArea');
  if (!area) return;
  area.innerHTML = cardBackHTML();
  byId('cardBack').onclick = openingView?.preview ? revealPreviewNext : revealNext;
}

async function revealPreviewNext() {
  const back = byId('cardBack');
  if (!back || back.disabled || !openingView?.preview) return;
  const revealIndex = openingView.pulled.length;
  const card = revealPreviewQueue?.[revealIndex];
  if (!card) return previewRecap();
  back.disabled = true;
  back.classList.add('is-revealing');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  await new Promise(resolve => setTimeout(resolve, reduced ? 200 : 740));
  const pulled = { card, cardCode: card.id, packIndex: 0, revealIndex, completed: revealIndex === revealPreviewQueue.length - 1 };
  openingView.pulled.push(pulled);
  showRevealed(pulled);
}

async function revealNext() {
  const back = byId('cardBack');
  if (!back || back.disabled) return;
  back.disabled = true;
  back.classList.add('is-revealing');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  try {
    const [result] = await Promise.all([
      gameApi('open.reveal', { openingId: openingView.id }),
      new Promise(resolve => setTimeout(resolve, reduced ? 200 : 740)),
    ]);
    const pulled = { ...result, card: cardFromCode(result.cardCode) };
    if (!openingView.pulled.some(item => item.packIndex === result.packIndex && item.revealIndex === result.revealIndex)) openingView.pulled.push(pulled);
    await refresh();
    showRevealed(pulled);
  } catch (error) {
    showCardBack();
    const message = document.createElement('p');
    message.className = 'reveal-error';
    message.textContent = error.message;
    byId('revealArea')?.append(message);
  }
}

function showRevealed(pulled) {
  const card = pulled.card;
  const last = Number(pulled.revealIndex) === 2;
  const finalPack = Boolean(pulled.completed);
  byId('revealArea').innerHTML = `<button class="revealed-card-click" id="cardAdvance">${cardHTML(card, true)}</button><div class="reveal-caption"><span class="reveal-count">${Number(pulled.revealIndex) + 1}/3</span><strong>${esc((TYPES[card.type]?.[0] || 'APEX').toUpperCase())} · ${tierLabel(card.tier)}</strong><em>Tap card to ${last ? (finalPack ? 'finish' : 'open next pack') : 'reveal next'}</em></div>`;
  root.querySelector('.opening-progress').textContent = `${openingView.pulled.length} cards pulled`;
  byId('cardAdvance').onclick = () => {
    if (openingView?.preview) return last ? previewRecap() : showCardBack();
    return finalPack ? recap() : last ? renderOpeningPack() : showCardBack();
  };
}

function previewRecap() {
  const pulled = openingView?.pulled || [];
  setOpeningLock(false);
  root.innerHTML = `<section class="preview-recap page"><div class="recap-hero"><div><p class="eyebrow">DEVELOPER REVEAL PREVIEW</p><h2>Reveal complete</h2><p class="muted">All three live card faces rendered successfully. This demo did not sign in, spend a pack or change a collection.</p></div><div class="button-row"><button class="primary" id="replayPreview">Replay preview</button><button class="ghost" id="exitPreview">Back to sign in</button></div></div><div class="preview-card-grid">${pulled.map(item => `<article>${cardHTML(item.card)}<strong>${esc(item.card.name)}</strong><small>${esc(TYPES[item.card.type]?.[0] || 'APEX')}</small></article>`).join('')}</div></section>`;
  byId('replayPreview').onclick = startRevealPreview;
  byId('exitPreview').onclick = () => {
    revealPreviewQueue = null;
    openingView = null;
    auth();
  };
}

function recap() {
  setOpeningLock(false);
  const pulled = openingView?.pulled || [];
  const hits = pulled.filter(item => (TYPES[item.card.type]?.[1] || 0) >= 4);
  const content = page('Opening Complete', 'RIP RECAP');
  content.innerHTML = `<div class="recap-hero"><div><p class="eyebrow">${openingView?.packCount || 1} PACK${openingView?.packCount === 1 ? '' : 'S'} OPENED</p><h2>${pulled.length} cards added</h2><p class="muted">${hits.length} Red-or-better / exclusive hits · all pulls saved to your online binder.</p></div><div class="button-row"><button class="primary" data-route="open">← Back to Open Packs</button><button class="ghost" data-route="store">Go to Store</button><button class="ghost" data-route="collection">View Collection</button></div></div><div class="binder-grid recap-grid">${pulled.map(item => cardTile(item.card)).join('')}</div>`;
  openingView = null;
  bindRoutes(content);
  bindCardClicks(content);
  setChrome();
}

function sectionHTML(title, types) {
  const records = owned();
  const cards = definitions().filter(card => types.includes(card.type));
  return `<section class="collection-section"><div class="section-heading"><h2>${title}</h2><span>${cards.filter(card => Number(records[card.id]?.quantity || 0) > 0).length}/${cards.length}</span></div><div class="binder-grid">${cards.map(card => Number(records[card.id]?.quantity || 0) > 0 ? cardTile(card) : '<div class="binder-item empty"><div class="empty-slot"></div><strong>Empty slot</strong><small class="muted">Not owned</small></div>').join('')}</div></section>`;
}

function collection(tab = 'sets') {
  const content = page('Collection', 'BINDER');
  const records = owned();
  const all = definitions();
  const count = all.filter(card => Number(records[card.id]?.quantity || 0) > 0).length;
  content.innerHTML = `<div class="section-tabs"><button data-tab="sets" class="${tab === 'sets' ? 'active' : ''}">Sets</button><button data-tab="duplicates" class="${tab === 'duplicates' ? 'active' : ''}">Duplicate Vault</button><button data-tab="gallery" class="${tab === 'gallery' ? 'active' : ''}">Gallery</button></div><div id="collectionBody"></div>`;
  content.querySelectorAll('[data-tab]').forEach(button => { button.onclick = () => collection(button.dataset.tab); });
  const body = byId('collectionBody');
  if (tab === 'sets') {
    body.innerHTML = `<div class="generic-card"><p class="eyebrow">APEX UCL DEBUT EDITION 26/27</p><h3>${count} / ${all.length} owned</h3><p class="muted">${count} discovered · ${Math.round(count / all.length * 100)}% collection complete</p><div class="progress"><i style="width:${count / all.length * 100}%"></i></div><div class="rarity-guide"><span class="tier-pill tier-common"><b>C</b> Common</span><span class="tier-pill tier-uncommon"><b>U</b> Uncommon</span><span class="tier-pill tier-scarce"><b>S</b> Scarce</span></div></div>${sectionHTML('Base', ['base'])}${sectionHTML('Green', ['green'])}${sectionHTML('Blue', ['blue'])}${sectionHTML('Neon Nights', ['neon'])}${sectionHTML('Black Ice', ['ice'])}${sectionHTML('APEX', ['apex'])}${sectionHTML('Red', ['red'])}${sectionHTML('Only One', ['onlyone'])}${sectionHTML('Elevation', ['elevation'])}${sectionHTML('Afterimage', ['afterimage'])}${sectionHTML('Frameless: Breakthrough', ['frameless'])}${sectionHTML('Road to Glory', ['road'])}${sectionHTML('The Stage', ['stage'])}${sectionHTML('THE APEX', ['theapex'])}${sectionHTML('APEX Rewards', ['reward'])}`;
  } else if (tab === 'duplicates') showDuplicates(body);
  else {
    const cards = all.filter(card => records[card.id]?.gallery);
    body.innerHTML = `<div class="generic-card"><h3>Your Gallery</h3><p class="muted">Gallery cards are protected from SBC submissions.</p></div><div class="gallery-grid">${cards.length ? cards.map(cardTile).join('') : '<div class="notice">Your gallery is empty. Open a card and choose Add to Gallery.</div>'}</div>`;
  }
  bindCardClicks(body);
}

function showDuplicates(body) {
  const records = owned();
  const cards = definitions().filter(card => Number(records[card.id]?.quantity || 0) > 1 && SELL_VALUES[card.type]);
  const spares = cards.reduce((sum, card) => sum + Number(records[card.id].quantity) - 1, 0);
  body.innerHTML = `<div class="generic-card"><p class="eyebrow">DUPLICATE VAULT</p><h3>${spares} spare card${spares === 1 ? '' : 's'}</h3><p class="muted">Sell a selected amount while one copy always remains in your binder.</p></div>${cards.length ? `<div class="duplicate-grid">${cards.map(card => `<article class="duplicate-card" data-row="${card.id}" data-max="${Number(records[card.id].quantity) - 1}" data-qty="1">${cardHTML(card)}<div class="duplicate-copy"><p class="eyebrow">${TYPES[card.type][0].toUpperCase()}</p><h3>${esc(card.name)}</h3><p class="muted">Own ${records[card.id].quantity} · keeping 1</p><div class="duplicate-sell-row"><div class="inline-stepper"><button class="qty-btn" data-minus>−</button><output data-output>1</output><button class="qty-btn" data-plus>＋</button></div><button class="tiny-btn primary-mini" data-sell>Sell 1 · ${SELL_VALUES[card.type]} ◉</button></div></div></article>`).join('')}</div>` : '<div class="notice">No spare cards yet. Any card beyond your first copy will appear here automatically.</div>'}`;
  body.querySelectorAll('[data-row]').forEach(row => {
    const card = cardFromCode(row.dataset.row);
    const paint = () => { const quantity = Number(row.dataset.qty); row.querySelector('[data-output]').textContent = quantity; row.querySelector('[data-minus]').disabled = quantity <= 1; row.querySelector('[data-plus]').disabled = quantity >= Number(row.dataset.max); row.querySelector('[data-sell]').textContent = `Sell ${quantity} · ${(quantity * SELL_VALUES[card.type]).toLocaleString()} ◉`; };
    row.querySelector('[data-minus]').onclick = () => { row.dataset.qty = String(Math.max(1, Number(row.dataset.qty) - 1)); paint(); };
    row.querySelector('[data-plus]').onclick = () => { row.dataset.qty = String(Math.min(Number(row.dataset.max), Number(row.dataset.qty) + 1)); paint(); };
    row.querySelector('[data-sell]').onclick = async event => { event.currentTarget.disabled = true; try { await gameApi('quickSell', { cards: { [card.id]: Number(row.dataset.qty) } }); await refresh(); collection('duplicates'); } catch (error) { event.currentTarget.disabled = false; event.currentTarget.textContent = error.message; } };
    paint();
  });
}

function bindCardClicks(scope) { scope.querySelectorAll('[data-card]').forEach(button => { button.onclick = () => details(button.dataset.card); }); }
function details(code) {
  const card = cardFromCode(code);
  const record = owned()[code] || { quantity: 0, lifetime: 0, gallery: false };
  const content = page(card.name, (TYPES[card.type]?.[0] || 'APEX').toUpperCase());
  content.innerHTML = `<div class="card-detail-layout">${cardHTML(card, true)}<div class="generic-card detail-panel"><h3>${esc(TYPES[card.type]?.[0] || 'APEX')}</h3><p>${esc(card.club)}${card.rookie ? ' · Rookie' : ''}</p><div class="list"><div class="list-row"><span>Owned</span><b>×${Number(record.quantity || 0)}</b></div><div class="list-row"><span>Lifetime pulled</span><b>${Number(record.lifetime || 0)}</b></div><div class="list-row"><span>Player rarity</span><b>${tierShort(card.tier)} · ${tierLabel(card.tier)}</b></div><div class="list-row"><span>Status</span><b>Discovered</b></div></div><div class="button-row"><button class="primary" id="galleryToggle">${record.gallery ? 'Remove from Gallery' : 'Add to Gallery'}</button><button class="ghost" data-route="collection">Back to Binder</button></div></div></div>`;
  byId('galleryToggle').onclick = async event => { event.currentTarget.disabled = true; try { await gameApi('gallery', { cardCode: code, enabled: !record.gallery }); await refresh(); details(code); } catch (error) { event.currentTarget.disabled = false; event.currentTarget.textContent = error.message; } };
  bindRoutes(content);
}

function store() {
  const content = page('Store', 'SEALED PRODUCTS');
  content.innerHTML = `<div class="notice">Balance: ${Number(state.wallet?.coin_balance || 0).toLocaleString()} coins. Purchases are checked and applied by the APEX server.</div><div class="store-grid" style="margin-top:16px">${Object.entries(PRODUCTS).filter(([, item]) => item[1]).map(([key, item]) => `<article class="store-item"><p class="eyebrow">APEX UCL DEBUT EDITION</p><h3>${item[0]}</h3><div class="product-visual ${key}">apex<span class="seal">◇ SEALED</span></div><p class="muted">${item[3]}</p><div class="button-row"><button class="tiny-btn primary-mini" data-buy="${key}">Buy 1 · ${item[1].toLocaleString()} ◉</button></div></article>`).join('')}</div>`;
  content.querySelectorAll('[data-buy]').forEach(button => { button.onclick = () => confirmPurchase(button.dataset.buy); });
}
function confirmPurchase(key) {
  const item = PRODUCTS[key];
  const shell = modal(`<p class="eyebrow">CONFIRM PURCHASE</p><h3>1 × ${esc(item[0])}</h3><p>Spend <b>${item[1].toLocaleString()} coins</b>?</p><div class="button-row"><button class="primary" id="confirmBuy">Confirm purchase</button><button class="ghost" id="modalCancel">Cancel</button></div>`);
  byId('modalCancel').onclick = () => shell.remove();
  byId('confirmBuy').onclick = async event => { event.currentTarget.disabled = true; event.currentTarget.textContent = 'Purchasing…'; try { await gameApi('purchase', { productKey: key }); await refresh(); shell.remove(); store(); setChrome(); } catch (error) { event.currentTarget.disabled = false; event.currentTarget.textContent = error.message; } };
}

function rewardText(payload = {}) {
  const parts = [];
  if (Number(payload.coins || 0)) parts.push(`${Number(payload.coins).toLocaleString()} coins`);
  if (Number(payload.xp || 0)) parts.push(`${Number(payload.xp).toLocaleString()} XP`);
  Object.entries(payload.packs || {}).forEach(([key, quantity]) => parts.push(`${quantity} × ${PRODUCTS[key]?.[0] || key}`));
  return parts.join(' · ') || 'APEX reward';
}

function rewardArt(payload = {}, size = 'card') {
  const packs = payload?.packs || {};
  const packKey = Object.keys(packs).find(key => Number(packs[key]) > 0) || '';
  const artPack = ['normal', 'plus', 'premium', 'elite'].includes(packKey) ? packKey : 'normal';
  const packLabel = (PRODUCTS[packKey]?.[0] || packKey || 'Pack').replace(/\s+Pack$/i, '');
  const coins = Number(payload?.coins || 0);
  const xp = Number(payload?.xp || 0);
  const parts = [];

  if (packKey) parts.push(`<span class="daily-pack daily-pack-${artPack}"><i></i><b>◇</b><small>${esc(packLabel)}</small></span>`);
  if (coins) parts.push(`<span class="daily-coins"><i></i><i></i><i></i><b>◇</b></span>`);
  if (xp) parts.push(`<span class="daily-xp"><b>XP</b><small>${xp.toLocaleString()}</small></span>`);
  if (!parts.length) parts.push(`<span class="daily-glyph">◇</span>`);

  return `<div class="daily-art daily-art-${size} ${packKey === 'elite' ? 'is-elite' : ''}" aria-hidden="true">${parts.join('')}</div>`;
}

function dailyRewardCard(item, currentDay, claimed) {
  const day = Number(item?.day || 0);
  const isCurrent = day === currentDay;
  const isClaimed = day < currentDay || (isCurrent && claimed);
  const status = isClaimed ? 'claimed' : isCurrent ? 'current' : 'locked';
  const elite = Number(item?.payload?.packs?.elite || 0) > 0;
  const marker = isClaimed ? '✓' : isCurrent ? 'NOW' : '⌁';

  return `<article class="daily-reward-card ${status} ${elite ? 'elite' : ''}">
    <div class="daily-card-top"><span>DAY ${day}</span><b aria-label="${isClaimed ? 'Claimed' : isCurrent ? 'Available now' : 'Locked'}">${marker}</b></div>
    ${rewardArt(item?.payload || {}, 'card')}
    <strong>${esc(item?.name || 'APEX reward')}</strong>
    <small>${esc(rewardText(item?.payload || {}))}</small>
  </article>`;
}

async function rewards(initialDaily = null) {
  const content = page('Daily Rewards', '7 DAY LOGIN TRACK');
  content.innerHTML = '<div class="notice">Loading your server-verified daily reward…</div>';

  try {
    const daily = initialDaily || await gameApi('daily.status');
    const track = daily.track || [];
    const currentDay = Number(daily.currentDay || 1);
    const claimed = Boolean(daily.alreadyClaimed);
    const currentReward = daily.reward || track.find(item => Number(item.day) === currentDay) || {};
    const currentPayload = currentReward.payload || {};
    const isEliteDay = Number(currentPayload?.packs?.elite || 0) > 0;
    const headline = claimed ? 'Reward secured for today.' : isEliteDay ? 'The Elite reward is ready.' : `Day ${currentDay} is ready.`;

    content.innerHTML = `<section class="daily-reward-hero ${isEliteDay ? 'is-elite' : ''}">
      <div class="daily-hero-copy">
        <p class="eyebrow">APEX DAILY LOGIN</p>
        <h2>${headline}</h2>
        <p>${claimed ? 'Your reward has been added securely. Come back after the next APEX server day to continue the track.' : 'Claim your reward to continue the seven-day run. Pack rewards go straight into your unopened inventory.'}</p>
        <div class="daily-claim-row">
          ${claimed ? '<button class="ghost" data-route="home">Back home</button>' : '<button class="primary daily-claim" id="claimDaily"><span>Claim reward</span><i aria-hidden="true">→</i></button><button class="ghost" data-route="home">Not now</button>'}
          <small>Server-verified · one claim per day</small>
        </div>
      </div>
      <aside class="daily-feature">
        <div class="daily-feature-orbit" aria-hidden="true"></div>
        ${rewardArt(currentPayload, 'hero')}
        <div class="daily-feature-copy">
          <span>DAY ${currentDay}</span>
          <b>${esc(currentReward.name || 'Daily reward')}</b>
          <small>${esc(rewardText(currentPayload))}</small>
        </div>
      </aside>
    </section>
    <section class="daily-track-section" aria-label="Seven-day Daily Login Rewards track">
      <div class="daily-track-heading">
        <div><p class="eyebrow">7 DAY LOGIN TRACK</p><h3>Collect your way to the Elite Pack.</h3></div>
        <span>${claimed ? 'Come back tomorrow' : `Day ${currentDay} available`}</span>
      </div>
      <div class="daily-track">${track.map(item => dailyRewardCard(item, currentDay, claimed)).join('')}</div>
    </section>`;

    const claim = byId('claimDaily');
    if (claim) claim.onclick = async () => {
      claim.disabled = true;
      content.classList.add('daily-claim-pending');
      claim.innerHTML = '<span>Securing reward</span><i aria-hidden="true">…</i>';
      try {
        await gameApi('daily.claim');
        await refresh();
        await rewards();
      } catch (error) {
        content.classList.remove('daily-claim-pending');
        claim.disabled = false;
        claim.textContent = error.message || 'Try again';
      }
    };
    bindRoutes(content);
  } catch (error) {
    content.innerHTML = `<div class="notice">Daily rewards are temporarily unavailable. ${esc(error.message || 'Please try again.')}</div>`;
  }
}

async function openDailyRewardOnArrival() {
  if (state?.activeOpening) return false;
  try {
    const daily = await gameApi('daily.status');
    if (daily.alreadyClaimed) return false;
    route('rewards', { daily });
    return true;
  } catch {
    return false;
  }
}

function friends() {
  renderFriends({ page, gameApi, esc, byId });
}

function clubs() {
  renderClubs({ page, gameApi, esc, byId });
}

function profile() {
  const career = state.career || {};
  const content = page('Profile & Stats', 'YOUR APEX CAREER');
  content.innerHTML = `<div class="stat-grid"><div class="stat-item"><span class="qty">${Number(career.packs_opened || 0)}</span><p>Real packs opened</p></div><div class="stat-item"><span class="qty">${Number(career.boxes_opened || 0)}</span><p>Boxes opened</p></div><div class="stat-item"><span class="qty">${Number(career.cards_pulled || 0)}</span><p>Cards pulled</p></div><div class="stat-item"><span class="qty">${state.cards?.length || 0}</span><p>Unique cards owned</p></div><div class="stat-item"><span class="qty">${Number(career.draft_stars || 0)}</span><p>Draft Stars</p></div><div class="stat-item"><span class="qty">${Number(career.xp || 0)}</span><p>APEX XP</p></div><div class="stat-item"><span class="qty">${Number(career.quick_sell_coins || 0).toLocaleString()}</span><p>Coins from spares</p></div></div><div class="generic-card" style="margin-top:14px"><p class="eyebrow">APEX ACCOUNT</p><h3>${esc(state.profile?.display_name || 'Collector')}</h3><p class="muted">@${esc(state.profile?.username || 'apex-collector')} · secure cloud save</p><div class="profile-actions"><button class="tiny-btn" id="clubs">Clubs</button><button class="tiny-btn" id="friends">Friends</button><button class="tiny-btn" id="logout">Sign out</button></div></div>`;
  byId('clubs').onclick = () => route('clubs');
  byId('friends').onclick = () => route('friends');
  byId('logout').onclick = async () => { await signOut(); state = null; auth(); };
}

function soon(name) {
  const content = page(name, 'APEX ONLINE');
  content.innerHTML = `<div class="generic-card"><h3>${esc(name)} is being connected</h3><p class="muted">This mode remains locked until its secure server actions are ready. Your account, packs and binder are already online.</p><button class="primary" data-route="home">Back home</button></div>`;
  bindRoutes(content);
}

function route(name = 'home', options = {}) {
  chrome(true);
  setChrome();
  if (state.activeOpening && name !== 'open') return resumeOpening();
  setOpeningLock(false);
  setActive(name);
  if (name === 'home') home();
  else if (name === 'open') state.activeOpening ? resumeOpening() : open();
  else if (name === 'collection') collection();
  else if (name === 'store') store();
  else if (name === 'profile') profile();
  else if (name === 'friends') friends();
  else if (name === 'clubs') clubs();
  else if (name === 'rewards') rewards(options.daily);
  else soon(name === 'objectives' ? 'Objectives' : name === 'draft' ? 'Quick Draft' : name === 'sbc' ? 'SBCs' : 'Pack Rush');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function boot() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return auth();
  await refresh();
  if (!state.profile?.onboarding_completed) return onboarding();
  if (!(await openDailyRewardOnArrival())) route('home');
}

supabase.auth.onAuthStateChange((_event, session) => { if (!session) { state = null; auth(); } });
boot().catch(error => auth('signin', error.message));
