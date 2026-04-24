export const FX_RATE_USD = 40;

export const products = [
  {
    id: 1,
    slug: "sillon-cosmopolitan-cuero-italiano-caramelo",
    nombre: "SILLÓN COSMOPOLITAN - CUERO ITALIANO CARAMELO",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-001",
    precioUYU: 136000,
    stock: true,
    destacado: true,
    badges: ["destacado", "mas-vendido"],
    colores: ["Caramelo", "Tabaco"],
    resumen: "Sillón de presencia elegante, tapizado en cuero italiano caramelo.",
    descripcion:
      "Una pieza protagonista para living o sala de estar. Combina estructura sólida, visual premium y una lectura cálida del espacio.",
    medidas: {
      largo: "2.20 mts",
      profundidad: "0.95 mts",
      altura: "0.78 mts"
    },
    imagenes: [
      "imagenes/sillon-1.jpg",
      "imagenes/sillon-2.jpg",
      "imagenes/sillon-3.jpg"
    ],
    tags: ["premium", "living", "cuero"],
    material: "Cuero italiano"
  },
  {
    id: 2,
    slug: "sillon-alma-lino-crudo-230",
    nombre: "SILLÓN ALMA LINO CRUDO - 2.30 MTS",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-002",
    precioUYU: 120000,
    stock: true,
    destacado: true,
    badges: ["destacado", "nuevo"],
    colores: ["Crudo", "Arena"],
    resumen: "Sillón amplio, luminoso y versátil para espacios de estética serena.",
    descripcion:
      "Ideal para quienes buscan una pieza grande, cómoda y limpia visualmente. El lino crudo aporta una lectura natural y sofisticada.",
    medidas: {
      largo: "2.30 mts",
      profundidad: "0.90 mts",
      altura: "0.76 mts"
    },
    imagenes: [
      "imagenes/sillon-2.jpg",
      "imagenes/sillon-3.jpg",
      "imagenes/sillon-4.jpg"
    ],
    tags: ["lino", "amplio", "premium"],
    material: "Lino crudo"
  },
  {
    id: 3,
    slug: "sillon-alma-lino-blanco-208",
    nombre: "SILLÓN ALMA LINO BLANCO - 2.08 MTS",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-003",
    precioUYU: 112000,
    stock: true,
    destacado: false,
    badges: ["nuevo"],
    colores: ["Blanco", "Marfil"],
    resumen: "Una opción clara y refinada para ambientes modernos y cálidos.",
    descripcion:
      "Su proporción equilibrada y tapizado claro lo convierten en una excelente base para ambientes con deco premium y tonos suaves.",
    medidas: {
      largo: "2.08 mts",
      profundidad: "0.90 mts",
      altura: "0.76 mts"
    },
    imagenes: [
      "imagenes/sillon-3.jpg",
      "imagenes/sillon-4.jpg",
      "imagenes/sillon-5.jpg"
    ],
    tags: ["blanco", "moderno", "living"],
    material: "Lino blanco"
  },
  {
    id: 4,
    slug: "sillon-alma-lino-blanco-230",
    nombre: "SILLÓN ALMA LINO BLANCO - 2.30 MTS",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-004",
    precioUYU: 120000,
    stock: true,
    destacado: false,
    badges: ["edicion-limitada"],
    colores: ["Blanco", "Perla"],
    resumen: "Versión de mayor tamaño con look limpio y sensación de amplitud.",
    descripcion:
      "Pensado para salas amplias donde el sillón debe verse elegante sin recargar el ambiente. Muy buena base para textiles neutros.",
    medidas: {
      largo: "2.30 mts",
      profundidad: "0.90 mts",
      altura: "0.76 mts"
    },
    imagenes: [
      "imagenes/sillon-4.jpg",
      "imagenes/sillon-3.jpg",
      "imagenes/sillon-2.jpg"
    ],
    tags: ["grande", "minimal", "premium"],
    material: "Lino blanco"
  },
  {
    id: 5,
    slug: "sillon-alma-lino-belga-antimanchas-230",
    nombre: "SILLÓN ALMA LINO BELGA ANTIMANCHAS - 2.30 MTS",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-005",
    precioUYU: 120000,
    stock: true,
    destacado: false,
    badges: ["oferta"],
    colores: ["Beige", "Tostado"],
    resumen: "Diseño premium con tela más práctica para uso cotidiano.",
    descripcion:
      "Mantiene la estética elegante de la línea Alma, con una tela pensada para convivir mejor con el día a día sin resignar presencia visual.",
    medidas: {
      largo: "2.30 mts",
      profundidad: "0.90 mts",
      altura: "0.76 mts"
    },
    imagenes: [
      "imagenes/sillon-5.jpg",
      "imagenes/sillon-4.jpg",
      "imagenes/sillon-3.jpg"
    ],
    tags: ["antimanchas", "lino belga", "familiar"],
    material: "Lino belga antimanchas"
  },
  {
    id: 6,
    slug: "sillon-malva-tussor-180",
    nombre: "SILLÓN MALVA - TUSSOR - 1.80 MTS",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-006",
    precioUYU: 63000,
    stock: false,
    destacado: false,
    badges: [],
    colores: ["Piedra"],
    resumen: "Una pieza compacta con textura cálida y personalidad serena.",
    descripcion:
      "Ideal para espacios más reducidos o rincones donde buscás diseño sin perder liviandad visual. Actualmente figura sin stock.",
    medidas: {
      largo: "1.80 mts",
      profundidad: "0.88 mts",
      altura: "0.74 mts"
    },
    imagenes: [
      "imagenes/sillon-6.jpg",
      "imagenes/sillon-7.jpg",
      "imagenes/sillon-8.jpg"
    ],
    tags: ["compacto", "tussor", "sin stock"],
    material: "Tussor"
  },
  {
    id: 7,
    slug: "sillon-malva-tussor-220",
    nombre: "SILLÓN MALVA - TUSSOR - 2.20 MTS",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-007",
    precioUYU: 78500,
    stock: true,
    destacado: false,
    badges: ["oferta"],
    colores: ["Visón", "Greige"],
    resumen: "Más presencia, más superficie útil y una estética noble.",
    descripcion:
      "Una muy buena opción si querés comodidad amplia con un look textil cálido. Equilibra volumen y estilo premium sin verse pesado.",
    medidas: {
      largo: "2.20 mts",
      profundidad: "0.90 mts",
      altura: "0.75 mts"
    },
    imagenes: [
      "imagenes/sillon-7.jpg",
      "imagenes/sillon-6.jpg",
      "imagenes/sillon-8.jpg"
    ],
    tags: ["amplio", "tussor", "living"],
    material: "Tussor"
  },
  {
    id: 8,
    slug: "sillon-azur-lino",
    nombre: "SILLÓN AZUR - LINO",
    categoria: "Sillones y Butacas",
    codigo: "JRM-SIL-008",
    precioUYU: 104000,
    stock: false,
    destacado: true,
    badges: ["destacado", "edicion-limitada"],
    colores: ["Natural", "Camel claro"],
    resumen: "Líneas suaves y un lenguaje contemporáneo muy limpio.",
    descripcion:
      "Pensado para quienes buscan una pieza moderna y sobria. Ahora mismo figura sin stock, pero sirve como excelente referencia de la línea Jarama.",
    medidas: {
      largo: "2.00 mts",
      profundidad: "0.92 mts",
      altura: "0.77 mts"
    },
    imagenes: [
      "imagenes/sillon-8.jpg",
      "imagenes/sillon-7.jpg",
      "imagenes/sillon-6.jpg"
    ],
    tags: ["moderno", "lino", "sin stock"],
    material: "Lino"
  }
];

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug) || null;
}

export function getProductById(id) {
  return products.find((product) => String(product.id) === String(id)) || null;
}

export function getRelatedProducts(currentProduct, limit = 3) {
  if (!currentProduct) return [];

  return products
    .filter(
      (product) =>
        String(product.id) !== String(currentProduct.id) &&
        product.categoria === currentProduct.categoria
    )
    .slice(0, limit);
}

export function formatPriceUyu(value) {
  return `$ ${Number(value).toLocaleString("es-UY")}`;
}

export function formatPriceUsd(value) {
  return `US$ ${Math.round(Number(value) / FX_RATE_USD).toLocaleString("es-UY")}`;
}
