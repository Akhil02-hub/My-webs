/* NOVA frontend/backend bridge.
   Replace the inline product/localStorage logic in your original HTML with this file.
*/
const API = '/api';
let products = [];
let cart = JSON.parse(localStorage.getItem('novaCart') || '[]');
let favorites = new Set(JSON.parse(localStorage.getItem('novaFavorites') || '[]'));
let activeFilter = 'All';
let searchTerm = '';

const $ = (id) => document.getElementById(id);
const money = (value) => `$${Number(value).toFixed(2)}`;

async function api(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (activeFilter !== 'All') params.set('category', activeFilter);
  if (searchTerm) params.set('search', searchTerm);
  const sort = $('sortSelect')?.value || 'featured';
  if (sort) params.set('sort', sort);
  products = await api(`/products?${params.toString()}`);
  renderProducts();
}

function renderProducts() {
  const grid = $('productGrid');
  if (!grid) return;
  $('productCount').textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
  if (!products.length) {
    grid.innerHTML = '<div class="empty-products"><h3 style="margin:12px 0 5px;color:var(--ink)">No products found</h3><p>Try another search or category.</p></div>';
    lucide.createIcons();
    return;
  }
  grid.innerHTML = products.map((p, index) => `
    <article class="product-card" style="animation-delay:${index * 45}ms">
      <div class="product-media" onclick="addToCart(${p.id})">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
        ${p.tag ? `<span class="product-tag">${escapeHtml(p.tag)}</span>` : ''}
        <button class="favorite ${favorites.has(p.id) ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${p.id})" aria-label="Save ${escapeHtml(p.name)}"><i data-lucide="heart" width="17"></i></button>
        <button class="quick-add" onclick="event.stopPropagation(); addToCart(${p.id})">Quick add</button>
      </div>
      <div class="product-info">
        <div class="product-category">${escapeHtml(p.category)}</div>
        <div class="product-title-row">
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          <div class="product-price">
            ${p.old_price != null ? `<span class="old-price">${money(p.old_price)}</span>` : ''}
            ${money(p.price)}
          </div>
        </div>
        <div class="rating"><i data-lucide="star" width="12"></i> ${Number(p.rating).toFixed(1)} <span>(${p.reviews})</span></div>
      </div>
    </article>`).join('');
  lucide.createIcons();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function saveCart() { localStorage.setItem('novaCart', JSON.stringify(cart)); }

async function addToCart(id) {
  const product = products.find(p => p.id === id) || await api(`/products/${id}`);
  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id, quantity: 1 });
  saveCart(); renderCart(); showToast(`${product.name} added to your bag`);
}

function updateQuantity(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart(); showToast('Item removed from your bag');
}

function renderCart() {
  const container = $('cartItems');
  if (!container) return;
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  $('cartBadge').textContent = totalQty;
  $('drawerCount').textContent = `(${totalQty})`;
  $('subtotal').textContent = money(subtotal);
  const remaining = Math.max(0, 75 - subtotal);
  $('shippingMessage').textContent = remaining > 0 ? `You're ${money(remaining)} away from free shipping.` : "You've unlocked free shipping!";
  $('progressBar').style.width = `${Math.min(100, subtotal / 75 * 100)}%`;

  if (!cart.length) {
    container.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon"><i data-lucide="shopping-bag" width="28"></i></div><strong>Your bag is empty</strong><span style="font-size:12px;margin-top:5px">Let\'s find something you\'ll love.</span></div>';
  } else {
    container.innerHTML = cart.map(item => {
      const p = products.find(product => product.id === item.id);
      if (!p) return '';
      return `<div class="cart-item"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"><div><h4>${escapeHtml(p.name)}</h4><div class="meta">${escapeHtml(p.category)} · One size</div><div class="quantity"><button onclick="updateQuantity(${p.id},-1)"><i data-lucide="minus" width="12"></i></button><span>${item.quantity}</span><button onclick="updateQuantity(${p.id},1)"><i data-lucide="plus" width="12"></i></button></div></div><div class="cart-item-price">${money(p.price * item.quantity)}<br><button class="remove" onclick="removeFromCart(${p.id})">Remove</button></div></div>`;
    }).join('');
  }
  lucide.createIcons();
}

async function toggleFavorite(id) {
  const email = prompt('Enter your email to save favorites:');
  if (!email) return;
  try {
    if (favorites.has(id)) {
      await api('/favorites', { method: 'DELETE', body: JSON.stringify({ email, product_id: id }) });
      favorites.delete(id); showToast('Removed from saved items');
    } else {
      await api('/favorites', { method: 'POST', body: JSON.stringify({ email, product_id: id }) });
      favorites.add(id); showToast('Saved to your favorites');
    }
    localStorage.setItem('novaFavorites', JSON.stringify([...favorites]));
    renderProducts();
  } catch (error) { showToast(error.message); }
}

async function checkout() {
  if (!cart.length) return showToast('Your bag is currently empty');
  const name = prompt('Customer name (optional):') || '';
  const email = prompt('Email (optional):') || '';
  try {
    const order = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({ customer: { name, email }, items: cart }),
    });
    cart = []; saveCart(); renderCart();
    showToast(`Order #${order.order_id} created — total ${money(order.total)}`);
  } catch (error) { showToast(error.message); }
}

async function subscribeNewsletter(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector('input');
  try {
    const result = await api('/newsletter', { method: 'POST', body: JSON.stringify({ email: input.value }) });
    showToast(`${result.message} Code: ${result.discount_code}`);
    input.value = '';
  } catch (error) { showToast(error.message); }
}

function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  $('toastText').textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__novaToastTimer);
  window.__novaToastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

async function initNovaBackend() {
  try { await loadProducts(); renderCart(); } catch (error) { showToast(`Backend error: ${error.message}`); }

  $('sortSelect')?.addEventListener('change', loadProducts);
  document.querySelectorAll('.filter-pill').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    searchTerm = '';
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p === button));
    loadProducts();
  }));
  document.querySelectorAll('[data-category-link]').forEach(link => link.addEventListener('click', () => {
    activeFilter = link.dataset.categoryLink;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === activeFilter));
    loadProducts();
  }));
  $('newsletterForm')?.addEventListener('submit', subscribeNewsletter);
  $('checkoutButton')?.addEventListener('click', checkout);
}

document.addEventListener('DOMContentLoaded', initNovaBackend);
