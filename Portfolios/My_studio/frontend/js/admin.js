(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  let TOKEN = sessionStorage.getItem('admin_token') || '';
  let INVITATIONS = [], WEBSITES = [], REVIEWS = [], REQUESTS = [];

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[m]));
  }

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (TOKEN) headers['X-Admin-Token'] = TOKEN;
    const res = await fetch(path, { ...opts, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Session expired — please sign in again.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.status === 204 ? null : res.json();
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-Admin-Token': TOKEN },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail);
    }
    return res.json();
  }

  // ---------------- Auth ----------------
  function showApp() {
    $('#login-screen').style.display = 'none';
    $('#admin-app').classList.add('visible');
    loadAll();
  }

  function logout() {
    TOKEN = '';
    sessionStorage.removeItem('admin_token');
    $('#admin-app').classList.remove('visible');
    $('#login-screen').style.display = 'flex';
  }

  $('#login-btn').addEventListener('click', doLogin);
  $('#login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

  async function doLogin() {
    const password = $('#login-password').value;
    const errBox = $('#login-error');
    errBox.style.display = 'none';
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error('Incorrect password');
      const data = await res.json();
      TOKEN = data.token;
      sessionStorage.setItem('admin_token', TOKEN);
      showApp();
    } catch (err) {
      errBox.textContent = err.message || 'Could not sign in';
      errBox.style.display = 'block';
    }
  }

  $('#logout-btn').addEventListener('click', () => {
    api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    logout();
  });

  if (TOKEN) showApp();

  // ---------------- Panel switching ----------------
  $$('.side-link[data-panel]').forEach((link) => {
    link.addEventListener('click', () => {
      $$('.side-link[data-panel]').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      $$('.panel').forEach((p) => p.classList.remove('active'));
      $(`#panel-${link.dataset.panel}`).classList.add('active');
    });
  });

  // ---------------- Load everything ----------------
  async function loadAll() {
    try {
      const [settings, invitations, websites, reviews, requests] = await Promise.all([
        api('/api/settings'),
        api('/api/invitations'),
        api('/api/websites'),
        api('/api/reviews?all=true'),
        api('/api/project-requests'),
      ]);
      populateSettings(settings);
      INVITATIONS = invitations;
      WEBSITES = websites;
      REVIEWS = reviews;
      REQUESTS = requests;
      renderInvitationsTable();
      renderWebsitesTable();
      renderReviewsTable();
      renderRequestsTable();
      updateStats();
    } catch (err) {
      console.error(err);
    }
  }

  function updateStats() {
    $('#stat-invitations').textContent = INVITATIONS.length;
    $('#stat-websites').textContent = WEBSITES.length;
    $('#stat-reviews').textContent = REVIEWS.filter((r) => !r.approved).length;
    $('#stat-requests').textContent = REQUESTS.filter((r) => r.status === 'new').length;
  }

  // ---------------- Settings ----------------
  function populateSettings(s) {
    ['site_name', 'site_logo', 'hero_headline', 'hero_subheadline', 'invitation_quote', 'website_quote', 'instagram_url', 'contact_email']
      .forEach((key) => {
        const el = $(`#set-${key}`);
        if (el) el.value = s[key] || '';
      });
    if (s.site_logo) $('#set-logo-preview').src = s.site_logo;
  }

  $('#set-logo-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      $('#set-site_logo').value = url;
      $('#set-logo-preview').src = url;
    } catch (err) { alert(err.message); }
  });

  $('#save-settings-btn').addEventListener('click', async () => {
    const values = {};
    ['site_name', 'site_logo', 'hero_headline', 'hero_subheadline', 'invitation_quote', 'website_quote', 'instagram_url', 'contact_email']
      .forEach((key) => { values[key] = $(`#set-${key}`).value; });
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify({ values }) });
      alert('Settings saved.');
    } catch (err) { alert(err.message); }
  });

  $('#change-pw-btn').addEventListener('click', async () => {
    const current_password = $('#pw-current').value;
    const new_password = $('#pw-new').value;
    if (!new_password || new_password.length < 6) {
      alert('New password should be at least 6 characters.');
      return;
    }
    try {
      await api('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password, new_password }),
      });
      alert('Password updated.');
      $('#pw-current').value = '';
      $('#pw-new').value = '';
    } catch (err) { alert(err.message); }
  });

  // ---------------- Invitations ----------------
  function renderInvitationsTable() {
    const tbody = $('#invitations-table');
    if (!INVITATIONS.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No invitations yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = INVITATIONS.map((i) => `
      <tr>
        <td><img src="${escapeHtml(i.image_url)}" alt=""></td>
        <td>${escapeHtml(i.title)}</td>
        <td>${i.type === 'animated' ? 'Animated' : 'Classic'}</td>
        <td>${escapeHtml(i.price)}</td>
        <td class="actions">
          <button class="btn btn-outline" data-edit-inv="${i.id}">Edit</button>
          <button class="btn btn-danger" data-del-inv="${i.id}">Delete</button>
        </td>
      </tr>
    `).join('');
    $$('[data-edit-inv]', tbody).forEach((b) => b.addEventListener('click', () => openInvitationModal(INVITATIONS.find(x => x.id == b.dataset.editInv))));
    $$('[data-del-inv]', tbody).forEach((b) => b.addEventListener('click', () => deleteInvitation(b.dataset.delInv)));
  }

  function openInvitationModal(item) {
    $('#invitation-modal-title').textContent = item ? 'Edit invitation' : 'Add invitation';
    $('#inv-id').value = item ? item.id : '';
    $('#inv-title').value = item ? item.title : '';
    $('#inv-type').value = item ? item.type : 'static';
    $('#inv-price').value = item ? item.price : '';
    $('#inv-description').value = item ? item.description : '';
    $('#inv-image_url').value = item ? item.image_url : '';
    $('#inv-preview_url').value = item ? item.preview_url : '';
    $('#inv-purchase_link').value = item ? item.purchase_link : '';
    $('#inv-sort_order').value = item ? item.sort_order : 0;
    $('#inv-image-preview').src = item ? item.image_url : '';
    $('#invitation-modal').classList.add('open');
  }
  $('#add-invitation-btn').addEventListener('click', () => openInvitationModal(null));
  $('#inv-cancel').addEventListener('click', () => $('#invitation-modal').classList.remove('open'));

  $('#inv-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      $('#inv-image_url').value = url;
      $('#inv-image-preview').src = url;
    } catch (err) { alert(err.message); }
  });

  $('#inv-save').addEventListener('click', async () => {
    const id = $('#inv-id').value;
    const body = {
      title: $('#inv-title').value.trim(),
      type: $('#inv-type').value,
      price: $('#inv-price').value.trim(),
      description: $('#inv-description').value.trim(),
      image_url: $('#inv-image_url').value.trim(),
      preview_url: $('#inv-preview_url').value.trim() || $('#inv-image_url').value.trim(),
      purchase_link: $('#inv-purchase_link').value.trim(),
      sort_order: parseInt($('#inv-sort_order').value, 10) || 0,
    };
    if (!body.title) { alert('Title is required.'); return; }
    try {
      if (id) await api(`/api/invitations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/api/invitations', { method: 'POST', body: JSON.stringify(body) });
      $('#invitation-modal').classList.remove('open');
      await loadAll();
    } catch (err) { alert(err.message); }
  });

  async function deleteInvitation(id) {
    if (!confirm('Delete this invitation?')) return;
    try {
      await api(`/api/invitations/${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (err) { alert(err.message); }
  }

  // ---------------- Websites ----------------
  function renderWebsitesTable() {
    const tbody = $('#websites-table');
    if (!WEBSITES.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No websites yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = WEBSITES.map((w) => `
      <tr>
        <td>${w.video_url ? `<video src="${escapeHtml(w.video_url)}" muted></video>` : '—'}</td>
        <td>${escapeHtml(w.title)}</td>
        <td>${escapeHtml(w.category)}</td>
        <td>${w.live_url ? `<a href="${escapeHtml(w.live_url)}" target="_blank" style="color:var(--gold-soft)">link</a>` : '—'}</td>
        <td class="actions">
          <button class="btn btn-outline" data-edit-site="${w.id}">Edit</button>
          <button class="btn btn-danger" data-del-site="${w.id}">Delete</button>
        </td>
      </tr>
    `).join('');
    $$('[data-edit-site]', tbody).forEach((b) => b.addEventListener('click', () => openWebsiteModal(WEBSITES.find(x => x.id == b.dataset.editSite))));
    $$('[data-del-site]', tbody).forEach((b) => b.addEventListener('click', () => deleteWebsite(b.dataset.delSite)));
  }

  function openWebsiteModal(item) {
    $('#website-modal-title').textContent = item ? 'Edit website' : 'Add website';
    $('#site-id').value = item ? item.id : '';
    $('#site-title').value = item ? item.title : '';
    $('#site-category').value = item ? item.category : '';
    $('#site-description').value = item ? item.description : '';
    $('#site-video_url').value = item ? item.video_url : '';
    $('#site-live_url').value = item ? item.live_url : '';
    $('#site-sort_order').value = item ? item.sort_order : 0;
    $('#website-modal').classList.add('open');
  }
  $('#add-website-btn').addEventListener('click', () => openWebsiteModal(null));
  $('#site-cancel').addEventListener('click', () => $('#website-modal').classList.remove('open'));

  $('#site-video-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      $('#site-video_url').value = url;
    } catch (err) { alert(err.message); }
  });

  $('#site-save').addEventListener('click', async () => {
    const id = $('#site-id').value;
    const body = {
      title: $('#site-title').value.trim(),
      category: $('#site-category').value.trim(),
      description: $('#site-description').value.trim(),
      video_url: $('#site-video_url').value.trim(),
      live_url: $('#site-live_url').value.trim(),
      sort_order: parseInt($('#site-sort_order').value, 10) || 0,
    };
    if (!body.title || !body.category) { alert('Title and category are required.'); return; }
    try {
      if (id) await api(`/api/websites/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/api/websites', { method: 'POST', body: JSON.stringify(body) });
      $('#website-modal').classList.remove('open');
      await loadAll();
    } catch (err) { alert(err.message); }
  });

  async function deleteWebsite(id) {
    if (!confirm('Delete this website?')) return;
    try {
      await api(`/api/websites/${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (err) { alert(err.message); }
  }

  // ---------------- Reviews ----------------
  function renderReviewsTable() {
    const tbody = $('#reviews-table');
    if (!REVIEWS.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No reviews yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = REVIEWS.map((r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${'★'.repeat(r.rating)}</td>
        <td>${escapeHtml(r.comment)}</td>
        <td><span class="badge ${r.approved ? '' : 'pending'}">${r.approved ? 'Published' : 'Pending'}</span></td>
        <td class="actions">
          ${r.approved ? '' : `<button class="btn btn-outline" data-approve="${r.id}">Approve</button>`}
          <button class="btn btn-danger" data-del-review="${r.id}">Delete</button>
        </td>
      </tr>
    `).join('');
    $$('[data-approve]', tbody).forEach((b) => b.addEventListener('click', async () => {
      await api(`/api/reviews/${b.dataset.approve}/approve`, { method: 'PUT' });
      await loadAll();
    }));
    $$('[data-del-review]', tbody).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this review?')) return;
      await api(`/api/reviews/${b.dataset.delReview}`, { method: 'DELETE' });
      await loadAll();
    }));
  }

  // ---------------- Project requests ----------------
  function renderRequestsTable() {
    const tbody = $('#requests-table');
    if (!REQUESTS.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No project requests yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = REQUESTS.map((r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.project_type)}</td>
        <td>${escapeHtml(r.budget)}</td>
        <td><span class="badge ${r.status === 'new' ? 'pending' : ''}">${escapeHtml(r.status)}</span></td>
        <td class="actions">
          ${r.status === 'new' ? `<button class="btn btn-outline" data-mark="${r.id}">Mark handled</button>` : ''}
          <button class="btn btn-danger" data-del-req="${r.id}">Delete</button>
        </td>
      </tr>
    `).join('');
    $$('[data-mark]', tbody).forEach((b) => b.addEventListener('click', async () => {
      await api(`/api/project-requests/${b.dataset.mark}/status?status=handled`, { method: 'PUT' });
      await loadAll();
    }));
    $$('[data-del-req]', tbody).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this request?')) return;
      await api(`/api/project-requests/${b.dataset.delReq}`, { method: 'DELETE' });
      await loadAll();
    }));
  }
})();
