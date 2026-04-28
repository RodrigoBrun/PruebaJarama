import "./ui.js";
import { signOutAdmin, requireAdminAccess, getSupabaseClient } from "./auth.js";
import { isSupabaseConfigured } from "./supabase-config.js";
import { products as demoProducts } from "../data/products.js";
import { toSupabasePayload } from "../data/product-repository.js";

const STORAGE_BUCKET = "site-assets";

const elements = {
  adminName: document.getElementById("adminName"),
  adminEmail: document.getElementById("adminEmail"),
  status: document.getElementById("productsStatus"),
  tableBody: document.getElementById("productsTableBody"),
  search: document.getElementById("productSearch"),
  logoutBtn: document.getElementById("logoutBtn"),
  form: document.getElementById("productForm"),
  formTitle: document.getElementById("productFormTitle"),
  saveBtn: document.getElementById("saveProductBtn"),
  resetBtn: document.getElementById("resetProductFormBtn"),
  seedDemoBtn: document.getElementById("seedDemoBtn"),
  productId: document.getElementById("productId"),
  productName: document.getElementById("productName"),
  productSlug: document.getElementById("productSlug"),
  productCategorySelect: document.getElementById("productCategorySelect"),
  productSubcategorySelect: document.getElementById("productSubcategorySelect"),
  productCode: document.getElementById("productCode"),
  productPrice: document.getElementById("productPrice"),
  measureLargo: document.getElementById("measureLargo"),
  measureProfundidad: document.getElementById("measureProfundidad"),
  measureAltura: document.getElementById("measureAltura"),
  productMaterial: document.getElementById("productMaterial"),
  productTags: document.getElementById("productTags"),
  productColorsInput: document.getElementById("productColorsInput"),
  productSummary: document.getElementById("productSummary"),
  productDescription: document.getElementById("productDescription"),
  productImages: document.getElementById("productImages"),
  productImageFiles: document.getElementById("productImageFiles"),
  uploadProductImagesBtn: document.getElementById("uploadProductImagesBtn"),
  clearProductImageFilesBtn: document.getElementById("clearProductImageFilesBtn"),
  productImagesPreview: document.getElementById("productImagesPreview"),
  stockYes: document.getElementById("stockYes"),
  stockNo: document.getElementById("stockNo"),
  badgeFeatured: document.getElementById("badgeFeatured"),
  badgeNew: document.getElementById("badgeNew"),
  badgeBestSeller: document.getElementById("badgeBestSeller"),
  badgeOffer: document.getElementById("badgeOffer"),
  badgeLimited: document.getElementById("badgeLimited"),
  statProductCount: document.getElementById("statProductCount"),
  statPublishedCount: document.getElementById("statPublishedCount"),
  statFeaturedCount: document.getElementById("statFeaturedCount"),
  statOutCount: document.getElementById("statOutCount"),
  filterStock: document.getElementById("productFilterStock"),
  filterFeatured: document.getElementById("productFilterFeatured"),
  filterCategory: document.getElementById("productFilterCategory"),
  clearFiltersBtn: document.getElementById("clearProductFiltersBtn"),
  confirmModal: document.getElementById("productConfirmModal"),
  confirmTitle: document.getElementById("productConfirmTitle"),
  confirmMessage: document.getElementById("productConfirmMessage"),
  confirmAcceptBtn: document.getElementById("productConfirmAcceptBtn"),
  confirmCancelBtn: document.getElementById("productConfirmCancelBtn")
};

const badgeMap = {
  destacado: { label: "Destacado", className: "admin-badge--dark" },
  nuevo: { label: "Nuevo", className: "admin-badge--done" },
  "mas-vendido": { label: "Más vendido", className: "admin-badge--pending" },
  oferta: { label: "Oferta", className: "admin-badge--cancelled" },
  "edicion-limitada": { label: "Edición limitada", className: "admin-badge--paid" }
};

let state = {
  products: [],
  filteredProducts: [],
  categories: [],
  rootCategories: [],
  editingId: null,
  confirmAction: null,
  localPreviewFiles: []
};

function showStatus(message, type = "info") {
  if (!elements.status) return;
  elements.status.hidden = false;
  elements.status.textContent = message;
  elements.status.classList.remove("is-info", "is-error");
  elements.status.classList.add(type === "error" ? "is-error" : "is-info");
}

