-- =========================================
-- JARAMA · ETAPA 3
-- Auth privado para Soledad + base inicial
-- =========================================

create extension if not exists "pgcrypto";

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text,
  code text unique,
  price_uyu numeric(12,2) not null default 0,
  in_stock boolean not null default true,
  featured boolean not null default false,
  summary text,
  description text,
  material text,
  measures jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  shipping_method text,
  payment_method text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'delivered')),
  total_uyu numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_uyu numeric(12,2) not null default 0,
  subtotal_uyu numeric(12,2) not null default 0
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles
create policy if not exists "profiles_admin_select"
on public.profiles
for select
using (public.is_admin());

create policy if not exists "profiles_self_select"
on public.profiles
for select
using (auth.uid() = id);

create policy if not exists "profiles_self_update"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Products
create policy if not exists "products_public_read"
on public.products
for select
using (true);

create policy if not exists "products_admin_all"
on public.products
for all
using (public.is_admin())
with check (public.is_admin());

-- Orders
create policy if not exists "orders_admin_all"
on public.orders
for all
using (public.is_admin())
with check (public.is_admin());

create policy if not exists "order_items_admin_all"
on public.order_items
for all
using (public.is_admin())
with check (public.is_admin());

-- =========================================
-- PASOS MANUALES IMPORTANTES
-- =========================================
-- 1) Crear el usuario de Soledad en Authentication > Users
-- 2) Insertar su perfil como admin. Ejemplo:
--
-- insert into public.profiles (id, email, full_name, role)
-- values (
--   'UUID_DEL_USUARIO_AUTH',
--   'MAIL_REAL_DE_SOLEDAD',
--   'Soledad',
--   'admin'
-- );
--
-- 3) Editar js/admin/supabase-config.js con:
--    - SUPABASE_URL
--    - SUPABASE_ANON_KEY
--    - ALLOWED_ADMIN_EMAIL
