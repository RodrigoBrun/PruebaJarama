import "./ui.js";
import { signOutAdmin, requireAdminAccess, getSupabaseClient } from "./auth.js";
import { isSupabaseConfigured } from "./supabase-config.js";

const STORAGE_BUCKET = "site-assets";

const elements = {
  adminName: document.getElementById("adminName"),
  adminEmail: document.getElementById("adminEmail"),
  logoutBtn: document.getElementById("logoutBtn"),
  status: document.getElementById("bsdStatus"),

  storageUsed: document.getElementById("bsdStorageUsed"),
  filesCount: document.getElementById("bsdFilesCount"),
  orphanCount: document.getElementById("bsdOrphanCount"),
  productsCount: document.getElementById("bsdProductsCount"),
  ordersCount: document.getElementById("bsdOrdersCount"),
  bannersCount: document.getElementById("bsdBannersCount"),
  categoriesCount: document.getElementById("bsdCategoriesCount"),
  productsWithoutImage: document.getElementById("bsdProductsWithoutImage"),
  productsWithoutCategory: document.getElementById("bsdProductsWithoutCategory"),
  bannersWithoutImage: document.getElementById("bsdBannersWithoutImage"),
  bannersWithoutLink: document.getElementById("bsdBannersWithoutLink"),

  refreshBtn: document.getElementById("bsdRefreshBtn"),
  deleteOrphansBtn: document.getElementById("bsdDeleteOrphansBtn"),

  search: document.getElementById("bsdSearch"),
  usageFilter: document.getElementById("bsdUsageFilter"),
  folderFilter: document.getElementById("bsdFolderFilter"),
  clearFiltersBtn: document.getElementById("bsdClearFiltersBtn"),

  healthList: document.getElementById("bsdHealthList"),
  tableBody: document.getElementById("bsdTableBody"),

  confirmModal: document.getElementById("bsdConfirmModal"),
  confirmTitle: document.getElementById("bsdConfirmTitle"),
  confirmMessage: document.getElementById("bsdConfirmMessage"),
  confirmAcceptBtn: document.getElementById("bsdConfirmAcceptBtn"),
  confirmCancelBtn: document.getElementById("bsdConfirmCancelBtn")
};

let state = {
  products: [],
  banners: [],
  objects: [],
  filteredObjects: [],
  counts: {
    categories: 0,
    orders: 0
  },
  confirmAction: null
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw, window.location.origin).href.split("?")[0];
  } catch {
    return raw.split("?")[0];
  }
}

