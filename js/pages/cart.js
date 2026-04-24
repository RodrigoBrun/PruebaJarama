const cartList = document.getElementById("cartList");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const clearCartBtn = document.getElementById("clearCartBtn");

function createEmptyState() {
  const article = document.createElement("article");
  article.className = "empty-state";
  article.innerHTML = `
    <p class="eyebrow">Todavía no hay productos</p>
    <h2>Tu carrito está vacío</h2>
    <p>Cuando agregues artículos desde la ficha de producto, aparecerán acá con cantidad, subtotal y controles para editar la compra.</p>
    <div>
      <a href="index.html" class="btn btn-primary">Ir al catálogo</a>
    </div>
  `;
  return article;
}

function createCartItem(item) {
  const article = document.createElement("article");
  article.className = "cart-item";

  article.innerHTML = `
    <div class="cart-item__image">
      <img src="${item.imagen}" alt="${item.nombre}">
    </div>

    <div class="cart-item__content">
      <div class="cart-item__top">
        <div>
          <h3 class="cart-item__name">${item.nombre}</h3>
          <div class="cart-item__meta">
            <span>Precio unitario: ${window.JaramaApp.formatUyu(item.precioUYU)}</span>
            <span>ID: ${item.id}</span>
          </div>
        </div>
        <p class="cart-item__line-total">${window.JaramaApp.formatUyu(Number(item.precioUYU) * Number(item.cantidad))}</p>
      </div>

      <div class="cart-item__actions">
        <div class="qty-controls">
          <button class="qty-btn" type="button" data-action="decrease">−</button>
          <span class="qty-value">${item.cantidad}</span>
          <button class="qty-btn" type="button" data-action="increase">+</button>
        </div>

        <button class="remove-btn" type="button">Eliminar producto</button>
      </div>
    </div>
  `;

  article.querySelector('[data-action="decrease"]').addEventListener("click", () => {
    const nextQuantity = Math.max(1, Number(item.cantidad) - 1);
    window.JaramaApp.updateItemQuantity(item.id, nextQuantity);
    renderCart();
  });

  article.querySelector('[data-action="increase"]').addEventListener("click", () => {
    const nextQuantity = Number(item.cantidad) + 1;
    window.JaramaApp.updateItemQuantity(item.id, nextQuantity);
    renderCart();
  });

  article.querySelector(".remove-btn").addEventListener("click", () => {
    window.JaramaApp.removeItemFromCart(item.id);
    renderCart();
  });

  return article;
}

function renderCart() {
  const cart = window.JaramaApp.getCartItems();
  cartList.innerHTML = "";

  if (!cart.length) {
    cartList.appendChild(createEmptyState());
    cartSubtotal.textContent = window.JaramaApp.formatUyu(0);
    cartTotal.textContent = window.JaramaApp.formatUyu(0);
    checkoutBtn.classList.add("is-disabled");
    checkoutBtn.setAttribute("aria-disabled", "true");
    checkoutBtn.href = "#";
    clearCartBtn.hidden = true;
    return;
  }

  cart.forEach((item) => {
    cartList.appendChild(createCartItem(item));
  });

  const subtotal = window.JaramaApp.getCartSubtotal();
  cartSubtotal.textContent = window.JaramaApp.formatUyu(subtotal);
  cartTotal.textContent = window.JaramaApp.formatUyu(subtotal);
  checkoutBtn.classList.remove("is-disabled");
  checkoutBtn.removeAttribute("aria-disabled");
  checkoutBtn.href = "checkout.html";
  clearCartBtn.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  renderCart();

  clearCartBtn?.addEventListener("click", () => {
    window.JaramaApp.clearCart();
    renderCart();
  });

  window.addEventListener("jarama:cart-updated", renderCart);
});