function clearStatus() {
  if (!elements.status) return;
  elements.status.hidden = true;
  elements.status.textContent = "";
  elements.status.classList.remove("is-info", "is-error");
}

function formatUyu(value) {
  return `$ ${Number(value || 0).toLocaleString("es-UY")}`;
}

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

function readLines(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeLines(lines) {
  elements.productImages.value = lines.join("\n");
}

function getTextareaImages() {
  return readLines(elements.productImages.value);
}

function getSelectedBadges() {
  const badges = [];
  if (elements.badgeFeatured.checked) badges.push("destacado");
  if (elements.badgeNew.checked) badges.push("nuevo");
  if (elements.badgeBestSeller.checked) badges.push("mas-vendido");
  if (elements.badgeOffer.checked) badges.push("oferta");
  if (elements.badgeLimited.checked) badges.push("edicion-limitada");
  return badges;
}

function markBadges(badges = []) {
  const set = new Set(badges);
  elements.badgeFeatured.checked = set.has("destacado");
  elements.badgeNew.checked = set.has("nuevo");
  elements.badgeBestSeller.checked = set.has("mas-vendido");
  elements.badgeOffer.checked = set.has("oferta");
  elements.badgeLimited.checked = set.has("edicion-limitada");
}

function openConfirm({ title, message, confirmText = "Confirmar", variant = "danger", onConfirm }) {
  state.confirmAction = onConfirm || null;
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmAcceptBtn.textContent = confirmText;
  elements.confirmAcceptBtn.classList.remove("btn-primary", "btn-secondary");
  elements.confirmAcceptBtn.classList.add(variant === "neutral" ? "btn-secondary" : "btn-primary");
  elements.confirmModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeConfirm() {
  state.confirmAction = null;
  elements.confirmModal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function acceptConfirm() {
  if (typeof state.confirmAction === "function") {
    const action = state.confirmAction;
    closeConfirm();
    await action();
    return;
  }
  closeConfirm();
}

function renderStats(products) {
  elements.statProductCount.textContent = products.length;
  elements.statPublishedCount.textContent = products.filter((item) => item.in_stock).length;
  elements.statFeaturedCount.textContent = products.filter((item) => item.featured).length;
  elements.statOutCount.textContent = products.filter((item) => !item.in_stock).length;
}

function stockMarkup(product) {
  return product.in_stock
    ? '<span class="admin-badge admin-badge--done">Con stock</span>'
    : '<span class="admin-badge admin-badge--cancelled">Sin stock</span>';
}

function renderBadges(badges = []) {
  if (!badges.length) return '<span class="admin-badge admin-badge--pending">Sin extras</span>';

  return badges
    .map((badge) => {
      const meta = badgeMap[badge] || { label: badge, className: "admin-badge--pending" };
      return `<span class="admin-badge ${meta.className}">${meta.label}</span>`;
    })
    .join("");
}

function getCategoryBySlug(slug) {
  return state.categories.find((item) => item.slug === slug) || null;
}

function getRootCategories() {
  return [...state.categories]
    .filter((item) => !item.parent_id && item.is_active)
    .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100) || String(a.name).localeCompare(String(b.name), "es"));
}

function getSubcategoriesByParentId(parentId) {
  return [...state.categories]
    .filter((item) => item.parent_id === parentId && item.is_active)
    .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100) || String(a.name).localeCompare(String(b.name), "es"));
}

function syncCategorySelects(selectedCategorySlug = "", selectedSubcategorySlug = "") {
  elements.productCategorySelect.innerHTML = `
    <option value="">Seleccionar categoría</option>
    ${state.rootCategories
      .map(
        (item) => `
          <option value="${escapeHtml(item.slug)}" ${item.slug === selectedCategorySlug ? "selected" : ""}>
            ${escapeHtml(item.name)}
          </option>
        `
      )
      .join("")}
  `;

  const selectedRoot = getCategoryBySlug(selectedCategorySlug);
  const children = selectedRoot ? getSubcategoriesByParentId(selectedRoot.id) : [];

  elements.productSubcategorySelect.innerHTML = `
    <option value="">${children.length ? "Sin subcategoría" : "Primero elegí una categoría"}</option>
    ${children
      .map(
        (item) => `
          <option value="${escapeHtml(item.slug)}" ${item.slug === selectedSubcategorySlug ? "selected" : ""}>
            ${escapeHtml(item.name)}
          </option>
        `
      )
      .join("")}
  `;

  elements.productSubcategorySelect.disabled = !children.length;
}

