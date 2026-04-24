import { isSupabaseConfigured } from "./supabase-config.js";
import { getDashboardStats, getSupabaseClient, requireAdminAccess, signOutAdmin } from "./auth.js";

const elements = {
  adminName: document.getElementById("adminName"),
  adminEmail: document.getElementById("adminEmail"),
  dashboardStatus: document.getElementById("dashboardStatus"),
  statProducts: document.getElementById("statProducts"),
  statStock: document.getElementById("statStock"),
  statOrders: document.getElementById("statOrders"),
  statPending: document.getElementById("statPending"),
  recentOrdersBody: document.getElementById("recentOrdersBody"),
  logoutBtn: document.getElementById("logoutBtn"),
  salesCurrentTotal: document.getElementById("salesCurrentTotal"),
  salesPreviousTotal: document.getElementById("salesPreviousTotal"),
  salesDelta: document.getElementById("salesDelta"),
  analyticsBars: document.getElementById("analyticsBars"),
  analyticsNote: document.getElementById("analyticsNote"),
  bestSellerName: document.getElementById("bestSellerName"),
  bestSellerMeta: document.getElementById("bestSellerMeta"),
  worstSellerName: document.getElementById("worstSellerName"),
  worstSellerMeta: document.getElementById("worstSellerMeta")
};

function setStatus(message, type = "info") {
  if (!elements.dashboardStatus) return;
  elements.dashboardStatus.hidden = false;
  elements.dashboardStatus.textContent = message;
  elements.dashboardStatus.classList.remove("is-info", "is-error");
  elements.dashboardStatus.classList.add(type === "error" ? "is-error" : "is-info");
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

function formatUyu(value) {
  return `$ ${Number(value || 0).toLocaleString("es-UY")}`;
}

function renderOrders(orders) {
  if (!elements.recentOrdersBody) return;

  if (!orders || !orders.length) {
    elements.recentOrdersBody.innerHTML = `
      <tr>
        <td colspan="4">Todavía no hay pedidos reales guardados en la base.</td>
      </tr>
    `;
    return;
  }

  elements.recentOrdersBody.innerHTML = orders
    .map((order) => {
      const date = new Date(order.created_at).toLocaleDateString("es-UY");
      return `
        <tr>
          <td>${order.customer_name || "Cliente"}</td>
          <td>${renderBadge(order.status)}</td>
          <td>${formatUyu(order.total_uyu)}</td>
          <td>${date}</td>
        </tr>
      `;
    })
    .join("");
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end };
}

function aggregateProductStats(items) {
  const map = new Map();
  items.forEach((item) => {
    const name = item.product_name || "Producto";
    const current = map.get(name) || { quantity: 0, total: 0 };
    current.quantity += Number(item.quantity || 0);
    current.total += Number(item.subtotal_uyu || 0);
    map.set(name, current);
  });
  return [...map.entries()].map(([name, stats]) => ({ name, ...stats }));
}

function renderAnalytics(analytics) {
  const currentTotal = analytics.current.total;
  const previousTotal = analytics.previous.total;
  const base = Math.max(currentTotal, previousTotal, 1);
  const deltaValue = currentTotal - previousTotal;
  const deltaLabel = previousTotal > 0
    ? `${deltaValue >= 0 ? "+" : ""}${Math.round((deltaValue / previousTotal) * 100)}%`
    : (currentTotal > 0 ? "Nuevo mes con ventas" : "—");

  elements.salesCurrentTotal.textContent = formatUyu(currentTotal);
  elements.salesPreviousTotal.textContent = formatUyu(previousTotal);
  elements.salesDelta.textContent = deltaLabel;

  elements.analyticsBars.innerHTML = `
    <div class="analytics-bar">
      <div class="analytics-bar__meta"><span>Mes actual</span><strong>${formatUyu(currentTotal)}</strong></div>
      <div class="analytics-bar__track"><div class="analytics-bar__fill" style="width: ${(currentTotal / base) * 100}%"></div></div>
    </div>
    <div class="analytics-bar">
      <div class="analytics-bar__meta"><span>Mes anterior</span><strong>${formatUyu(previousTotal)}</strong></div>
      <div class="analytics-bar__track"><div class="analytics-bar__fill" style="width: ${(previousTotal / base) * 100}%"></div></div>
    </div>
  `;

  if (!analytics.current.orders.length && !analytics.previous.orders.length) {
    elements.analyticsNote.textContent = "Todavía no hay pedidos reales para comparar. Apenas empiecen a entrar órdenes, acá vas a ver el mes actual contra el anterior.";
  } else if (!analytics.previous.orders.length) {
    elements.analyticsNote.textContent = "Ya hay actividad en el mes actual. La comparación fina aparece cuando exista al menos un mes anterior con datos.";
  } else {
    elements.analyticsNote.textContent = "Comparativa calculada con pedidos no cancelados. Ideal para empezar a leer tendencia comercial sin complicar la operación.";
  }

  const source = analytics.current.products.length ? analytics.current.products : analytics.previous.products;
  if (!source.length) {
    elements.bestSellerName.textContent = "Sin datos todavía";
    elements.bestSellerMeta.textContent = "Esperando productos vendidos.";
    elements.worstSellerName.textContent = "Sin datos todavía";
    elements.worstSellerMeta.textContent = "Esperando productos vendidos.";
    return;
  }

  const sorted = [...source].sort((a, b) => b.quantity - a.quantity || b.total - a.total);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  elements.bestSellerName.textContent = best.name;
  elements.bestSellerMeta.textContent = `${best.quantity} unidades · ${formatUyu(best.total)}`;
  elements.worstSellerName.textContent = worst.name;
  elements.worstSellerMeta.textContent = `${worst.quantity} unidades · ${formatUyu(worst.total)}`;
}

