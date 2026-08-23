 const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();
try { tg.setHeaderColor('#050508'); tg.setBackgroundColor('#050508'); } catch(e) {}

const SUPPORT_URL = 'https://t.me/m0rphine_support';
const CATEGORY_NAMES = { jewelry: 'Украшения', clothing: 'Одежда', accessories: 'Аксессуары' };

let products = [];
let cart = JSON.parse(localStorage.getItem('m0rphine_cart') || '[]');
let favorites = JSON.parse(localStorage.getItem('m0rphine_favs') || '[]');
let currentFilter = 'all';
let currentSort = 'default';
let searchQuery = '';

/* ===== CANVAS ФОН ===== */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
resizeCanvas();

function initParticles() {
  particles = [];
  const count = Math.floor((canvas.width * canvas.height) / 20000);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4, dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.1
    });
  }
}
initParticles();

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.x += p.dx; p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(157, 0, 255, ${p.o})`;
    ctx.fill();
  }
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
      if (d < 100) {
        ctx.strokeStyle = `rgba(157, 0, 255, ${0.15 * (1 - d / 100)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(animate);
}
animate();

/* ===== ЗАГРУЗКА ===== */
async function init() {
  try {
    const res = await fetch('products.json?t=' + Date.now());
    products = await res.json();
  } catch (e) {
    showToast('Ошибка загрузки товаров', 'error');
  }
  renderProducts();
  updateBadges();
  document.getElementById('loader').classList.add('hidden');
}

/* ===== РЕНДЕР ТОВАРОВ ===== */
function getFiltered() {
  let list = [...products];
  if (currentFilter !== 'all') list = list.filter(p => p.category === currentFilter);
  if (searchQuery) {
    list = list.filter(p =>
      (p.name + ' ' + p.description).toLowerCase().includes(searchQuery));
  }
  if (currentSort === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (currentSort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (currentSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  if (currentSort === 'newest') list.sort((a, b) => (b.badge === 'NEW') - (a.badge === 'NEW'));
  return list;
}

function renderProducts() {
  const list = getFiltered();
  document.getElementById('products-count').textContent = `Товаров: ${list.length}`;
  const grid = document.getElementById('products-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">🕸️</div>
      <div class="empty-state-title">Ничего не найдено</div>
      <div class="empty-state-text">Попробуй изменить фильтры или поиск</div>
    </div>`;
    return;
  }
  grid.innerHTML = list.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.06}s" onclick="openProduct(${p.id})">
      <div class="product-image-wrapper">
        ${p.image ? `<img class="product-image" src="${p.image}" alt="">`
                  : `<div class="product-emoji">${p.emoji || '🖤'}</div>`}
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        <button class="product-favorite-btn ${favorites.includes(p.id) ? 'active' : ''}"
          onclick="event.stopPropagation(); toggleFavorite(${p.id})">
          <i class="fas fa-heart"></i>
        </button>
      </div>
      <div class="product-info">
        <div class="product-category">${CATEGORY_NAMES[p.category] || ''}</div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-description">${p.description}</p>
        <div class="product-footer">
          <div class="product-price">${p.price.toLocaleString('ru-RU')} ₽</div>
          <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${p.id})">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    </div>`).join('');
}

/* ===== КАРТОЧКА ТОВАРА ===== */
function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-body').innerHTML = `
    <div class="product-detail">
      <div class="product-detail-image">
        ${p.image ? `<img src="${p.image}" alt="">` : (p.emoji || '🖤')}
      </div>
      <div class="product-category">${CATEGORY_NAMES[p.category] || ''}</div>
      <h2 class="detail-name">${p.name}</h2>
      <p class="detail-desc">${p.description}</p>
      <div class="detail-price">${p.price.toLocaleString('ru-RU')} ₽</div>
      <div class="detail-actions">
        <button class="detail-fav" onclick="toggleFavorite(${p.id})">
          <i class="fas fa-heart"></i>
        </button>
        <button class="detail-add" onclick="addToCart(${p.id}); closeProductModal();">
          <i class="fas fa-cart-plus"></i> В корзину
        </button>
      </div>
    </div>`;
  document.getElementById('product-modal').classList.add('active');
  tg.HapticFeedback.impactOccurred('light');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
}

/* ===== КОРЗИНА ===== */
function addToCart(id) {
  const item = cart.find(i => i.id === id);
  if (item) item.qty++;
  else {
    const p = products.find(x => x.id === id);
    cart.push({ ...p, qty: 1 });
  }
  saveCart();
  updateBadges();
  renderCart();
  showToast('✅ Добавлено в корзину', 'success');
  tg.HapticFeedback.impactOccurred('medium');
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) item.qty = 1;
  saveCart(); updateBadges(); renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); updateBadges(); renderCart();
  showToast('🗑️ Удалено из корзины', 'success');
}

function renderCart() {
  const box = document.getElementById('cart-items');
  if (!cart.length) {
    box.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🛒</div>
      <div class="empty-state-title">Корзина пуста</div>
      <div class="empty-state-text">Добавь что-нибудь тёмное и красивое</div>
    </div>`;
  } else {
    box.innerHTML = cart.map(i => `
      <div class="cart-item">
        <div class="cart-item-image">${i.image ? '🛍️' : (i.emoji || '🖤')}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-price">${(i.price * i.qty).toLocaleString('ru-RU')} ₽</div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
            <span>${i.qty}</span>
            <button class="qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
          </div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${i.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>`).join('');
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cart-subtotal').textContent = total.toLocaleString('ru-RU') + ' ₽';
  document.getElementById('cart-total').textContent = total.toLocaleString('ru-RU') + ' ₽';
}

function openCart() {
  closeMenu();
  renderCart();
  document.getElementById('cart-modal').classList.add('active');
}
function viewCart() { openCart(); }
function closeCart() { document.getElementById('cart-modal').classList.remove('active'); }

function checkout() {
  if (!cart.length) return showToast('❌ Корзина пуста!', 'error');
  const order = cart.map(i => `${i.name} ×${i.qty}`).join(', ');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  tg.sendData(JSON.stringify({ order, total, items: cart.length }));
  showToast('✅ Заказ отправлен!', 'success');
  cart = [];
  saveCart(); updateBadges(); closeCart();
  setTimeout(() => tg.close(), 800);
}

/* ===== ИЗБРАННОЕ ===== */
function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(f => f !== id);
    showToast('💔 Удалено из избранного', 'success');
  } else {
    favorites.push(id);
    showToast('❤️ Добавлено в избранное', 'success');
  }
  localStorage.setItem('m0rphine_favs', JSON.stringify(favorites));
  updateBadges(); renderProducts();
  if (document.getElementById('favorites-modal').classList.contains('active')) renderFavorites();
  tg.HapticFeedback.impactOccurred('light');
}

function renderFavorites() {
  const box = document.getElementById('favorites-body');
  const list = products.filter(p => favorites.includes(p.id));
  if (!list.length) {
    box.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">💔</div>
      <div class="empty-state-title">Избранное пусто</div>
      <div class="empty-state-text">Нажимай на сердечко, чтобы сохранять</div>
    </div>`;
    return;
  }
  box.innerHTML = list.map(p => `
    <div class="favorite-item">
      <div class="favorite-item-image">${p.emoji || '🖤'}</div>
      <div class="favorite-item-info">
        <div class="favorite-item-name">${p.name}</div>
        <div class="favorite-item-price">${p.price.toLocaleString('ru-RU')} ₽</div>
        <div class="favorite-item-actions">
          <button class="add-to-cart-btn" style="width:auto;padding:8px 15px"
            onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i></button>
          <button class="remove-btn" onclick="toggleFavorite(${p.id})">
            <i class="fas fa-heart-crack"></i>
          </button>
        </div>
      </div>
    </div>`).join('');
}

function showFavorites() { closeMenu(); renderFavorites();
  document.getElementById('favorites-modal').classList.add('active'); }
function toggleFavorites() { showFavorites(); }
function closeFavorites() { document.getElementById('favorites-modal').classList.remove('active'); }

/* ===== ФИЛЬТРЫ / ПОИСК / СОРТИРОВКА ===== */
function filterCategory(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(b =>
    b.classList.toggle('active', b.dataset.category === cat));
  closeMenu();
  renderProducts();
}

function searchProducts() {
  searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  renderProducts();
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  searchQuery = '';
  renderProducts();
}

function toggleSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.toggle('active');
  if (bar.classList.contains('active')) document.getElementById('search-input').focus();
}

function sortProducts() {
  currentSort = document.getElementById('sort-select').value;
  renderProducts();
}

/* ===== МЕНЮ ===== */
function toggleMenu() { document.getElementById('side-menu').classList.toggle('active'); }
function closeMenu() { document.getElementById('side-menu').classList.remove('active'); }

function contactSupport() {
  closeMenu();
  try { tg.openTelegramLink(SUPPORT_URL); }
  catch(e) { showToast('💬 Поддержка: ' + SUPPORT_URL, 'success'); }
}

function showAbout() {
  closeMenu();
  document.getElementById('modal-body').innerHTML = `
    <div class="product-detail">
      <div class="product-detail-image">🖤</div>
      <h2 class="detail-name">m0rphine</h2>
      <p class="detail-desc">
        Готический магазин уникальных вещей.<br><br>
        ⚰️ Украшения ручной работы<br>
        🕸 Одежда и аксессуары<br>
        🦇 Доставка по всей стране<br><br>
        Все вещи отбираются вручную и несут тёмную эстетику.
      </p>
      <button class="detail-add" onclick="closeProductModal()">
        <i class="fas fa-check"></i> Понятно
      </button>
    </div>`;
  document.getElementById('product-modal').classList.add('active');
}

/* ===== СЛУЖЕБНОЕ ===== */
function saveCart() { localStorage.setItem('m0rphine_cart', JSON.stringify(cart)); }

function updateBadges() {
  const cc = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-count').textContent = cc;
  document.getElementById('favorites-count').textContent = favorites.length;
}

function showToast(message, type = 'success') {
  const box = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>${message}`;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

window.addEventListener('scroll', () => {
  document.getElementById('scroll-top').classList.toggle('visible', window.scrollY > 300);
});

init();
