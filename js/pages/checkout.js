import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "../config/supabase.js";

const checkoutLayout = document.getElementById("checkoutLayout");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutSubtotal = document.getElementById("checkoutSubtotal");
const checkoutTotal = document.getElementById("checkoutTotal");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");

let publicClient = null;

function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  if (!publicClient) {
    publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return publicClient;
}

function createEmptyState() {
  checkoutLayout.innerHTML = `
    <article class="empty-state">
      <p class="eyebrow">No hay nada para confirmar</p>
      <h2>Tu checkout está vacío</h2>
      <p>Antes de completar datos de envío y pago, agregá al menos un producto desde la ficha correspondiente.</p>
      <div>
        <a href="index.html" class="btn btn-primary">Ir al catálogo</a>
      </div>
    </article>
  `;
}

function createSummaryItem(item) {
  const article = document.createElement("article");
  article.className = "checkout-item";
  article.innerHTML = `
    <div class="checkout-item__image">
      <img src="${item.imagen || "imagenes/placeholder.jpg"}" alt="${item.nombre}">
    </div>
    <div>
      <h3 class="checkout-item__name">${item.nombre}</h3>
      <div class="checkout-item__meta">
        <span>Cantidad: ${item.cantidad}</span>
        <strong>${window.JaramaApp.formatUyu(Number(item.precioUYU) * Number(item.cantidad))}</strong>
      </div>
    </div>
  `;
  return article;
}

function renderSummary() {
  const cart = window.JaramaApp.getCartItems();
  if (!cart.length) {
    createEmptyState();
    return false;
  }

  checkoutItems.innerHTML = "";
  cart.forEach((item) => checkoutItems.appendChild(createSummaryItem(item)));

  const subtotal = window.JaramaApp.getCartSubtotal();
  checkoutSubtotal.textContent = window.JaramaApp.formatUyu(subtotal);
  checkoutTotal.textContent = window.JaramaApp.formatUyu(subtotal);

  return true;
}

function createOrderCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `JRM-${y}${m}${d}-${rand}`;
}

function buildOrderPayload(orderId, orderCode, buyer, subtotal) {
  return {
    id: orderId,
    order_code: orderCode,
    customer_name: buyer.nombre,
    customer_phone: buyer.telefono,
    customer_email: buyer.email,
    customer_department: buyer.departamento,
    customer_city: buyer.ciudad,
    customer_address: buyer.direccion,
    customer_reference: buyer.referencia || null,
    shipping_method: buyer.envio,
    payment_method: buyer.pago,
    subtotal_uyu: subtotal,
    total_uyu: subtotal,
    status: "pending"
  };
}

function buildOrderItemsPayload(orderId, cart) {
  return cart.map((item) => {
    const quantity = Number(item.cantidad || 1);
    const unitPrice = Number(item.precioUYU || 0);

    return {
      order_id: orderId,
      product_id: item.id ? String(item.id) : null,
      product_slug: item.slug || null,
      product_name: item.nombre || "Producto Jarama",
      unit_price_uyu: unitPrice,
      quantity,
      subtotal_uyu: unitPrice * quantity
    };
  });
}

async function persistOrder(buyer, cart, subtotal) {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Supabase no está configurado todavía.");
  }

  const orderId = crypto.randomUUID();
  const orderCode = createOrderCode();

  const orderPayload = buildOrderPayload(orderId, orderCode, buyer, subtotal);
  const itemsPayload = buildOrderItemsPayload(orderId, cart);

  const { error: orderError } = await client
    .from("orders")
    .insert(orderPayload);

  if (orderError) {
    throw orderError;
  }

  const { error: itemsError } = await client
    .from("order_items")
    .insert(itemsPayload);

  if (itemsError) {
    throw itemsError;
  }

  return { orderId, orderCode };
}

function renderSuccess(orderCode, buyer, cart, subtotal) {
  const buyerName = buyer.nombre || "Cliente";
  const itemsText = cart
    .map((item) => `<li>${item.nombre} × ${item.cantidad} — ${window.JaramaApp.formatUyu(Number(item.precioUYU) * Number(item.cantidad))}</li>`)
    .join("");

  document.querySelector(".page-main").innerHTML = `
    <section class="section-spacing">
      <div class="container-wide">
        <article class="checkout-success">
          <p class="eyebrow">Pedido guardado</p>
          <h1>Gracias, ${buyerName}</h1>
          <span class="checkout-success__code">${orderCode}</span>
          <p>Tu pedido quedó guardado correctamente en la base de datos con estado pendiente. El siguiente paso natural es conectarlo con Mercado Pago.</p>

          <div class="checkout-success__box">
            <p><strong>Resumen:</strong></p>
            <ul>${itemsText}</ul>
            <p><strong>Total:</strong> ${window.JaramaApp.formatUyu(subtotal)}</p>
            <p><strong>Método de pago:</strong> ${buyer.pago}</p>
            <p><strong>Método de envío:</strong> ${buyer.envio}</p>
          </div>

          <div class="checkout-success__actions">
            <a href="index.html" class="btn btn-primary">Volver al catálogo</a>
            <a href="carrito.html" class="btn btn-secondary">Ver carrito</a>
          </div>
        </article>
      </div>
    </section>
  `;
}

async function handleSubmit(event) {
  event.preventDefault();

  const cart = window.JaramaApp.getCartItems();
  if (!cart.length) {
    createEmptyState();
    return;
  }

  const formData = new FormData(checkoutForm);
  const buyer = Object.fromEntries(formData.entries());
  const subtotal = window.JaramaApp.getCartSubtotal();

  if (!buyer.nombre || !buyer.telefono || !buyer.email || !buyer.departamento || !buyer.ciudad || !buyer.direccion) {
    alert("Completá todos los datos obligatorios antes de confirmar.");
    return;
  }

  const originalText = confirmOrderBtn?.innerHTML || "Confirmar pedido";

  try {
    if (confirmOrderBtn) {
      confirmOrderBtn.disabled = true;
      confirmOrderBtn.textContent = "Guardando pedido...";
    }

    const { orderCode } = await persistOrder(buyer, cart, subtotal);

    localStorage.setItem(
      "jarama-last-order",
      JSON.stringify({
        codigo: orderCode,
        fecha: new Date().toISOString(),
        comprador: buyer,
        items: cart,
        subtotal,
        total: subtotal,
        estado: "pending"
      })
    );

    window.JaramaApp.clearCart();
    renderSuccess(orderCode, buyer, cart, subtotal);
  } catch (error) {
    alert(error.message || "No pudimos guardar el pedido. Probá de nuevo.");
    if (confirmOrderBtn) {
      confirmOrderBtn.disabled = false;
      confirmOrderBtn.innerHTML = originalText;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const hasItems = renderSummary();
  if (!hasItems) return;

  checkoutForm?.addEventListener("submit", handleSubmit);
});