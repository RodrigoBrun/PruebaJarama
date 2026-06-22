import { formatPriceUyu, formatPriceUsd } from "../data/products.js";
import { getProductBySlug, getRelatedProducts } from "../data/product-repository.js";

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

const dom = {
  productStatus: document.getElementById("productStatus"),
  productBadges: document.getElementById("productBadges"),
  productTitle: document.getElementById("productTitle"),
  productCode: document.getElementById("productCode"),
  productMeasures: document.getElementById("productMeasures"),
  productMaterial: document.getElementById("productMaterial"),
  productDescription: document.getElementById("productDescription"),
  productPrice: document.getElementById("productPrice"),
  productColorsBlock: document.getElementById("productColorsBlock"),
  productColors: document.getElementById("productColors"),
  thumbsColumn: document.getElementById("thumbsColumn"),
  mainProductImage: document.getElementById("mainProductImage"),
  relatedProductsGrid: document.getElementById("relatedProductsGrid"),
  currencyBtns: document.querySelectorAll(".currency-btn"),
  consultBtn: document.querySelector(".detail-consult-link"),
  qtyInput: document.getElementById("qty"),
  detailInlineCart: document.getElementById("detailInlineCart")
};

let currentProduct = null;

const badgeMeta = {
  destacado: { label: "Destacado", className: "is-dark" },
  nuevo: { label: "Nuevo", className: "is-green" },
  "mas-vendido": { label: "Más vendido", className: "is-gold" },
  oferta: { label: "Oferta", className: "is-red" },
  "edicion-limitada": { label: "Edición limitada", className: "is-dark" }
};

function renderNotFound() {
  document.title = "Jarama – Producto no encontrado";
  const main = document.querySelector(".page-main");
  if (!main) return;

  main.innerHTML = `
    <section class="section-spacing">
      <div class="container-wide empty-page-state">
        <p class="eyebrow">Oops</p>
        <h1>Este producto no existe o ya no está disponible.</h1>
        <p>Podés volver al catálogo principal y seguir explorando la colección Jarama.</p>
        <a class="btn btn-primary" href="index.html">Volver al catálogo</a>
      </div>
    </section>
  `;
}

function renderLoadingState() {
  if (dom.productTitle) dom.productTitle.textContent = "Cargando producto…";
  if (dom.productDescription) {
    dom.productDescription.textContent = "Estamos trayendo la ficha desde Supabase o desde el respaldo local.";
  }
}

function createThumbButton(imageSrc, imageAlt, isActive = false) {
  const button = document.createElement("button");
  button.className = `thumb-btn ${isActive ? "active" : ""}`;
  button.type = "button";
  button.innerHTML = `<img src="${imageSrc}" alt="${imageAlt}" onerror="this.onerror=null; this.src='assets/logo-jarama.svg';">`;

  button.addEventListener("click", () => {
    document.querySelectorAll(".thumb-btn").forEach((thumb) => thumb.classList.remove("active"));
    button.classList.add("active");

    if (dom.mainProductImage) {
      dom.mainProductImage.src = imageSrc;
      dom.mainProductImage.alt = imageAlt;
    }
  });

  return button;
}

function badgeMarkup(product) {
  if (!Array.isArray(product.badges) || !product.badges.length) return "";

  return product.badges
    .map((badgeKey) => {
      const badge = badgeMeta[badgeKey] || { label: badgeKey, className: "" };
      return `<span class="detail-badge ${badge.className}">${badge.label}</span>`;
    })
    .join("");
}

function colorMarkup(colors = []) {
  return colors
    .map((color) => `
      <span class="color-pill">
        <span class="color-pill__dot"></span>
        <span>${color}</span>
      </span>
    `)
    .join("");
}

function createRelatedCard(relatedProduct) {
  const badge = !relatedProduct.stock
    ? { label: "Sin stock", className: "is-red" }
    : (Array.isArray(relatedProduct.badges) && relatedProduct.badges[0]
      ? badgeMeta[relatedProduct.badges[0]] || null
      : null);

  const article = document.createElement("article");
  article.className = "product-card";
  article.innerHTML = `
    <a href="producto.html?slug=${encodeURIComponent(relatedProduct.slug)}" class="product-link">
      <div class="product-image-wrapper">
        <img src="${relatedProduct.imagenes[0] || "assets/logo-jarama.svg"}" alt="${relatedProduct.nombre}" onerror="this.onerror=null; this.src='assets/logo-jarama.svg';">
        ${badge ? `<span class="product-ribbon ${badge.className}">${badge.label}</span>` : ""}
      </div>
    </a>
    <div class="product-card__body">
      <a href="producto.html?slug=${encodeURIComponent(relatedProduct.slug)}" class="product-link product-link--body">
        <h3 class="product-name">${relatedProduct.nombre}</h3>
      </a>
      <div class="product-price-row">
        <p class="product-price">${formatPriceUyu(relatedProduct.precioUYU)}</p>
        <button class="product-quick-add" type="button" ${!relatedProduct.stock ? "disabled" : ""}>
          <i class="ph-shopping-cart-simple"></i>
        </button>
      </div>
    </div>
  `;

  article.querySelector(".product-quick-add")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!relatedProduct.stock) return;
    window.JaramaApp?.addItemToCart?.({
      id: relatedProduct.id,
      slug: relatedProduct.slug,
      nombre: relatedProduct.nombre,
      precioUYU: relatedProduct.precioUYU,
      cantidad: 1,
      imagen: relatedProduct.imagenes?.[0] || ""
    });
  });

  return article;
}

