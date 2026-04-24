-- =========================================
-- JARAMA · ETAPA 5
-- Mejoras de productos + métricas base
-- =========================================

alter table public.products
  add column if not exists badges jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists available_colors jsonb not null default '[]'::jsonb;

update public.products
set badges = case
  when jsonb_array_length(coalesce(badges, '[]'::jsonb)) = 0 and featured = true then '["destacado"]'::jsonb
  else coalesce(badges, '[]'::jsonb)
end;

update public.products
set available_colors = coalesce(available_colors, '[]'::jsonb);
