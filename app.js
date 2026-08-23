 const tg = window.Telegram.WebApp;
tg.expand();
try {
  tg.setHeaderColor('#050508');
  tg.setBackgroundColor('#050508');
} catch (e) {}

let products = [];
let cart = JSON.parse(localStorage.getItem('m0rphine_cart') || '[]');
let favorites = JSON.parse(localStorage.getItem('m0rphine_favs') || '[]');
let currentFilter = 'all';
let currentSort = 'default';
let searchQuery = '';

// ===== АНИМИРОВАННЫЙ ФОН (частицы) =====
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initParticles() {
  particles = [];
  const count = Math.min(50, Math.floor(window.innerWidth / 15));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      hue: Math.random() > 0.5 ? 280 : 190
    });
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.x += p.dx; p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, 0.4)`;
    ctx.fill();
  });
  requestAnimationFrame(animateParticles);
}
initParticles();
animateParticles();

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function init() {
  showLoader();
  try {
    const res = await fetch('products.json');
    products = await res.json();
  } catch (e) {
    showToast('Ошибка загрузки товаров', 'error');
  }
  applyFiltersAndSort();
  updateBadges();
  hideLoader();
}

// ===== РЕНДЕР ТОВАРОВ =====
function applyFiltersAndSort() {
  let list = [...products];

  if (currentFilter !== 'all') list = list.filter(p => p.category === currentFilter);
  if (searchQuery) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery)
    );
  }

  switch (currentSort) {
    case 'price-asc': list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'newest': list.sort((a, b) => b.id - a.id); break;
  }

  document.getElementById('products-count').textContent = `Товаров: ${list.length}`;
  renderProducts(list);
}

function renderProducts(list) {
  const grid = document.getElementById('products-grid');

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🕸️</div>
        <div class="empty-state-title">Ничего не найдено</div>
        <div class="empty-state-text">Попробуй изменить фильтры или поиск</div>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.07}s" onclick="openProduct(${p.id})">
      <div class="product-image-wrapper">
        ${p.image
          ? `<img class="product-image" src="${p.image}" alt="${p.name}">`
          : `<div class="product-emoji">${p.emoji || '🖤'}</div>`}
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
        <button class="product-favorite-btn ${favorites.includes(p.id) ? 'active' : ''}"
          onclick="event.stopPropagation(); toggleFavorite(${p.id})">
          <i class="fas fa-heart"></i>
        </button>
      </div>
      <div class="product-info">
        <div class="product-category">${categoryName(p.category)}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-description">${p.description}</div>
        <div class="product-footer">
          <div class="product-price">${p.price.toLocaleString()} ₽</div>
          <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${p.id})">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function categoryName(c) {
  return { jewelry: 'Украшения', clothing: 'Одежда', accessories: 'Аксессуары' }[c] || c;
}

// ===== МОДАЛКА ТОВАРА =====
function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-body').innerHTML = `
    <div class="product-image-wrapper" style="height:250px">
      ${p.image
        ? `<img class="product-image" src="${p.image}">`
        : `<div class="product-emoji">${p.emoji || '🖤'}</div>`}
    </div>
    <div style="padding:25px">
      <div class="product-category">${categoryName(p.category)}</div>
      <h2 style="font-family:'Cinzel',serif;margin:10px 0">${p.name}</h2>
      <p style="color:var(--text-secondary);margin-bottom:20px">${p.description}</p>
      <div class="product-price" style="font-size:28px;margin-bottom:20px">${p.price.toLocaleString()} ₽</div>
      <button class="checkout-btn" onclick="addToCart(${p.id}); closeProductModal()">
        <i class="fas fa-cart-plus"></i> В корзину
      </button>
    </div>`;
  document.getElementById('product-modal').style.display = 'block';
  tg.HapticFeedback.impactOccurred('light');
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
}

// ===== КОРЗИНА =====
function addToCart(id) {
  const item = cart.find(i => i.id === id);
  if (item) item.quantity++;
  else {
    const p = products.find(x => x.id === id);
    cart.push({ ...p, quantity: 1 });
  }
  saveCart();
  showToast('Добавлено в корзину', 'success');
  tg.HapticFeedback.impactOccurred('medium');
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
  showToast('Товар удалён', 'success');
}

function saveCart() {
  localStorage.setItem('m0rphine_cart', JSON.stringify(cart));
  updateBadges();
}

function updateBadges() {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cart-count').textContent = count;
  document.getElementById('favorites-count').textContent = favorites.length;
}

function openCart() { renderCart(); document.getElementById('cart-modal').style.display = 'block'; }
function viewCart() { toggleMenu(); openCart(); }
function closeCart() { document.getElementById('cart-modal').style.display = 'none'; }

function renderCart() {
  const box = document.getElementById('cart-items');
  if (!cart.length) {
    box.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <div class="empty-state-title">Корзина пуста</div>
        <div class="empty-state-text">Добавь что-нибудь тёмное и стильное</div>
      </div>`;
  } else {
    box.innerHTML = cart.map(i => `
      <div class="cart-item">
        <div class="cart-item-image">${i.image ? `<img src="${i.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : (i.emoji || '🖤')}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-price">${(i.price * i.quantity).toLocaleString()} ₽</div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
            <span>${i.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${i.id})">🗑</button>
          </div>
        </div>
      </div>`).join('');
  }
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  document.getElementById('cart-subtotal').textContent = total.toLocaleString() + ' ₽';
  document.getElementById('cart-total').textContent = total.toLocaleString() + ' ₽';
}

function checkout() {
  if (!cart.length) { showToast('Корзина пуста!', 'error'); return; }
  const user = tg.initDataUnsafe.user || {};
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  tg.sendData(JSON.stringify({
    order: cart.map(i => `${i.name} ×${i.quantity}`).join(', '),
    total,
    items: cart.reduce((s, i) => s + i.quantity, 0),
    user: user.username || user.first_name || 'unknown'
  }));
  cart = [];
  saveCart();
  closeCart();
  showToast('✅ Заказ отправлен!', 'success');
  setTimeout(() => tg.close(), 800);
}

// ===== ИЗБРАННОЕ =====
function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(f => f !== id);
    showToast('Удалено из избранного', 'success');
  } else {
    favorites.push(id);
    showToast('❤️ В избранном!', 'success');
  }
  localStorage.setItem('m0rphine_favs', JSON.stringify(favorites));
  updateBadges();
  applyFiltersAndSort();
}

function toggleFavorites() { showFavorites(); }

function showFavorites() {
  const box = document.getElementById('favorites-body');
  const favs = products.filter(p => favorites.includes(p.id));
  if (!favs.length) {
    box.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💔</div>
        <div class="empty-state-title">Пока пусто</div>
        <div class="empty-state-text">Жми на сердечко, чтобы сохранить</div>
      </div>`;
  } else {
    box.innerHTML = favs.map(p => `
      <div class="favorite-item">
        <div class="favorite-item-image">${p.emoji || '🖤'}</div>
        <div class="favorite-item-info">
          <div class="favorite-item-name">${p.name}</div>
          <div class="favorite-item-price">${p.price.toLocaleString()} ₽</div>
          <div class="favorite-item-actions">
            <button class="qty-btn" onclick="addToCart(${p.id})">🛒</button>
            <button class="remove-btn" onclick="toggleFavorite(${p.id}); showFavorites()">Убрать</button>
          </div>
        </div>
      </div>`).join('');
  }
  document.getElementById('favorites-modal').style.display = 'block';
}