async function renderRelated(productData) {
  const related = await getRelatedProducts(productData, 3);
  if (!dom.relatedProductsGrid) return;
  dom.relatedProductsGrid.innerHTML = "";
  related.forEach((relatedProduct) => {
    dom.relatedProductsGrid.appendChild(createRelatedCard(relatedProduct));
  });
}

function buildCartItem(quantity) {
  return {
    id: currentProduct.id,
    slug: currentProduct.slug,
    nombre: currentProduct.nombre,
    precioUYU: currentProduct.precioUYU,
    cantidad: quantity,
    imagen: currentProduct.imagenes?.[0] || ""
  };
}

function setCartButtonFeedback(button) {
  if (!button) return;
  button.innerHTML = '<i class="ph-check"></i>';
  setTimeout(() => {
    button.innerHTML = '<i class="ph-shopping-cart-simple"></i>';
  }, 1200);
}

function renderProduct(productData) {
  if (!productData) {
    renderNotFound();
    return;
  }

  currentProduct = productData;
  document.title = `Jarama – ${productData.nombre}`;

  dom.productStatus.textContent = productData.stock ? "Disponible" : "Sin stock";
  dom.productStatus.classList.toggle("is-out", !productData.stock);
  dom.productTitle.textContent = productData.nombre;
  dom.productCode.textContent = `Código: ${productData.codigo}`;
  dom.productMeasures.textContent = `Medidas: Largo ${productData.medidas.largo}. Profundidad ${productData.medidas.profundidad}. Altura ${productData.medidas.altura}.`;
  dom.productMaterial.textContent = `Material: ${productData.material}`;
  dom.productDescription.textContent = productData.descripcion;
  dom.productPrice.dataset.priceUyu = String(productData.precioUYU);
  dom.productPrice.textContent = formatPriceUyu(productData.precioUYU);
  dom.productBadges.innerHTML = badgeMarkup(productData);

  const colors = Array.isArray(productData.colores) ? productData.colores : [];
  if (colors.length) {
    dom.productColorsBlock.hidden = false;
    dom.productColors.innerHTML = colorMarkup(colors);
  } else {
    dom.productColorsBlock.hidden = true;
  }

  if (dom.mainProductImage && productData.imagenes.length) {
    dom.mainProductImage.src = productData.imagenes[0];
    dom.mainProductImage.alt = productData.nombre;
  }

  dom.thumbsColumn.innerHTML = "";
  productData.imagenes.forEach((image, index) => {
    dom.thumbsColumn.appendChild(createThumbButton(image, `${productData.nombre} vista ${index + 1}`, index === 0));
  });

  renderRelated(productData);
}

function initCurrencySwitch() {
  if (!dom.currencyBtns.length || !dom.productPrice) return;

  dom.currencyBtns.forEach((button) => {
    button.addEventListener("click", () => {
      if (!currentProduct) return;
      dom.currencyBtns.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      const selectedCurrency = button.dataset.currency;
      dom.productPrice.textContent = selectedCurrency === "USD"
        ? formatPriceUsd(currentProduct.precioUYU)
        : formatPriceUyu(currentProduct.precioUYU);
    });
  });
}

function initConsultModal() {
  const consultModal = document.getElementById("modalConsulta");
  const modalCloseBtn = document.querySelector(".modal-close");
  const modalTextarea = document.querySelector(".modal-form textarea");

  if (!dom.consultBtn || !consultModal) return;

  const openConsultModal = () => {
    consultModal.classList.add("is-visible");
    consultModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (modalTextarea && currentProduct) {
      modalTextarea.value = `Hola, quiero consultar por ${currentProduct.nombre}.`;
    }
  };

  const closeConsultModal = () => {
    consultModal.classList.remove("is-visible");
    consultModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  dom.consultBtn.addEventListener("click", openConsultModal);
  modalCloseBtn?.addEventListener("click", closeConsultModal);
  consultModal.addEventListener("click", (event) => {
    if (event.target === consultModal) closeConsultModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && consultModal.classList.contains("is-visible")) {
      closeConsultModal();
    }
  });
}

function initCartButtons() {
  const addToCartBtn = document.querySelector(".btn-add-cart");
  if (!addToCartBtn) return;

  const handleAdd = (button) => {
    if (!currentProduct) return;
    if (!currentProduct.stock) return;
    const quantity = Number(dom.qtyInput?.value || 1);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    window.JaramaApp?.addItemToCart?.(buildCartItem(safeQuantity));
    setCartButtonFeedback(button);
  };

  addToCartBtn.addEventListener("click", () => handleAdd(addToCartBtn));
  dom.detailInlineCart?.addEventListener("click", () => handleAdd(dom.detailInlineCart));
}

async function bootstrap() {
  renderLoadingState();
  const product = await getProductBySlug(slug);
  renderProduct(product);
  initCurrencySwitch();
  initConsultModal();
  initCartButtons();
}

document.addEventListener("DOMContentLoaded", bootstrap);
