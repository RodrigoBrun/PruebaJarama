import { formatPriceUyu, formatPriceUsd } from "../data/products.js";
import { getProductBySlug, getRelatedProducts } from "../data/product-repository.js";

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");
let currentProduct = null;

const badgeMap = {
  destacado: { label: "Destacado", className: "is-dark" },
  nuevo: { label: "Nuevo", className: "is-green" },
  "mas-vendido": { label: "Más vendido", className: "is-gold" },
  oferta: { label: "Oferta", className: "is-red" },
  "edicion-limitada": { label: "Edición limitada", className: "" }
};

const dom = {
  productStatus: document.getElementById("productStatus"),
  productBadges: document.getElementById("productBadges"),
  productTitle: document.getElementById("productTitle"),
  productCode: document.getElementById("productCode"),
  productMeasures: document.getElementById("productMeasures"),
  productMaterial: document.getElementById("productMaterial"),
  productColorsBlock: document.getElementById("productColorsBlock"),
  productColors: document.getElementById("productColors"),
  productDescription: document.getElementById("productDescription"),
  productPrice: document.getElementById("productPrice"),
  mainProductImage: document.getElementById("mainProductImage"),
  thumbsColumn: document.getElementById("thumbsColumn"),
  relatedProductsGrid: document.getElementById("relatedProductsGrid"),
  consultBtn: document.querySelector(".detail-consult-link"),
  currencyBtns: document.querySelectorAll(".currency-btn"),
  qtyInput: document.getElementById("qty")
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function createThumbButton(src, alt, active = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `thumb-btn${active ? " active" : ""}`;
  button.innerHTML = `<img src="${src}" alt="${alt}">`;

  button.addEventListener("click", () => {
    document.querySelectorAll(".thumb-btn").forEach((element) => element.classList.remove("active"));
    button.classList.add("active");
    if (dom.mainProductImage) {
      dom.mainProductImage.src = src;
      dom.mainProductImage.alt = alt;
    }
  });

  return button;
}

function createRelatedCard(product) {
  return `
    <article class="product-card">
      <a href="producto.html?slug=${product.slug}" class="product-link">
        <div class="product-image-wrapper">
          <img src="${product.imagenes[0]}" alt="${escapeHtml(product.nombre)}">
          ${!product.stock ? '<span class="product-ribbon">SIN STOCK</span>' : ""}
        </div>
        <h3 class="product-name">${escapeHtml(product.nombre)}</h3>
        <p class="product-price">${formatPriceUyu(product.precioUYU)}</p>
      </a>
    </article>
  `;
}

function renderLoadingState() {
  dom.productTitle.textContent = "Cargando producto…";
  dom.productDescription.textContent = "Estamos buscando la ficha de este artículo en la colección Jarama.";
}

function renderNotFound() {
  dom.productTitle.textContent = "Producto no encontrado";
  dom.productDescription.textContent = "No pudimos encontrar este artículo. Podés volver al catálogo para seguir explorando la tienda.";
  dom.relatedProductsGrid.innerHTML = "";
}

function renderBadgeRow(product) {
  if (!dom.productBadges) return;
  const badges = Array.isArray(product.badges) ? product.badges : [];
  dom.productBadges.innerHTML = badges
    .map((badge) => {
      const meta = badgeMap[badge] || { label: badge, className: "" };
      return `<span class="detail-badge ${meta.className}">${escapeHtml(meta.label)}</span>`;
    })
    .join("");
}

function renderColors(product) {
  if (!dom.productColors || !dom.productColorsBlock) return;
  const colors = Array.isArray(product.colores) ? product.colores : [];

  if (!colors.length) {
    dom.productColorsBlock.hidden = true;
    dom.productColors.innerHTML = "";
    return;
  }

  dom.productColorsBlock.hidden = false;
  dom.productColors.innerHTML = colors
    .map((color) => `
      <span class="color-pill">
        <span class="color-pill__dot"></span>
        ${escapeHtml(color)}
      </span>
    `)
    .join("");
}

function renderRelated(product) {
  getRelatedProducts(product).then((related) => {
    dom.relatedProductsGrid.innerHTML = related.length
      ? related.map(createRelatedCard).join("")
      : '<article class="empty-state"><p>No encontramos productos relacionados todavía.</p></article>';
  });
}

function renderProduct(productData) {
  currentProduct = productData;

  if (!productData) {
    renderNotFound();
    return;
  }

  dom.productStatus.textContent = productData.stock ? "Disponible" : "Sin stock";
  dom.productStatus.classList.toggle("is-out", !productData.stock);
  dom.productTitle.textContent = productData.nombre;
  dom.productCode.textContent = `Código: ${productData.codigo}`;
  dom.productMeasures.textContent = `Medidas: Largo ${productData.medidas.largo}. Profundidad ${productData.medidas.profundidad}. Altura ${productData.medidas.altura}.`;
  dom.productMaterial.textContent = `Material: ${productData.material}`;
  dom.productDescription.textContent = productData.descripcion;
  dom.productPrice.dataset.priceUyu = String(productData.precioUYU);
  dom.productPrice.textContent = formatPriceUyu(productData.precioUYU);

  renderBadgeRow(productData);
  renderColors(productData);

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
      dom.productPrice.textContent =
        selectedCurrency === "USD"
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

function initCartButton() {
  const addToCartBtn = document.querySelector(".btn-add-cart");
  if (!addToCartBtn) return;

  addToCartBtn.addEventListener("click", () => {
    if (!currentProduct) return;

    if (!currentProduct.stock) {
      addToCartBtn.innerHTML = '<i class="ph-warning"></i> Sin stock';
      return;
    }

    const quantity = Number(dom.qtyInput?.value || 1);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    const cartItem = {
      id: currentProduct.id,
      slug: currentProduct.slug,
      nombre: currentProduct.nombre,
      precioUYU: currentProduct.precioUYU,
      cantidad: safeQuantity,
      imagen: currentProduct.imagenes[0]
    };

    window.JaramaApp?.addItemToCart?.(cartItem);

    addToCartBtn.innerHTML = '<i class="ph-check"></i> Agregado';

    setTimeout(() => {
      addToCartBtn.innerHTML = '<i class="ph-shopping-cart-simple"></i> Agregar al carrito';
    }, 1500);
  });
}

async function bootstrap() {
  renderLoadingState();
  const product = await getProductBySlug(slug);
  renderProduct(product);
  initCurrencySwitch();
  initConsultModal();
  initCartButton();
}

document.addEventListener("DOMContentLoaded", bootstrap);
