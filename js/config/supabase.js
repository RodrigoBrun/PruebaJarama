export const SUPABASE_URL = "https://uinlbpkqwcsqddpcuohu.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_d1Q911jcrBE2fVk2V1j-Iw_reXKGPA7";
export const ALLOWED_ADMIN_EMAIL = "rodrigobrun4@gmail.com";

export function isSupabaseConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY &&
    (SUPABASE_ANON_KEY.startsWith("sb_publishable_") || SUPABASE_ANON_KEY.startsWith("eyJ")) &&
    ALLOWED_ADMIN_EMAIL &&
    ALLOWED_ADMIN_EMAIL.includes("@")
  );
}
