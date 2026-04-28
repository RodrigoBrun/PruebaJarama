import "./ui.js";
import { signOutAdmin, requireAdminAccess, getSupabaseClient } from "./auth.js";
import { isSupabaseConfigured } from "./supabase-config.js";

const elements = {
  adminName: document.getElementById("adminName"),
  adminEmail: document.getElementById("adminEmail"),
  logoutBtn: document.getElementById("logoutBtn"),

  status: document.getElementById("categoriesStatus"),

  statRootCategories: document.getElementById("statRootCategories"),
  statChildCategories: document.getElementById("statChildCategories"),
  statVisibleInNav: document.getElementById("statVisibleInNav"),
  statActiveCategories: document.getElementById("statActiveCategories"),

  form: document.getElementById("categoryForm"),
  formTitle: document.getElementById("categoryFormTitle"),
  saveBtn: document.getElementById("saveCategoryBtn"),
  resetBtn: document.getElementById("resetCategoryFormBtn"),

  categoryId: document.getElementById("categoryId"),
  categoryName: document.getElementById("categoryName"),
  categorySlug: document.getElementById("categorySlug"),
  categoryLevel: document.getElementById("categoryLevel"),
  categoryParent: document.getElementById("categoryParent"),
  categoryIconKey: document.getElementById("categoryIconKey"),
  categoryDescription: document.getElementById("categoryDescription"),
  categoryPositionWrap: document.getElementById("categoryPositionWrap"),
  categoryPositionSelect: document.getElementById("categoryPositionSelect"),
  categoryIsActive: document.getElementById("categoryIsActive"),
  categoryShowInNav: document.getElementById("categoryShowInNav"),
  categoryShowInHome: document.getElementById("categoryShowInHome"),

  search: document.getElementById("categorySearch"),
  tableBody: document.getElementById("categoriesTableBody"),
  treePreview: document.getElementById("categoriesTreePreview")
};

let state = {
  categories: [],
  filteredCategories: [],
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

function renderIconPreview(iconKey) {
  if (iconKey === "svg-religioso") {
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

  return `<i class="${escapeHtml(iconKey || "ph-squares-four")}"></i>`;
}

function renderStateBadges(category) {
  const badges = [];

  badges.push(
    category.is_active
      ? '<span class="admin-badge admin-badge--done">Activa</span>'
      : '<span class="admin-badge admin-badge--cancelled">Inactiva</span>'
  );

  if (category.show_in_nav) {
    badges.push('<span class="admin-badge admin-badge--pending">Nav</span>');
  }

  if (category.show_in_home) {
    badges.push('<span class="admin-badge admin-badge--paid">Home</span>');
  }

  if (!category.parent_id) {
    badges.push('<span class="admin-badge admin-badge--dark">Principal</span>');
  } else {
    badges.push('<span class="admin-badge admin-badge--pending">Subcategoría</span>');
  }

  return badges.join("");
}

function getRootCategories(list = state.categories) {
  return [...list]
    .filter((item) => !item.parent_id)
    .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100) || String(a.name).localeCompare(String(b.name), "es"));
}

function getChildrenOf(parentId, list = state.categories) {
  return [...list]
    .filter((item) => item.parent_id === parentId)
    .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100) || String(a.name).localeCompare(String(b.name), "es"));
}

function getSiblingGroupByParent(parentId, excludeId = null) {
  return [...state.categories]
    .filter((item) => item.parent_id === parentId)
    .filter((item) => item.id !== excludeId)
    .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100) || String(a.name).localeCompare(String(b.name), "es"));
}

function getDisplayPosition(category) {
  const siblings = getSiblingGroupByParent(category.parent_id);
  const index = siblings.findIndex((item) => item.id === category.id);
  return index >= 0 ? index + 1 : "—";
}

function getNextSortOrder(parentId = null) {
  const siblings = getSiblingGroupByParent(parentId);
  if (!siblings.length) return 10;

  const maxSort = Math.max(...siblings.map((item) => Number(item.sort_order || 0)));
  return maxSort + 10;
}

function renderStats() {
  const roots = state.categories.filter((item) => !item.parent_id);
  const children = state.categories.filter((item) => item.parent_id);
  const visibleInNav = state.categories.filter((item) => item.show_in_nav).length;
  const active = state.categories.filter((item) => item.is_active).length;

  elements.statRootCategories.textContent = roots.length;
  elements.statChildCategories.textContent = children.length;
  elements.statVisibleInNav.textContent = visibleInNav;
  elements.statActiveCategories.textContent = active;
}

