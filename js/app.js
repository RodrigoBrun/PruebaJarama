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
  window.dispatchEvent(
    new CustomEvent("jarama:cart-updated", {
      detail: { cart }
    })
  );
}

function formatUyu(value) {
  return `$ ${Number(value || 0).toLocaleString("es-UY")}`;
}

function normalizeId(value) {
  return String(value);
}

function getCartCount() {
  return readCart().reduce((total, item) => {
    return total + Number(item.cantidad || 0);
  }, 0);
}

function getCartSubtotal() {
  return readCart().reduce((total, item) => {
    return total + Number(item.precioUYU || 0) * Number(item.cantidad || 0);
  }, 0);
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
    cart.push({
      ...item,
      id: incomingId,
      cantidad: Number(item.cantidad || 1)
    });
  }

  writeCart(cart);
}

function updateItemQuantity(itemId, quantity) {
  const targetId = normalizeId(itemId);

  const cart = readCart().map((item) => {
    if (normalizeId(item.id) !== targetId) return item;

    return {
      ...item,
      cantidad: Math.max(1, Number(quantity || 1))
    };
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
      const input = form.querySelector('input[type="search"]');
      const query = String(input?.value || "").trim();

      if (!query) return;

      const isHome = window.location.pathname.toLowerCase().endsWith("/index.html") ||
        window.location.pathname === "/" ||
        !window.location.pathname.split("/").pop();

      if (isHome) {
        window.dispatchEvent(new CustomEvent("jarama:search", { detail: { query } }));
      } else {
        window.location.href = `index.html?buscar=${encodeURIComponent(query)}#catalogoPrincipal`;
      }
    });
  });
}

function initCartButtons() {
  const cartButtons = document.querySelectorAll("[data-go-cart], .cart-btn");

  cartButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  });
}

function initMobileDrawer() {
  if (window.__jaramaMobileDrawerBound) return;
  window.__jaramaMobileDrawerBound = true;

  const getDrawer = () => document.querySelector("[data-mobile-drawer]");

  const openDrawer = () => {
    const drawer = getDrawer();
    if (!drawer) return;

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
  };

  const closeDrawer = () => {
    const drawer = getDrawer();
    if (!drawer) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
  };

  document.addEventListener("click", (event) => {
    const openBtn = event.target.closest("[data-mobile-menu-open]");
    if (openBtn) {
      event.preventDefault();
      openDrawer();
      return;
    }

    const closeBtn = event.target.closest("[data-mobile-menu-close]");
    if (closeBtn) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    const submenuToggle = event.target.closest("[data-mobile-submenu-toggle]");
    if (submenuToggle) {
      event.preventDefault();

      const group = submenuToggle.closest(".mobile-drawer__group");
      if (!group) return;

      const willOpen = !group.classList.contains("is-open");
      const siblings = group.parentElement?.querySelectorAll(".mobile-drawer__group") || [];

      siblings.forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector("[data-mobile-submenu-toggle]")?.setAttribute("aria-expanded", "false");
      });

      if (willOpen) {
        group.classList.add("is-open");
        submenuToggle.setAttribute("aria-expanded", "true");
      }

      return;
    }

    const drawer = getDrawer();
    if (!drawer) return;

    const clickedInsidePanel = event.target.closest(".mobile-drawer__panel");
    const clickedOverlay = event.target.closest(".mobile-drawer__overlay");
    const clickedDrawerLink = event.target.closest(".mobile-drawer__single, .mobile-drawer__submenu a");

    if (clickedDrawerLink) {
      closeDrawer();
      return;
    }

    if (clickedOverlay && drawer.classList.contains("is-open")) {
      closeDrawer();
      return;
    }

    if (drawer.classList.contains("is-open") && !clickedInsidePanel && event.target.closest("[data-mobile-drawer]")) {
      closeDrawer();
    }
  });

  document.addEventListener("keydown", (event) => {
    const drawer = getDrawer();
    if (event.key === "Escape" && drawer?.classList.contains("is-open")) {
      closeDrawer();
    }
  });
}

function initDesktopDropdowns() {
  const navItems = document.querySelectorAll(".main-nav .has-dropdown");
  if (!navItems.length || window.innerWidth <= 768) return;

  let openItem = null;

  const closeAll = (exceptItem = null) => {
    navItems.forEach((item) => {
      if (item === exceptItem) return;
      item.classList.remove("is-open");
      item.querySelector(":scope > a")?.setAttribute("aria-expanded", "false");
    });

    if (!exceptItem) openItem = null;
  };

  navItems.forEach((item) => {
    const trigger = item.querySelector(":scope > a");
    const dropdown = item.querySelector(":scope > .dropdown");
    let closeTimeout = null;

    const open = () => {
      clearTimeout(closeTimeout);
      closeAll(item);
      item.classList.add("is-open");
      trigger?.setAttribute("aria-expanded", "true");
      openItem = item;
    };

    const close = () => {
      item.classList.remove("is-open");
      trigger?.setAttribute("aria-expanded", "false");
      if (openItem === item) openItem = null;
    };

    const scheduleClose = () => {
      clearTimeout(closeTimeout);
      closeTimeout = setTimeout(close, 140);
    };

    item.addEventListener("mouseenter", open);
    item.addEventListener("mouseleave", scheduleClose);
    dropdown?.addEventListener("mouseenter", () => clearTimeout(closeTimeout));
    dropdown?.addEventListener("mouseleave", scheduleClose);

    trigger?.setAttribute("aria-expanded", "false");
    trigger?.addEventListener("click", (event) => {
      event.preventDefault();

      if (item.classList.contains("is-open")) {
        close();
      } else {
        open();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".main-nav")) {
      closeAll();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) {
      closeAll();
    }
  });
}

function initJaramaUi() {
  updateCartCount();
  initSearchForms();
  initCartButtons();
  initMobileDrawer();
  initDesktopDropdowns();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initJaramaUi);
} else {
  initJaramaUi();
}

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