async function getMonthlyAnalytics() {
  const client = getSupabaseClient();
  if (!client) return null;

  const prevRange = getMonthRange(-1);
  const currentRange = getMonthRange(0);

  const { data: ordersData, error: ordersError } = await client
    .from("orders")
    .select("id, total_uyu, status, created_at")
    .gte("created_at", prevRange.start.toISOString())
    .lt("created_at", currentRange.end.toISOString())
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;

  const orders = ordersData || [];
  const currentOrders = orders.filter((order) => new Date(order.created_at) >= currentRange.start);
  const previousOrders = orders.filter((order) => new Date(order.created_at) >= prevRange.start && new Date(order.created_at) < currentRange.start);

  const allIds = orders.map((order) => order.id);
  let items = [];
  if (allIds.length) {
    const { data: itemsData, error: itemsError } = await client
      .from("order_items")
      .select("order_id, product_name, quantity, subtotal_uyu")
      .in("order_id", allIds);

    if (itemsError) throw itemsError;
    items = itemsData || [];
  }

  const currentIdSet = new Set(currentOrders.map((item) => item.id));
  const previousIdSet = new Set(previousOrders.map((item) => item.id));

  const currentItems = items.filter((item) => currentIdSet.has(item.order_id));
  const previousItems = items.filter((item) => previousIdSet.has(item.order_id));

  return {
    current: {
      orders: currentOrders,
      total: currentOrders.reduce((sum, order) => sum + Number(order.total_uyu || 0), 0),
      products: aggregateProductStats(currentItems)
    },
    previous: {
      orders: previousOrders,
      total: previousOrders.reduce((sum, order) => sum + Number(order.total_uyu || 0), 0),
      products: aggregateProductStats(previousItems)
    }
  };
}

async function bootstrap() {
  if (!isSupabaseConfigured()) {
    setStatus("Falta configurar Supabase antes de usar el panel real.", "error");
    return;
  }

  const access = await requireAdminAccess({ redirectTo: "login.html" });
  if (!access.ok) return;

  const { user, profile } = access;
  elements.adminName.textContent = profile.full_name || "Administrador";
  elements.adminEmail.textContent = user.email || "—";

  try {
    const stats = await getDashboardStats();
    elements.statProducts.textContent = stats.totalProducts ?? "—";
    elements.statStock.textContent = stats.stockProducts ?? "—";
    elements.statOrders.textContent = stats.totalOrders ?? "—";
    elements.statPending.textContent = stats.pendingOrders ?? "—";
    renderOrders(stats.recentOrders);

    const analytics = await getMonthlyAnalytics();
    if (analytics) renderAnalytics(analytics);
  } catch (error) {
    setStatus(
      "El login está correcto, pero todavía faltan datos o permisos para alguna parte del dashboard.",
      "error"
    );
  }
}

elements.logoutBtn?.addEventListener("click", async () => {
  await signOutAdmin();
  window.location.href = "login.html";
});

bootstrap();
