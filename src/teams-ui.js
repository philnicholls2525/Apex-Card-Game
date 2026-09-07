const initialModel = () => ({ team: null, invitations: [], availableFriends: [] });

export function renderFriendTeams({ page, gameApi, esc, byId, navigate }) {
  const content = page('Friend Teams', 'PLAY TOGETHER');
  let model = initialModel();
  let message = '';
  let isError = false;

  const label = collector => esc(collector.displayName || collector.username || collector.apexId || 'APEX collector');
  const handle = collector => collector.apexId ? esc(collector.apexId) : `@${esc(collector.username || 'collector')}`;
  const feedback = () => message ? `<p class="team-feedback ${isError ? 'team-feedback-error' : ''}">${esc(message)}</p>` : '';

  function inviteRows() {
    return model.invitations.length ? model.invitations.map(invite => `<article class="team-invite-row"><div><strong>[${esc(invite.teamTag)}] ${esc(invite.teamName)}</strong><small>Invited by ${esc(invite.inviterName)}</small></div><div class="social-actions"><button class="tiny-btn primary-mini" data-team-action="accept" data-team-id="${esc(invite.inviteId)}">Accept</button><button class="tiny-btn" data-team-action="decline" data-team-id="${esc(invite.inviteId)}">Decline</button></div></article>`).join('') : '<p class="muted">No Friend Team invitations.</p>';
  }

  function teamPanel() {
    if (!model.team) return `<section class="team-create-card generic-card"><p class="eyebrow">CREATE A TEAM</p><h3>Start with the friends you trust.</h3><p class="muted">A Friend Team is separate from the wider APEX Clubs system. For this first version, each collector can belong to one active Friend Team.</p><form id="friendTeamCreate" class="team-form"><label>Team name<input name="name" required minlength="3" maxlength="32" placeholder="North Stand XI"></label><label>Team tag<input name="tag" required minlength="3" maxlength="5" pattern="[A-Za-z0-9]{3,5}" placeholder="NSXI"></label><label class="team-form-wide">Description<textarea name="description" maxlength="280" placeholder="What brings your team together?"></textarea></label><button class="primary team-form-wide">Create Friend Team</button></form></section>`;

    const team = model.team;
    const captain = team.myRole === 'captain';
    const members = (team.members || []).map(member => `<article class="team-member"><div class="social-avatar">${esc((member.displayName || member.username || 'A').slice(0,1).toUpperCase())}</div><div><strong>${label(member)}</strong><small>${handle(member)} · ${member.role === 'captain' ? 'Captain' : 'Member'}</small></div>${captain && member.userId !== team.ownerId ? `<button class="tiny-btn" data-team-action="remove" data-team-id="${esc(member.userId)}">Remove</button>` : ''}</article>`).join('');
    const outgoing = (team.outgoingInvites || []).map(invite => `<article class="team-invite-row"><div><strong>${label(invite)}</strong><small>${handle(invite)} · pending</small></div><button class="tiny-btn" data-team-action="cancel" data-team-id="${esc(invite.inviteId)}">Cancel</button></article>`).join('');
    const options = model.availableFriends.map(friend => `<option value="${esc(friend.userId)}">${label(friend)} · ${handle(friend)}</option>`).join('');

    return `<section class="friend-team-identity" style="--team-primary:${esc(team.primaryColor)};--team-secondary:${esc(team.secondaryColor)}"><div><p class="eyebrow">YOUR FRIEND TEAM</p><div class="friend-team-title"><span>${esc(team.tag)}</span><h2>${esc(team.name)}</h2></div><p>${esc(team.description || 'Built by friends. Ready for future APEX competitions.')}</p></div><div class="social-count"><span>MEMBERS</span><b>${team.members.length}</b><small>of 20</small></div></section><section class="team-layout"><div class="generic-card"><p class="eyebrow">LINE-UP</p><h3>Team members</h3><div class="team-member-list">${members}</div><button class="ghost team-leave" data-team-action="leave" data-team-id="${esc(team.id)}">${captain ? 'Archive team' : 'Leave team'}</button></div><div class="generic-card"><p class="eyebrow">${captain ? 'CAPTAIN TOOLS' : 'TEAM STATUS'}</p><h3>${captain ? 'Invite a friend' : 'Captain-managed team'}</h3>${captain ? (options ? `<form id="friendTeamInvite" class="team-invite-form"><select name="friend" required><option value="">Choose an available friend</option>${options}</select><button class="primary">Send invite</button></form>` : '<p class="muted">All eligible friends are already in a team or have a pending invitation.</p>') : '<p class="muted">Your captain controls invitations and membership.</p>'}${captain ? `<div class="team-outgoing"><h4>Pending invitations</h4>${outgoing || '<p class="muted">No pending invitations.</p>'}</div>` : ''}</div></section>`;
  }

  function render() {
    content.innerHTML = `<section class="team-page-head"><div><p class="eyebrow">FRIENDS → TEAM → COMPETE</p><h2>Your people. One badge.</h2><p>Build a small team from accepted APEX friends. Competition entry and scoring are prepared for the next stage.</p><div class="button-row"><button class="tiny-btn" id="backToFriends">Friends</button><button class="tiny-btn primary-mini" id="viewCompetitions">Competition hub</button></div></div><div class="team-mark">FT</div></section>${feedback()}<section class="generic-card team-invitations"><p class="eyebrow">YOUR INVITATIONS</p><h3>Pending team requests</h3>${inviteRows()}</section>${teamPanel()}`;
    bind();
  }

  async function load() {
    model = await gameApi('friendTeam.status');
    render();
  }

  async function run(action, payload, success) {
    message = 'Saving…'; isError = false; render();
    try {
      const result = await gameApi(action, payload);
      model = result?.team !== undefined ? result : await gameApi('friendTeam.status');
      message = success; isError = false; render();
    } catch (error) {
      message = error.message || 'That team action could not be completed.'; isError = true; render();
    }
  }

  function bind() {
    byId('backToFriends').onclick = () => navigate('friends');
    byId('viewCompetitions').onclick = () => navigate('competitions');
    byId('friendTeamCreate')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      run('friendTeam.create', { name: form.get('name'), tag: form.get('tag'), description: form.get('description') }, 'Friend Team created.');
    });
    byId('friendTeamInvite')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      run('friendTeam.invite', { teamId: model.team.id, targetUserId: form.get('friend') }, 'Invitation sent.');
    });
    content.querySelectorAll('[data-team-action]').forEach(button => {
      button.onclick = () => {
        const action = button.dataset.teamAction;
        const id = button.dataset.teamId;
        if (action === 'accept') return run('friendTeam.respond', { inviteId: id, accept: true }, 'You joined the Friend Team.');
        if (action === 'decline') return run('friendTeam.respond', { inviteId: id, accept: false }, 'Invitation declined.');
        if (action === 'cancel') return run('friendTeam.cancelInvite', { inviteId: id }, 'Invitation cancelled.');
        if (action === 'remove' && confirm('Remove this member from the Friend Team?')) return run('friendTeam.removeMember', { teamId: model.team.id, targetUserId: id }, 'Member removed.');
        if (action === 'leave' && confirm(model.team.myRole === 'captain' ? 'Archive this Friend Team? This is only available when you are the last member.' : 'Leave this Friend Team?')) return run('friendTeam.leave', { teamId: id }, model.team.myRole === 'captain' ? 'Friend Team archived.' : 'You left the Friend Team.');
      };
    });
  }

  content.innerHTML = '<div class="generic-card"><p class="muted">Loading your Friend Team…</p></div>';
  load().catch(error => { content.innerHTML = `<div class="generic-card"><h3>Friend Teams could not load</h3><p class="muted">${esc(error.message || 'Please try again shortly.')}</p></div>`; });
}

