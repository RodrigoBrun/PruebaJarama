import { formatPriceUyu } from "../data/products.js";
import { getAllProducts } from "../data/product-repository.js";

const catalogoGrid = document.getElementById("catalogoGrid");
const catalogSearch = document.getElementById("catalogSearch");
const catalogCategoryFilter = document.getElementById("catalogCategoryFilter");
const catalogStockFilter = document.getElementById("catalogStockFilter");
const catalogSort = document.getElementById("catalogSort");
const catalogClearFilters = document.getElementById("catalogClearFilters");
const catalogSummary = document.getElementById("catalogSummary");
const featuredLink = document.querySelector("[data-featured-link]");

let allProducts = [];
let baseUrlFilters = { category: "", subcategory: "" };

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getUrlFilters() {
  const params = new URLSearchParams(window.location.search);

  return {
    category: slugify(params.get("categoria") || ""),
    subcategory: slugify(params.get("subcategoria") || ""),
    query: params.get("buscar") || ""
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

function getProductSearchText(product) {
  return [
    product.nombre,
    product.codigo,
    product.categoria,
    product.category,
    product.categorySlug,
    product.category_slug,
    product.subcategoria,
    product.subcategory,
    product.material,
    product.resumen,
    product.descripcion
  ]
    .concat(Array.isArray(product.tags) ? product.tags : [])
    .concat(Array.isArray(product.colores) ? product.colores : [])
    .concat(Array.isArray(product.badges) ? product.badges : [])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getUiFilters() {
  return {
    query: String(catalogSearch?.value || "").trim().toLowerCase(),
    category: catalogCategoryFilter?.value || "all",
    stock: catalogStockFilter?.value || "all",
    sort: catalogSort?.value || "featured"
  };
}

function applyUiFilters(products) {
  const filters = getUiFilters();
  let nextProducts = [...products];

  if (filters.query) {
    nextProducts = nextProducts.filter((product) => getProductSearchText(product).includes(filters.query));
  }

  if (filters.category !== "all") {
    nextProducts = nextProducts.filter((product) => getProductCategorySlug(product) === filters.category);
  }

  if (filters.stock !== "all") {
    nextProducts = nextProducts.filter((product) => filters.stock === "in" ? Boolean(product.stock) : !Boolean(product.stock));
  }

  nextProducts.sort((a, b) => {
    if (filters.sort === "price-asc") return Number(a.precioUYU || 0) - Number(b.precioUYU || 0);
    if (filters.sort === "price-desc") return Number(b.precioUYU || 0) - Number(a.precioUYU || 0);
    if (filters.sort === "name-asc") return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");

    const featuredA = Number(Boolean(a.destacado || a.featured || a.badges?.includes("destacado")));
    const featuredB = Number(Boolean(b.destacado || b.featured || b.badges?.includes("destacado")));
    return featuredB - featuredA || String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  });

  return nextProducts;
}

function getProductCategoryLabel(product) {
  return product.categoria || product.category || "Sin categoría";
}

function getMeasuresSummary(product) {
  const measures = product.medidas || product.measures || {};
  const largo = measures.largo || "";
  const profundidad = measures.profundidad || "";

  if (largo && profundidad) return `${largo} x ${profundidad}`;
  return largo || profundidad || "";
}

function getSafeImage(product) {
  return product.imagenes?.[0] || product.images?.[0] || "assets/logo-jarama.svg";
}

function populateCategoryFilter(products) {
  if (!catalogCategoryFilter) return;

  const categories = [...new Map(
    products
      .map((product) => [getProductCategorySlug(product), getProductCategoryLabel(product)])
      .filter(([slug]) => Boolean(slug))
  )].sort((a, b) => a[1].localeCompare(b[1], "es"));

  const selected = catalogCategoryFilter.value || "all";
  catalogCategoryFilter.innerHTML = `
    <option value="all">Todas las categorías</option>
    ${categories.map(([slug, label]) => `<option value="${escapeHtml(slug)}">${escapeHtml(label)}</option>`).join("")}
  `;

  if (baseUrlFilters.category && categories.some(([slug]) => slug === baseUrlFilters.category)) {
    catalogCategoryFilter.value = baseUrlFilters.category;
  } else {
    catalogCategoryFilter.value = categories.some(([slug]) => slug === selected) ? selected : "all";
  }
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
  const image = getSafeImage(product);
  const measures = getMeasuresSummary(product);
  const material = product.material || "Material a confirmar";
  const summary = product.resumen || product.summary || product.descripcion || "";

  article.innerHTML = `
    <a href="producto.html?slug=${encodeURIComponent(product.slug)}" class="product-link" aria-label="Ver ${escapeHtml(product.nombre)}">
      <div class="product-image-wrapper">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.nombre)}" onerror="this.onerror=null; this.src='assets/logo-jarama.svg';">
        ${badge ? `<span class="product-ribbon ${badge.className}">${badge.label}</span>` : ""}
      </div>
    </a>

    <div class="product-card__body">
      <a href="producto.html?slug=${encodeURIComponent(product.slug)}" class="product-link product-link--body">
        <h3 class="product-name">${escapeHtml(product.nombre)}</h3>
      </a>

      <div class="product-card__meta">
        <span>${escapeHtml(getProductCategoryLabel(product))}</span>
        ${measures ? `<span>${escapeHtml(measures)}</span>` : ""}
        <span>${escapeHtml(material)}</span>
      </div>

      ${summary ? `<p class="product-card__summary">${escapeHtml(summary).slice(0, 136)}</p>` : ""}

      <div class="product-price-row">
        <p class="product-price">${formatPriceUyu(product.precioUYU)}</p>
        <button class="product-quick-add" type="button" aria-label="Agregar ${product.nombre} al carrito" ${!product.stock ? "disabled" : ""}>
          <i class="ph-shopping-cart-simple"></i>
        </button>
      </div>

      <div class="product-card__footer">
        <span class="product-stock ${product.stock ? "is-available" : "is-unavailable"}">
          ${product.stock ? "Disponible" : "Sin stock"}
        </span>
        <a href="producto.html?slug=${encodeURIComponent(product.slug)}">Ver detalle</a>
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

function updateCatalogSummary(count, total) {
  if (!catalogSummary) return;

  const filterParts = [];
  const uiFilters = getUiFilters();

  if (uiFilters.query) filterParts.push(`búsqueda “${uiFilters.query}”`);
  if (uiFilters.category !== "all") filterParts.push("categoría");
  if (uiFilters.stock !== "all") filterParts.push(uiFilters.stock === "in" ? "disponibles" : "sin stock");

  catalogSummary.textContent = filterParts.length
    ? `${count} de ${total} productos encontrados con ${filterParts.join(", ")}.`
    : `${count} productos en catálogo.`;
}

function renderFilteredCatalog() {
  if (!catalogoGrid) return;

  const filteredByUrl = filterProducts(allProducts, baseUrlFilters);
  const filteredProducts = applyUiFilters(filteredByUrl);

  updateCatalogSummary(filteredProducts.length, filteredByUrl.length);

  if (!filteredProducts.length) {
    renderEmptyState({
      category: baseUrlFilters.category || getUiFilters().category !== "all",
      subcategory: baseUrlFilters.subcategory,
      query: getUiFilters().query
    });
    return;
  }

  catalogoGrid.innerHTML = "";

  filteredProducts.forEach((product) => {
    catalogoGrid.appendChild(createProductCard(product));
  });
}

async function renderCatalog() {
  if (!catalogoGrid) return;

  renderLoadingState();

  baseUrlFilters = getUrlFilters();
  allProducts = await getAllProducts();
  populateCategoryFilter(filterProducts(allProducts, { ...baseUrlFilters, category: "", subcategory: "" }));
  if (catalogSearch && baseUrlFilters.query) {
    catalogSearch.value = baseUrlFilters.query;
  }
  renderFilteredCatalog();
}

function clearCatalogFilters() {
  if (catalogSearch) catalogSearch.value = "";
  if (catalogCategoryFilter) catalogCategoryFilter.value = baseUrlFilters.category || "all";
  if (catalogStockFilter) catalogStockFilter.value = "all";
  if (catalogSort) catalogSort.value = "featured";
  renderFilteredCatalog();
}

function bindCatalogControls() {
  [catalogSearch, catalogCategoryFilter, catalogStockFilter, catalogSort].forEach((control) => {
    control?.addEventListener("input", renderFilteredCatalog);
    control?.addEventListener("change", renderFilteredCatalog);
  });

  catalogClearFilters?.addEventListener("click", clearCatalogFilters);

  featuredLink?.addEventListener("click", () => {
    if (catalogSearch) catalogSearch.value = "destacado";
    if (catalogStockFilter) catalogStockFilter.value = "in";
    if (catalogSort) catalogSort.value = "featured";
    setTimeout(renderFilteredCatalog, 0);
  });

  window.addEventListener("jarama:search", (event) => {
    if (!catalogSearch) return;
    catalogSearch.value = event.detail?.query || "";
    renderFilteredCatalog();
    document.getElementById("catalogoPrincipal")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

bindCatalogControls();
document.addEventListener("DOMContentLoaded", renderCatalog);
