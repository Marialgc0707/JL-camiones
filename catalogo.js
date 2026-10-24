/* =====================================================
   CATALOGO.JS — Productos agregados sin cambiar el diseño.
   Precios provisionales expresados en dólares estadounidenses (USD).
   Confirma precios y compatibilidades antes de publicar.
   ===================================================== */

const AJUSTES = {
  nombre: "JL Camiones",
  slogan: "Repuestos para que tu camión siga en marcha",
  ciudad: "Barquisimeto",
  direccion: "",
  whatsapp: "584245329777",
  mapa: "",
  instagram: "https://www.instagram.com/jlcamiones/",
  tasaBs: 0,
  minimoMayorUnidades: null,
  minimoMayorUsd: null,
  empresasEnvio: ["MRW", "Zoom", "Tealca"],
  delivery: "",
  ocultarAgotados: false,
  horario: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
};

/* DATOS LEGALES DEL NEGOCIO: complétalos. Aparecen en el pie de página y en las páginas legales.
   Mientras estén vacíos, el sitio mostrará "[COMPLETAR: ...]" en amarillo. */
const NEGOCIO = {
  razonSocial: "empresa",   // Nombre legal o nombre del comerciante
  rif: "J-04598497-4",           // Ej: J-12345678-9 / V-12345678-9
  direccion: "carrera 21A con calle 56 y 57",     // Dirección física completa
  ciudad: "Barquisimeto, Lara, Venezuela",
  correo: "luis@gmail.com",        // Correo de contacto
  horario: "Lunes a Viernes 8:00am - 5:00pm"        // Ej: Lunes a viernes 8:00 a. m. – 5:00 p. m.
};

const MARCAS = [
  { nombre: "Mercedes-Benz", emoji: "🚛" },
  { nombre: "Freightliner", emoji: "🚛" },
  { nombre: "World Parts", emoji: "🔧" },
  { nombre: "Ford Cargo", emoji: "🚚" },
  { nombre: "Internacional", emoji: "🚛" }
];

const PRODUCTOS_RESPALDO = [
  {
    id: 1,
    nombre: "Manilla interna roja",
    marca: "Mercedes-Benz",
    categoria: "Manillas internas",
    modelo: "1720 / 1634 / 2638",
    anio: "",
    codigo: "",
    desc: "Manilla interna roja y negra. Verifica la compatibilidad con tu camión antes de comprar.",
    foto: "manilla-interna-mercedes.jpg",
    precioDetal: 18.00,
    precioMayor: 18.00,
    agotado: false
  },
  {
    id: 2,
    nombre: "Buje de ballesta trasera",
    marca: "Freightliner",
    categoria: "Suspensión",
    modelo: "CL / M2",
    anio: "",
    codigo: "",
    desc: "Buje de ballesta trasera. Confirma medidas y aplicación exacta del vehículo.",
    foto: "buje-ballesta-trasera.jpg",
    precioDetal: 35.00,
    precioMayor: 35.00,
    agotado: false
  },
  {
    id: 3,
    nombre: "Tensor de correa",
    marca: "World Parts",
    categoria: "Motor y correas",
    modelo: "Cargo 815 / 1721",
    anio: "",
    codigo: "",
    desc: "Tensor de correa. Confirma la referencia y el motor compatible.",
    foto: "tensor-correa.jpg",
    precioDetal: 65.00,
    precioMayor: 65.00,
    agotado: false
  },
  {
    id: 4,
    nombre: "Manilla interna negra",
    marca: "Ford Cargo",
    categoria: "Manillas internas",
    modelo: "Cargo 815 / 1721 · derecha o izquierda",
    anio: "",
    codigo: "",
    desc: "Manilla interior negra. Consulta el lado disponible antes de realizar el pedido.",
    foto: "manilla-interna-ford.jpg",
    precioDetal: 15.00,
    precioMayor: 15.00,
    agotado: false
  },
  {
    id: 5,
    nombre: "Botón selector",
    marca: "Ford Cargo",
    categoria: "Interruptores y controles",
    modelo: "Cargo 1721 · mocha",
    anio: "",
    codigo: "",
    desc: "Botón selector con cableado. Confirma la función y conexión antes de comprar.",
    foto: "boton-selector.jpg",
    precioDetal: 22.00,
    precioMayor: 22.00,
    agotado: false
  },
  {
    id: 6,
    nombre: "Cartucho de turbo",
    marca: "Internacional",
    categoria: "Turbo y motor",
    modelo: "Motor 711 (según rótulo de la foto)",
    anio: "",
    codigo: "",
    desc: "Cartucho de turbo. Confirma la referencia y compatibilidad del motor antes de comprar.",
    foto: "cartucho-turbo.jpg",
    precioDetal: 180.00,
    precioMayor: 180.00,
    agotado: false
  }
];

/* ===== Conexión con la base de datos (api.php) ===== */
let PRODUCTOS = PRODUCTOS_RESPALDO;

async function cargarProductos() {
  try {
    const res = await fetch("api.php", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const lista = await res.json();
    if (Array.isArray(lista)) PRODUCTOS = lista;
  } catch (e) {
    console.error("No se pudo leer la base de datos, usando respaldo:", e);
  }
}