export function renderCompetitions({ page, gameApi, esc, byId, navigate }) {
  const content = page('Competitions', 'APEX COMPETITION HUB');
  const date = value => value ? new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}) : 'Not yet verified';

  function competitionCard(competition) {
    const standings = competition.standings || [];
    return `<article class="generic-card competition-card"><div class="competition-card-head"><div><p class="eyebrow">${esc(competition.scope.replaceAll('_',' '))}</p><h3>${esc(competition.name)}</h3></div><span class="competition-status">${esc(competition.status)}</span></div><p class="muted">${date(competition.startsAt)} – ${date(competition.endsAt)} · ${competition.entrantCount} entrants</p><div class="competition-source"><span>Primary source</span><b>${esc(competition.primaryCompetitionCode || 'Not configured')}</b><span>Fallback</span><b>${esc(competition.fallbackCompetitionCode || 'Not configured')}</b></div>${standings.length ? `<div class="competition-standings">${standings.slice(0,10).map((entry,index) => `<div><span>${entry.rank || index+1}</span><strong>${esc(entry.name)}</strong><b>${Number(entry.score).toFixed(1)}</b></div>`).join('')}</div>` : '<p class="notice">Standings will appear once entrants and verified scores are available.</p>'}</article>`;
  }

  function render(data) {
    const competitions = data.competitions || [];
    const cache = data.footballCache || [];
    content.innerHTML = `<section class="competition-hero"><div><p class="eyebrow">FOUNDATION ONLINE</p><h2>Built for Friend Teams and Clubs.</h2><p>APEX competition records, periods, typed entrants and historical scores now have a secure home. Clients read cached football status instead of calling an external provider.</p><div class="button-row"><button class="tiny-btn primary-mini" id="competitionTeams">Friend Teams</button></div></div><div class="competition-orbit"><b>${competitions.length}</b><span>active listings</span></div></section><section class="cache-panel generic-card"><p class="eyebrow">FOOTBALL DATA CACHE</p><h3>UCL primary · domestic fallback</h3><div class="cache-source-grid">${cache.map(source => `<article><span>${esc(source.role)}</span><strong>${esc(source.competitionCode)}</strong><small class="cache-${esc(source.status)}">${source.providerConfigured ? esc(source.status) : 'Provider not configured'}</small><small>Last verified: ${date(source.lastVerifiedAt)}</small></article>`).join('') || '<p class="muted">Football data sources have not been configured yet.</p>'}</div><p class="muted cache-note">The last verified dataset is retained if a provider request fails, so a temporary outage does not stop competition scoring.</p></section><section class="competition-list">${competitions.length ? competitions.map(competitionCard).join('') : '<div class="generic-card competition-empty"><p class="eyebrow">NO LIVE COMPETITION YET</p><h3>The engine is ready for the first configured event.</h3><p class="muted">Creating and publishing competitions remains an administrator-controlled step; no placeholder tournament has been written into production.</p></div>'}</section>`;
    byId('competitionTeams').onclick = () => navigate('friend-team');
  }

  content.innerHTML = '<div class="generic-card"><p class="muted">Loading competition status…</p></div>';
  gameApi('competition.overview').then(render).catch(error => { content.innerHTML = `<div class="generic-card"><h3>Competitions could not load</h3><p class="muted">${esc(error.message || 'Please try again shortly.')}</p></div>`; });
}
