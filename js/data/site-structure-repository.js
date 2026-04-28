import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "../config/supabase.js";
import { categories as localCategories, sortCategoryTree } from "./categories.js";

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

function normalizeCategoryRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id || null,
    name: row.name || "Categoría",
    slug: row.slug || "",
    iconKey: row.icon_key || "ph-squares-four",
    sortOrder: Number(row.sort_order || 100),
    isActive: Boolean(row.is_active),
    showInNav: Boolean(row.show_in_nav),
    showInHome: Boolean(row.show_in_home),
    description: row.description || ""
  };
}

function buildCategoryTree(rows = []) {
  const normalized = rows.map(normalizeCategoryRow);
  const parents = normalized
    .filter((item) => !item.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));

  return parents.map((parent) => ({
    id: parent.id,
    name: parent.name,
    slug: parent.slug,
    iconKey: parent.iconKey,
    sortOrder: parent.sortOrder,
    isActive: parent.isActive,
    showInNav: parent.showInNav,
    showInHome: parent.showInHome,
    description: parent.description,
    children: normalized
      .filter((item) => item.parentId === parent.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
      .map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        sortOrder: child.sortOrder,
        isActive: child.isActive,
        description: child.description
      }))
  }));
}

export async function getNavigationCategories() {
  const client = getPublicClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .eq("show_in_nav", true)
        .order("sort_order", { ascending: true });

      if (!error && Array.isArray(data) && data.length) {
        return buildCategoryTree(data);
      }
    } catch {
      // fallback silencioso
    }
  }

  return sortCategoryTree(localCategories).filter((item) => item.isActive && item.showInNav !== false);
}

export async function getHomeCategories() {
  const client = getPublicClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .eq("show_in_home", true)
        .order("sort_order", { ascending: true });

      if (!error && Array.isArray(data) && data.length) {
        return buildCategoryTree(data);
      }
    } catch {
      // fallback silencioso
    }
  }

  return sortCategoryTree(localCategories).filter((item) => item.isActive && item.showInHome !== false);
}

export async function getAllCategoriesFlat() {
  const client = getPublicClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map(normalizeCategoryRow);
      }
    } catch {
      // fallback silencioso
    }
  }

  return sortCategoryTree(localCategories).flatMap((category) => [
    {
      id: category.id,
      parentId: null,
      name: category.name,
      slug: category.slug,
      iconKey: category.iconKey,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      showInNav: category.showInNav !== false,
      showInHome: category.showInHome !== false,
      description: category.description || ""
    },
    ...(category.children || []).map((child) => ({
      id: child.id,
      parentId: category.id,
      name: child.name,
      slug: child.slug,
      iconKey: null,
      sortOrder: child.sortOrder,
      isActive: child.isActive,
      showInNav: true,
      showInHome: false,
      description: child.description || ""
    }))
  ]);
}

export async function getActiveBanners() {
  const client = getPublicClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map((item) => ({
          id: item.id,
          title: item.title || "Banner Jarama",
          imageUrl: item.image_url,
          targetUrl: item.target_url || "",
          sortOrder: Number(item.sort_order || 100),
          isActive: Boolean(item.is_active),
          openInNewTab: Boolean(item.open_in_new_tab)
        }));
      }
    } catch {
      // fallback silencioso
    }
  }

  return [];
}

export async function getBannersSectionEnabled() {
  const client = getPublicClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("site_sections")
        .select("is_enabled")
        .eq("section_key", "banners")
        .maybeSingle();

      if (!error && data) {
        return Boolean(data.is_enabled);
      }
    } catch {
      // fallback silencioso
    }
  }

  return true;
}