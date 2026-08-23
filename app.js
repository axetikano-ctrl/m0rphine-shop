const tg = window.Telegram.WebApp;
tg.expand();

let cart = [];
let products = [];

async function loadProducts() {
    const res = await fetch('products.json');
    products = await res.json();
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('products');
    container.innerHTML = products.map(p => `
    <div class="product">
      <img src="${p.image}" alt="${p.name}">
      <div class="product-info">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="price">${p.price} ₽</div>
        <button class="btn" onclick="addToCart(${p.id})">В корзину</button>
      </div>
    </div>
  `).join('');
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    cart.push(product);
    updateCart();
    tg.HapticFeedback.impactOccurred('light');
}

function updateCart() {
    document.getElementById('cart-count').textContent = cart.length;
}

function openCart() {
    const modal = document.getElementById('cart-modal');
    const items = document.getElementById('cart-items');
    items.innerHTML = cart.map((p, i) => `
    <div class="cart-item">
      <span>${p.name}</span>
      <span>${p.price} ₽</span>
    </div>
  `).join('');
    const total = cart.reduce((s, p) => s + p.price, 0);
    document.getElementById('total-price').textContent = total;
    modal.classList.add('active');
}

function closeCart() {
    document.getElementById('cart-modal').classList.remove('active');
}

function checkout() {
    if (cart.length === 0) return;
    const order = cart.map(p => p.name).join(', ');
    const total = cart.reduce((s, p) => s + p.price, 0);

    // Отправляем данные боту
    tg.sendData(JSON.stringify({ order, total }));
    cart = [];
    updateCart();
    closeCart();
}

loadProducts();