function extractBucketPathFromUrl(value) {
  const clean = normalizeUrl(value);
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = clean.indexOf(marker);

  if (index === -1) return null;

  return decodeURIComponent(clean.slice(index + marker.length));
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-UY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);

  if (size >= 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${size} B`;
}

function renderUsageBadge(object) {
  if (!object.inUse) {
    return '<span class="admin-badge admin-badge--cancelled">Huérfana</span>';
  }

  if (object.usageSources.some((item) => item.startsWith("Banner:"))) {
    return '<span class="admin-badge admin-badge--paid">En uso</span>';
  }

  return '<span class="admin-badge admin-badge--done">En uso</span>';
}

function getFolderLabel(path) {
  const folder = String(path || "").includes("/") ? String(path).split("/")[0] : "other";
  return folder || "other";
}

function getFolderFilterValue(path) {
  const folder = getFolderLabel(path);
  if (folder === "products") return "products";
  if (folder === "banners") return "banners";
  return "other";
}

function openConfirm({ title, message, onConfirm }) {
  state.confirmAction = onConfirm || null;
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
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

async function safeCount(queryBuilder) {
  const { count, error } = await queryBuilder;
  if (error) return 0;
  return count ?? 0;
}

async function listFolderRecursive(client, path = "") {
  const pageSize = 100;
  let offset = 0;
  let output = [];

  while (true) {
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .list(path, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" }
      });

    if (error) throw error;
    if (!Array.isArray(data) || !data.length) break;

    for (const item of data) {
      const childPath = path ? `${path}/${item.name}` : item.name;
      const size = Number(item.metadata?.size);
      const isFile = Number.isFinite(size) || Boolean(item.metadata?.mimetype);

      if (isFile) {
        output.push({
          ...item,
          path: childPath,
          sizeBytes: Number.isFinite(size) ? size : 0
        });
      } else {
        const nested = await listFolderRecursive(client, childPath);
        output.push(...nested);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return output;
}

function addUsage(map, key, label) {
  if (!key) return;
  const current = map.get(key) || [];
  current.push(label);
  map.set(key, current);
}

function buildUsageIndex(products, banners) {
  const usageMap = new Map();

  products.forEach((product) => {
    const label = `Producto: ${product.name || product.slug || "Producto"}`;
    const images = Array.isArray(product.images) ? product.images : [];

    images.forEach((image) => {
      const normalized = normalizeUrl(image);
      const path = extractBucketPathFromUrl(image);
      addUsage(usageMap, normalized, label);
      addUsage(usageMap, path, label);
    });
  });

  banners.forEach((banner) => {
    const label = `Banner: ${banner.title || "Banner"}`;
    const normalized = normalizeUrl(banner.image_url);
    const path = extractBucketPathFromUrl(banner.image_url);
    addUsage(usageMap, normalized, label);
    addUsage(usageMap, path, label);
  });

  return usageMap;
}

function buildManagedObjects(files, client) {
  const usageIndex = buildUsageIndex(state.products, state.banners);

  return files.map((file) => {
    const publicUrl = client.storage.from(STORAGE_BUCKET).getPublicUrl(file.path).data.publicUrl;
    const normalizedUrl = normalizeUrl(publicUrl);
    const pathUsage = usageIndex.get(file.path) || [];
    const urlUsage = usageIndex.get(normalizedUrl) || [];
    const usageSources = [...new Set([...pathUsage, ...urlUsage])];

    return {
      name: file.name,
      path: file.path,
      publicUrl,
      sizeBytes: Number(file.sizeBytes || 0),
      updatedAt: file.updated_at || file.created_at || null,
      folder: getFolderLabel(file.path),
      inUse: usageSources.length > 0,
      usageSources
    };
  });
}

function renderOverview() {
  const totalStorageBytes = state.objects.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0);
  const orphanCount = state.objects.filter((item) => !item.inUse).length;
  const productsWithoutImage = state.products.filter((item) => !Array.isArray(item.images) || !item.images.length).length;
  const productsWithoutCategory = state.products.filter((item) => !(item.category_slug || item.category)).length;
  const bannersWithoutImage = state.banners.filter((item) => !String(item.image_url || "").trim()).length;
  const bannersWithoutLink = state.banners.filter((item) => !String(item.target_url || "").trim()).length;

  elements.storageUsed.textContent = formatBytes(totalStorageBytes);
  elements.filesCount.textContent = state.objects.length;
  elements.orphanCount.textContent = orphanCount;
  elements.productsCount.textContent = state.products.length;
  elements.ordersCount.textContent = state.counts.orders;
  elements.bannersCount.textContent = state.banners.length;
  elements.categoriesCount.textContent = state.counts.categories;
  elements.productsWithoutImage.textContent = productsWithoutImage;
  elements.productsWithoutCategory.textContent = productsWithoutCategory;
  elements.bannersWithoutImage.textContent = bannersWithoutImage;
  elements.bannersWithoutLink.textContent = bannersWithoutLink;

  elements.deleteOrphansBtn.disabled = orphanCount === 0;
}

function renderHealth() {
  const totalStorageBytes = state.objects.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0);
  const orphanCount = state.objects.filter((item) => !item.inUse).length;
  const productsWithoutImage = state.products.filter((item) => !Array.isArray(item.images) || !item.images.length).length;
  const productsWithoutCategory = state.products.filter((item) => !(item.category_slug || item.category)).length;
  const bannersWithoutImage = state.banners.filter((item) => !String(item.image_url || "").trim()).length;
  const bannersWithoutLink = state.banners.filter((item) => !String(item.target_url || "").trim()).length;

  const checks = [
    {
      type: orphanCount > 0 ? "warn" : "ok",
      text: orphanCount > 0
        ? `Hay ${orphanCount} imagen(es) huérfana(s) ocupando espacio en storage.`
        : "No se detectaron imágenes huérfanas."
    },
    {
      type: productsWithoutImage > 0 ? "warn" : "ok",
      text: productsWithoutImage > 0
        ? `Hay ${productsWithoutImage} producto(s) sin imagen.`
        : "Todos los productos tienen al menos una imagen."
    },
    {
      type: productsWithoutCategory > 0 ? "warn" : "ok",
      text: productsWithoutCategory > 0
        ? `Hay ${productsWithoutCategory} producto(s) sin categoría asignada.`
        : "Todos los productos tienen categoría o categoría_slug cargada."
    },
    {
      type: bannersWithoutImage > 0 ? "warn" : "ok",
      text: bannersWithoutImage > 0
        ? `Hay ${bannersWithoutImage} banner(s) sin imagen.`
        : "Todos los banners tienen imagen cargada."
    },
    {
      type: bannersWithoutLink > 0 ? "warn" : "ok",
      text: bannersWithoutLink > 0
        ? `Hay ${bannersWithoutLink} banner(s) sin link de destino.`
        : "Todos los banners tienen link de destino."
    },
    {
      type: "info",
      text: `El bucket ${STORAGE_BUCKET} está usando ${formatBytes(totalStorageBytes)} detectados desde BSD.`
    }
  ];

  elements.healthList.innerHTML = checks
    .map((item) => {
      const icon =
        item.type === "ok"
          ? "ph-check-circle"
          : item.type === "warn"
            ? "ph-warning-circle"
            : "ph-info";

      const badgeClass =
        item.type === "ok"
          ? "admin-badge--done"
          : item.type === "warn"
            ? "admin-badge--cancelled"
            : "admin-badge--pending";

      return `
        <article class="bsd-health-item">
          <div class="bsd-health-item__icon">
            <i class="${icon}"></i>
          </div>
          <div class="bsd-health-item__content">
            <span class="admin-badge ${badgeClass}">
              ${item.type === "ok" ? "OK" : item.type === "warn" ? "Atención" : "Dato"}
            </span>
            <p>${escapeHtml(item.text)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTable(list) {
  if (!list.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">No encontramos archivos con ese filtro.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = list
    .map((object) => {
      const usageDetail = object.inUse
        ? `
          <div class="bsd-usage-list">
            ${object.usageSources
              .slice(0, 2)
              .map((item) => `<span>${escapeHtml(item)}</span>`)
              .join("")}
            ${
              object.usageSources.length > 2
                ? `<span>+${object.usageSources.length - 2} más</span>`
                : ""
            }
          </div>
        `
        : '<span class="bsd-muted">Sin referencias en productos ni banners</span>';

      return `
        <tr>
          <td>
            <div class="bsd-thumb">
              <img src="${escapeHtml(object.publicUrl)}" alt="${escapeHtml(object.name)}" />
            </div>
          </td>

          <td>
            <div class="admin-product-cell">
              <strong>${escapeHtml(object.name)}</strong>
              <span class="bsd-code">${escapeHtml(object.path)}</span>
              <span>Carpeta: ${escapeHtml(object.folder)}</span>
            </div>
          </td>

          <td>${formatBytes(object.sizeBytes)}</td>

          <td>
            <div class="bsd-usage-cell">
              ${renderUsageBadge(object)}
              ${usageDetail}
            </div>
          </td>

          <td>${formatDate(object.updatedAt)}</td>

          <td>
            <div class="admin-inline-actions">
              <a class="admin-inline-btn" href="${escapeHtml(object.publicUrl)}" target="_blank" rel="noreferrer">
                <i class="ph-arrow-square-out"></i> Ver
              </a>

              <button class="admin-inline-btn" type="button" data-action="copy-url" data-path="${escapeHtml(object.path)}">
                <i class="ph-copy"></i> Copiar URL
              </button>

              <button class="admin-inline-btn admin-inline-btn--danger" type="button" data-action="delete-file" data-path="${escapeHtml(object.path)}">
                <i class="ph-trash"></i> Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function applyFilters() {
  const term = String(elements.search.value || "").trim().toLowerCase();
  const usage = String(elements.usageFilter.value || "all");
  const folder = String(elements.folderFilter.value || "all");

  state.filteredObjects = state.objects.filter((object) => {
    const haystack = [
      object.name,
      object.path,
      object.folder,
      ...object.usageSources
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesText = haystack.includes(term);
    const matchesUsage =
      usage === "all"
        ? true
        : usage === "used"
          ? object.inUse
          : !object.inUse;

    const matchesFolder =
      folder === "all"
        ? true
        : getFolderFilterValue(object.path) === folder;

    return matchesText && matchesUsage && matchesFolder;
  });

  renderTable(state.filteredObjects);
}

function clearFilters() {
  elements.search.value = "";
  elements.usageFilter.value = "all";
  elements.folderFilter.value = "all";
  applyFilters();
}

async function deleteStorageFiles(paths) {
  const client = getSupabaseClient();
  const chunkSize = 100;

  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await client.storage.from(STORAGE_BUCKET).remove(chunk);
    if (error) throw error;
  }
}

async function copyObjectUrl(path) {
  const object = state.objects.find((item) => item.path === path);
  if (!object) return;

  try {
    await navigator.clipboard.writeText(object.publicUrl);
    showStatus("URL copiada al portapapeles.");
  } catch {
    showStatus("No pudimos copiar la URL automáticamente.", "error");
  }
}

async function deleteSingleObject(path) {
  const object = state.objects.find((item) => item.path === path);
  if (!object) return;

  openConfirm({
    title: "Eliminar archivo definitivamente",
    message: object.inUse
      ? `Este archivo está en uso por ${object.usageSources.length} referencia(s). Si lo borrás, vas a romper esa imagen en la tienda o en el admin.`
      : `Se va a eliminar definitivamente ${object.name} del bucket ${STORAGE_BUCKET}.`,
    onConfirm: async () => {
      try {
        clearStatus();
        await deleteStorageFiles([path]);
        showStatus("Archivo eliminado definitivamente.");
        await loadBSD();
      } catch (error) {
        showStatus(error.message || "No pudimos borrar el archivo.", "error");
      }
    }
  });
}

async function deleteOrphanImages() {
  const orphanPaths = state.objects.filter((item) => !item.inUse).map((item) => item.path);

  if (!orphanPaths.length) {
    showStatus("No hay imágenes huérfanas para eliminar.");
    return;
  }

  openConfirm({
    title: "Eliminar imágenes huérfanas",
    message: `Se van a eliminar ${orphanPaths.length} archivo(s) huérfano(s) del bucket ${STORAGE_BUCKET}. Esta acción es definitiva.`,
    onConfirm: async () => {
      try {
        clearStatus();
        await deleteStorageFiles(orphanPaths);
        showStatus("Imágenes huérfanas eliminadas correctamente.");
        await loadBSD();
      } catch (error) {
        showStatus(error.message || "No pudimos borrar las huérfanas.", "error");
      }
    }
  });
}

async function fetchDatabaseData() {
  const client = getSupabaseClient();

  const [
    productsResponse,
    bannersResponse,
    categoriesCount,
    ordersCount
  ] = await Promise.all([
    client.from("products").select("id, name, slug, images, category, category_slug"),
    client.from("banners").select("id, title, image_url, target_url"),
    safeCount(client.from("categories").select("id", { count: "exact", head: true })),
    safeCount(client.from("orders").select("id", { count: "exact", head: true }))
  ]);

  if (productsResponse.error) throw productsResponse.error;

  state.products = Array.isArray(productsResponse.data) ? productsResponse.data : [];
  state.banners = bannersResponse.error || !Array.isArray(bannersResponse.data) ? [] : bannersResponse.data;
  state.counts.categories = categoriesCount;
  state.counts.orders = ordersCount;
}

async function fetchStorageData() {
  const client = getSupabaseClient();
  const files = await listFolderRecursive(client, "");
  state.objects = buildManagedObjects(files, client)
    .sort((a, b) => {
      if (a.inUse !== b.inUse) return a.inUse ? -1 : 1;
      return String(a.path).localeCompare(String(b.path), "es");
    });
}

async function loadBSD() {
  const refreshText = elements.refreshBtn.innerHTML;
  elements.refreshBtn.disabled = true;
  elements.refreshBtn.innerHTML = '<i class="ph-arrows-clockwise"></i> Refrescando...';

  try {
    clearStatus();
    await fetchDatabaseData();
    await fetchStorageData();
    renderOverview();
    renderHealth();
    applyFilters();
  } catch (error) {
    console.error(error);
    showStatus(error.message || "No pudimos cargar BSD.", "error");
  } finally {
    elements.refreshBtn.disabled = false;
    elements.refreshBtn.innerHTML = refreshText;
  }
}

function attachTableEvents() {
  elements.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action, path } = button.dataset;

    if (action === "copy-url") {
      copyObjectUrl(path);
    }

    if (action === "delete-file") {
      deleteSingleObject(path);
    }
  });
}

function bindEvents() {
  elements.logoutBtn?.addEventListener("click", async () => {
    await signOutAdmin();
    window.location.href = "login.html";
  });

  elements.refreshBtn?.addEventListener("click", loadBSD);
  elements.deleteOrphansBtn?.addEventListener("click", deleteOrphanImages);

  elements.search?.addEventListener("input", applyFilters);
  elements.usageFilter?.addEventListener("change", applyFilters);
  elements.folderFilter?.addEventListener("change", applyFilters);
  elements.clearFiltersBtn?.addEventListener("click", clearFilters);

  elements.confirmAcceptBtn?.addEventListener("click", acceptConfirm);
  elements.confirmCancelBtn?.addEventListener("click", closeConfirm);
  document.querySelectorAll("[data-bsd-confirm-close]").forEach((node) => {
    node.addEventListener("click", closeConfirm);
  });

  attachTableEvents();
}

async function bootstrap() {
  if (!isSupabaseConfigured()) {
    showStatus("Falta configurar Supabase antes de usar BSD.", "error");
    return;
  }

  const access = await requireAdminAccess({ redirectTo: "login.html" });
  if (!access.ok) return;

  const { user, profile } = access;
  elements.adminName.textContent = profile.full_name || "Administrador";
  elements.adminEmail.textContent = user.email || "—";

  bindEvents();
  await loadBSD();
}

bootstrap();