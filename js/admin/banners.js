import "./ui.js";
import { signOutAdmin, requireAdminAccess, getSupabaseClient } from "./auth.js";
import { isSupabaseConfigured } from "./supabase-config.js";

const STORAGE_BUCKET = "site-assets";
const BANNERS_SECTION_KEY = "banners";

const elements = {
  adminName: document.getElementById("adminName"),
  adminEmail: document.getElementById("adminEmail"),
  logoutBtn: document.getElementById("logoutBtn"),

  status: document.getElementById("bannersStatus"),

  statBannerCount: document.getElementById("statBannerCount"),
  statBannerActive: document.getElementById("statBannerActive"),
  statBannerLinked: document.getElementById("statBannerLinked"),
  statBannerNewTab: document.getElementById("statBannerNewTab"),

  sectionEnabled: document.getElementById("bannersSectionEnabled"),
  saveSectionBtn: document.getElementById("saveBannersSectionBtn"),

  form: document.getElementById("bannerForm"),
  formTitle: document.getElementById("bannerFormTitle"),
  saveBtn: document.getElementById("saveBannerBtn"),
  resetBtn: document.getElementById("resetBannerFormBtn"),

  bannerId: document.getElementById("bannerId"),
  bannerTitle: document.getElementById("bannerTitle"),
  bannerSortOrder: document.getElementById("bannerSortOrder"),
  bannerImageUrl: document.getElementById("bannerImageUrl"),
  bannerTargetUrl: document.getElementById("bannerTargetUrl"),
  bannerFile: document.getElementById("bannerFile"),
  bannerLivePreview: document.getElementById("bannerLivePreview"),
  bannerIsActive: document.getElementById("bannerIsActive"),
  bannerOpenInNewTab: document.getElementById("bannerOpenInNewTab"),

  search: document.getElementById("bannerSearch"),
  tableBody: document.getElementById("bannersTableBody"),
  previewGrid: document.getElementById("bannersPreviewGrid")
};

