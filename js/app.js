function readCart() {
  try {
    const raw = localStorage.getItem("jarama-cart");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem("jarama-cart", JSON.stringify(cart));
  updateCartCount();
  window.dispatchEvent(new CustomEvent("jarama:cart-updated", { detail: { cart } }));
}

function formatUyu(value) {
  return `$ ${Number(value || 0).toLocaleString("es-UY")}`;
}

function normalizeId(value) {
  return String(value);
}

function getCartCount() {
  return readCart().reduce((total, item) => total + Number(item.cantidad || 0), 0);
}

function getCartSubtotal() {
  return readCart().reduce(
    (total, item) => total + Number(item.precioUYU || 0) * Number(item.cantidad || 0),
    0
  );
}

function updateCartCount() {
  const countElements = document.querySelectorAll("[data-cart-count]");
  const totalItems = getCartCount();

  countElements.forEach((element) => {
    element.textContent = String(totalItems);
    element.hidden = totalItems <= 0;
  });
}

function addItemToCart(item) {
  const cart = readCart();
  const incomingId = normalizeId(item.id);
  const existingItem = cart.find((cartItem) => normalizeId(cartItem.id) === incomingId);

  if (existingItem) {
    existingItem.cantidad += Number(item.cantidad || 1);
  } else {
    cart.push({ ...item, id: incomingId, cantidad: Number(item.cantidad || 1) });
  }

  writeCart(cart);
}

function updateItemQuantity(itemId, quantity) {
  const targetId = normalizeId(itemId);

  const cart = readCart().map((item) => {
    if (normalizeId(item.id) !== targetId) return item;
    return { ...item, cantidad: Math.max(1, Number(quantity || 1)) };
  });

  writeCart(cart);
}

function removeItemFromCart(itemId) {
  const targetId = normalizeId(itemId);
  const cart = readCart().filter((item) => normalizeId(item.id) !== targetId);
  writeCart(cart);
}

function clearCart() {
  writeCart([]);
}

function initSearchForms() {
  const searchForms = document.querySelectorAll("[data-search-form]");

  searchForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  });
}

function initCartButtons() {
  const cartButtons = document.querySelectorAll(".cart-btn, [data-go-cart]");

  cartButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  });
}

function initMobileDrawer() {
  const drawer = document.querySelector("[data-mobile-drawer]");
  const panel = drawer?.querySelector(".mobile-drawer__panel");
  const openButtons = document.querySelectorAll("[data-mobile-menu-open]");
  const closeButtons = document.querySelectorAll("[data-mobile-menu-close]");
  const overlay = drawer?.querySelector(".mobile-drawer__overlay");
  const drawerLinks = drawer?.querySelectorAll("a") || [];

  if (!drawer || !openButtons.length || !panel) return;

  const openDrawer = () => {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
  };

  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
  };

  openButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openDrawer();
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
    });
  });

  if (overlay) {
    overlay.addEventListener("click", closeDrawer);
  }

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  drawerLinks.forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  initSearchForms();
  initCartButtons();
  initMobileDrawer();
});

window.addEventListener("storage", updateCartCount);
window.JaramaApp = {
  formatUyu,
  getCartItems: readCart,
  getCartCount,
  getCartSubtotal,
  updateCartCount,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  clearCart
};
