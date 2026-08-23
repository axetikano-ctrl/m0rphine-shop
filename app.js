 const tg = window.Telegram.WebApp;
tg.expand();

let cart = [];
let products = [];
let currentFilter = 'all';
let currentSort = 'default';

// Инициализация
async function init() {
  showLoader();
  await loadProducts();
  hideLoader();
  tg.ready();
}

// Загрузка товаров
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    products = await res.json();
    renderProducts();
  } catch (error) {
    showToast('❌ Ошибка загрузки товаров', 'error');
  }
}

// Отображение товаров
function renderProducts(productsToRender = products) {
  const container = document.getElementById('products');
  
  if (productsToRender.length === 0) {
    container.innerHTML = '<div class="empty-cart"><div class="empty-cart-icon"></div><p>Товары не найдены</p></div>';
    return;
  }
  
  container.innerHTML = productsToRender.map((p, index) => `
    <div class="product" style="animation-delay: ${index * 0.1}s">
      <div class="product-image">${p.emoji || '💀'}</div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-price">${p.price.toLocaleString()} ₽</div>
        <button class="add-to-cart-btn" onclick="addToCart(${p.id})">
          В корзину 
        </button>
      </div>
    </div>
  `).join('');
}

// Добавление в корзину
function addToCart(id) {
  const product = products.find(p => p.id === id);
  const existingItem = cart.find(item => item.id === id);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  
  updateCart();
  showToast(`✅ ${product.name} добавлен`, 'success');
  tg.HapticFeedback.impactOccurred('medium');
}

// Обновление корзины
function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  badge.textContent = count;
  
  if (count > 0) {
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// Открытие корзины
function openCart() {
  const modal = document.getElementById('cart-modal');
  const itemsContainer = document.getElementById('cart-items');
  
  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <p>Корзина пуста</p>
      </div>
    `;
  } else {
    itemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <div class="cart-item-price">
            ${item.price.toLocaleString()} ₽ × ${item.quantity}
          </div>
        </div>
        <button class="remove-item-btn" onclick="removeFromCart(${item.id})">
          Удалить
        </button>
      </div>
    `).join('');
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('total-price').textContent = `${total.toLocaleString()} ₽`;
  
  modal.classList.add('active');
}

// Закрытие корзины
function closeCart() {
  document.getElementById('cart-modal').classList.remove('active');
}

// Удаление из корзины
function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  updateCart();
  openCart(); // Перерисовать корзину
  showToast('🗑️ Товар удалён', 'success');
}

// Очистка корзины
function clearCart() {
  if (cart.length === 0) return;
  
  if (confirm('Очистить корзину?')) {
    cart = [];
    updateCart();
    openCart();
    showToast('🗑️ Корзина очищена', 'success');
  }
}

// Оформление заказа
function checkout() {
  if (cart.length === 0) {
    showToast('❌ Корзина пуста!', 'error');
    return;
  }
  
  const order = cart.map(item => `${item.name} × ${item.quantity}`).join(', ');
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  tg.sendData(JSON.stringify({ 
    order, 
    total,
    items: cart.length
  }));
  
  showToast('✅ Заказ отправлен!', 'success');
  cart = [];
  updateCart();
  closeCart();
  
  setTimeout(() => {
    tg.close();
  }, 1000);
}

// Фильтрация по категориям
function filterCategory(category) {
  currentFilter = category;
  
  // Обновить активную кнопку
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  applyFiltersAndSort();
}

// Поиск товаров
function searchProducts() {
  const query = document.getElementById('search-input').value.toLowerCase();
  applyFiltersAndSort(query);
}

// Сортировка
function sortProducts() {
  currentSort = document.getElementById('sort-select').value;
  applyFiltersAndSort();
}

// Применение фильтров и сортировки
function applyFiltersAndSort(searchQuery = '') {
  let filtered = products;
  
  // Фильтр по категории
  if (currentFilter !== 'all') {
    filtered = filtered.filter(p => p.category === currentFilter);
  }
  
  // Поиск
  if (searchQuery) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery)
    );
  }
  
  // Сортировка
  switch (currentSort) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  
  renderProducts(filtered);
}

// Показать/скрыть поиск
function toggleSearch() {
  const container = document.getElementById('search-container');
  container.classList.toggle('active');
  if (container.classList.contains('active')) {
    document.getElementById('search-input').focus();
  }
}

// Уведомления
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  if (type === 'error') {
    toast.style.borderColor = 'var(--error)';
  }
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Loader
function showLoader() {
  document.getElementById('loader').classList.add('active');
}

function hideLoader() {
  document.getElementById('loader').classList.remove('active');
}

// Закрытие модалки по клику вне
document.getElementById('cart-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeCart();
  }
});

// Инициализация при загрузке
init();
