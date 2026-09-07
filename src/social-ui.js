export function renderFriends({ page, gameApi, esc, byId }) {
  const content = page('Friends', 'APEX SOCIAL');
  let social = { friends: [], incoming: [], outgoing: [] };
  let searchResults = [];

  const name = collector => esc(collector.displayName || collector.username || collector.apexId || 'APEX collector');
  const handle = collector => collector.apexId ? `APEX ID · ${esc(collector.apexId)}` : `@${esc(collector.username || 'collector')}`;
  const actionButton = (label, action, id, tone = '') => `<button class="tiny-btn ${tone}" data-social-action="${action}" data-social-id="${esc(id)}">${label}</button>`;
  const collectorRow = (collector, actions, note = '') => `<article class="social-collector"><div class="social-avatar">${esc((collector.displayName || collector.username || 'A').slice(0, 1).toUpperCase())}</div><div><strong>${name(collector)}</strong><small>${handle(collector)}${note ? ` · ${esc(note)}` : ''}</small></div><div class="social-actions">${actions}</div></article>`;

  function render() {
    content.innerHTML = `<section class="social-hero"><div><p class="eyebrow">YOUR NETWORK</p><h2>Build your APEX circle.</h2><p>Find collectors by username, display name or APEX ID. Friend requests are handled securely by the game server.</p></div><div class="social-count"><span>CONNECTED</span><b>${social.friends.length}</b><small>friends</small></div></section><section class="social-search"><label for="collector-search">Find a collector</label><div><input id="collector-search" maxlength="48" placeholder="Search username, name or APEX ID" autocomplete="off"><button class="primary" id="collector-search-button">Search</button></div><p class="muted" id="collector-search-message">Search never exposes email addresses.</p><div class="social-results" id="collector-search-results"></div></section><section class="social-grid"><div class="generic-card"><p class="eyebrow">FRIENDS</p><h3>Your squad</h3><div class="social-list">${social.friends.length ? social.friends.map(friend => collectorRow(friend, actionButton('Remove', 'remove', friend.userId))).join('') : '<p class="muted">No friends yet. Search for an APEX collector above.</p>'}</div></div><div class="generic-card"><p class="eyebrow">INCOMING</p><h3>Requests for you</h3><div class="social-list">${social.incoming.length ? social.incoming.map(request => collectorRow(request, `${actionButton('Accept', 'accept', request.friendshipId, 'primary')}${actionButton('Decline', 'decline', request.friendshipId)}`)).join('') : '<p class="muted">No pending requests.</p>'}</div></div><div class="generic-card"><p class="eyebrow">SENT</p><h3>Waiting to connect</h3><div class="social-list">${social.outgoing.length ? social.outgoing.map(request => collectorRow(request, '<span class="social-pending">Pending</span>')).join('') : '<p class="muted">No outgoing requests.</p>'}</div></div></section>`;
    bind();
  }

  async function load() {
    social = await gameApi('social.list');
    render();
  }

  function showSearchMessage(message, isError = false) {
    const messageEl = byId('collector-search-message');
    messageEl.textContent = message;
    messageEl.classList.toggle('social-error', isError);
  }

  function renderSearchResults() {
    const results = byId('collector-search-results');
    results.innerHTML = searchResults.length ? searchResults.map(result => {
      let actions = '';
      if (result.relationship === 'none') actions = actionButton('Add friend', 'request', result.userId, 'primary');
      else if (result.relationship === 'incoming') actions = '<span class="social-pending">Request received</span>';
      else if (result.relationship === 'outgoing') actions = '<span class="social-pending">Request sent</span>';
      else if (result.relationship === 'friends') actions = '<span class="social-pending">Friends</span>';
      else actions = '<span class="social-pending">Unavailable</span>';
      return collectorRow(result, actions);
    }).join('') : '';
    bindActions(results);
  }

  async function search() {
    const query = byId('collector-search').value.trim();
    if (query.length < 2) return showSearchMessage('Enter at least 2 characters.', true);
    showSearchMessage('Searching…');
    try {
      searchResults = await gameApi('social.search', { query });
      renderSearchResults();
      showSearchMessage(searchResults.length ? `${searchResults.length} collector${searchResults.length === 1 ? '' : 's'} found.` : 'No collectors found.');
    } catch (error) { showSearchMessage(error.message || 'Search failed.', true); }
  }

  async function act(action, id) {
    try {
      if (action === 'request') await gameApi('friend.request', { targetUserId: id });
      if (action === 'accept') await gameApi('friend.respond', { friendshipId: id, accept: true });
      if (action === 'decline') await gameApi('friend.respond', { friendshipId: id, accept: false });
      if (action === 'remove') await gameApi('friend.remove', { targetUserId: id });
      searchResults = [];
      await load();
    } catch (error) { showSearchMessage(error.message || 'That action could not be completed.', true); }
  }

  function bindActions(scope = content) {
    scope.querySelectorAll('[data-social-action]').forEach(button => {
      button.onclick = () => act(button.dataset.socialAction, button.dataset.socialId);
    });
  }

  function bind() {
    byId('collector-search-button').onclick = search;
    byId('collector-search').onkeydown = event => { if (event.key === 'Enter') search(); };
    bindActions();
  }

  content.innerHTML = '<div class="generic-card"><p class="muted">Loading your APEX network…</p></div>';
  load().catch(error => { content.innerHTML = `<div class="generic-card"><h3>Friends could not load</h3><p class="muted">${esc(error.message || 'Please try again shortly.')}</p></div>`; });
}
