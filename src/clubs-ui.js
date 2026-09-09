export function renderClubs({ page, gameApi, esc, byId }) {
  const content = page('Clubs', 'APEX CLUBS');
  let clubState = { membership: null, club: null, members: [], activity: [], requests: [], invites: [], discover: [] };
  let discover = [];
  let inviteResults = [];

  const roleLabel = role => ({ owner: 'Owner', co_owner: 'Captain', officer: 'Officer', member: 'Member' }[role] || 'Member');
  const colour = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#3578ff';
  const collectorName = person => esc(person.displayName || person.username || person.apexId || 'APEX collector');
  const clubStyle = club => `style="--club-primary:${colour(club.primaryColor)};--club-secondary:${colour(club.secondaryColor)}"`;
  const action = (label, name, id, tone = '') => `<button class="tiny-btn ${tone}" data-club-action="${name}" data-club-id="${esc(id)}">${label}</button>`;
  const clubCard = club => {
    const state = club.joinState;
    const button = state === 'open' ? action('Join now', 'join', club.id, 'primary') : state === 'request' ? action('Request to join', 'join', club.id, 'primary') : state === 'invited' ? '<span class="club-state">Invitation waiting</span>' : state === 'requested' ? '<span class="club-state">Request sent</span>' : state === 'member' ? '<span class="club-state">Your club</span>' : '<span class="club-state">Invite only</span>';
    return `<article class="club-card" ${clubStyle(club)}><div class="club-card-band"><span>${esc(club.tag)}</span><small>LVL ${Number(club.level || 1)}</small></div><h3>${esc(club.name)}</h3><p>${esc(club.motto || club.description || 'An APEX collecting club.')}</p><footer><small>${Number(club.memberCount || 0)}/${Number(club.memberCap || 20)} members · ${esc(club.joinMode)}</small>${button}</footer></article>`;
  };
  const activityText = item => {
    const actor = item.actor?.displayName ? esc(item.actor.displayName) : 'A collector';
    const type = item.eventType;
    if (type === 'club_created') return `${actor} founded the club`;
    if (type === 'member_joined') return `${actor} joined the club`;
    if (type === 'member_left') return `${actor} left the club`;
    if (type === 'join_requested') return `${actor} requested to join`;
    if (type === 'invite_sent') return `${actor} sent a club invitation`;
    if (type === 'role_changed') return `${actor} changed a member role`;
    return `${actor} updated the club`;
  };
  const dateText = value => { try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value)); } catch { return 'Recently'; } };

  function render() {
    const activeClub = clubState.club;
    const listings = discover.length ? discover : clubState.discover || [];
    if (!activeClub) return renderDiscover(listings);
    renderClub(activeClub, listings);
  }

  function renderDiscover(listings) {
    const invitations = (clubState.invites || []).map(invite => `<article class="club-invite" style="--club-primary:${colour(invite.primaryColor)};--club-secondary:${colour(invite.secondaryColor)}"><div><span>${esc(invite.clubTag)}</span><strong>${esc(invite.clubName)}</strong><small>Invitation expires ${dateText(invite.expiresAt)}</small></div><div>${action('Accept', 'invite-accept', invite.id, 'primary')}${action('Decline', 'invite-decline', invite.id)}</div></article>`).join('');
    content.innerHTML = `<section class="clubs-hero clubs-hero-discover"><div><p class="eyebrow">APEX CLUBS</p><h2>Find your collecting crew.</h2><p>Join a club, build its level together and keep your best pulls close to the people you play with.</p></div><div class="clubs-hero-mark"><b>CLUBS</b><span>20 MEMBER MAX</span></div></section>${invitations ? `<section class="club-panel club-invites"><p class="eyebrow">INVITATIONS</p><h3>Waiting for you</h3>${invitations}</section>` : ''}<section class="clubs-start-grid"><form class="club-panel club-create" id="club-create"><p class="eyebrow">START A CLUB</p><h3>Set the standard.</h3><label>Club name<input required maxlength="32" name="name" placeholder="e.g. North London Gold"></label><div class="club-form-row"><label>Tag<input required maxlength="5" pattern="[A-Za-z0-9]{3,5}" name="tag" placeholder="NLG"></label><label>Access<select name="joinMode"><option value="request">Request to join</option><option value="open">Open to join</option><option value="invite">Invite only</option></select></label></div><label>Motto <span>optional</span><input maxlength="80" name="motto" placeholder="Every pull matters"></label><label>Description <span>optional</span><textarea maxlength="500" name="description" placeholder="Tell collectors what your club is chasing."></textarea></label><div class="club-form-row club-colours"><label>Primary<input type="color" name="primaryColor" value="#3578ff"></label><label>Accent<input type="color" name="secondaryColor" value="#e9bd63"></label></div><button class="primary">Create club →</button><p class="muted" id="club-create-message">You can only belong to one active club.</p></form><section class="club-panel club-discover"><p class="eyebrow">DISCOVER</p><h3>Active clubs</h3><div class="club-search"><input id="club-search" maxlength="48" placeholder="Search club name or tag"><button class="tiny-btn" id="club-search-button">Search</button></div><p class="muted" id="club-search-message">Explore active clubs and choose your next squad.</p><div class="club-card-list" id="club-discover-list">${listings.length ? listings.map(clubCard).join('') : '<p class="muted">No active clubs match this search yet.</p>'}</div></section></section>`;
    bindDiscover();
  }

  function renderClub(club, listings) {
    const membership = clubState.membership || {};
    const members = (clubState.members || []).map(member => {
      const roleControl = membership.isOwner && member.userId !== club.ownerId ? `<select data-club-role="${esc(member.userId)}"><option value="member" ${member.role === 'member' ? 'selected' : ''}>Member</option><option value="officer" ${member.role === 'officer' ? 'selected' : ''}>Officer</option><option value="co_owner" ${member.role === 'co_owner' ? 'selected' : ''}>Captain</option></select>` : `<span class="club-role">${roleLabel(member.role)}</span>`;
      return `<article class="club-member"><div class="club-member-avatar">${esc((member.displayName || member.username || 'A').slice(0, 1).toUpperCase())}</div><div><strong>${collectorName(member)}</strong><small>APEX ID · ${esc(member.apexId || '—')} · joined ${dateText(member.joinedAt)}</small></div><div class="club-member-role">${roleControl}</div></article>`;
    }).join('');
    const requests = (clubState.requests || []).map(request => `<article class="club-request"><div><strong>${collectorName(request)}</strong><small>APEX ID · ${esc(request.apexId || '—')} · requested ${dateText(request.createdAt)}</small></div><div>${action('Accept', 'request-accept', request.id, 'primary')}${action('Decline', 'request-decline', request.id)}</div></article>`).join('');
    const activity = (clubState.activity || []).map(item => `<article class="club-activity"><i></i><div><strong>${activityText(item)}</strong><small>${dateText(item.createdAt)}</small></div></article>`).join('');
    content.innerHTML = `<section class="club-banner" ${clubStyle(club)}><div class="club-banner-tag">${esc(club.tag)}</div><div><p class="eyebrow">APEX CLUB · LEVEL ${Number(club.level || 1)}</p><h2>${esc(club.name)}</h2><p>${esc(club.motto || club.description || 'A home for serious APEX collectors.')}</p></div><div class="club-banner-metrics"><span><b>${Number(club.memberCount || 0)}</b> / ${Number(club.memberCap || 20)} members</span><span><b>${Number(club.xp || 0).toLocaleString()}</b> club XP</span></div></section><section class="club-dashboard"><div class="club-panel club-members-panel"><div class="club-panel-head"><div><p class="eyebrow">ROSTER</p><h3>Club members</h3></div>${membership.isOwner ? '<small>Owner controls roles</small>' : ''}</div><div class="club-members">${members}</div>${membership.isOwner ? '<p class="muted club-owner-note">Ownership transfer is reserved for the next Clubs update.</p>' : `<button class="tiny-btn" id="club-leave">Leave club</button>`}</div><div class="club-panel club-activity-panel"><p class="eyebrow">ACTIVITY</p><h3>Latest moves</h3><div class="club-activity-list">${activity || '<p class="muted">Your club activity will appear here.</p>'}</div></div></section>${membership.canManage ? `<section class="club-management"><div class="club-panel"><p class="eyebrow">JOIN REQUESTS</p><h3>Collectors waiting</h3><div class="club-request-list">${requests || '<p class="muted">No requests waiting.</p>'}</div></div><div class="club-panel"><p class="eyebrow">INVITE A FRIEND</p><h3>Grow your crew</h3><div class="club-search"><input id="club-invite-search" maxlength="48" placeholder="Search an APEX friend"><button class="tiny-btn" id="club-invite-search-button">Find friend</button></div><p class="muted" id="club-invite-message">Invites are limited to accepted APEX friends.</p><div class="club-invite-results" id="club-invite-results"></div></div></section>` : ''}<section class="club-panel club-more-clubs"><p class="eyebrow">CLUB DIRECTORY</p><h3>Other active clubs</h3><div class="club-card-list">${listings.filter(item => item.id !== club.id).slice(0, 4).map(clubCard).join('') || '<p class="muted">More clubs will appear as collectors create them.</p>'}</div></section>`;
    bindClub();
  }

  async function load() {
    clubState = await gameApi('club.status');
    if (!discover.length) discover = clubState.discover || [];
    render();
  }

  function message(id, value, error = false) {
    const target = byId(id);
    if (!target) return;
    target.textContent = value;
    target.classList.toggle('club-error', error);
  }

  async function run(actionName, payload = {}, noticeId = '') {
    try {
      await gameApi(actionName, payload);
      await load();
    } catch (error) { message(noticeId || 'club-search-message', error.message || 'Club action failed.', true); }
  }

  async function searchClubs() {
    const query = byId('club-search').value.trim();
    if (query.length === 1) return message('club-search-message', 'Enter at least 2 characters.', true);
    try {
      discover = await gameApi('club.search', { query });
      const list = byId('club-discover-list');
      list.innerHTML = discover.length ? discover.map(clubCard).join('') : '<p class="muted">No active clubs match this search yet.</p>';
      message('club-search-message', discover.length ? `${discover.length} club${discover.length === 1 ? '' : 's'} found.` : 'No clubs found.');
      bindActions(list);
    } catch (error) { message('club-search-message', error.message || 'Club search failed.', true); }
  }

  async function searchFriends() {
    const query = byId('club-invite-search').value.trim();
    if (query.length < 2) return message('club-invite-message', 'Enter at least 2 characters.', true);
    try {
      inviteResults = await gameApi('social.search', { query });
      const target = byId('club-invite-results');
      target.innerHTML = inviteResults.length ? inviteResults.map(person => `<article class="club-invite-person"><div><strong>${collectorName(person)}</strong><small>APEX ID · ${esc(person.apexId || '—')}</small></div>${person.relationship === 'friends' ? action('Invite', 'invite', person.userId, 'primary') : '<span class="club-state">Friends only</span>'}</article>`).join('') : '<p class="muted">No collectors found.</p>';
      bindActions(target);
      message('club-invite-message', 'Only accepted friends can be invited.');
    } catch (error) { message('club-invite-message', error.message || 'Friend search failed.', true); }
  }

  function bindActions(scope = content) {
    scope.querySelectorAll('[data-club-action]').forEach(button => {
      button.onclick = () => {
        const id = button.dataset.clubId;
        const name = button.dataset.clubAction;
        if (name === 'join') run('club.join', { clubId: id });
        if (name === 'invite-accept') run('club.invite.respond', { inviteId: id, accept: true });
        if (name === 'invite-decline') run('club.invite.respond', { inviteId: id, accept: false });
        if (name === 'request-accept') run('club.request.respond', { requestId: id, accept: true });
        if (name === 'request-decline') run('club.request.respond', { requestId: id, accept: false });
        if (name === 'invite') run('club.invite', { clubId: clubState.club.id, targetUserId: id }, 'club-invite-message');
      };
    });
  }

  function bindDiscover() {
    byId('club-create').onsubmit = event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      run('club.create', { name: form.get('name'), tag: String(form.get('tag') || '').toUpperCase(), description: form.get('description'), motto: form.get('motto'), joinMode: form.get('joinMode'), primaryColor: form.get('primaryColor'), secondaryColor: form.get('secondaryColor') }, 'club-create-message');
    };
    byId('club-search-button').onclick = searchClubs;
    byId('club-search').onkeydown = event => { if (event.key === 'Enter') searchClubs(); };
    bindActions();
  }

  function bindClub() {
    byId('club-leave')?.addEventListener('click', () => run('club.leave'));
    byId('club-invite-search-button')?.addEventListener('click', searchFriends);
    byId('club-invite-search')?.addEventListener('keydown', event => { if (event.key === 'Enter') searchFriends(); });
    content.querySelectorAll('[data-club-role]').forEach(select => {
      select.onchange = () => run('club.role.update', { clubId: clubState.club.id, targetUserId: select.dataset.clubRole, role: select.value });
    });
    bindActions();
  }

  content.innerHTML = '<div class="generic-card"><p class="muted">Loading your club space…</p></div>';
  load().catch(error => { content.innerHTML = `<div class="generic-card"><h3>Clubs could not load</h3><p class="muted">${esc(error.message || 'Please try again shortly.')}</p></div>`; });
}
