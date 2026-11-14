-- VendaMais Online — execute este ficheiro uma única vez no SQL Editor
-- de um projecto novo do Supabase. Não use a service_role key no navegador.

create extension if not exists pgcrypto;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  nif text,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('Administrador', 'Gerente', 'Vendedor')),
  location_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Guarda catálogo, stock, clientes, caixas, despesas e configurações.
-- Vendas ficam separadas no livro abaixo para que uma venda nunca seja perdida
-- quando duas lojas gravam em simultâneo.
create table public.business_snapshots (
  company_id uuid primary key references public.companies(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.sales_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sale_id text not null,
  location_id text not null,
  occurred_at timestamptz not null,
  total numeric(14,2) not null check (total >= 0),
  status text not null default 'Concluída',
  sale_data jsonb not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sale_id)
);

create index sales_ledger_company_day_idx on public.sales_ledger (company_id, occurred_at desc);
create index sales_ledger_company_location_day_idx on public.sales_ledger (company_id, location_id, occurred_at desc);

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_company_manager()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and active and role in ('Administrador', 'Gerente')) $$;

create or replace function public.current_location_id()
returns text language sql stable security definer set search_path = public
as $$ select location_id from public.profiles where id = auth.uid() $$;

-- Cria a primeira empresa depois de o administrador criar a conta no ecrã
-- de dados online. A função só pode criar uma empresa para o próprio utilizador.
create or replace function public.bootstrap_vendamais_company(
  p_company_name text,
  p_nif text,
  p_initial_state jsonb,
  p_initial_sales jsonb
)
returns table (id uuid, company_id uuid, full_name text, role text, location_id text, active boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_name text;
  v_location_id text;
begin
  if auth.uid() is null then raise exception 'É necessário iniciar sessão.'; end if;

  select p.id, p.company_id, p.full_name, p.role, p.location_id, p.active
    into id, company_id, full_name, role, location_id, active
  from public.profiles p where p.id = auth.uid();
  if found then return next; return; end if;

  v_name := nullif(trim(p_company_name), '');
  if v_name is null then raise exception 'Indique o nome da empresa.'; end if;
  v_location_id := coalesce(nullif(p_initial_state #>> '{settings,activeLocationId}', ''), 'loc_main');

  insert into public.companies (name, nif, owner_id)
  values (v_name, nullif(trim(p_nif), ''), auth.uid())
  returning companies.id into v_company_id;

  insert into public.profiles (id, company_id, full_name, role, location_id)
  values (auth.uid(), v_company_id, coalesce(nullif(auth.jwt() ->> 'email', ''), 'Administrador'), 'Administrador', v_location_id);

  insert into public.business_snapshots (company_id, state, revision, updated_by)
  values (v_company_id, coalesce(p_initial_state, '{}'::jsonb), 0, auth.uid());

  insert into public.sales_ledger (company_id, sale_id, location_id, occurred_at, total, status, sale_data, created_by)
  select
    v_company_id,
    sale ->> 'id',
    coalesce(nullif(sale ->> 'locationId', ''), v_location_id),
    coalesce(nullif(sale ->> 'date', '')::timestamptz, now()),
    coalesce(nullif(sale ->> 'total', '')::numeric, 0),
    coalesce(nullif(sale ->> 'status', ''), 'Concluída'),
    sale,
    auth.uid()
  from jsonb_array_elements(coalesce(p_initial_sales, '[]'::jsonb)) sale
  where coalesce(sale ->> 'id', '') <> ''
  on conflict (company_id, sale_id) do nothing;

  return query select p.id, p.company_id, p.full_name, p.role, p.location_id, p.active
  from public.profiles p where p.id = auth.uid();
end;
$$;

-- Atualização optimista do estado que não é venda. Se outra loja tiver gravado
-- antes, não actualiza nada; o navegador descarrega a versão mais recente.
create or replace function public.save_vendamais_state(p_state jsonb, p_expected_revision bigint)
returns table (revision bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if public.current_company_id() is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  update public.business_snapshots
     set state = coalesce(p_state, '{}'::jsonb), revision = business_snapshots.revision + 1,
         updated_at = now(), updated_by = auth.uid()
   where company_id = public.current_company_id() and revision = p_expected_revision
  returning business_snapshots.revision into revision;
  if found then return next; end if;
end;
$$;

-- Usada pelo administrador depois de criar a conta do operador em
-- Authentication > Users. Exemplo:
-- select public.provision_vendamais_user('UUID-DO-OPERADOR', 'Maria Silva', 'Vendedor', 'loc_loja_baia');
create or replace function public.provision_vendamais_user(
  p_user_id uuid, p_full_name text, p_role text, p_location_id text default null
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_company_manager() then raise exception 'Apenas administrador ou gerente pode atribuir operadores.'; end if;
  if p_role not in ('Administrador', 'Gerente', 'Vendedor') then raise exception 'Função inválida.'; end if;
  insert into public.profiles (id, company_id, full_name, role, location_id)
  values (p_user_id, public.current_company_id(), nullif(trim(p_full_name), ''), p_role, nullif(trim(p_location_id), ''))
  on conflict (id) do update set company_id = excluded.company_id, full_name = excluded.full_name,
    role = excluded.role, location_id = excluded.location_id, active = true;
end;
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.business_snapshots enable row level security;
alter table public.sales_ledger enable row level security;

create policy companies_select_own on public.companies for select using (id = public.current_company_id());
create policy profiles_select_company on public.profiles for select using (company_id = public.current_company_id());
create policy snapshot_select_company on public.business_snapshots for select using (company_id = public.current_company_id());
create policy sales_select_company on public.sales_ledger for select using (company_id = public.current_company_id());
create policy sales_insert_assigned_store on public.sales_ledger for insert with check (
  company_id = public.current_company_id() and created_by = auth.uid()
  and (public.is_company_manager() or location_id = public.current_location_id())
);
create policy sales_update_own_or_manager on public.sales_ledger for update
  using (company_id = public.current_company_id() and (created_by = auth.uid() or public.is_company_manager()))
  with check (company_id = public.current_company_id());

grant execute on function public.bootstrap_vendamais_company(text, text, jsonb, jsonb) to authenticated;
grant execute on function public.save_vendamais_state(jsonb, bigint) to authenticated;
grant execute on function public.provision_vendamais_user(uuid, text, text, text) to authenticated;

-- Realtime permite que o administrador veja novas vendas sem actualizar a página.
alter table public.business_snapshots replica identity full;
alter table public.sales_ledger replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'business_snapshots') then
      execute 'alter publication supabase_realtime add table public.business_snapshots';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sales_ledger') then
      execute 'alter publication supabase_realtime add table public.sales_ledger';
    end if;
  end if;
end;
$$;
