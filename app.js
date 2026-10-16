
const grid = document.querySelector("#product-grid");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const emptyMessage = document.querySelector("#empty-message");
const cartCount = document.querySelector("#cart-count");
const cartPanel = document.querySelector("#cart-panel");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");

const cart = new Map();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderCategories() {
  const categories = [
    ...new Set(PRODUCTOS.map(product => product.categoria))
  ].sort();

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
    const text = `${product.nombre} ${product.categoria} ${product.codigo}`
      .toLocaleLowerCase("es");

    return text.includes(search) &&
      (category === "todas" || product.categoria === category);
  });

  grid.innerHTML = "";
  emptyMessage.hidden = filtered.length > 0;

  filtered.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageArea = document.createElement("div");
    imageArea.className = "product-image";

    if (product.imagen) {
      const img = document.createElement("img");
      img.src = product.imagen;
      img.alt = product.nombre;

      img.onerror = () => {
        img.remove();
        imageArea.insertAdjacentText("afterbegin", "JL");
      };

      imageArea.appendChild(img);
    } else {
      imageArea.textContent = "JL";
    }

    const tag = document.createElement("span");
    tag.className = "product-tag";
    tag.textContent = product.destacado
      ? "Destacado"
      : product.categoria;

    imageArea.appendChild(tag);

    const info = document.createElement("div");
    info.className = "product-info";

    info.innerHTML = `
      <p class="product-category">${escapeHtml(product.categoria)}</p>
      <h3>${escapeHtml(product.nombre)}</h3>
      <p class="product-description">
        ${escapeHtml(product.descripcion)}
      </p>
      <div class="product-bottom">
        <span class="price-note">Precio por consultar</span>
        <button class="add-button" type="button">+ Agregar</button>
      </div>
    `;

    info.querySelector("button").addEventListener("click", () => {
      addToCart(product.id);
    });

    card.append(imageArea, info);
    grid.appendChild(card);
  });
}

function updateCount() {
  const total = [...cart.values()].reduce((sum, quantity) => {
    return sum + quantity;
  }, 0);

  cartCount.textContent = total;
}

function addToCart(id) {
  cart.set(id, (cart.get(id) || 0) + 1);
  renderCart();
  updateCount();
}

function changeQuantity(id, change) {
  const quantity = (cart.get(id) || 0) + change;

  if (quantity < 1) {
    cart.delete(id);
  } else {
    cart.set(id, quantity);
  }

  renderCart();
  updateCount();
}

function renderCart() {
  cartItems.innerHTML = "";
  cartEmpty.hidden = cart.size > 0;

  cart.forEach((quantity, id) => {
    const product = PRODUCTOS.find(item => item.id === id);
    if (!product) return;

    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <div>
        <strong>${escapeHtml(product.nombre)}</strong>
        <small>${escapeHtml(product.categoria)}</small>
      </div>
      <div class="quantity-controls">
        <button type="button" aria-label="Quitar uno">−</button>
        <strong>${quantity}</strong>
        <button type="button" aria-label="Agregar uno">+</button>
      </div>
    `;

    const buttons = row.querySelectorAll("button");

    buttons[0].addEventListener("click", () => {
      changeQuantity(id, -1);
    });

    buttons[1].addEventListener("click", () => {
      changeQuantity(id, 1);
    });

    cartItems.appendChild(row);
  });
}

function openCart() {
  cartPanel.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartPanel.hidden = true;
  document.body.style.overflow = "";
}

document.querySelector("#open-cart").addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeCart);
document.querySelector("#cart-backdrop").addEventListener("click", closeCart);

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

document.querySelector("#send-whatsapp").addEventListener("click", () => {
  if (cart.size === 0) {
    alert("Agrega al menos un producto a tu cotización.");
    return;
  }

  const lines = [
    "Hola, JL Camiones. Quisiera cotizar estos repuestos:",
    ""
  ];

  cart.forEach((quantity, id) => {
    const product = PRODUCTOS.find(item => item.id === id);

    if (product) {
      lines.push(`• ${product.nombre} — Cantidad: ${quantity}`);
    }
  });

  const notes = document.querySelector("#customer-notes").value.trim();

  if (notes) {
    lines.push("", `Detalles del camión: ${notes}`);
  }

  lines.push(
    "",
    "Por favor, confirmen disponibilidad y precio. Gracias."
  );

  const url =
    `https://wa.me/${AJUSTES.whatsapp}?text=${encodeURIComponent(
      lines.join("\n")
    )}`;

  window.open(url, "_blank", "noopener,noreferrer");
});

renderCategories();
renderProducts();
renderCart();
