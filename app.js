 // ===== TELEGRAM =====
let tg = null;
try {
  tg = window.Telegram.WebApp;
  tg.expand();
  tg.ready();
} catch (e) {
  console.log('Not in Telegram');
}

function haptic(type) {
  try { tg.HapticFeedback.impactOccurred(type || 'light'); } catch (e) {}
}

function storageGet(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; }
}

function storageSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

// ===== ДАННЫЕ =====
let products = [];
let cart = storageGet('m0rphine_cart', []);
let favorites = storageGet('m0rphine_favs', []);
let currentFilter = 'all';
let currentSort = 'default';
let searchQuery = '';

// ===== АНИМИРОВАННЫЙ ФОН =====
const canvas = document.getElementById('bg-canvas');
let ctx = null;
let particles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

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
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(function (p) {
    p.x += p.dx; p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'hsla(' + p.hue + ', 100%, 60%, 0.4)';
    ctx.fill();
  });
  requestAnimationFrame(animateParticles);
}

if (canvas) {
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  initParticles();
  animateParticles();
}

// ===== СТАРТ =====
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

// ===== ТОВАРЫ =====
function categoryName(c) {
  const map = { jewelry: 'Украшения', clothing: 'Одежда', accessories: 'Аксессуары' };
  return map[c] || c;
}

