const checkoutLayout = document.getElementById("checkoutLayout");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutSubtotal = document.getElementById("checkoutSubtotal");
const checkoutTotal = document.getElementById("checkoutTotal");

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
      <img src="${item.imagen}" alt="${item.nombre}">
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
  const timestamp = Date.now().toString().slice(-6);
  return `JRM-${timestamp}`;
}

function handleSubmit(event) {
  event.preventDefault();

  const cart = window.JaramaApp.getCartItems();
  if (!cart.length) {
    createEmptyState();
    return;
  }

  const formData = new FormData(checkoutForm);
  const buyer = Object.fromEntries(formData.entries());
  const subtotal = window.JaramaApp.getCartSubtotal();
  const orderCode = createOrderCode();

  const order = {
    codigo: orderCode,
    fecha: new Date().toISOString(),
    comprador: buyer,
    items: cart,
    subtotal,
    total: subtotal,
    estado: "pendiente"
  };

  localStorage.setItem("jarama-last-order", JSON.stringify(order));
  window.JaramaApp.clearCart();

  const buyerName = buyer.nombre || "Cliente";
  const itemsText = cart
    .map((item) => `<li>${item.nombre} × ${item.cantidad} — ${window.JaramaApp.formatUyu(Number(item.precioUYU) * Number(item.cantidad))}</li>`)
    .join("");

  document.querySelector(".page-main").innerHTML = `
    <section class="section-spacing">
      <div class="container-wide">
        <article class="checkout-success">
          <p class="eyebrow">Pedido generado</p>
          <h1>Gracias, ${buyerName}</h1>
          <span class="checkout-success__code">${orderCode}</span>
          <p>El pedido quedó generado en el frontend como base de trabajo. El siguiente paso será guardarlo en base de datos y luego enviarlo a la pasarela de pago real.</p>

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

document.addEventListener("DOMContentLoaded", () => {
  const hasItems = renderSummary();
  if (!hasItems) return;

  checkoutForm?.addEventListener("submit", handleSubmit);
});
