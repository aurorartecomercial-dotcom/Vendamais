-- VendaMais ERP Modular 2.4.0
-- Migração ADITIVA. Rever num ambiente de teste e fazer backup antes de executar.
-- Não apaga nem reescreve dados comerciais existentes.

create table if not exists public.company_modules (
  company_id uuid not null references public.companies(id) on delete cascade,
  module_key text not null check (module_key in ('commerce','restaurant','hotel','accounting','hr','school','health')),
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (company_id, module_key)
);

create table if not exists public.profile_permissions (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  allowed boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id, permission_key)
);

create table if not exists public.restaurant_tables (
  id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  location_id text not null,
  name text not null,
  capacity integer not null default 4 check (capacity between 1 and 50),
  status text not null default 'Livre' check (status in ('Livre','Ocupada','Reservada')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, id)
);

create table if not exists public.restaurant_orders (
  id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  table_id text not null,
  location_id text not null,
  reference text not null,
  status text not null default 'Recebido' check (status in ('Recebido','Em preparação','Pronto','Servido','Cancelado')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, id),
  foreign key (company_id, table_id) references public.restaurant_tables(company_id, id) on delete restrict,
  unique (company_id, reference)
);

create index if not exists restaurant_tables_company_location_idx
  on public.restaurant_tables(company_id, location_id, active);
create index if not exists restaurant_orders_company_location_status_idx
  on public.restaurant_orders(company_id, location_id, status, created_at desc);

create or replace function public.is_company_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'Administrador'
  );
$$;

-- O administrador tem controlo total. Os overrides só são escritos pelo
-- administrador; a função bloqueia sempre permissões administrativas para
-- perfis não administradores.
create or replace function public.has_vendamais_permission(p_permission_key text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_role text;
  v_override boolean;
begin
  if auth.uid() is null or nullif(trim(p_permission_key), '') is null then return false; end if;
  select role into v_role from public.profiles where id = auth.uid() and active;
  if v_role is null then return false; end if;
  if v_role = 'Administrador' then return true; end if;
  if p_permission_key in ('admin.manage','settings.manage','users.manage','company.reset','permissions.manage','modules.manage') then return false; end if;

  select allowed into v_override
    from public.profile_permissions
   where company_id = public.current_company_id()
     and user_id = auth.uid()
     and permission_key = p_permission_key;
  if found then return coalesce(v_override, false); end if;

  if v_role = 'Gerente' then
    return p_permission_key in (
      'dashboard.view','pos.use','cash.manage','documents.view',
      'products.manage','inventory.manage','customers.manage',
      'suppliers.manage','purchases.manage','reports.view','restaurant.manage'
    );
  elsif v_role = 'Vendedor' then
    return p_permission_key in ('dashboard.view','pos.use','cash.self','documents.own');
  end if;
  return false;
end;
$$;

alter table public.company_modules enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.restaurant_orders enable row level security;

-- Módulos: todos os membros activos da empresa podem consultar; só admin altera.
drop policy if exists company_modules_select on public.company_modules;
create policy company_modules_select on public.company_modules for select
  using (company_id = public.current_company_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active));
drop policy if exists company_modules_admin_write on public.company_modules;
create policy company_modules_admin_write on public.company_modules for all
  using (company_id = public.current_company_id() and public.is_company_admin())
  with check (company_id = public.current_company_id() and public.is_company_admin());

-- Permissões: o utilizador consulta as próprias; administradores gerem todas.
drop policy if exists profile_permissions_select on public.profile_permissions;
create policy profile_permissions_select on public.profile_permissions for select
  using (company_id = public.current_company_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active) and (user_id = auth.uid() or public.is_company_admin()));
drop policy if exists profile_permissions_admin_write on public.profile_permissions;
create policy profile_permissions_admin_write on public.profile_permissions for all
  using (company_id = public.current_company_id() and public.is_company_admin())
  with check (
    company_id = public.current_company_id()
    and public.is_company_admin()
    and exists (select 1 from public.profiles p where p.id = profile_permissions.user_id and p.company_id = profile_permissions.company_id and p.active and p.role <> 'Administrador')
  );

