/* app.js adaptado al catalogo.js: mantiene la estructura y estilos originales. */
const grid = document.querySelector("#product-grid");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const emptyMessage = document.querySelector("#empty-message");
const cartCount = document.querySelector("#cart-count");
const cartPanel = document.querySelector("#cart-panel");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cart = new Map();
const money = value => `$${Number(value || 0).toFixed(2)} USD`;
const cleanWhatsApp = String(AJUSTES.whatsapp || "").replace(/\D/g, "");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderCategories() {
  const categories = [...new Set(PRODUCTOS.map(p => p.categoria).filter(Boolean))].sort();
  categoryFilter.innerHTML = '<option value="todas">Todas las categorías</option>';
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function renderProducts() {
  const search = searchInput.value.trim().toLocaleLowerCase("es");
  const category = categoryFilter.value;
  const filtered = PRODUCTOS.filter(product => {
    const text = [product.nombre, product.marca, product.categoria, product.modelo, product.codigo, product.desc]
      .join(" ").toLocaleLowerCase("es");
    return text.includes(search) && (category === "todas" || product.categoria === category) &&
      (!AJUSTES.ocultarAgotados || !product.agotado);
  });

  grid.innerHTML = "";
  emptyMessage.hidden = filtered.length > 0;
  filtered.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";
    const imageArea = document.createElement("div");
    imageArea.className = "product-image";

    if (product.foto) {
      const img = document.createElement("img");
      img.src = `fotos/${encodeURIComponent(product.foto)}`;
      img.alt = product.nombre;
      img.loading = "lazy";
      img.onerror = () => {
        img.remove();
        imageArea.insertAdjacentText("afterbegin", "JL");
        console.error(`No se pudo cargar la imagen: fotos/${product.foto}`);
      };
      imageArea.appendChild(img);
    } else {
      imageArea.textContent = "JL";
    }

    const tag = document.createElement("span");
    tag.className = "product-tag";
    tag.textContent = product.marca || product.categoria || "Repuesto";
    imageArea.appendChild(tag);

    const info = document.createElement("div");
    info.className = "product-info";
    const description = `${product.desc || ""}${product.modelo ? ` Aplicación: ${product.modelo}.` : ""}`;
    info.innerHTML = `
      <p class="product-category">${escapeHtml(product.categoria)}</p>
      <h3>${escapeHtml(product.nombre)}</h3>
      <p class="product-description">${escapeHtml(description)}</p>
      <div class="product-bottom">
        <div><strong>${money(product.precioDetal)}</strong><div class="price-note">Precio provisional</div></div>
        <button class="add-button" type="button" data-add="${Number(product.id)}" ${product.agotado ? "disabled" : ""}>${product.agotado ? "Agotado" : "+ Agregar"}</button>
      </div>`;
    card.append(imageArea, info);
    grid.appendChild(card);
  });
}

function updateCount() {
  const count = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  cartCount.textContent = count;
  const floatingCount = document.querySelector("#floating-cart-count");
  if (floatingCount) floatingCount.textContent = count;
}