function applyFiltersAndSort() {
  let list = products.slice();

  if (currentFilter !== 'all') {
    list = list.filter(function (p) { return p.category === currentFilter; });
  }

  if (searchQuery) {
    list = list.filter(function (p) {
      return p.name.toLowerCase().includes(searchQuery) ||
             p.description.toLowerCase().includes(searchQuery);
    });
  }

  if (currentSort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
  if (currentSort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
  if (currentSort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  if (currentSort === 'newest') list.sort(function (a, b) { return b.id - a.id; });

  const counter = document.getElementById('products-count');
  if (counter) counter.textContent = 'Товаров: ' + list.length;
  renderProducts(list);
}

function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1">' +
      '<div class="empty-state-icon">🕸️</div>' +
      '<div class="empty-state-title">Ничего не найдено</div>' +
      '<div class="empty-state-text">Попробуй другие фильтры</div>' +
      '</div>';
    return;
  }

  grid.innerHTML = list.map(function (p, i) {
    const img = p.image
      ? '<img class="product-image" src="' + p.image + '" alt="">'
      : '<div class="product-emoji">' + (p.emoji || '🖤') + '</div>';
    const badge = p.badge ? '<div class="product-badge">' + p.badge + '</div>' : '';
    const fav = favorites.includes(p.id) ? ' active' : '';

    return '<div class="product-card" style="animation-delay:' + (i * 0.06) + 's" onclick="openProduct(' + p.id + ')">' +
      '<div class="product-image-wrapper">' + img + badge +
      '<button class="product-favorite-btn' + fav + '" onclick="event.stopPropagation(); toggleFavorite(' + p.id + ')">' +
      '<i class="fas fa-heart"></i></button>' +
      '</div>' +
      '<div class="product-info">' +
      '<div class="product-category">' + categoryName(p.category) + '</div>' +
      '<div class="product-name">' + p.name + '</div>' +
      '<div class="product-description">' + p.description + '</div>' +
      '<div class="product-footer">' +
      '<div class="product-price">' + p.price.toLocaleString() + ' ₽</div>' +
      '<button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(' + p.id + ')">' +
      '<i class="fas fa-plus"></i></button>' +
      '</div></div></div>';
  }).join('');
}

// ===== МОДАЛКА ТОВАРА =====
function openProduct(id) {
  const p = products.find(function (x) { return x.id === id; });
  if (!p) return;

  const img = p.image
    ? '<img class="product-image" src="' + p.image + '" style="height:230px">'
    : '<div class="product-emoji" style="height:230px;display:flex;align-items:center;justify-content:center">' + (p.emoji || '🖤') + '</div>';

  const body = document.getElementById('modal-body');
  if (!body) return;

  body.innerHTML = img +
    '<div style="padding:22px">' +
    '<div class="product-category">' + categoryName(p.category) + '</div>' +
    '<h2 style="font-family:Cinzel,serif;margin:8px 0">' + p.name + '</h2>' +
    '<p style="color:var(--text-secondary);margin-bottom:15px">' + p.description + '</p>' +
    '<div class="product-price" style="font-size:26px;margin-bottom:18px">' + p.price.toLocaleString() + ' ₽</div>' +
    '<button class="checkout-btn" onclick="addToCart(' + p.id + '); closeProductModal()">' +
    '<i class="fas fa-cart-plus"></i> В корзину</button>' +
    '</div>';

  document.getElementById('product-modal').style.display = 'flex';
  haptic();
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
}

// ===== КОРЗИНА =====
function addToCart(id) {
  const p = products.find(function (x) { return x.id === id; });
  if (!p) return;

  const item = cart.find(function (i) { return i.id === id; });
  if (item) item.quantity += 1;
  else cart.push({ id: p.id, name: p.name, price: p.price, emoji: p.emoji, image: p.image, quantity: 1 });

  saveCart();
  showToast('✅ Добавлено в корзину');
  haptic('medium');
}

function changeQty(id, delta) {
  const item = cart.find(function (i) { return i.id === id; });
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(function (i) { return i.id !== id; });
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(function (i) { return i.id !== id; });
  saveCart();
  renderCart();
  showToast('🗑️ Удалено');
}

function saveCart() {
  storageSet('m0rphine_cart', cart);
  updateBadges();
}

function updateBadges() {
  const count = cart.reduce(function (s, i) { return s + i.quantity; }, 0);
  const c = document.getElementById('cart-count');
  const f = document.getElementById('favorites-count');
  if (c) c.textContent = count;
  if (f) f.textContent = favorites.length;
}

function openCart() {
  renderCart();
  document.getElementById('cart-modal').style.display = 'flex';
}

function viewCart() {
  toggleMenu();
  openCart();
}

function closeCart() {
  document.getElementById('cart-modal').style.display = 'none';
}

function renderCart() {
  const box = document.getElementById('cart-items');
  if (!box) return;

  if (!cart.length) {
    box.innerHTML =
      '<div class="empty-state">' +
      '<div class="empty-state-icon">🛒</div>' +
      '<div class="empty-state-title">Корзина пуста</div>' +
      '<div class="empty-state-text">Добавь что-нибудь тёмное</div>' +
      '</div>';
  } else {
    box.innerHTML = cart.map(function (i) {
      const img = i.image
        ? '<img src="' + i.image + '" style="width:100%;height:100%;object-fit:cover">'
        : (i.emoji || '🖤');
      return '<div class="cart-item">' +
        '<div class="cart-item-image">' + img + '</div>' +
        '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + i.name + '</div>' +
        '<div class="cart-item-price">' + (i.price * i.quantity).toLocaleString() + ' ₽</div>' +
        '<div class="cart-item-quantity">' +
        '<button class="qty-btn" onclick="changeQty(' + i.id + ', -1)">−</button>' +
        '<span>' + i.quantity + '</span>' +
        '<button class="qty-btn" onclick="changeQty(' + i.id + ', 1)">+</button>' +
        '<button class="remove-btn" onclick="removeFromCart(' + i.id + ')">🗑</button>' +
        '</div></div></div>';
    }).join('');
  }

  const total = cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
  const sub = document.getElementById('cart-subtotal');
  const tot = document.getElementById('cart-total');
  if (sub) sub.textContent = total.toLocaleString() + ' ₽';
  if (tot) tot.textContent = total.toLocaleString() + ' ₽';
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА (с диагностикой) =====
function checkout() {
  if (!cart.length) { showToast('Корзина пуста!', 'error'); return; }

  const total = cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
  const itemsCount = cart.reduce(function (s, i) { return s + i.quantity; }, 0);
  const orderText = cart.map(function (i) { return i.name + ' ×' + i.quantity; }).join(', ');

  let username = 'unknown';
  try {
    const u = tg.initDataUnsafe.user || {};
    username = u.username || u.first_name || 'unknown';
  } catch (e) {}

  let ok = false;
  try {
    if (tg && typeof tg.sendData === 'function') {
      tg.sendData(JSON.stringify({
        order: orderText,
        total: total,
        items: itemsCount,
        user: username
      }));
      ok = true;
    }
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }

  if (ok) showToast('✅ Заказ отправлен боту!');
  else showToast('❌ Не удалось отправить! Открой магазин с телефона', 'error');

  if (ok) {
    cart = [];
    saveCart();
    closeCart();
    setTimeout(function () { try { tg.close(); } catch (e) {} }, 900);
  }
}

// ===== ИЗБРАННОЕ =====
function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(function (f) { return f !== id; });
    showToast('💔 Удалено из избранного');
  } else {
    favorites.push(id);
    showToast('❤️ В избранном!');
  }
  storageSet('m0rphine_favs', favorites);
  updateBadges();
  applyFiltersAndSort();
  haptic();
}

