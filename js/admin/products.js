import { signOutAdmin, requireAdminAccess, getSupabaseClient } from "./auth.js";
import { isSupabaseConfigured } from "./supabase-config.js";
import { products as demoProducts } from "../data/products.js";
import { toSupabasePayload } from "../data/product-repository.js";

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
  productCategory: document.getElementById("productCategory"),
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
  statOutCount: document.getElementById("statOutCount")
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
  editingId: null
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

function readLines(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function renderTable(products) {
  renderStats(state.products);

  if (!products.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="5">No encontramos productos con ese filtro.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = products
    .map((product) => {
      const badges = Array.isArray(product.badges) ? product.badges : [];
      const colors = Array.isArray(product.available_colors) ? product.available_colors : [];
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

  state.filteredProducts = state.products.filter((product) => {
    const haystack = [product.name, product.slug, product.code, product.category]
      .concat(Array.isArray(product.available_colors) ? product.available_colors : [])
      .concat(Array.isArray(product.badges) ? product.badges : [])
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  renderTable(state.filteredProducts);
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

function resetForm() {
  state.editingId = null;
  elements.form.reset();
  elements.productId.value = "";
  elements.stockYes.checked = true;
  elements.stockNo.checked = false;
  markBadges([]);
  elements.formTitle.textContent = "Nuevo producto";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar producto';
}

function fillForm(product) {
  state.editingId = product.id;
  elements.productId.value = product.id;
  elements.productName.value = product.name || "";
  elements.productSlug.value = product.slug || "";
  elements.productCategory.value = product.category || "";
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
  elements.formTitle.textContent = "Editar producto";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar cambios';
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildPayloadFromForm() {
  const name = elements.productName.value.trim();
  const slug = elements.productSlug.value.trim() || slugify(name);
  const badges = getSelectedBadges();

  return {
    slug,
    name,
    category: elements.productCategory.value.trim() || null,
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
    images: readLines(elements.productImages.value),
    tags: readLines(elements.productTags.value)
  };
}

async function saveProduct(event) {
  event.preventDefault();
  clearStatus();

  const payload = buildPayloadFromForm();
  if (!payload.name || !payload.slug) {
    showStatus("Nombre y slug son obligatorios para guardar el producto.", "error");
    return;
  }

  elements.saveBtn.disabled = true;
  const client = getSupabaseClient();

  try {
    if (state.editingId) {
      const { error } = await client.from("products").update(payload).eq("id", state.editingId);
      if (error) throw error;
      showStatus("Producto actualizado correctamente.");
    } else {
      const { error } = await client.from("products").insert(payload);
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

async function deleteProduct(id) {
  const confirmed = window.confirm("¿Seguro que querés borrar este producto de Jarama?");
  if (!confirmed) return;

  clearStatus();
  const client = getSupabaseClient();

  try {
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) throw error;

    if (state.editingId === id) resetForm();
    showStatus("Producto eliminado correctamente.");
    await fetchProducts();
  } catch (error) {
    showStatus(error.message || "No pudimos borrar el producto.", "error");
  }
}

async function seedDemoProducts() {
  const confirmed = window.confirm("Esto va a importar a Supabase la demo local actual. ¿Seguimos?");
  if (!confirmed) return;

  clearStatus();
  const client = getSupabaseClient();
  const payload = demoProducts.map((item) => toSupabasePayload(item));

  try {
    const { error } = await client.from("products").upsert(payload, { onConflict: "slug" });
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

    if (action === "edit" && product) fillForm(product);
    if (action === "delete" && id) deleteProduct(id);
  });
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

  await fetchProducts();
  attachTableEvents();
}

elements.productName?.addEventListener("input", () => {
  if (!state.editingId && !elements.productSlug.value.trim()) {
    elements.productSlug.value = slugify(elements.productName.value);
  }
});

elements.search?.addEventListener("input", applyFilter);
elements.form?.addEventListener("submit", saveProduct);
elements.resetBtn?.addEventListener("click", resetForm);
elements.seedDemoBtn?.addEventListener("click", seedDemoProducts);
elements.logoutBtn?.addEventListener("click", async () => {
  await signOutAdmin();
  window.location.href = "login.html";
});

bootstrap();