function fillParentOptions() {
  const roots = getRootCategories();
  const currentEditingId = state.editingId;

  elements.categoryParent.innerHTML = `
    <option value="">Sin padre</option>
    ${roots
      .filter((item) => item.id !== currentEditingId)
      .map(
        (item) =>
          `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.slug)}</option>`
      )
      .join("")}
  `;
}

function syncLevelUI() {
  const isChild = elements.categoryLevel.value === "child";
  elements.categoryParent.disabled = !isChild;

  if (!isChild) {
    elements.categoryParent.value = "";
  }
}

function syncPositionOptions() {
  if (!state.editingId) {
    elements.categoryPositionWrap.hidden = true;
    elements.categoryPositionSelect.innerHTML = "";
    return;
  }

  const currentCategory = state.categories.find((item) => item.id === state.editingId);
  if (!currentCategory) {
    elements.categoryPositionWrap.hidden = true;
    return;
  }

  const targetParentId = elements.categoryLevel.value === "child"
    ? elements.categoryParent.value || null
    : null;

  const movedGroup = currentCategory.parent_id !== targetParentId;
  const siblings = movedGroup
    ? getSiblingGroupByParent(targetParentId, currentCategory.id)
    : getSiblingGroupByParent(targetParentId);

  const totalPositions = movedGroup ? siblings.length + 1 : siblings.length;
  const currentPosition = movedGroup
    ? Math.min(totalPositions, Number(elements.categoryPositionSelect.value || totalPositions))
    : (siblings.findIndex((item) => item.id === currentCategory.id) + 1 || 1);

  elements.categoryPositionSelect.innerHTML = Array.from({ length: Math.max(totalPositions, 1) }, (_, index) => {
    const position = index + 1;
    return `<option value="${position}" ${position === currentPosition ? "selected" : ""}>${position}</option>`;
  }).join("");

  elements.categoryPositionWrap.hidden = false;
}

