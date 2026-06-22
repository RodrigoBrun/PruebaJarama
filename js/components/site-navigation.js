import { getNavigationCategories } from "../data/site-structure-repository.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getReligiousSvg() {
  return `
    <span class="nav-inline-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v5"></path>
        <path d="M9.5 5.5h5"></path>
        <path d="M7 21V11l5-3 5 3v10"></path>
        <path d="M10 21v-4h4v4"></path>
      </svg>
    </span>
  `;
}

function renderIcon(iconKey, { mobile = false } = {}) {
  if (iconKey === "svg-religioso") {
    return getReligiousSvg();
  }

  const safeIcon = escapeHtml(iconKey || "ph-squares-four");
  if (mobile) {
    return `<i class="${safeIcon}"></i>`;
  }
  return `<i class="${safeIcon}"></i>`;
}

function getCurrentPageName() {
  const path = window.location.pathname.toLowerCase();

  if (path.endsWith("/producto.html")) return "producto";
  if (path.endsWith("/carrito.html")) return "carrito";
  if (path.endsWith("/checkout.html")) return "checkout";
  return "index";
}

function getHomeHref(categorySlug, childSlug = "") {
  const params = new URLSearchParams();

  if (categorySlug) params.set("categoria", categorySlug);
  if (childSlug) params.set("subcategoria", childSlug);

  const query = params.toString();
  return query ? `index.html?${query}#catalogoPrincipal` : "index.html#catalogoPrincipal";
}

function buildDesktopItem(category) {
  const children = Array.isArray(category.children) ? category.children.filter((item) => item.isActive !== false) : [];
  const iconMarkup = renderIcon(category.iconKey);

  if (!children.length) {
    return `
      <li class="nav-item">
        <a href="${getHomeHref(category.slug)}">
          ${iconMarkup}
          <span>${escapeHtml(category.name)}</span>
        </a>
      </li>
    `;
  }

  return `
    <li class="nav-item has-dropdown">
      <a href="${getHomeHref(category.slug)}" aria-expanded="false">
        ${iconMarkup}
        <span>${escapeHtml(category.name)}</span>
        <i class="ph-caret-down nav-caret"></i>
      </a>
      <div class="dropdown${children.length <= 4 ? " dropdown--narrow" : ""}">
        <ul class="dropdown-grid">
          ${children
            .map(
              (child) => `
                <li>
                  <a href="${getHomeHref(category.slug, child.slug)}">${escapeHtml(child.name)}</a>
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
    </li>
  `;
}

function buildMobileItem(category) {
  const children = Array.isArray(category.children) ? category.children.filter((item) => item.isActive !== false) : [];
  const iconMarkup = renderIcon(category.iconKey, { mobile: true });

  if (!children.length) {
    return `
      <a class="mobile-drawer__single" href="${getHomeHref(category.slug)}">
        <span class="mobile-drawer__label">
          ${iconMarkup}
          <span>${escapeHtml(category.name)}</span>
        </span>
      </a>
    `;
  }

  return `
    <div class="mobile-drawer__group">
      <button class="mobile-drawer__trigger" type="button" data-mobile-submenu-toggle aria-expanded="false">
        <span class="mobile-drawer__label">
          ${iconMarkup}
          <span>${escapeHtml(category.name)}</span>
        </span>
        <i class="ph-caret-down"></i>
      </button>
      <div class="mobile-drawer__submenu">
        ${children
          .map(
            (child) => `
              <a href="${getHomeHref(category.slug, child.slug)}">${escapeHtml(child.name)}</a>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function buildDesktopNav(categories) {
  return `
    <div class="container-wide">
      <ul class="nav-list">
        ${categories.map(buildDesktopItem).join("")}
      </ul>
    </div>
  `;
}

function buildMobileDrawer(categories) {
  const currentPage = getCurrentPageName();
  const homeLabel = currentPage === "index" ? "Inicio" : "Volver al catálogo";

  return `
    <button class="mobile-drawer__overlay" type="button" data-mobile-menu-close aria-label="Cerrar menú"></button>
    <aside class="mobile-drawer__panel">
      <div class="mobile-drawer__top">
        <a href="index.html" class="logo-main" aria-label="Ir al inicio de Jarama">
          <img class="brand-logo" src="assets/logo-jarama.svg" alt="Jarama Home &amp; Deco" width="553" height="119" />
        </a>
        <button class="mobile-drawer__close" type="button" data-mobile-menu-close aria-label="Cerrar menú">
          <i class="ph-x"></i>
        </button>
      </div>

      <nav class="mobile-drawer__nav" aria-label="Menú móvil">
        <a class="mobile-drawer__single" href="index.html">
          <span class="mobile-drawer__label">
            <i class="ph-house"></i>
            <span>${homeLabel}</span>
          </span>
        </a>

        ${categories.map(buildMobileItem).join("")}

        <a class="mobile-drawer__single" href="carrito.html">
          <span class="mobile-drawer__label">
            <i class="ph-shopping-cart-simple"></i>
            <span>Carrito</span>
          </span>
        </a>
      </nav>

      <div class="mobile-drawer__footer">
        Navegación dinámica conectada a la estructura real de Jarama. El carrito queda siempre a mano mientras hacés scroll.
      </div>
    </aside>
  `;
}

async function mountSiteNavigation() {
  const navMount = document.querySelector("[data-site-main-nav]");
  const drawerMount = document.querySelector("[data-site-mobile-drawer]");

  if (!navMount && !drawerMount) return;

  const categories = await getNavigationCategories();
  const activeCategories = (categories || []).filter((item) => item.isActive !== false);

  if (navMount) {
    navMount.innerHTML = buildDesktopNav(activeCategories);
  }

  if (drawerMount) {
    drawerMount.innerHTML = buildMobileDrawer(activeCategories);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mountSiteNavigation();
});

window.JaramaSiteNavigation = {
  mountSiteNavigation
};