-- Restaurante: acesso apenas a utilizadores autorizados e sempre dentro da empresa.
drop policy if exists restaurant_tables_select on public.restaurant_tables;
create policy restaurant_tables_select on public.restaurant_tables for select
  using (company_id = public.current_company_id() and public.has_vendamais_permission('restaurant.manage'));
drop policy if exists restaurant_tables_write on public.restaurant_tables;
create policy restaurant_tables_write on public.restaurant_tables for all
  using (company_id = public.current_company_id() and public.has_vendamais_permission('restaurant.manage'))
  with check (company_id = public.current_company_id() and public.has_vendamais_permission('restaurant.manage'));

drop policy if exists restaurant_orders_select on public.restaurant_orders;
create policy restaurant_orders_select on public.restaurant_orders for select
  using (company_id = public.current_company_id() and public.has_vendamais_permission('restaurant.manage'));
drop policy if exists restaurant_orders_write on public.restaurant_orders;
create policy restaurant_orders_write on public.restaurant_orders for all
  using (company_id = public.current_company_id() and public.has_vendamais_permission('restaurant.manage'))
  with check (
    company_id = public.current_company_id()
    and public.has_vendamais_permission('restaurant.manage')
    and exists (
      select 1 from public.restaurant_tables t
      where t.company_id = restaurant_orders.company_id and t.id = restaurant_orders.table_id and t.location_id = restaurant_orders.location_id and t.active
    )
  );

-- Inicializa apenas o módulo comercial como activo para empresas existentes.
insert into public.company_modules(company_id, module_key, enabled)
select id, 'commerce', true from public.companies
on conflict (company_id, module_key) do nothing;
insert into public.company_modules(company_id, module_key, enabled)
select id, 'restaurant', false from public.companies
on conflict (company_id, module_key) do nothing;

-- Corrige a autorização da rotina destrutiva: apenas Administrador pode limpar.
create or replace function public.reset_vendamais_business_data()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_state jsonb;
  v_zero_costs jsonb := '{"Renda":0,"Energia":0,"Água":0,"Internet":0,"Salários":0,"Segurança":0,"Outros":0}'::jsonb;
  v_revision bigint;
begin
  if auth.uid() is null then raise exception 'Inicie sessão.'; end if;
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  if not public.is_company_admin() then raise exception 'Apenas o administrador pode limpar os dados comerciais.'; end if;

  select state into v_state from public.business_snapshots where company_id = v_company_id for update;
  if v_state is null then raise exception 'Estado da empresa não encontrado.'; end if;
  delete from public.sales_ledger where company_id = v_company_id;
  v_state := jsonb_set(coalesce(v_state, '{}'::jsonb), '{products}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{customers}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{suppliers}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{sales}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{purchases}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{movements}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{receipts}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{supplierPayments}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{transfers}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{cashSessions}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{cashMovements}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{expenses}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{returns}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{restaurantTables}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{restaurantOrders}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{auditLog}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{locations}', coalesce((
    select jsonb_agg(jsonb_set(location, '{fixedCosts}', v_zero_costs, true) order by ordinality)
    from jsonb_array_elements(coalesce(v_state -> 'locations', '[]'::jsonb)) with ordinality as item(location, ordinality)
  ), '[]'::jsonb), true);
  update public.business_snapshots set state = v_state, revision = revision + 1,
    updated_at = now(), updated_by = auth.uid()
   where company_id = v_company_id returning revision into v_revision;
  insert into public.audit_events(company_id, actor_id, action, detail)
  values (v_company_id, auth.uid(), 'Dados comerciais limpos', 'Operação executada exclusivamente pelo administrador.');
  return jsonb_build_object('ok', true, 'revision', v_revision);
end;
$$;
revoke all on function public.reset_vendamais_business_data() from public;
grant execute on function public.reset_vendamais_business_data() to authenticated;

-- Funções de autorização são consultadas por policies/RPCs futuras e não
-- substituem a revisão das policies e das funções financeiras existentes.
revoke all on function public.is_company_admin() from public;
revoke all on function public.has_vendamais_permission(text) from public;
grant execute on function public.is_company_admin() to authenticated;
grant execute on function public.has_vendamais_permission(text) to authenticated;
