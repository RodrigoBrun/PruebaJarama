import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "../config/supabase.js";
import {
  products as localProducts,
  getProductBySlug as getLocalProductBySlug,
  getRelatedProducts as getLocalRelatedProducts
} from "./products.js";

let publicClient = null;

function getPublicClient() {
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

function placeholderSvg(label = "Jarama") {
  const safeLabel = String(label || "Jarama")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .slice(0, 38);

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 700">
      <rect width="900" height="700" fill="#f4eee8"/>
      <rect x="58" y="58" width="784" height="584" rx="28" fill="#efe4d8" stroke="#d8c4b2"/>
      <text x="50%" y="47%" text-anchor="middle" font-family="Georgia, serif" font-size="54" fill="#8f7866">JARAMA</text>
      <text x="50%" y="58%" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#a38c79">${safeLabel}</text>
    </svg>
  `)}`;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => String(item)) : [];
}

function normalizeMeasures(value) {
  const measures = value && typeof value === "object" ? value : {};
  return {
    largo: measures.largo || "A coordinar",
    profundidad: measures.profundidad || "A coordinar",
    altura: measures.altura || "A coordinar"
  };
}

function defaultBadges(record) {
  const list = normalizeArray(record?.badges);
  if (list.length) return list;
  if (record?.featured) return ["destacado"];
  return [];
}

function defaultColors(record) {
  return normalizeArray(record?.available_colors || record?.colores);
}

function mapSupabaseProduct(record) {
  const name = record?.name || "Producto Jarama";
  const images = normalizeArray(record?.images);
  const tags = normalizeArray(record?.tags);

  return {
    id: record?.id,
    slug: record?.slug || "",
    nombre: name,
    categoria: record?.category || "General",
    codigo: record?.code || "SIN-COD",
    precioUYU: Number(record?.price_uyu || 0),
    stock: Boolean(record?.in_stock),
    destacado: Boolean(record?.featured),
    badges: defaultBadges(record),
    colores: defaultColors(record),
    resumen: record?.summary || "",
    descripcion: record?.description || "Sin descripción todavía.",
    medidas: normalizeMeasures(record?.measures),
    imagenes: images.length ? images : [placeholderSvg(name)],
    tags,
    material: record?.material || "No especificado",
    createdAt: record?.created_at || null,
    updatedAt: record?.updated_at || null
  };
}

function mapLocalProduct(product) {
  return {
    ...product,
    imagenes: Array.isArray(product.imagenes) && product.imagenes.length
      ? product.imagenes
      : [placeholderSvg(product.nombre)],
    tags: Array.isArray(product.tags) ? product.tags : [],
    badges: Array.isArray(product.badges) ? product.badges : (product.destacado ? ["destacado"] : []),
    colores: Array.isArray(product.colores) ? product.colores : [],
    medidas: normalizeMeasures(product.medidas)
  };
}

export function toSupabasePayload(product) {
  const images = normalizeArray(product.imagenes || product.images);
  const tags = normalizeArray(product.tags);
  const badges = normalizeArray(product.badges);
  const colors = normalizeArray(product.colores || product.available_colors);
  const featured = Boolean(product.destacado ?? product.featured ?? badges.includes("destacado"));

  return {
    slug: product.slug,
    name: product.nombre || product.name,
    category: product.categoria || product.category || null,
    code: product.codigo || product.code || null,
    price_uyu: Number(product.precioUYU ?? product.price_uyu ?? 0),
    in_stock: Boolean(product.stock ?? product.in_stock),
    featured,
    badges: badges.length ? badges : (featured ? ["destacado"] : []),
    available_colors: colors,
    summary: product.resumen || product.summary || "",
    description: product.descripcion || product.description || "",
    material: product.material || "",
    measures: normalizeMeasures(product.medidas || product.measures),
    images: images.length ? images : [placeholderSvg(product.nombre || product.name || "Jarama")],
    tags
  };
}

function sortProducts(list) {
  return [...list].sort((a, b) => {
    if (Boolean(b.destacado) !== Boolean(a.destacado)) {
      return Number(Boolean(b.destacado)) - Number(Boolean(a.destacado));
    }

    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
}

export async function getAllProducts({ featuredOnly = false, includeOutOfStock = true } = {}) {
  const client = getPublicClient();

  if (client) {
    try {
      let query = client
        .from("products")
        .select("*")
        .order("featured", { ascending: false })
        .order("name", { ascending: true });

      if (featuredOnly) query = query.eq("featured", true);
      if (!includeOutOfStock) query = query.eq("in_stock", true);

      const { data, error } = await query;

      if (!error && Array.isArray(data) && data.length) {
        return data.map(mapSupabaseProduct);
      }

      if (!error && Array.isArray(data) && !data.length) {
        const fallback = localProducts.map(mapLocalProduct);
        return sortProducts(
          fallback.filter((product) => (featuredOnly ? product.destacado : true))
            .filter((product) => (includeOutOfStock ? true : product.stock))
        );
      }
    } catch {
      // silent fallback
    }
  }

  const fallback = localProducts.map(mapLocalProduct);
  return sortProducts(
    fallback.filter((product) => (featuredOnly ? product.destacado : true))
      .filter((product) => (includeOutOfStock ? true : product.stock))
  );
}

export async function getProductBySlug(slug) {
  if (!slug) return null;

  const client = getPublicClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) return mapSupabaseProduct(data);
    } catch {
      // silent fallback
    }
  }

  const local = getLocalProductBySlug(slug);
  return local ? mapLocalProduct(local) : null;
}

export async function getRelatedProducts(product, limit = 3) {
  if (!product) return [];

  const client = getPublicClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("category", product.categoria)
        .neq("slug", product.slug)
        .limit(limit);

      if (!error && Array.isArray(data) && data.length) {
        return data.map(mapSupabaseProduct);
      }
    } catch {
      // silent fallback
    }
  }

  return getLocalRelatedProducts(product, limit).map(mapLocalProduct);
}