function renderCart() {
  cartItems.innerHTML = "";
  cartEmpty.hidden = cart.size > 0;
  let total = 0;
  cart.forEach((quantity, id) => {
    const product = PRODUCTOS.find(item => item.id === id);
    if (!product) return;
    const subtotal = Number(product.precioDetal || 0) * quantity;
    total += subtotal;
    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-main">
        <strong>${escapeHtml(product.nombre)}</strong>
        <small>${money(product.precioDetal)} c/u</small>
        <small class="cart-subtotal">Subtotal: ${money(subtotal)}</small>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-controls" aria-label="Cantidad">
          <button type="button" data-minus="${id}" aria-label="Restar una unidad">−</button>
          <strong>${quantity}</strong>
          <button type="button" data-plus="${id}" aria-label="Sumar una unidad">+</button>
        </div>
        <button type="button" class="remove-item" data-remove="${id}" aria-label="Eliminar ${escapeHtml(product.nombre)}">×</button>
      </div>`;
    cartItems.appendChild(row);
  });
  document.querySelector("#cart-total-value").textContent = money(total);
  updateCount();
}

function addToCart(id, change = 1) {
  id = Number(id);
  const product = PRODUCTOS.find(p => p.id === id);
  if (!product || product.agotado) return;
  const quantity = (cart.get(id) || 0) + change;
  if (quantity <= 0) cart.delete(id); else cart.set(id, quantity);
  renderCart();
}

function openCart() { cartPanel.hidden = false; document.body.style.overflow = "hidden"; }
function closeCart() { cartPanel.hidden = true; document.body.style.overflow = ""; }

document.querySelector("#open-cart").addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeCart);
document.querySelector("#clear-cart").addEventListener("click", () => {
  if (!cart.size) return;
  if (confirm("¿Quieres vaciar todos los repuestos del carrito?")) { cart.clear(); renderCart(); }
});
document.querySelector("#cart-backdrop").addEventListener("click", closeCart);
searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  addToCart(button.dataset.add);
  const original = button.textContent;
  button.textContent = "Agregado ✓";
  setTimeout(() => { if (button.isConnected) button.textContent = original; }, 900);
});

cartItems.addEventListener("click", event => {
  const plus = event.target.closest("[data-plus]");
  const minus = event.target.closest("[data-minus]");
  if (plus) addToCart(plus.dataset.plus, 1);
  if (minus) addToCart(minus.dataset.minus, -1);
  const remove = event.target.closest("[data-remove]");
  if (remove) { cart.delete(Number(remove.dataset.remove)); renderCart(); }
});

let deliveryMethod = "Retiro en tienda";
const shippingCarrierField = document.querySelector("#shipping-carrier-field");
const shippingCarrier = document.querySelector("#shipping-carrier");
document.querySelectorAll(".delivery-option").forEach(button => {
  button.addEventListener("click", () => {
    deliveryMethod = button.dataset.delivery;
    document.querySelectorAll(".delivery-option").forEach(option => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    const needsShipping = deliveryMethod === "Envío / delivery";
    shippingCarrierField.hidden = !needsShipping;
    shippingCarrier.required = needsShipping;
    if (!needsShipping) shippingCarrier.value = "";
  });
});

document.querySelector("#send-whatsapp").addEventListener("click", () => {
  if (!cart.size) { alert("Agrega al menos un producto a tu cotización."); return; }
  if (!cleanWhatsApp) { alert("Configura el número de WhatsApp en catalogo.js."); return; }
  const customerName = document.querySelector("#customer-name").value.trim();
  const paymentMethod = document.querySelector("#payment-method").value;
  const carrier = shippingCarrier.value;
  if (!paymentMethod) { alert("Selecciona un método de pago: Efectivo, Pago Móvil, Zelle o Binance."); document.querySelector("#payment-method").focus(); return; }
  if (deliveryMethod === "Envío / delivery" && !carrier) { alert("Selecciona la empresa de envío: MRW o Zoom."); shippingCarrier.focus(); return; }
  const lines = ["Hola, JL Camiones. Quiero realizar este pedido de repuestos:", ""];
  if (customerName) lines.push(`Nombre: ${customerName}`);
  lines.push(`Entrega: ${deliveryMethod}`);
  if (deliveryMethod === "Envío / delivery") lines.push(`Empresa de envío: ${carrier}`);
  lines.push(`Método de pago: ${paymentMethod}`, "");
  let total = 0;
  cart.forEach((quantity, id) => {
    const product = PRODUCTOS.find(item => item.id === id);
    if (!product) return;
    const subtotal = Number(product.precioDetal || 0) * quantity;
    total += subtotal;
    lines.push(`• ${product.nombre} (${product.marca}) — ${money(product.precioDetal)} c/u — Cantidad: ${quantity} — Subtotal: ${money(subtotal)}`);
  });
  const notes = document.querySelector("#customer-notes").value.trim();
  if (notes) lines.push("", `Detalles del camión / notas: ${notes}`);
  lines.push("", `Total estimado: ${money(total)}`, "Confirmar disponibilidad, compatibilidad y precio final.");
  window.open(`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
});

renderCategories();
renderProducts();
renderCart();