function renderTable(list) {
  renderStats();

  if (!list.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="5">No encontramos categorías con ese filtro.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = list
    .map((category) => {
      const parent = category.parent_id
        ? state.categories.find((item) => item.id === category.parent_id)
        : null;

      return `
        <tr>
          <td>
            <div class="admin-product-cell">
              <strong>${escapeHtml(category.name)}</strong>
              <span>${escapeHtml(category.slug)}</span>
              <span>${parent ? `Sub de: ${escapeHtml(parent.name)}` : "Categoría principal"}</span>
              ${category.description ? `<span>${escapeHtml(category.description)}</span>` : ""}
            </div>
          </td>
          <td>
            <div class="admin-inline-btn" style="width:max-content;">
              ${renderIconPreview(category.icon_key)}
              <span>${escapeHtml(category.icon_key || "—")}</span>
            </div>
          </td>
          <td>
            <div class="admin-product-cell">
              <strong>${getDisplayPosition(category)}° lugar</strong>
              <span>${category.parent_id ? "Dentro de su categoría" : "Dentro del menú principal"}</span>
            </div>
          </td>
          <td><div class="admin-badge-group">${renderStateBadges(category)}</div></td>
          <td>
            <div class="admin-inline-actions">
              <button class="admin-inline-btn" type="button" data-action="edit" data-id="${category.id}">
                <i class="ph-pencil-simple"></i> Editar
              </button>

              <button class="admin-inline-btn admin-inline-btn--danger" type="button" data-action="delete" data-id="${category.id}">
                <i class="ph-trash"></i> Borrar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderTreePreview() {
  const roots = getRootCategories();

  if (!roots.length) {
    elements.treePreview.innerHTML = "<p>Todavía no hay categorías cargadas.</p>";
    return;
  }

  elements.treePreview.innerHTML = `
    <div style="display:grid; gap:16px;">
      ${roots
        .map((root) => {
          const children = getChildrenOf(root.id);
          return `
            <article style="padding:18px; border:1px solid var(--color-border-soft); border-radius:18px; background:#faf6f2;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:${children.length ? "14px" : "0"};">
                ${renderIconPreview(root.icon_key)}
                <strong style="color:var(--color-text-strong);">${escapeHtml(root.name)}</strong>
                <span class="admin-badge admin-badge--dark">${escapeHtml(root.slug)}</span>
              </div>

              ${
                children.length
                  ? `
                    <div style="display:grid; gap:10px; padding-left:10px;">
                      ${children
                        .map(
                          (child) => `
                            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                              <span style="opacity:.5;">↳</span>
                              <span>${escapeHtml(child.name)}</span>
                              <span class="admin-badge admin-badge--pending">${escapeHtml(child.slug)}</span>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  `
                  : `<p style="margin:0; font-size:14px; color:#7f6d63;">Sin subcategorías todavía.</p>`
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function applyFilter() {
  const term = String(elements.search.value || "").trim().toLowerCase();

  state.filteredCategories = state.categories.filter((category) => {
    const parent = category.parent_id
      ? state.categories.find((item) => item.id === category.parent_id)
      : null;

    const haystack = [
      category.name,
      category.slug,
      category.icon_key,
      category.description,
      parent?.name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  renderTable(state.filteredCategories);
  renderTreePreview();
}

async function fetchCategories() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  state.categories = Array.isArray(data) ? data : [];
  fillParentOptions();
  applyFilter();
}

function resetForm() {
  state.editingId = null;
  elements.form.reset();
  elements.categoryId.value = "";
  elements.categoryIsActive.checked = true;
  elements.categoryShowInNav.checked = true;
  elements.categoryShowInHome.checked = true;
  elements.categoryLevel.value = "root";
  elements.categoryIconKey.value = "ph-door";
  elements.formTitle.textContent = "Nueva categoría";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar categoría';
  syncLevelUI();
  fillParentOptions();
  syncPositionOptions();
}

function fillForm(category) {
  state.editingId = category.id;
  elements.categoryId.value = category.id;
  elements.categoryName.value = category.name || "";
  elements.categorySlug.value = category.slug || "";
  elements.categoryIconKey.value = category.icon_key || "ph-squares-four";
  elements.categoryDescription.value = category.description || "";
  elements.categoryIsActive.checked = Boolean(category.is_active);
  elements.categoryShowInNav.checked = Boolean(category.show_in_nav);
  elements.categoryShowInHome.checked = Boolean(category.show_in_home);

  const isChild = Boolean(category.parent_id);
  elements.categoryLevel.value = isChild ? "child" : "root";
  syncLevelUI();
  fillParentOptions();

  if (isChild) {
    elements.categoryParent.value = category.parent_id;
  }

  syncPositionOptions();

  elements.formTitle.textContent = isChild ? "Editar subcategoría" : "Editar categoría";
  elements.saveBtn.innerHTML = '<i class="ph-floppy-disk"></i> Guardar cambios';
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function updateSortOrderSequence(categoryIds) {
  const client = getSupabaseClient();

  for (let index = 0; index < categoryIds.length; index++) {
    const id = categoryIds[index];
    const sortOrder = (index + 1) * 10;

    const { error } = await client
      .from("categories")
      .update({ sort_order: sortOrder })
      .eq("id", id);

    if (error) throw error;
  }
}

function buildPayloadFromForm() {
  const name = elements.categoryName.value.trim();
  const slug = elements.categorySlug.value.trim() || slugify(name);
  const isChild = elements.categoryLevel.value === "child";
  const parentId = isChild ? elements.categoryParent.value || null : null;

  return {
    name,
    slug,
    parent_id: parentId,
    icon_key: elements.categoryIconKey.value || "ph-squares-four",
    is_active: elements.categoryIsActive.checked,
    show_in_nav: elements.categoryShowInNav.checked,
    show_in_home: elements.categoryShowInHome.checked,
    description: elements.categoryDescription.value.trim() || null
  };
}

async function saveCategory(event) {
  event.preventDefault();
  clearStatus();

  const payload = buildPayloadFromForm();

  if (!payload.name || !payload.slug) {
    showStatus("Nombre y slug son obligatorios.", "error");
    return;
  }

  if (elements.categoryLevel.value === "child" && !payload.parent_id) {
    showStatus("Si elegís subcategoría, tenés que seleccionar una categoría padre.", "error");
    return;
  }

  if (payload.parent_id && payload.parent_id === state.editingId) {
    showStatus("Una categoría no puede ser padre de sí misma.", "error");
    return;
  }

  elements.saveBtn.disabled = true;
  const client = getSupabaseClient();

  try {
    if (state.editingId) {
      const currentCategory = state.categories.find((item) => item.id === state.editingId);
      const targetParentId = payload.parent_id;
      const desiredPosition = Number(elements.categoryPositionSelect.value || 1);

      const oldParentId = currentCategory?.parent_id ?? null;
      const movedGroup = oldParentId !== targetParentId;

      const { error: updateError } = await client
        .from("categories")
        .update(payload)
        .eq("id", state.editingId);

      if (updateError) throw updateError;

      if (!currentCategory) {
        throw new Error("No encontramos la categoría actual para reorganizar.");
      }

      if (movedGroup) {
        const oldGroupIds = getSiblingGroupByParent(oldParentId)
          .filter((item) => item.id !== state.editingId)
          .map((item) => item.id);

        const newGroup = getSiblingGroupByParent(targetParentId, state.editingId);
        const insertionIndex = Math.max(0, Math.min(desiredPosition - 1, newGroup.length));
        const newGroupIds = newGroup.map((item) => item.id);

        newGroupIds.splice(insertionIndex, 0, state.editingId);

        await updateSortOrderSequence(oldGroupIds);
        await updateSortOrderSequence(newGroupIds);
      } else {
        const siblings = getSiblingGroupByParent(targetParentId);
        const currentIndex = siblings.findIndex((item) => item.id === state.editingId);
        const targetIndex = Math.max(0, Math.min(desiredPosition - 1, siblings.length - 1));

        if (currentIndex !== targetIndex) {
          const currentSibling = siblings[currentIndex];
          const targetSibling = siblings[targetIndex];

          const { error: firstSwapError } = await client
            .from("categories")
            .update({ sort_order: targetSibling.sort_order })
            .eq("id", currentSibling.id);

          if (firstSwapError) throw firstSwapError;

          const { error: secondSwapError } = await client
            .from("categories")
            .update({ sort_order: currentSibling.sort_order })
            .eq("id", targetSibling.id);

          if (secondSwapError) throw secondSwapError;
        }
      }

      showStatus("Categoría actualizada correctamente.");
    } else {
      const sortOrder = getNextSortOrder(payload.parent_id);

      const { error } = await client
        .from("categories")
        .insert({ ...payload, sort_order: sortOrder });

      if (error) throw error;
      showStatus("Categoría creada correctamente. Quedó agregada al final de su sección.");
    }

    resetForm();
    await fetchCategories();
  } catch (error) {
    showStatus(error.message || "No pudimos guardar la categoría.", "error");
  } finally {
    elements.saveBtn.disabled = false;
  }
}

async function deleteCategory(id) {
  const category = state.categories.find((item) => item.id === id);
  if (!category) return;

  const children = state.categories.filter((item) => item.parent_id === id);
  const extraWarning = children.length
    ? `\n\nEsta categoría tiene ${children.length} subcategoría(s) y se borrarán en cascada.`
    : "";

  const confirmed = window.confirm(
    `¿Seguro que querés borrar "${category.name}"?${extraWarning}`
  );

  if (!confirmed) return;

  clearStatus();
  const client = getSupabaseClient();

  try {
    const { error } = await client
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    if (state.editingId === id) {
      resetForm();
    }

    showStatus("Categoría eliminada correctamente.");
    await fetchCategories();
  } catch (error) {
    showStatus(error.message || "No pudimos borrar la categoría.", "error");
  }
}

function attachTableEvents() {
  elements.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;
    const category = state.categories.find((item) => item.id === id);
    if (!category) return;

    if (action === "edit") {
      fillForm(category);
    }

    if (action === "delete") {
      deleteCategory(id);
    }
  });
}

function bindEvents() {
  elements.logoutBtn?.addEventListener("click", async () => {
    await signOutAdmin();
    window.location.href = "login.html";
  });

  elements.search?.addEventListener("input", applyFilter);

  elements.resetBtn?.addEventListener("click", () => {
    clearStatus();
    resetForm();
  });

  elements.form?.addEventListener("submit", saveCategory);

  elements.categoryName?.addEventListener("input", () => {
    if (!elements.categorySlug.dataset.touched) {
      elements.categorySlug.value = slugify(elements.categoryName.value);
    }
  });

  elements.categorySlug?.addEventListener("input", () => {
    elements.categorySlug.dataset.touched = "true";
  });

  elements.categoryLevel?.addEventListener("change", () => {
    syncLevelUI();
    syncPositionOptions();
  });

  elements.categoryParent?.addEventListener("change", syncPositionOptions);

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
    await fetchCategories();
  } catch (error) {
    showStatus(error.message || "No pudimos cargar categorías.", "error");
  }
}

bootstrap();