function syncCategoryFilterOptions() {
  elements.filterCategory.innerHTML = `
    <option value="all">Todas las categorías</option>
    ${state.rootCategories
      .map(
        (item) => `
          <option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>
        `
      )
      .join("")}
  `;
}

function renderImagePreview() {
  const textareaImages = getTextareaImages();

  if (!textareaImages.length && !state.localPreviewFiles.length) {
    elements.productImagesPreview.innerHTML = `
      <div class="admin-preview-empty">Todavía no hay imágenes cargadas para este producto.</div>
    `;
    return;
  }

  const savedCards = textareaImages.map((url, index) => `
    <article class="admin-preview-card">
      <img src="${escapeHtml(url)}" alt="Preview ${index + 1}" />
      <button type="button" class="admin-preview-remove" data-remove-image="${escapeHtml(url)}" aria-label="Quitar imagen">
        <i class="ph-x"></i>
      </button>
      <span class="admin-preview-badge">Guardada</span>
    </article>
  `);

  const localCards = state.localPreviewFiles.map((item, index) => `
    <article class="admin-preview-card admin-preview-card--pending">
      <img src="${item.preview}" alt="Archivo pendiente ${index + 1}" />
      <button type="button" class="admin-preview-remove" data-remove-local-index="${index}" aria-label="Quitar archivo">
        <i class="ph-x"></i>
      </button>
      <span class="admin-preview-badge">Pendiente</span>
    </article>
  `);

  elements.productImagesPreview.innerHTML = [...savedCards, ...localCards].join("");
}

