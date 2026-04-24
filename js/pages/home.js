import { formatPriceUyu } from "../data/products.js";
import { getAllProducts } from "../data/product-repository.js";

const catalogoGrid = document.getElementById("catalogoGrid");

const badgeMap = {
  destacado: { label: "Destacado", className: "is-dark" },
  nuevo: { label: "Nuevo", className: "is-green" },
  "mas-vendido": { label: "Más vendido", className: "is-gold" },
  oferta: { label: "Oferta", className: "is-red" },
  "edicion-limitada": { label: "Edición limitada", className: "" }
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function renderCardBadges(product) {
  const badges = Array.isArray(product.badges) ? product.badges.slice(0, 2) : [];
  if (!badges.length) return "";

  return `
    <div class="product-badges">
      ${badges
        .map((badge) => {
          const meta = badgeMap[badge] || { label: badge, className: "" };
          return `<span class="product-badge ${meta.className}">${escapeHtml(meta.label)}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderRibbon(product) {
  if (!product.stock) {
    return '<span class="product-ribbon">SIN STOCK</span>';
  }

  const firstBadge = Array.isArray(product.badges) ? product.badges[0] : null;
  if (!firstBadge) return "";

  const meta = badgeMap[firstBadge] || { label: firstBadge, className: "" };
  return `<span class="product-ribbon is-soft ${meta.className}">${escapeHtml(meta.label)}</span>`;
}

function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";

  article.innerHTML = `
    <a href="producto.html?slug=${product.slug}" class="product-link">
      <div class="product-image-wrapper">
        <img src="${product.imagenes[0]}" alt="${escapeHtml(product.nombre)}">
        ${renderRibbon(product)}
      </div>
      <h3 class="product-name">${escapeHtml(product.nombre)}</h3>
      ${renderCardBadges(product)}
      <p class="product-price">${formatPriceUyu(product.precioUYU)}</p>
    </a>
  `;

  return article;
}

function renderLoadingState() {
  if (!catalogoGrid) return;
  catalogoGrid.innerHTML = `
    <article class="empty-state">
      <p class="eyebrow">Sincronizando catálogo</p>
      <h2>Cargando productos…</h2>
      <p>Estamos preparando la colección Jarama desde Supabase o desde la base local de respaldo.</p>
    </article>
  `;
}

function renderEmptyState() {
  if (!catalogoGrid) return;
  catalogoGrid.innerHTML = `
    <article class="empty-state">
      <p class="eyebrow">Catálogo vacío</p>
      <h2>Todavía no hay productos publicados</h2>
      <p>Podés cargar los primeros artículos desde el panel admin y van a aparecer automáticamente acá.</p>
    </article>
  `;
}

async function renderCatalog() {
  if (!catalogoGrid) return;

  renderLoadingState();
  const products = await getAllProducts();

  if (!products.length) {
    renderEmptyState();
    return;
  }

  catalogoGrid.innerHTML = "";
  products.forEach((product) => {
    catalogoGrid.appendChild(createProductCard(product));
  });
}

document.addEventListener("DOMContentLoaded", renderCatalog);