let state = {
  banners: [],
  filteredBanners: [],
  editingId: null,
  livePreviewUrl: "",
  sectionEnabled: true
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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setLivePreview(url = "", title = "Preview banner") {
  state.livePreviewUrl = url;

  if (!elements.bannerLivePreview) return;

  if (!url) {
    elements.bannerLivePreview.innerHTML = `
      <span style="font-size:13px; color:#7f6d63;">Todavía no hay imagen seleccionada</span>
    `;
    return;
  }

  elements.bannerLivePreview.innerHTML = `
    <div style="width:100%; aspect-ratio:16/7; background:#f4ece4; border-radius:12px; overflow:hidden;">
      <img
        src="${escapeHtml(url)}"
        alt="${escapeHtml(title)}"
        style="width:100%; height:100%; object-fit:cover; display:block;"
      />
    </div>
  `;
}

function renderStats() {
  const total = state.banners.length;
  const active = state.banners.filter((item) => item.is_active).length;
  const linked = state.banners.filter((item) => String(item.target_url || "").trim()).length;
  const newTab = state.banners.filter((item) => item.open_in_new_tab).length;

  elements.statBannerCount.textContent = total;
  elements.statBannerActive.textContent = active;
  elements.statBannerLinked.textContent = linked;
  elements.statBannerNewTab.textContent = newTab;
}

function renderStateBadges(banner) {
  const badges = [];

  badges.push(
    banner.is_active
      ? '<span class="admin-badge admin-badge--done">Activo</span>'
      : '<span class="admin-badge admin-badge--cancelled">Inactivo</span>'
  );

  if (String(banner.target_url || "").trim()) {
    badges.push('<span class="admin-badge admin-badge--paid">Con link</span>');
  }

  if (banner.open_in_new_tab) {
    badges.push('<span class="admin-badge admin-badge--pending">Nueva pestaña</span>');
  }

  return badges.join("");
}

function renderTable(list) {
  renderStats();

  if (!list.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="4">No encontramos banners con ese filtro.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = list
    .map((banner) => {
      const imageUrl = String(banner.image_url || "").trim();
      const targetUrl = String(banner.target_url || "").trim();

      return `
        <tr>
          <td>
            <div class="admin-product-cell">
              <strong>${escapeHtml(banner.title)}</strong>
              <span>${imageUrl ? escapeHtml(imageUrl) : "Sin imagen"}</span>
              <span>${targetUrl ? escapeHtml(targetUrl) : "Sin link de destino"}</span>
            </div>
          </td>
          <td>${Number(banner.sort_order || 1)}</td>
          <td><div class="admin-badge-group">${renderStateBadges(banner)}</div></td>
          <td>
            <div class="admin-inline-actions">
              <button class="admin-inline-btn" type="button" data-action="edit" data-id="${banner.id}">
                <i class="ph-pencil-simple"></i> Editar
              </button>
              <button class="admin-inline-btn admin-inline-btn--danger" type="button" data-action="delete" data-id="${banner.id}">
                <i class="ph-trash"></i> Borrar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPreview() {
  if (!elements.previewGrid) return;

  if (!state.filteredBanners.length) {
    elements.previewGrid.innerHTML = "<p>No hay banners para mostrar en el preview.</p>";
    return;
  }

  const sorted = [...state.filteredBanners].sort(
    (a, b) => Number(a.sort_order || 1) - Number(b.sort_order || 1)
  );

  elements.previewGrid.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:18px 28px;">
      ${sorted
        .map((banner) => {
          const targetUrl = String(banner.target_url || "").trim();
          const safeTarget = targetUrl ? escapeHtml(targetUrl) : "";
          const safeTitle = escapeHtml(banner.title);
          const safeImage = escapeHtml(banner.image_url);

          return `
            <article style="display:flex; align-items:center; justify-content:center; min-width:120px; max-width:220px; padding:6px 4px; background:transparent;">
              <div style="width:100%; height:56px; display:flex; align-items:center; justify-content:center;">
                <img
                  src="${safeImage}"
                  alt="${safeTitle}"
                  style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; display:block;"
                  onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=&quot;font-size:12px;color:#8b7768;text-align:center;&quot;>Imagen no disponible</div>';"
                />
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function applyFilter() {
  const term = String(elements.search.value || "").trim().toLowerCase();

  state.filteredBanners = state.banners.filter((banner) => {
    const haystack = [
      banner.title,
      banner.image_url,
      banner.target_url,
      banner.is_active ? "activo" : "inactivo",
      banner.open_in_new_tab ? "nueva pestaña" : "misma pestaña",
      banner.sort_order
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  renderTable(state.filteredBanners);
  renderPreview();
}

async function fetchBanners() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  state.banners = Array.isArray(data) ? data : [];
  applyFilter();
}

async function fetchSectionConfig() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("site_sections")
    .select("*")
    .eq("section_key", BANNERS_SECTION_KEY)
    .maybeSingle();

  if (error) throw error;

  state.sectionEnabled = data ? Boolean(data.is_enabled) : true;
  elements.sectionEnabled.checked = state.sectionEnabled;
}

async function saveSectionConfig() {
  clearStatus();
  elements.saveSectionBtn.disabled = true;

  try {
    const client = getSupabaseClient();
    const payload = {
      section_key: BANNERS_SECTION_KEY,
      is_enabled: elements.sectionEnabled.checked
    };

    const { error } = await client
      .from("site_sections")
      .upsert(payload, { onConflict: "section_key" });

    if (error) throw error;

    state.sectionEnabled = elements.sectionEnabled.checked;
    showStatus("Configuración global de banners guardada.");
  } catch (error) {
    showStatus(error.message || "No pudimos guardar la visibilidad de la sección.", "error");
  } finally {
    elements.saveSectionBtn.disabled = false;
  }
}

function resetForm() {
  state.editingId = null;
  elements.form.reset();
  elements.bannerId.value = "";
  elements.bannerSortOrder.value = "1";
  elements.bannerIsActive.checked = true;
  elements.bannerOpenInNewTab.checked = false;
  elements.formTitle.textContent = "Nuevo banner";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar banner';
  setLivePreview("");
}

function fillForm(banner) {
  state.editingId = banner.id;
  elements.bannerId.value = banner.id;
  elements.bannerTitle.value = banner.title || "";
  elements.bannerSortOrder.value = String(Number(banner.sort_order || 1));
  elements.bannerImageUrl.value = banner.image_url || "";
  elements.bannerTargetUrl.value = banner.target_url || "";
  elements.bannerIsActive.checked = Boolean(banner.is_active);
  elements.bannerOpenInNewTab.checked = Boolean(banner.open_in_new_tab);
  setLivePreview(banner.image_url || "", banner.title || "Banner");

  elements.formTitle.textContent = "Editar banner";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar cambios';
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function uploadBannerFile(file) {
  const client = getSupabaseClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const fileName = `${Date.now()}-${slugify(file.name.replace(/\.[^/.]+$/, ""))}.${extension}`;
  const filePath = `banners/${fileName}`;

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || "";
}

function buildPayloadFromForm(imageUrl) {
  return {
    title: elements.bannerTitle.value.trim(),
    image_url: imageUrl,
    target_url: elements.bannerTargetUrl.value.trim() || null,
    sort_order: Number(elements.bannerSortOrder.value || 1),
    is_active: elements.bannerIsActive.checked,
    open_in_new_tab: elements.bannerOpenInNewTab.checked
  };
}

async function saveBanner(event) {
  event.preventDefault();
  clearStatus();

  let imageUrl = elements.bannerImageUrl.value.trim();
  const file = elements.bannerFile.files?.[0];

  if (!elements.bannerTitle.value.trim()) {
    showStatus("El título es obligatorio.", "error");
    return;
  }

  elements.saveBtn.disabled = true;

  try {
    if (file) {
      imageUrl = await uploadBannerFile(file);
      elements.bannerImageUrl.value = imageUrl;
    }

    if (!imageUrl) {
      showStatus("Necesitás una imagen URL o subir un archivo.", "error");
      elements.saveBtn.disabled = false;
      return;
    }

    const payload = buildPayloadFromForm(imageUrl);
    const client = getSupabaseClient();

    if (state.editingId) {
      const { error } = await client
        .from("banners")
        .update(payload)
        .eq("id", state.editingId);

      if (error) throw error;
      showStatus("Banner actualizado correctamente.");
    } else {
      const { error } = await client
        .from("banners")
        .insert(payload);

      if (error) throw error;
      showStatus("Banner creado correctamente.");
    }

    resetForm();
    await fetchBanners();
  } catch (error) {
    showStatus(error.message || "No pudimos guardar el banner.", "error");
  } finally {
    elements.saveBtn.disabled = false;
  }
}

async function deleteBanner(id) {
  const banner = state.banners.find((item) => item.id === id);
  if (!banner) return;

  const confirmed = window.confirm(`¿Seguro que querés borrar el banner "${banner.title}"?`);
  if (!confirmed) return;

  clearStatus();
  const client = getSupabaseClient();

  try {
    const { error } = await client
      .from("banners")
      .delete()
      .eq("id", id);

    if (error) throw error;

    if (state.editingId === id) {
      resetForm();
    }

    showStatus("Banner eliminado correctamente.");
    await fetchBanners();
  } catch (error) {
    showStatus(error.message || "No pudimos borrar el banner.", "error");
  }
}

function attachTableEvents() {
  elements.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;
    const banner = state.banners.find((item) => item.id === id);
    if (!banner) return;

    if (action === "edit") {
      fillForm(banner);
    }

    if (action === "delete") {
      deleteBanner(id);
    }
  });
}

function bindEvents() {
  elements.logoutBtn?.addEventListener("click", async () => {
    await signOutAdmin();
    window.location.href = "login.html";
  });

  elements.saveSectionBtn?.addEventListener("click", saveSectionConfig);

  elements.search?.addEventListener("input", applyFilter);

  elements.resetBtn?.addEventListener("click", () => {
    clearStatus();
    resetForm();
  });

  elements.bannerImageUrl?.addEventListener("input", () => {
    const url = elements.bannerImageUrl.value.trim();
    if (url) setLivePreview(url, elements.bannerTitle.value || "Banner");
  });

  elements.bannerFile?.addEventListener("change", () => {
    const file = elements.bannerFile.files?.[0];
    if (!file) {
      setLivePreview(elements.bannerImageUrl.value.trim(), elements.bannerTitle.value || "Banner");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLivePreview(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  });

  elements.form?.addEventListener("submit", saveBanner);

  attachTableEvents();
}

async function bootstrap() {
  if (!isSupabaseConfigured()) {
    showStatus("Falta configurar Supabase antes de usar esta pantalla.", "error");
    return;
  }

  const access = await requireAdminAccess({ redirectTo: "login.html" });
  if (!access.ok) return;

  const { user, profile } = access;
  elements.adminName.textContent = profile.full_name || "Administrador";
  elements.adminEmail.textContent = user.email || "—";

  bindEvents();
  resetForm();

  try {
    await fetchSectionConfig();
    await fetchBanners();
  } catch (error) {
    showStatus(error.message || "No pudimos cargar la configuración de banners.", "error");
  }
}

bootstrap();