function closeFavorites() { document.getElementById('favorites-modal').style.display = 'none'; }

// ===== ПОИСК / ФИЛЬТРЫ / СОРТИРОВКА =====
function toggleSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.toggle('active');
  if (bar.classList.contains('active')) document.getElementById('search-input').focus();
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  searchQuery = '';
  applyFiltersAndSort();
}

function searchProducts() {
  searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  applyFiltersAndSort();
}

function filterCategory(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.category === cat);
  });
  applyFiltersAndSort();
  if (document.getElementById('side-menu').classList.contains('active')) toggleMenu();
}

function sortProducts() {
  currentSort = document.getElementById('sort-select').value;
  applyFiltersAndSort();
}

// ===== МЕНЮ =====
function toggleMenu() { document.getElementById('side-menu').classList.toggle('active'); }

function contactSupport() {
  toggleMenu();
  try { tg.openTelegramLink('https://t.me/m0rphine_support'); }
  catch (e) { showToast('Поддержка: @m0rphine_support', 'success'); }
}

function showAbout() {
  toggleMenu();
  document.getElementById('modal-body').innerHTML = `
    <div style="padding:40px;text-align:center">
      <div style="font-size:70px;margin-bottom:20px">🖤</div>
      <h2 style="font-family:'Cinzel',serif;margin-bottom:15px">m0rphine</h2>
      <p style="color:var(--text-secondary)">
        Готический магазин уникальных вещей.<br>
        Украшения, одежда и аксессуары для тех, кто любит тёмную эстетику.
      </p>
      <p style="color:var(--text-muted);margin-top:20px;font-size:12px">v2.0 ULTIMATE</p>
    </div>`;
  document.getElementById('product-modal').style.display = 'block';
}

// ===== СКРОЛЛ НАВЕРХ =====
window.addEventListener('scroll', () => {
  document.getElementById('scroll-top').classList.toggle('visible', window.scrollY > 300);
});

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ===== TOAST / LOADER =====
function showToast(message, type = 'success') {
  const box = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function showLoader() { document.getElementById('loader').classList.remove('hidden'); }
function hideLoader() {
  setTimeout(() => document.getElementById('loader').classList.add('hidden'), 500);
}

init();
