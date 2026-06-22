import "./ui.js";
import { signOutAdmin, requireAdminAccess, getSupabaseClient } from "./auth.js";
import { isSupabaseConfigured } from "./supabase-config.js";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const elements = {
  adminName: document.getElementById("adminName"),
  adminEmail: document.getElementById("adminEmail"),
  logoutBtn: document.getElementById("logoutBtn"),

  status: document.getElementById("ordersStatus"),

  statOrdersTotal: document.getElementById("statOrdersTotal"),
  statOrdersPending: document.getElementById("statOrdersPending"),
  statOrdersPaid: document.getElementById("statOrdersPaid"),
  statOrdersDelivered: document.getElementById("statOrdersDelivered"),

  search: document.getElementById("orderSearch"),
  statusFilter: document.getElementById("orderStatusFilter"),
  clearFiltersBtn: document.getElementById("clearOrderFiltersBtn"),
  exportExcelBtn: document.getElementById("exportOrdersExcelBtn"),

  tableBody: document.getElementById("ordersTableBody"),
  board: document.getElementById("ordersBoard"),
  detail: document.getElementById("orderDetail")
};

let state = {
  orders: [],
  filteredOrders: [],
  orderItems: [],
  selectedOrderId: null
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

function formatUyu(value) {
  return `$ ${Number(value || 0).toLocaleString("es-UY")}`;
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

function renderBadge(status) {
  const normalized = String(status || "pending").toLowerCase();

  const map = {
    pending: { label: "Pendiente", className: "admin-badge admin-badge--pending" },
    paid: { label: "Pagado", className: "admin-badge admin-badge--paid" },
    delivered: { label: "Entregado", className: "admin-badge admin-badge--done" },
    cancelled: { label: "Cancelado", className: "admin-badge admin-badge--cancelled" }
  };

  const badge = map[normalized] || map.pending;
  return `<span class="${badge.className}">${badge.label}</span>`;
}

function renderStats() {
  const total = state.orders.length;
  const pending = state.orders.filter((item) => item.status === "pending").length;
  const paid = state.orders.filter((item) => item.status === "paid").length;
  const delivered = state.orders.filter((item) => item.status === "delivered").length;

  elements.statOrdersTotal.textContent = total;
  elements.statOrdersPending.textContent = pending;
  elements.statOrdersPaid.textContent = paid;
  elements.statOrdersDelivered.textContent = delivered;
}

function getStatusMeta(status) {
  const map = {
    pending: { label: "Pendiente", badge: "admin-badge--pending" },
    paid: { label: "Pagado", badge: "admin-badge--paid" },
    delivered: { label: "Entregado", badge: "admin-badge--done" },
    cancelled: { label: "Cancelado", badge: "admin-badge--cancelled" }
  };

  return map[status] || map.pending;
}

function renderBoard() {
  if (!elements.board) return;

  const statuses = ["pending", "paid", "delivered", "cancelled"];

  elements.board.innerHTML = statuses
    .map((status) => {
      const meta = getStatusMeta(status);
      const orders = state.orders.filter((order) => String(order.status || "pending") === status);
      const visibleOrders = orders.slice(0, 4);

      return `
        <article class="orders-board-column">
          <div class="orders-board-column__head">
            <strong>${meta.label}</strong>
            <span class="admin-badge ${meta.badge}">${orders.length}</span>
          </div>
          <div class="orders-board-column__body">
            ${
              visibleOrders.length
                ? visibleOrders
                  .map((order) => `
                    <button type="button" class="orders-board-card" data-board-id="${order.id}">
                      <strong>${escapeHtml(order.order_code || "Sin código")}</strong>
                      <span>${escapeHtml(order.customer_name || "Cliente")} · ${formatUyu(order.total_uyu)}</span>
                      <span>${formatDate(order.created_at)}</span>
                    </button>
                  `)
                  .join("")
                : `<p class="orders-board-empty">Sin pedidos en este estado.</p>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function getItemsForOrder(orderId) {
  return state.orderItems.filter((item) => item.order_id === orderId);
}

function renderTable(list) {
  renderStats();

  if (!list.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6">No encontramos pedidos con ese filtro.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = list
    .map((order) => `
      <tr>
        <td>
          <div class="admin-product-cell">
            <strong>${escapeHtml(order.order_code || "Sin código")}</strong>
            <span>${escapeHtml(order.payment_method || "Sin método de pago")}</span>
            <span>${escapeHtml(order.shipping_method || "Sin método de envío")}</span>
          </div>
        </td>
        <td>
          <div class="admin-product-cell">
            <strong>${escapeHtml(order.customer_name || "Cliente")}</strong>
            <span>${escapeHtml(order.customer_email || "—")}</span>
            <span>${escapeHtml(order.customer_phone || "—")}</span>
          </div>
        </td>
        <td>${renderBadge(order.status)}</td>
        <td>${formatUyu(order.total_uyu)}</td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          <div class="admin-inline-actions">
            <button class="admin-inline-btn" type="button" data-action="view" data-id="${order.id}">
              <i class="ph-eye"></i> Ver
            </button>
            <button class="admin-inline-btn admin-inline-btn--danger" type="button" data-action="delete" data-id="${order.id}">
              <i class="ph-trash"></i> Borrar
            </button>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function renderDetail() {
  if (!state.selectedOrderId) {
    elements.detail.innerHTML = `
      <p style="color:#7f6d63; line-height:1.7;">Elegí un pedido del listado para ver sus productos, datos del cliente y cambiar el estado.</p>
    `;
    return;
  }

  const order = state.orders.find((item) => item.id === state.selectedOrderId);
  if (!order) {
    state.selectedOrderId = null;
    renderDetail();
    return;
  }

  const items = getItemsForOrder(order.id);

  elements.detail.innerHTML = `
    <div class="orders-detail-grid">
      <div class="admin-product-cell">
        <strong style="font-size:20px;">${escapeHtml(order.order_code || "Pedido")}</strong>
        <span>${formatDate(order.created_at)}</span>
      </div>

      <div class="admin-badge-group">
        ${renderBadge(order.status)}
      </div>

      <div class="orders-detail-card">
        <strong>Datos del cliente</strong>
        <div class="orders-detail-lines">
          <span><strong>Nombre:</strong> ${escapeHtml(order.customer_name || "—")}</span>
          <span><strong>Teléfono:</strong> ${escapeHtml(order.customer_phone || "—")}</span>
          <span><strong>Email:</strong> ${escapeHtml(order.customer_email || "—")}</span>
          <span><strong>Departamento:</strong> ${escapeHtml(order.customer_department || "—")}</span>
          <span><strong>Ciudad:</strong> ${escapeHtml(order.customer_city || "—")}</span>
          <span><strong>Dirección:</strong> ${escapeHtml(order.customer_address || "—")}</span>
          <span><strong>Referencia:</strong> ${escapeHtml(order.customer_reference || "—")}</span>
        </div>
      </div>

      <div class="orders-detail-card">
        <strong>Compra</strong>
        <div class="orders-detail-lines">
          <span><strong>Pago:</strong> ${escapeHtml(order.payment_method || "—")}</span>
          <span><strong>Envío:</strong> ${escapeHtml(order.shipping_method || "—")}</span>
          <span><strong>Subtotal:</strong> ${formatUyu(order.subtotal_uyu)}</span>
          <span><strong>Total:</strong> ${formatUyu(order.total_uyu)}</span>
        </div>
      </div>

      <div style="display:grid; gap:10px;">
        <strong style="color:var(--color-text-strong);">Productos</strong>
        ${
          items.length
            ? `
              <div class="orders-detail-items">
                ${items
                  .map(
                    (item) => `
                      <div class="orders-detail-item">
                        <strong>${escapeHtml(item.product_name || "Producto")}</strong>
                        <div class="orders-detail-lines" style="margin-top:8px;">
                          <span>Cantidad: ${Number(item.quantity || 0)}</span>
                          <span>Precio unitario: ${formatUyu(item.unit_price_uyu)}</span>
                          <span>Subtotal: ${formatUyu(item.subtotal_uyu)}</span>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `<p style="color:#7f6d63;">No encontramos ítems para este pedido.</p>`
        }
      </div>

      <div class="admin-product-form orders-status-editor">
        <label style="display:grid; gap:8px;">
          Estado del pedido
          <select id="orderStatusSelect">
            <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pendiente</option>
            <option value="paid" ${order.status === "paid" ? "selected" : ""}>Pagado</option>
            <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Entregado</option>
            <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelado</option>
          </select>
        </label>

        <div class="orders-status-actions">
          <button class="btn btn-primary" type="button" id="saveOrderStatusBtn">
            <i class="ph-floppy-disk"></i>
            Guardar estado
          </button>

          <button class="btn btn-secondary" type="button" id="deleteSelectedOrderBtn">
            <i class="ph-trash"></i>
            Borrar pedido
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("saveOrderStatusBtn")?.addEventListener("click", saveSelectedOrderStatus);
  document.getElementById("deleteSelectedOrderBtn")?.addEventListener("click", () => deleteOrder(order.id));
}

function applyFilter() {
  const term = String(elements.search.value || "").trim().toLowerCase();
  const selectedStatus = String(elements.statusFilter.value || "all");

  state.filteredOrders = state.orders.filter((order) => {
    const haystack = [
      order.order_code,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.status,
      order.payment_method,
      order.shipping_method
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesText = haystack.includes(term);
    const matchesStatus = selectedStatus === "all" ? true : order.status === selectedStatus;

    return matchesText && matchesStatus;
  });

  renderTable(state.filteredOrders);
}

async function fetchOrders() {
  const client = getSupabaseClient();

  const { data: orders, error: ordersError } = await client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;

  state.orders = Array.isArray(orders) ? orders : [];

  if (!state.orders.length) {
    state.orderItems = [];
    renderBoard();
    applyFilter();
    renderDetail();
    return;
  }

  const orderIds = state.orders.map((item) => item.id);

  const { data: items, error: itemsError } = await client
    .from("order_items")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  state.orderItems = Array.isArray(items) ? items : [];
  renderBoard();
  applyFilter();
  renderDetail();
}

async function saveSelectedOrderStatus() {
  const order = state.orders.find((item) => item.id === state.selectedOrderId);
  const statusSelect = document.getElementById("orderStatusSelect");

  if (!order || !statusSelect) return;

  const nextStatus = statusSelect.value;
  if (!nextStatus || nextStatus === order.status) {
    showStatus("No hubo cambios para guardar.");
    return;
  }

  clearStatus();

  try {
    const client = getSupabaseClient();

    const { error } = await client
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", order.id);

    if (error) throw error;

    showStatus("Estado del pedido actualizado correctamente.");
    await fetchOrders();
  } catch (error) {
    showStatus(error.message || "No pudimos actualizar el estado del pedido.", "error");
  }
}

async function deleteOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;

  const confirmed = window.confirm(`¿Seguro que querés borrar el pedido ${order.order_code}?`);
  if (!confirmed) return;

  clearStatus();

  try {
    const client = getSupabaseClient();

    const { error } = await client
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) throw error;

    if (state.selectedOrderId === orderId) {
      state.selectedOrderId = null;
    }

    showStatus("Pedido eliminado correctamente.");
    await fetchOrders();
  } catch (error) {
    showStatus(error.message || "No pudimos borrar el pedido.", "error");
  }
}

function clearFilters() {
  elements.search.value = "";
  elements.statusFilter.value = "all";
  applyFilter();
}

function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("estado");
  if (["pending", "paid", "delivered", "cancelled"].includes(status)) {
    elements.statusFilter.value = status;
  }
}

function groupItemsByOrder(items) {
  const map = new Map();

  (items || []).forEach((item) => {
    const key = item.order_id;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  });

  return map;
}

function buildItemsSummary(items = []) {
  if (!items.length) return "";

  return items
    .map((item) => {
      const productName = item.product_name || "Producto";
      const quantity = Number(item.quantity || 0);
      const subtotal = Number(item.subtotal_uyu || 0).toLocaleString("es-UY");
      return `${productName} x${quantity} ($ ${subtotal})`;
    })
    .join(" | ");
}

function formatDateTimeForExcel(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-UY");
}

function formatMoneyForExcel(value) {
  return Number(value || 0);
}

async function exportOrdersExcel() {
  const client = getSupabaseClient();
  if (!client) {
    showStatus("No hay cliente de Supabase disponible para exportar.", "error");
    return;
  }

  const originalText = elements.exportExcelBtn?.innerHTML;

  if (elements.exportExcelBtn) {
    elements.exportExcelBtn.disabled = true;
    elements.exportExcelBtn.innerHTML = '<i class="ph-spinner-gap"></i> Exportando...';
  }

  try {
    const { data: orders, error: ordersError } = await client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    const orderIds = (orders || [])
      .map((order) => order.id)
      .filter(Boolean);

    let itemsByOrder = new Map();

    if (orderIds.length) {
      const { data: orderItems, error: itemsError } = await client
        .from("order_items")
        .select("order_id, product_name, quantity, subtotal_uyu")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      itemsByOrder = groupItemsByOrder(orderItems || []);
    }

    const rows = (orders || []).map((order) => {
      const items = itemsByOrder.get(order.id) || [];

      const code = order.order_code || order.code || order.codigo || order.id || "";
      const customerName = order.customer_name || order.buyer_name || order.nombre || "";
      const customerPhone = order.customer_phone || order.phone || order.telefono || "";
      const customerEmail = order.customer_email || order.email || "";
      const department = order.customer_department || order.department || order.departamento || "";
      const city = order.customer_city || order.city || order.ciudad || "";
      const address = order.customer_address || order.address || order.direccion || "";
      const reference = order.customer_reference || order.reference || order.referencia || "";
      const paymentMethod = order.payment_method || order.pago || "";
      const shippingMethod = order.shipping_method || order.envio || "";
      const status = order.status || order.estado || "";
      const subtotal = order.subtotal_uyu ?? order.subtotal ?? 0;
      const total = order.total_uyu ?? order.total ?? 0;

      return {
        Código: code,
        Fecha: formatDateTimeForExcel(order.created_at || order.fecha),
        Cliente: customerName,
        Teléfono: customerPhone,
        Email: customerEmail,
        Departamento: department,
        Ciudad: city,
        Dirección: address,
        Referencia: reference,
        "Método de pago": paymentMethod,
        "Método de envío": shippingMethod,
        Estado: status,
        Subtotal_UYU: formatMoneyForExcel(subtotal),
        Total_UYU: formatMoneyForExcel(total),
        Cantidad_items: items.length,
        Detalle_items: buildItemsSummary(items)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 26 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 60 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `jarama-pedidos-${today}.xlsx`);

    showStatus("Excel exportado correctamente.");
  } catch (error) {
    console.error(error);
    showStatus(error.message || "No se pudo exportar el Excel.", "error");
  } finally {
    if (elements.exportExcelBtn) {
      elements.exportExcelBtn.disabled = false;
      elements.exportExcelBtn.innerHTML = originalText || '<i class="ph-download-simple"></i> Exportar Excel';
    }
  }
}

function attachTableEvents() {
  elements.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "view") {
      state.selectedOrderId = id;
      renderDetail();
    }

    if (action === "delete") {
      deleteOrder(id);
    }
  });
}

function attachBoardEvents() {
  elements.board?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-board-id]");
    if (!card) return;
    state.selectedOrderId = card.dataset.boardId;
    renderDetail();
    elements.detail?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function bindEvents() {
  elements.logoutBtn?.addEventListener("click", async () => {
    await signOutAdmin();
    window.location.href = "login.html";
  });

  elements.search?.addEventListener("input", applyFilter);
  elements.statusFilter?.addEventListener("change", applyFilter);
  elements.clearFiltersBtn?.addEventListener("click", clearFilters);
  elements.exportExcelBtn?.addEventListener("click", exportOrdersExcel);

  attachTableEvents();
  attachBoardEvents();
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
  applyUrlFilters();

  try {
    await fetchOrders();
  } catch (error) {
    showStatus(error.message || "No pudimos cargar los pedidos.", "error");
  }
}

bootstrap();
