-- Solo corré esto si la tienda pública no puede leer products desde Supabase.
grant usage on schema public to anon, authenticated;
grant select on table public.products to anon, authenticated;
