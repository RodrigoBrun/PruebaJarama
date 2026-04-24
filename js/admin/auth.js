import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  ALLOWED_ADMIN_EMAIL,
  isSupabaseConfigured
} from "./supabase-config.js";

let supabaseInstance = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return supabaseInstance;
}

async function getProfile(userId) {
  const client = getSupabaseClient();
  if (!client) return { profile: null, error: new Error("Supabase no configurado") };

  const { data, error } = await client
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();

  return { profile: data ?? null, error };
}

export async function signInAdmin(email, password) {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: new Error("Supabase no configurado") };
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) return { data: null, error };

  const authEmail = data?.user?.email?.toLowerCase();
  if (!authEmail || authEmail !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
    await client.auth.signOut();
    return {
      data: null,
      error: new Error("Este usuario no está autorizado para el panel de Jarama.")
    };
  }

  const { profile, error: profileError } = await getProfile(data.user.id);
  if (profileError || !profile || profile.role !== "admin") {
    await client.auth.signOut();
    return {
      data: null,
      error: new Error("La cuenta existe, pero no tiene rol administrador.")
    };
  }

  return { data: { user: data.user, profile }, error: null };
}

export async function getCurrentAdminSession() {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, profile: null, error: new Error("Supabase no configurado") };
  }

  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null, error };
  }

  if (user.email?.toLowerCase() !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
    return { user: null, profile: null, error: new Error("Usuario no autorizado") };
  }

  const { profile, error: profileError } = await getProfile(user.id);
  if (profileError || !profile || profile.role !== "admin") {
    return { user: null, profile: null, error: new Error("Perfil sin permisos de admin") };
  }

  return { user, profile, error: null };
}

export async function requireAdminAccess({ redirectTo = "login.html" } = {}) {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "config" };
  }

  const { user, profile, error } = await getCurrentAdminSession();

  if (error || !user || !profile) {
    window.location.href = `${redirectTo}?reason=unauthorized`;
    return { ok: false, reason: "unauthorized" };
  }

  return { ok: true, user, profile };
}

export async function signOutAdmin() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

async function safeCount(queryBuilder) {
  const { count, error } = await queryBuilder;
  if (error) return null;
  return count ?? 0;
}

export async function getDashboardStats() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase no configurado");

  const totalProducts = await safeCount(
    client.from("products").select("id", { count: "exact", head: true })
  );

  const stockProducts = await safeCount(
    client.from("products").select("id", { count: "exact", head: true }).eq("in_stock", true)
  );

  const totalOrders = await safeCount(
    client.from("orders").select("id", { count: "exact", head: true })
  );

  const pendingOrders = await safeCount(
    client.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending")
  );

  const { data: recentOrders, error } = await client
    .from("orders")
    .select("id, customer_name, total_uyu, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalProducts,
    stockProducts,
    totalOrders,
    pendingOrders,
    recentOrders: error ? [] : (recentOrders ?? [])
  };
}
