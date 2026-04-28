import { formatPriceUyu } from "../data/products.js";
import { getAllProducts } from "../data/product-repository.js";

const catalogoGrid = document.getElementById("catalogoGrid");

const badgeMeta = {
  destacado: { label: "Destacado", className: "is-dark" },
  nuevo: { label: "Nuevo", className: "is-green" },
  "mas-vendido": { label: "Más vendido", className: "is-gold" },
  oferta: { label: "Oferta", className: "is-red" },
  "edicion-limitada": { label: "Ed. limitada", className: "is-dark" }
};

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getUrlFilters() {
  const params = new URLSearchParams(window.location.search);

  return {
    category: slugify(params.get("categoria") || ""),
    subcategory: slugify(params.get("subcategoria") || "")
  };
}

function getProductCategorySlug(product) {
  return slugify(
    product.categorySlug ||
    product.category_slug ||
    product.categoria ||
    product.category ||
    ""
  );
}

function getProductSubcategorySlug(product) {
  return slugify(
    product.subcategorySlug ||
    product.subcategory_slug ||
    product.subcategoria ||
    product.subcategory ||
    ""
  );
}

function filterProducts(products, filters) {
  const { category, subcategory } = filters;

  if (!category && !subcategory) {
    return products;
  }

  return products.filter((product) => {
    const productCategory = getProductCategorySlug(product);
    const productSubcategory = getProductSubcategorySlug(product);

    const categoryMatch = category ? productCategory === category : true;
    const subcategoryMatch = subcategory ? productSubcategory === subcategory : true;

    return categoryMatch && subcategoryMatch;
  });
}

function getPrimaryBadge(product) {
  if (!product.stock) {
    return { label: "Sin stock", className: "is-red" };
  }

  const firstBadge = Array.isArray(product.badges) ? product.badges[0] : null;
  return firstBadge ? badgeMeta[firstBadge] || null : null;
}

function buildCartItem(product) {
  return {
    id: product.id,
    slug: product.slug,
    nombre: product.nombre,
    precioUYU: product.precioUYU,
    cantidad: 1,
    imagen: product.imagenes?.[0] || ""
  };
}

function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";

  const badge = getPrimaryBadge(product);

  article.innerHTML = `
    <a href="producto.html?slug=${encodeURIComponent(product.slug)}" class="product-link" aria-label="Ver ${product.nombre}">
      <div class="product-image-wrapper">
        <img src="${product.imagenes[0]}" alt="${product.nombre}">
        ${badge ? `<span class="product-ribbon ${badge.className}">${badge.label}</span>` : ""}
      </div>
    </a>

    <div class="product-card__body">
      <a href="producto.html?slug=${encodeURIComponent(product.slug)}" class="product-link product-link--body">
        <h3 class="product-name">${product.nombre}</h3>
      </a>

      <div class="product-price-row">
        <p class="product-price">${formatPriceUyu(product.precioUYU)}</p>
        <button class="product-quick-add" type="button" aria-label="Agregar ${product.nombre} al carrito" ${!product.stock ? "disabled" : ""}>
          <i class="ph-shopping-cart-simple"></i>
        </button>
      </div>
    </div>
  `;

  const quickAdd = article.querySelector(".product-quick-add");
  quickAdd?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!product.stock) return;

    window.JaramaApp?.addItemToCart?.(buildCartItem(product));
    quickAdd.innerHTML = '<i class="ph-check"></i>';

    setTimeout(() => {
      quickAdd.innerHTML = '<i class="ph-shopping-cart-simple"></i>';
    }, 1200);
  });

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

function renderEmptyState(filters) {
  if (!catalogoGrid) return;

  const hasFilter = filters.category || filters.subcategory;

  catalogoGrid.innerHTML = `
    <article class="empty-state">
      <p class="eyebrow">${hasFilter ? "Sin resultados" : "Catálogo vacío"}</p>
      <h2>${hasFilter ? "No encontramos productos para esa selección" : "Todavía no hay productos publicados"}</h2>
      <p>
        ${hasFilter
          ? "Probá entrar desde otra categoría o subcategoría. Cuando Soledad cargue más productos, van a aparecer automáticamente acá."
          : "Podés cargar los primeros artículos desde el panel admin y van a aparecer automáticamente acá."
        }
      </p>
    </article>
  `;
}

async function renderCatalog() {
  if (!catalogoGrid) return;

  renderLoadingState();

  const filters = getUrlFilters();
  const products = await getAllProducts();
  const filteredProducts = filterProducts(products, filters);

  if (!filteredProducts.length) {
    renderEmptyState(filters);
    return;
  }

  catalogoGrid.innerHTML = "";

  filteredProducts.forEach((product) => {
    catalogoGrid.appendChild(createProductCard(product));
  });
}

document.addEventListener("DOMContentLoaded", renderCatalog);