(function () {
  const API = '';
  let SETTINGS = {};
  let activeInviteType = 'static';
  let activeCategory = null;
  let ALL_INVITATIONS = [];
  let ALL_WEBSITES = [];

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[m]));
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.status === 204 ? null : res.json();
  }

  // ---------------- Loader ----------------
  window.addEventListener('load', () => {
    setTimeout(() => {
      $('#loader').classList.add('hidden');
      $('#hero').classList.add('animate-in');
    }, 600);
  });
  // Safety net in case 'load' already fired
  setTimeout(() => {
    if (!$('#loader').classList.contains('hidden')) {
      $('#loader').classList.add('hidden');
      $('#hero').classList.add('animate-in');
    }
  }, 2500);

  // ---------------- Header scroll state ----------------
  window.addEventListener('scroll', () => {
    $('#site-header').classList.toggle('scrolled', window.scrollY > 40);
  });

  // ---------------- Smooth CTA scroll ----------------
  $$('[data-scroll]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      revealQuote(btn.dataset.scroll);
    });
  });

  function revealQuote(section) {
    if (section === 'invitations') $('#invitation-quote').classList.add('visible');
    if (section === 'websites') $('#website-quote').classList.add('visible');
  }
  // Also reveal quote when user scrolls the section into view naturally
  if ('IntersectionObserver' in window) {
    const sections = ['invitations', 'websites'];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) revealQuote(e.target.id);
      });
    }, { threshold: 0.25 });
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // ---------------- Settings ----------------
  async function loadSettings() {
    SETTINGS = await api('/api/settings');
    if (SETTINGS.site_logo) {
      $('#site-logo').src = SETTINGS.site_logo;
      $('#footer-logo').src = SETTINGS.site_logo;
    }
    if (SETTINGS.site_name) {
      document.title = `${SETTINGS.site_name} — Invitations & Websites`;
      $('#footer-name').textContent = SETTINGS.site_name;
    }
    if (SETTINGS.hero_headline) $('#hero-headline').textContent = SETTINGS.hero_headline;
    if (SETTINGS.hero_subheadline) $('#hero-subheadline').textContent = SETTINGS.hero_subheadline;
    if (SETTINGS.invitation_quote) $('#invitation-quote').textContent = `“${SETTINGS.invitation_quote}”`;
    if (SETTINGS.website_quote) $('#website-quote').textContent = `“${SETTINGS.website_quote}”`;
    if (SETTINGS.instagram_url) $('#footer-instagram').href = SETTINGS.instagram_url;
    $('#footer-year').textContent = new Date().getFullYear();
  }

  // ---------------- Invitations ----------------
  function renderInvitations() {
    const grid = $('#invitation-grid');
    const items = ALL_INVITATIONS.filter((i) => i.type === activeInviteType);
    if (!items.length) {
      grid.innerHTML = `<p style="color:var(--muted); font-size:14px;">Nothing here yet — check back soon.</p>`;
      return;
    }
    grid.innerHTML = items.map((item) => `
      <div class="invite-card">
        <div class="thumb"><img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy"></div>
        <div class="body">
          <span class="kind-tag ${item.type === 'animated' ? 'animated' : ''}">${item.type === 'animated' ? 'ANIMATED' : 'CLASSIC · NO EFFECTS'}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="desc">${escapeHtml(item.description)}</p>
          <span class="price">${escapeHtml(item.price)}</span>
          <div class="card-actions">
            <button class="btn btn-outline btn-sm" data-preview="${item.id}">Preview</button>
            <button class="btn btn-primary btn-sm" data-purchase-invite="${item.id}">Purchase</button>
          </div>
        </div>
      </div>
    `).join('');

    $$('[data-preview]', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = ALL_INVITATIONS.find((i) => i.id == btn.dataset.preview);
        openPreview(item);
      });
    });
    $$('[data-purchase-invite]', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = ALL_INVITATIONS.find((i) => i.id == btn.dataset.purchaseInvite);
        purchaseInvitation(item);
      });
    });
  }

  function purchaseInvitation(item) {
    if (!item) return;
    if (item.purchase_link) {
      window.open(item.purchase_link, '_blank', 'noopener');
    } else {
      toast('Purchase link coming soon — reach out via Start a Project.');
    }
  }

  function openPreview(item) {
    if (!item) return;
    $('#modal-image').src = item.preview_url || item.image_url;
    $('#modal-image').alt = item.title;
    $('#modal-title').textContent = item.title;
    $('#modal-desc').textContent = item.description;
    const purchaseBtn = $('#modal-purchase');
    purchaseBtn.onclick = () => purchaseInvitation(item);
    $('#preview-modal').classList.add('open');
  }
  $('#modal-close').addEventListener('click', () => $('#preview-modal').classList.remove('open'));
  $('#preview-modal').addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') $('#preview-modal').classList.remove('open');
  });

  $$('.type-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.type-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeInviteType = tab.dataset.type;
      renderInvitations();
    });
  });

  // ---------------- Websites ----------------
  function renderCategoryRail(categories) {
    const rail = $('#category-rail');
    rail.innerHTML = ['All', ...categories].map((cat) => `
      <button class="category-pill ${(!activeCategory && cat === 'All') || activeCategory === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
    `).join('');
    $$('.category-pill', rail).forEach((pill) => {
      pill.addEventListener('click', () => {
        activeCategory = pill.dataset.cat === 'All' ? null : pill.dataset.cat;
        $$('.category-pill', rail).forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        renderWebsites();
      });
    });
    enableDragScroll(rail);
  }

  function renderWebsites() {
    const grid = $('#website-grid');
    const items = activeCategory ? ALL_WEBSITES.filter((w) => w.category === activeCategory) : ALL_WEBSITES;
    if (!items.length) {
      grid.innerHTML = `<p style="color:var(--muted); font-size:14px;">No projects in this category yet.</p>`;
      return;
    }
    grid.innerHTML = items.map((item) => `
      <div class="website-card">
        <div class="media">
          ${item.video_url ? `<video src="${escapeHtml(item.video_url)}" muted loop playsinline autoplay onerror="this.style.display='none'"></video>` : ''}
          <div class="fallback">${escapeHtml(item.title)}</div>
        </div>
        <div class="body">
          <span class="cat-tag">${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="desc">${escapeHtml(item.description)}</p>
          <div class="card-actions">
            <button class="btn btn-outline btn-sm" data-live="${escapeHtml(item.live_url)}">Live website</button>
            <button class="btn btn-primary btn-sm" data-purchase-site="1">Purchase</button>
          </div>
        </div>
      </div>
    `).join('');

    $$('[data-live]', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.live) window.open(btn.dataset.live, '_blank', 'noopener');
        else toast('Live preview coming soon.');
      });
    });
    $$('[data-purchase-site]', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = SETTINGS.instagram_url || 'https://instagram.com/';
        window.open(url, '_blank', 'noopener');
      });
    });
  }

  function enableDragScroll(el) {
    let isDown = false, startX, scrollLeft;
    el.addEventListener('mousedown', (e) => {
      isDown = true;
      el.classList.add('dragging');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });
    ['mouseleave', 'mouseup'].forEach((ev) => el.addEventListener(ev, () => {
      isDown = false;
      el.classList.remove('dragging');
    }));
    el.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX) * 1.4;
    });
  }

  // ---------------- Reviews ----------------
  function renderReviews(reviews) {
    const grid = $('#review-grid');
    if (!reviews.length) {
      grid.innerHTML = `<p style="color:var(--muted); font-size:14px;">Be the first to leave a review.</p>`;
    } else {
      grid.innerHTML = reviews.slice(0, 9).map((r) => `
        <div class="review-card">
          <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          <p>${escapeHtml(r.comment || 'Lovely experience working with the studio.')}</p>
          <span class="name">${escapeHtml(r.name)}</span>
        </div>
      `).join('');
    }
    if (reviews.length) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      $('#avg-rating').textContent = avg.toFixed(1);
      const full = Math.round(avg);
      $('#avg-stars').textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
      $('#rating-count').textContent = `${reviews.length} review${reviews.length === 1 ? '' : 's'}`;
    }
  }

  let selectedRating = 0;
  $$('#star-picker button').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val, 10);
      $('#rf-rating').value = selectedRating;
      $$('#star-picker button').forEach((b) => b.classList.toggle('active', parseInt(b.dataset.val, 10) <= selectedRating));
    });
  });

  $('#review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedRating) { toast('Please choose a star rating.'); return; }
    const name = $('#rf-name').value.trim();
    const comment = $('#rf-comment').value.trim();
    try {
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ name, rating: selectedRating, comment }),
      });
      toast('Thanks! Your review is pending approval.');
      e.target.reset();
      selectedRating = 0;
      $$('#star-picker button').forEach((b) => b.classList.remove('active'));
    } catch (err) {
      toast(err.message || 'Could not submit review.');
    }
  });

  // ---------------- Project request form ----------------
  $('#project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      project_type: form.project_type.value,
      budget: form.budget.value.trim(),
      message: form.message.value.trim(),
    };
    try {
      await api('/api/project-requests', { method: 'POST', body: JSON.stringify(payload) });
      toast('Brief sent — we\u2019ll follow up soon.');
      form.reset();
    } catch (err) {
      toast(err.message || 'Could not send brief.');
    }
  });

  // ---------------- Init ----------------
  async function init() {
    try {
      await loadSettings();
      const [invitations, websites, categories, reviews] = await Promise.all([
        api('/api/invitations'),
        api('/api/websites'),
        api('/api/websites/categories'),
        api('/api/reviews'),
      ]);
      ALL_INVITATIONS = invitations;
      ALL_WEBSITES = websites;
      renderInvitations();
      renderCategoryRail(categories);
      renderWebsites();
      renderReviews(reviews);
    } catch (err) {
      console.error(err);
      toast('Could not reach the server. Is the backend running?');
    }
  }
  init();
})();
