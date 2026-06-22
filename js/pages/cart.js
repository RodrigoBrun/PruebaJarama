document.addEventListener("DOMContentLoaded", () => {
  const cartItemsEl = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  const clearBtn = document.getElementById("cartClearBtn");
  const checkoutBtn = document.getElementById("cartCheckoutBtn");

  const {
    getCartItems,
    getCartSubtotal,
    updateItemQuantity,
    removeItemFromCart,
    clearCart,
    formatUyu
  } = window.JaramaApp || {};

  if (!cartItemsEl || !subtotalEl || !getCartItems) return;

  const render = () => {
    const cart = getCartItems();
    const subtotal = getCartSubtotal();
    subtotalEl.textContent = formatUyu ? formatUyu(subtotal) : `$ ${subtotal}`;

    if (!cart.length) {
      cartItemsEl.innerHTML = `
        <div class="cart-empty">
          <p class="eyebrow">Vacío por ahora</p>
          <h3>Tu carrito todavía no tiene productos</h3>
          <p>Volvé al catálogo, agregá productos y vas a verlos acá con el mismo diseño nuevo.</p>
          <a href="index.html" class="btn btn-primary">Ir al catálogo</a>
        </div>
      `;
      checkoutBtn.disabled = true;
      clearBtn.disabled = true;
      return;
    }

    checkoutBtn.disabled = false;
    clearBtn.disabled = false;

    cartItemsEl.innerHTML = cart.map((item) => `
      <article class="cart-item" data-id="${item.id}">
        <div class="cart-item__media">
          <img src="${item.imagen || 'assets/logo-jarama.svg'}" alt="${item.nombre}" onerror="this.onerror=null; this.src='assets/logo-jarama.svg';">
        </div>
        <div class="cart-item__body">
          <h3 class="cart-item__title">${item.nombre}</h3>
          <p class="cart-item__meta">${formatUyu ? formatUyu(item.precioUYU) : `$ ${item.precioUYU}`} por unidad</p>
        </div>
        <div class="cart-item__actions">
          <div class="cart-qty">
            <button type="button" data-action="minus">−</button>
            <span>${item.cantidad}</span>
            <button type="button" data-action="plus">+</button>
          </div>
          <button type="button" class="cart-remove" data-action="remove"><i class="ph-trash"></i>Quitar</button>
        </div>
      </article>
    `).join("");
  };

  cartItemsEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const item = button.closest(".cart-item");
    const id = item?.dataset.id;
    if (!id) return;

    const cart = getCartItems();
    const current = cart.find((entry) => String(entry.id) === String(id));
    if (!current) return;

    const action = button.dataset.action;
    if (action === "plus") updateItemQuantity(id, Number(current.cantidad || 1) + 1);
    if (action === "minus") updateItemQuantity(id, Math.max(1, Number(current.cantidad || 1) - 1));
    if (action === "remove") removeItemFromCart(id);

    render();
  });

  clearBtn?.addEventListener("click", () => {
    clearCart?.();
    render();
  });

  checkoutBtn?.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });

  window.addEventListener("jarama:cart-updated", render);
  render();
});