function showFavorites() {
  const box = document.getElementById('favorites-body');
  if (!box) return;

  const favs = products.filter(function (p) { return favorites.includes(p.id); });

  if (!favs.length) {
    box.innerHTML =
      '<div class="empty-state">' +
      '<div class="empty-state-icon">💔</div>' +
      '<div class="empty-state-title">Пока пусто</div>' +
      '<div class="empty-state-text">Жми на сердечко</div>' +
      '</div>';
  } else {
    box.innerHTML = favs.map(function (p) {
      return '<div class="favorite-item">' +
        '<div class="favorite-item-image">' + (p.emoji || '🖤') + '</div>' +
        '<div class="favorite-item-info">' +
        '<div class="favorite-item-name">' + p.name + '</div>' +
        '<div class="favorite-item-price">' + p.price.toLocaleString() + ' ₽</div>' +
        '<div class="favorite-item-actions">' +
        '<button class="qty-btn" onclick="addToCart(' + p.id + ')">🛒</button>' +
        '<button class="remove-btn" onclick="toggleFavorite(' + p.id + '); showFavorites()">Убрать</button>' +
        '</div></div></div>';
    }).join('');
  }

  document.getElementById('favorites-modal').style.display = 'flex';
}

function closeFavorites() {
  document.getElementById('favorites-modal').style.display = 'none';
}

// ===== ПОИСК =====
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

// ===== ФИЛЬТРЫ / СОРТИРОВКА =====
function filterCategory(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(function (b) {
    b.classList.toggle('active', b.dataset.category === cat);
  });
  applyFiltersAndSort();
  const menu = document.getElementById('side-menu');
  if (menu.classList.contains('active')) toggleMenu();
}

function sortProducts() {
  currentSort = document.getElementById('sort-select').value;
  applyFiltersAndSort();
}

// ===== МЕНЮ =====
function toggleMenu() {
  document.getElementById('side-menu').classList.toggle('active');
}

function contactSupport() {
  toggleMenu();
  try { tg.openTelegramLink('https://t.me/m0rphine_support'); }
  catch (e) { showToast('Поддержка: @m0rphine_support'); }
}

function showAbout() {
  toggleMenu();
  const body = document.getElementById('modal-body');
  if (!body) return;
  body.innerHTML =
    '<div style="padding:40px;text-align:center">' +
    '<div style="font-size:60px;margin-bottom:15px">🖤</div>' +
    '<h2 style="font-family:Cinzel,serif;margin-bottom:12px">m0rphine</h2>' +
    '<p style="color:var(--text-secondary)">Готический магазин уникальных вещей для тех, кто любит тёмную эстетику.</p>' +
    '<p style="color:var(--text-muted);margin-top:15px;font-size:12px">v4.0 ULTIMATE</p>' +
    '</div>';
  document.getElementById('product-modal').style.display = 'flex';
}

// ===== СКРОЛЛ НАВЕРХ =====
window.addEventListener('scroll', function () {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 300);
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== УВЕДОМЛЕНИЯ =====
function showToast(message, type) {
  const box = document.getElementById('toast-container');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = message;
  box.appendChild(t);
  setTimeout(function () { t.remove(); }, 2500);
}

// ===== ЛОАДЕР =====
function showLoader() {
  const l = document.getElementById('loader');
  if (l) l.classList.remove('hidden');
}

function hideLoader() {
  const l = document.getElementById('loader');
  if (l) {
    l.classList.add('hidden');
    setTimeout(function () { l.style.display = 'none'; }, 600);
  }
}

// ===== ЗАПУСК =====
init();