function renderTable(products) {
  renderStats(state.products);

  if (!products.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">No encontramos productos con ese filtro.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = products
    .map((product) => {
      const badges = Array.isArray(product.badges) ? product.badges : [];
      const colors = Array.isArray(product.available_colors) ? product.available_colors : [];
      const categoryLabel = [product.category, product.category_slug, product.subcategory_slug]
        .filter(Boolean)
        .join(" · ");

      return `
        <tr>
          <td>
            <div class="admin-product-cell">
              <strong>${escapeHtml(product.name)}</strong>
              <span>${escapeHtml(product.slug)}</span>
              <span>${escapeHtml(product.code || "Sin código")}</span>
              ${colors.length ? `<span>Colores: ${escapeHtml(colors.join(", "))}</span>` : ""}
            </div>
          </td>
          <td>${escapeHtml(categoryLabel || "Sin categoría")}</td>
          <td>${formatUyu(product.price_uyu)}</td>
          <td>${stockMarkup(product)}</td>
          <td><div class="admin-badge-group">${renderBadges(badges)}</div></td>
          <td>
            <div class="admin-inline-actions">
              <a class="admin-inline-btn" href="../producto.html?slug=${encodeURIComponent(product.slug)}" target="_blank" rel="noreferrer">
                <i class="ph-arrow-square-out"></i> Ver
              </a>

              <button class="admin-inline-btn" type="button" data-action="edit" data-id="${product.id}">
                <i class="ph-pencil-simple"></i> Editar
              </button>

              <button class="admin-inline-btn" type="button" data-action="archive" data-id="${product.id}" ${!product.in_stock ? "disabled" : ""}>
                <i class="ph-archive-box"></i> ${product.in_stock ? "Archivar" : "Archivado"}
              </button>

              <button class="admin-inline-btn admin-inline-btn--danger" type="button" data-action="delete" data-id="${product.id}">
                <i class="ph-trash"></i> Borrar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function applyFilter() {
  const term = String(elements.search.value || "").trim().toLowerCase();
  const stockFilter = String(elements.filterStock.value || "all");
  const featuredFilter = String(elements.filterFeatured.value || "all");
  const categoryFilter = String(elements.filterCategory.value || "all");

  state.filteredProducts = state.products.filter((product) => {
    const haystack = [
      product.name,
      product.slug,
      product.code,
      product.category,
      product.category_slug,
      product.subcategory_slug
    ]
      .concat(Array.isArray(product.available_colors) ? product.available_colors : [])
      .concat(Array.isArray(product.badges) ? product.badges : [])
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesText = haystack.includes(term);
    const matchesStock =
      stockFilter === "all" ? true : stockFilter === "in" ? Boolean(product.in_stock) : !Boolean(product.in_stock);

    const matchesFeatured =
      featuredFilter === "all"
        ? true
        : featuredFilter === "featured"
          ? Boolean(product.featured)
          : !Boolean(product.featured);

    const matchesCategory =
      categoryFilter === "all"
        ? true
        : String(product.category_slug || "") === categoryFilter;

    return matchesText && matchesStock && matchesFeatured && matchesCategory;
  });

  renderTable(state.filteredProducts);
}

function clearFilters() {
  elements.search.value = "";
  elements.filterStock.value = "all";
  elements.filterFeatured.value = "all";
  elements.filterCategory.value = "all";
  applyFilter();
}

async function fetchCategories() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("categories")
    .select("id, parent_id, name, slug, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  state.categories = Array.isArray(data) ? data : [];
  state.rootCategories = getRootCategories();
  syncCategorySelects();
  syncCategoryFilterOptions();
}

async function fetchProducts() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("products")
    .select("*")
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;

  state.products = Array.isArray(data) ? data : [];
  applyFilter();
}

function resetLocalPreviewFiles() {
  state.localPreviewFiles.forEach((item) => {
    if (item.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(item.preview);
    }
  });
  state.localPreviewFiles = [];
}

function resetForm() {
  state.editingId = null;
  resetLocalPreviewFiles();
  elements.form.reset();
  elements.productId.value = "";
  elements.stockYes.checked = true;
  elements.stockNo.checked = false;
  markBadges([]);
  elements.formTitle.textContent = "Nuevo producto";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar producto';
  syncCategorySelects();
  renderImagePreview();
}

function fillForm(product) {
  state.editingId = product.id;
  resetLocalPreviewFiles();

  elements.productId.value = product.id;
  elements.productName.value = product.name || "";
  elements.productSlug.value = product.slug || "";
  elements.productCode.value = product.code || "";
  elements.productPrice.value = Number(product.price_uyu || 0);
  elements.measureLargo.value = product.measures?.largo || "";
  elements.measureProfundidad.value = product.measures?.profundidad || "";
  elements.measureAltura.value = product.measures?.altura || "";
  elements.productMaterial.value = product.material || "";
  elements.productTags.value = Array.isArray(product.tags) ? product.tags.join(", ") : "";
  elements.productColorsInput.value = Array.isArray(product.available_colors) ? product.available_colors.join(", ") : "";
  elements.productSummary.value = product.summary || "";
  elements.productDescription.value = product.description || "";
  elements.productImages.value = Array.isArray(product.images) ? product.images.join("\n") : "";
  elements.stockYes.checked = Boolean(product.in_stock);
  elements.stockNo.checked = !Boolean(product.in_stock);
  markBadges(product.badges || []);

  syncCategorySelects(product.category_slug || "", product.subcategory_slug || "");
  renderImagePreview();

  elements.formTitle.textContent = "Editar producto";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar cambios';
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildPayloadFromForm() {
  const name = elements.productName.value.trim();
  const slug = elements.productSlug.value.trim() || slugify(name);
  const badges = getSelectedBadges();

  const categorySlug = elements.productCategorySelect.value || null;
  const subcategorySlug = elements.productSubcategorySelect.value || null;
  const categoryRecord = getCategoryBySlug(categorySlug);

  return {
    slug,
    name,
    category: categoryRecord?.name || null,
    category_slug: categorySlug,
    subcategory_slug: subcategorySlug,
    code: elements.productCode.value.trim() || null,
    price_uyu: Number(elements.productPrice.value || 0),
    in_stock: elements.stockYes.checked,
    featured: badges.includes("destacado"),
    badges,
    available_colors: readLines(elements.productColorsInput.value),
    summary: elements.productSummary.value.trim(),
    description: elements.productDescription.value.trim(),
    material: elements.productMaterial.value.trim(),
    measures: {
      largo: elements.measureLargo.value.trim() || "A coordinar",
      profundidad: elements.measureProfundidad.value.trim() || "A coordinar",
      altura: elements.measureAltura.value.trim() || "A coordinar"
    },
    images: getTextareaImages(),
    tags: readLines(elements.productTags.value)
  };
}

async function uploadFilesToStorage(files) {
  const client = getSupabaseClient();
  const uploadedUrls = [];

  for (const file of files) {
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const safeName = slugify(file.name.replace(/\.[^/.]+$/, "")) || "producto";
    const fileName = `products/${Date.now()}-${safeName}.${extension}`;

    const { error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, { upsert: true });

    if (error) {
      throw error;
    }

    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

async function handleUploadImages() {
  const files = Array.from(elements.productImageFiles.files || []);
  if (!files.length) {
    showStatus("Seleccioná al menos una imagen antes de subir.", "error");
    return;
  }

  elements.uploadProductImagesBtn.disabled = true;
  clearStatus();

  try {
    const uploadedUrls = await uploadFilesToStorage(files);
    const merged = [...getTextareaImages(), ...uploadedUrls];
    writeLines(merged);

    resetLocalPreviewFiles();
    elements.productImageFiles.value = "";
    renderImagePreview();
    showStatus("Imágenes subidas correctamente.");
  } catch (error) {
    showStatus(error.message || "No pudimos subir las imágenes.", "error");
  } finally {
    elements.uploadProductImagesBtn.disabled = false;
  }
}

async function saveProduct(event) {
  event.preventDefault();
  clearStatus();

  const payload = buildPayloadFromForm();

  if (!payload.name || !payload.slug) {
    showStatus("Nombre y slug son obligatorios para guardar el producto.", "error");
    return;
  }

  if (!payload.category_slug) {
    showStatus("Elegí una categoría principal antes de guardar.", "error");
    return;
  }

  elements.saveBtn.disabled = true;
  const client = getSupabaseClient();

  try {
    if (state.editingId) {
      const { error } = await client
        .from("products")
        .update(payload)
        .eq("id", state.editingId);

      if (error) throw error;
      showStatus("Producto actualizado correctamente.");
    } else {
      const { error } = await client
        .from("products")
        .insert(payload);

      if (error) throw error;
      showStatus("Producto creado correctamente.");
    }

    resetForm();
    await fetchProducts();
  } catch (error) {
    showStatus(error.message || "No pudimos guardar el producto.", "error");
  } finally {
    elements.saveBtn.disabled = false;
  }
}

async function archiveProduct(id) {
  clearStatus();
  const client = getSupabaseClient();

  try {
    const { error } = await client
      .from("products")
      .update({ in_stock: false })
      .eq("id", id);

    if (error) throw error;

    if (state.editingId === id) {
      elements.stockNo.checked = true;
      elements.stockYes.checked = false;
    }

    showStatus("Producto archivado correctamente. Quedó sin stock.");
    await fetchProducts();
  } catch (error) {
    showStatus(error.message || "No pudimos archivar el producto.", "error");
  }
}

async function deleteProduct(id) {
  clearStatus();
  const client = getSupabaseClient();

  try {
    const { error } = await client
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    if (state.editingId === id) resetForm();
    showStatus("Producto eliminado correctamente.");
    await fetchProducts();
  } catch (error) {
    showStatus(error.message || "No pudimos borrar el producto.", "error");
  }
}

async function seedDemoProducts() {
  clearStatus();
  const client = getSupabaseClient();
  const payload = demoProducts.map((item) => toSupabasePayload(item));

  try {
    const { error } = await client
      .from("products")
      .upsert(payload, { onConflict: "slug" });

    if (error) throw error;

    showStatus("Demo importada correctamente. Ahora la tienda pública puede leerla desde Supabase.");
    await fetchProducts();
  } catch (error) {
    showStatus(error.message || "No pudimos importar la demo.", "error");
  }
}

function attachTableEvents() {
  elements.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;
    const product = state.products.find((item) => item.id === id);

    if (action === "edit" && product) {
      fillForm(product);
    }

    if (action === "archive" && id && product) {
      openConfirm({
        title: "Archivar producto",
        message: `“${product.name}” quedará sin stock y dejará de verse como disponible. ¿Querés continuar?`,
        confirmText: "Archivar",
        variant: "neutral",
        onConfirm: () => archiveProduct(id)
      });
    }

    if (action === "delete" && id && product) {
      openConfirm({
        title: "Borrar producto",
        message: `Esta acción eliminará “${product.name}” de Jarama. ¿Querés seguir igual?`,
        confirmText: "Borrar",
        variant: "danger",
        onConfirm: () => deleteProduct(id)
      });
    }
  });
}

function handlePreviewRemoveClick(event) {
  const removeSaved = event.target.closest("[data-remove-image]");
  const removeLocal = event.target.closest("[data-remove-local-index]");

  if (removeSaved) {
    const url = removeSaved.dataset.removeImage;
    const nextImages = getTextareaImages().filter((item) => item !== url);
    writeLines(nextImages);
    renderImagePreview();
    return;
  }

  if (removeLocal) {
    const index = Number(removeLocal.dataset.removeLocalIndex);
    const target = state.localPreviewFiles[index];

    if (target?.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(target.preview);
    }

    state.localPreviewFiles.splice(index, 1);
    renderImagePreview();
  }
}

function updateLocalPreviewFiles() {
  resetLocalPreviewFiles();

  const files = Array.from(elements.productImageFiles.files || []);
  state.localPreviewFiles = files.map((file) => ({
    file,
    preview: URL.createObjectURL(file)
  }));

  renderImagePreview();
}

function bindEvents() {
  elements.productName?.addEventListener("input", () => {
    if (!state.editingId && !elements.productSlug.value.trim()) {
      elements.productSlug.value = slugify(elements.productName.value);
    }
  });

  elements.productCategorySelect?.addEventListener("change", () => {
    syncCategorySelects(elements.productCategorySelect.value, "");
  });

  elements.productImages?.addEventListener("input", renderImagePreview);
  elements.productImageFiles?.addEventListener("change", updateLocalPreviewFiles);
  elements.productImagesPreview?.addEventListener("click", handlePreviewRemoveClick);

  elements.uploadProductImagesBtn?.addEventListener("click", handleUploadImages);

  elements.clearProductImageFilesBtn?.addEventListener("click", () => {
    resetLocalPreviewFiles();
    elements.productImageFiles.value = "";
    renderImagePreview();
  });

  elements.search?.addEventListener("input", applyFilter);
  elements.filterStock?.addEventListener("change", applyFilter);
  elements.filterFeatured?.addEventListener("change", applyFilter);
  elements.filterCategory?.addEventListener("change", applyFilter);
  elements.clearFiltersBtn?.addEventListener("click", clearFilters);

  elements.form?.addEventListener("submit", saveProduct);
  elements.resetBtn?.addEventListener("click", resetForm);

  elements.seedDemoBtn?.addEventListener("click", () => {
    openConfirm({
      title: "Importar demo actual",
      message: "Esto va a importar a Supabase la demo local actual y puede sobrescribir productos con el mismo slug. ¿Seguimos?",
      confirmText: "Importar",
      variant: "neutral",
      onConfirm: seedDemoProducts
    });
  });

  elements.logoutBtn?.addEventListener("click", async () => {
    await signOutAdmin();
    window.location.href = "login.html";
  });

  elements.confirmAcceptBtn?.addEventListener("click", acceptConfirm);
  elements.confirmCancelBtn?.addEventListener("click", closeConfirm);
  document.querySelectorAll("[data-confirm-close]").forEach((node) => {
    node.addEventListener("click", closeConfirm);
  });

  attachTableEvents();
}

async function bootstrap() {
  if (!isSupabaseConfigured()) {
    showStatus("Falta configurar Supabase antes de usar el CRUD real.", "error");
    return;
  }

  const access = await requireAdminAccess({ redirectTo: "login.html" });
  if (!access.ok) return;

  const { user, profile } = access;
  elements.adminName.textContent = profile.full_name || "Administrador";
  elements.adminEmail.textContent = user.email || "—";

  bindEvents();
  renderImagePreview();

  try {
    await fetchCategories();
    await fetchProducts();
  } catch (error) {
    showStatus(error.message || "No pudimos cargar productos o categorías.", "error");
  }
}

bootstrap();