export const categories = [
  {
    id: "muebles",
    name: "Muebles",
    slug: "muebles",
    iconKey: "ph-door",
    sortOrder: 10,
    isActive: true,
    showInNav: true,
    showInHome: true,
    description: "Muebles para living, guardado y apoyo.",
    children: [
      {
        id: "mesa-living",
        name: "Mesa living",
        slug: "mesa-living",
        sortOrder: 11,
        isActive: true
      },
      {
        id: "rack",
        name: "Rack",
        slug: "rack",
        sortOrder: 12,
        isActive: true
      },
      {
        id: "aparador",
        name: "Aparador",
        slug: "aparador",
        sortOrder: 13,
        isActive: true
      },
      {
        id: "biblioteca",
        name: "Biblioteca",
        slug: "biblioteca",
        sortOrder: 14,
        isActive: true
      }
    ]
  },
  {
    id: "sillones-y-butacas",
    name: "Sillones y Butacas",
    slug: "sillones-y-butacas",
    iconKey: "ph-armchair",
    sortOrder: 20,
    isActive: true,
    showInNav: true,
    showInHome: true,
    description: "Sillones, sofás y butacas premium.",
    children: [
      {
        id: "butacas",
        name: "Butacas",
        slug: "butacas",
        sortOrder: 21,
        isActive: true
      },
      {
        id: "sofa-2-cuerpos",
        name: "Sofá 2 cuerpos",
        slug: "sofa-2-cuerpos",
        sortOrder: 22,
        isActive: true
      },
      {
        id: "sofa-3-cuerpos",
        name: "Sofá 3 cuerpos",
        slug: "sofa-3-cuerpos",
        sortOrder: 23,
        isActive: true
      },
      {
        id: "chaise",
        name: "Chaise",
        slug: "chaise",
        sortOrder: 24,
        isActive: true
      }
    ]
  },
  {
    id: "deco",
    name: "Deco",
    slug: "deco",
    iconKey: "ph-lamp",
    sortOrder: 30,
    isActive: true,
    showInNav: true,
    showInHome: true,
    description: "Detalles decorativos y acentos visuales.",
    children: [
      {
        id: "portarretrato",
        name: "Portarretrato",
        slug: "portarretrato",
        sortOrder: 31,
        isActive: true
      },
      {
        id: "percheros",
        name: "Percheros",
        slug: "percheros",
        sortOrder: 32,
        isActive: true
      },
      {
        id: "centros-de-mesa",
        name: "Centros de mesa",
        slug: "centros-de-mesa",
        sortOrder: 33,
        isActive: true
      },
      {
        id: "candelabros",
        name: "Candelabros",
        slug: "candelabros",
        sortOrder: 34,
        isActive: true
      }
    ]
  },
  {
    id: "accesorios",
    name: "Accesorios",
    slug: "accesorios",
    iconKey: "ph-bag",
    sortOrder: 40,
    isActive: true,
    showInNav: true,
    showInHome: true,
    description: "Accesorios, detalles y piezas complementarias.",
    children: [
      {
        id: "caravanas",
        name: "Caravanas",
        slug: "caravanas",
        sortOrder: 41,
        isActive: true
      },
      {
        id: "pulseras",
        name: "Pulseras",
        slug: "pulseras",
        sortOrder: 42,
        isActive: true
      },
      {
        id: "collares",
        name: "Collares",
        slug: "collares",
        sortOrder: 43,
        isActive: true
      },
      {
        id: "mates-y-bombillas",
        name: "Mates y bombillas",
        slug: "mates-y-bombillas",
        sortOrder: 44,
        isActive: true
      }
    ]
  },
  {
    id: "religioso",
    name: "Religioso",
    slug: "religioso",
    iconKey: "svg-religioso",
    sortOrder: 50,
    isActive: true,
    showInNav: true,
    showInHome: true,
    description: "Piezas y objetos de lectura religiosa.",
    children: [
      {
        id: "virgenes",
        name: "Vírgenes",
        slug: "virgenes",
        sortOrder: 51,
        isActive: true
      },
      {
        id: "pesebres",
        name: "Pesebres",
        slug: "pesebres",
        sortOrder: 52,
        isActive: true
      },
      {
        id: "sagrada-familia",
        name: "Sagrada Familia",
        slug: "sagrada-familia",
        sortOrder: 53,
        isActive: true
      },
      {
        id: "angeles",
        name: "Ángeles",
        slug: "angeles",
        sortOrder: 54,
        isActive: true
      }
    ]
  }
];

export function sortCategoryTree(tree = []) {
  return [...tree]
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    .map((category) => ({
      ...category,
      children: [...(category.children || [])].sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
      )
    }));
}

export function flattenCategories(tree = categories) {
  return sortCategoryTree(tree).flatMap((category) => [
    {
      id: category.id,
      name: category.name,
      slug: category.slug,
      iconKey: category.iconKey,
      parentSlug: null,
      isActive: category.isActive
    },
    ...(category.children || []).map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      iconKey: null,
      parentSlug: category.slug,
      isActive: child.isActive
    }))
  ]);
}

export function findCategoryBySlug(slug, tree = categories) {
  for (const category of tree) {
    if (category.slug === slug) return category;
    const child = (category.children || []).find((item) => item.slug === slug);
    if (child) return child;
  }
  return null;
}