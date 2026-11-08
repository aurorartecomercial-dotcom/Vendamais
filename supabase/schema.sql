-- VendaMais Pro — base de dados PostgreSQL/Supabase
-- Execute no SQL Editor de um projecto Supabase novo.
-- Esta migração prepara a persistência multiutilizador; não inclui chaves privadas.

create extension if not exists pgcrypto;

create type public.user_role as enum ('Administrador', 'Gerente', 'Caixa');
create type public.payment_status as enum ('Pago', 'Parcial', 'Pendente', 'Anulada');
create type public.document_status as enum ('Concluída', 'Devolvida', 'Anulada');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nif text not null unique,
  phone text,
  email text,
  address text,
  tax_rate numeric(5,2) not null default 14 check (tax_rate between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  initials text not null,
  role public.user_role not null default 'Caixa',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Evita políticas recursivas: devolve a empresa associada ao utilizador autenticado.
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() $$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_type text not null check (customer_type in ('Particular', 'Empresa')),
  name text not null,
  nif text,
  phone text,
  email text,
  billing_address text,
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  created_at timestamptz not null default now(),
  unique(company_id, nif)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  nif text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  barcode text,
  name text not null,
  category text,
  unit text not null default 'un.',
  warehouse text not null default 'Armazém principal',
  cost numeric(14,2) not null default 0 check (cost >= 0),
  price numeric(14,2) not null default 0 check (price >= 0),
  stock numeric(14,3) not null default 0 check (stock >= 0),
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  lot text,
  expiry_date date,
  created_at timestamptz not null default now(),
  unique(company_id, code),
  unique(company_id, barcode)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id),
  reference text not null,
  payment_method text not null,
  payment_status public.payment_status not null default 'Pago',
  total numeric(14,2) not null,
  amount_paid numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(company_id, reference)
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0)
);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  user_id uuid not null references public.profiles(id),
  payment_method text not null,
  amount numeric(14,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_amount numeric(14,2) not null default 0 check (opening_amount >= 0),
  expected_amount numeric(14,2),
  counted_amount numeric(14,2),
  difference numeric(14,2),
  status text not null default 'Aberto' check (status in ('Aberto', 'Fechado')),
  note text,
  closing_note text
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  operator_id uuid not null references public.profiles(id),
  cash_session_id uuid references public.cash_sessions(id),
  reference text not null,
  document_type text not null,
  document_status public.document_status not null default 'Concluída',
  payment_method text not null,
  payment_status public.payment_status not null default 'Pago',
  due_date date,
  customer_snapshot jsonb not null default '{}'::jsonb,
  subtotal numeric(14,2) not null,
  discount_value numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null,
  amount_paid numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(company_id, reference)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_snapshot jsonb not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  unit_cost numeric(14,2) not null,
  line_total numeric(14,2) not null
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id),
  user_id uuid references public.profiles(id),
  movement_type text not null check (movement_type in ('Entrada', 'Saída', 'Ajuste', 'Devolução')),
  quantity numeric(14,3) not null,
  note text,
  reference text,
  created_at timestamptz not null default now()
);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  user_id uuid not null references public.profiles(id),
  movement_type text not null check (movement_type in ('Entrada', 'Saída')),
  amount numeric(14,2) not null check (amount > 0),
  note text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index sales_company_created_at_idx on public.sales(company_id, created_at desc);
create index products_company_stock_idx on public.products(company_id, stock);
create index stock_movements_product_created_at_idx on public.stock_movements(product_id, created_at desc);
create index purchases_company_created_at_idx on public.purchases(company_id, created_at desc);

-- A aplicação deve definir app.company_id após autenticar.
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.cash_movements enable row level security;
alter table public.audit_logs enable row level security;

create policy "companies_same_company" on public.companies for select using (id = public.current_company_id());
create policy "profiles_same_company" on public.profiles for select using (company_id = public.current_company_id());
create policy "customers_same_company" on public.customers for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "suppliers_same_company" on public.suppliers for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "products_same_company" on public.products for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "purchases_same_company" on public.purchases for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "sales_same_company" on public.sales for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "cash_sessions_same_company" on public.cash_sessions for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "stock_same_company" on public.stock_movements for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "audit_same_company" on public.audit_logs for select using (company_id = public.current_company_id());
create policy "sale_items_same_company" on public.sale_items for all using (exists (select 1 from public.sales where sales.id = sale_id and sales.company_id = public.current_company_id())) with check (exists (select 1 from public.sales where sales.id = sale_id and sales.company_id = public.current_company_id()));
create policy "cash_movements_same_company" on public.cash_movements for all using (exists (select 1 from public.cash_sessions where cash_sessions.id = cash_session_id and cash_sessions.company_id = public.current_company_id())) with check (exists (select 1 from public.cash_sessions where cash_sessions.id = cash_session_id and cash_sessions.company_id = public.current_company_id()));
create policy "purchase_items_same_company" on public.purchase_items for all using (exists (select 1 from public.purchases where purchases.id = purchase_id and purchases.company_id = public.current_company_id())) with check (exists (select 1 from public.purchases where purchases.id = purchase_id and purchases.company_id = public.current_company_id()));
create policy "supplier_payments_same_company" on public.supplier_payments for all using (exists (select 1 from public.purchases where purchases.id = purchase_id and purchases.company_id = public.current_company_id())) with check (exists (select 1 from public.purchases where purchases.id = purchase_id and purchases.company_id = public.current_company_id()));
