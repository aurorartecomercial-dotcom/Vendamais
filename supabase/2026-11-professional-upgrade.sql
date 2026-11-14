-- VendaMais Professional Upgrade
-- Execute este ficheiro DEPOIS de schema.sql (ou corrigir-funcoes.sql, se aplicável).
-- É seguro executar uma vez numa empresa já existente.

alter table public.companies add column if not exists sale_sequence bigint not null default 0;
create unique index if not exists companies_nif_unique on public.companies(nif) where nif is not null;

update public.companies c
set sale_sequence = greatest(c.sale_sequence, coalesce((
  select count(*) from public.sales_ledger s where s.company_id = c.id
), 0));

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.business_backups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  state jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  status text not null default 'Pendente' check (status in ('Pendente', 'Aprovado', 'Recusado')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists audit_events_company_created_idx on public.audit_events(company_id, created_at desc);
create index if not exists business_backups_company_created_idx on public.business_backups(company_id, created_at desc);
create index if not exists access_requests_company_status_idx on public.access_requests(company_id, status, requested_at);

drop policy if exists sales_select_company on public.sales_ledger;
create policy sales_select_assigned_store on public.sales_ledger for select
  using (
    company_id = public.current_company_id()
    and (public.is_company_manager() or location_id = public.current_location_id())
  );

alter table public.audit_events enable row level security;
alter table public.business_backups enable row level security;
alter table public.access_requests enable row level security;

drop policy if exists audit_events_select_company on public.audit_events;
create policy audit_events_select_company on public.audit_events for select
  using (company_id = public.current_company_id() and public.is_company_manager());

drop policy if exists business_backups_select_company on public.business_backups;
create policy business_backups_select_company on public.business_backups for select
  using (company_id = public.current_company_id() and public.is_company_manager());

drop policy if exists access_requests_requester_or_manager on public.access_requests;
create policy access_requests_requester_or_manager on public.access_requests for select
  using (user_id = auth.uid() or (company_id = public.current_company_id() and public.is_company_manager()));

-- Venda central: reserva e baixa o stock do local, numera o documento,
-- grava a venda, auditoria e uma cópia diária numa única transacção.
create or replace function public.record_vendamais_sale(p_sale jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_state jsonb;
  v_revision bigint;
  v_next_revision bigint;
  v_sale jsonb := coalesce(p_sale, '{}'::jsonb);
  v_existing jsonb;
  v_location_id text := nullif(p_sale ->> 'locationId', '');
  v_item jsonb;
  v_product jsonb;
  v_product_index bigint;
  v_quantity numeric;
  v_stock numeric;
  v_total_stock numeric;
  v_sequence bigint;
  v_operator_name text;
  v_matched boolean;
begin
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  if nullif(v_sale ->> 'id', '') is null then raise exception 'Venda sem identificador.'; end if;
  if v_location_id is null then raise exception 'Venda sem loja atribuída.'; end if;
  if not public.is_company_manager() and v_location_id is distinct from public.current_location_id() then
    raise exception 'Não tem autorização para vender nesta loja.';
  end if;
  select full_name into v_operator_name from public.profiles where id = auth.uid();

  select sale_data into v_existing
  from public.sales_ledger
  where company_id = v_company_id and sale_id = v_sale ->> 'id';
  if v_existing is not null then
    select revision into v_revision from public.business_snapshots where company_id = v_company_id;
    return jsonb_build_object('sale', v_existing, 'revision', v_revision, 'duplicate', true);
  end if;

  select state, revision into v_state, v_revision
  from public.business_snapshots
  where company_id = v_company_id
  for update;
  if v_state is null then raise exception 'Estado da empresa não encontrado.'; end if;

  for v_item in select value from jsonb_array_elements(coalesce(v_sale -> 'items', '[]'::jsonb)) loop
    v_quantity := coalesce(nullif(v_item ->> 'quantity', '')::numeric, 0);
    if v_quantity <= 0 then raise exception 'Quantidade inválida na venda.'; end if;
    v_matched := false;
    for v_product_index, v_product in
      select ordinality - 1, value
      from jsonb_array_elements(coalesce(v_state -> 'products', '[]'::jsonb)) with ordinality
    loop
      if v_product ->> 'id' = v_item ->> 'productId' then
        v_matched := true;
        v_stock := coalesce(nullif(v_product #>> array['stockByLocation', v_location_id], '')::numeric, 0);
        if v_stock < v_quantity then
          raise exception 'Stock insuficiente para % na loja seleccionada.', coalesce(v_product ->> 'name', 'produto');
        end if;
        v_product := jsonb_set(v_product, array['stockByLocation', v_location_id], to_jsonb(v_stock - v_quantity), true);
        select coalesce(sum(value::numeric), 0) into v_total_stock
        from jsonb_each_text(coalesce(v_product -> 'stockByLocation', '{}'::jsonb));
        v_product := jsonb_set(v_product, '{stock}', to_jsonb(v_total_stock), true);
        v_state := jsonb_set(v_state, array['products', v_product_index::text], v_product, false);
        exit;
      end if;
    end loop;
    if not v_matched then raise exception 'Produto da venda não existe no catálogo central.'; end if;
  end loop;

  update public.companies
  set sale_sequence = sale_sequence + 1
  where id = v_company_id
  returning sale_sequence into v_sequence;
  v_sale := jsonb_set(v_sale, '{reference}', to_jsonb('VD-' || lpad(v_sequence::text, 6, '0')), true);
  v_sale := jsonb_set(v_sale, '{operatorId}', to_jsonb(auth.uid()::text), true);
  v_sale := jsonb_set(v_sale, '{operatorName}', to_jsonb(coalesce(v_operator_name, 'Operador')), true);
  v_sale := jsonb_set(v_sale, '{syncStatus}', to_jsonb('Sincronizada'), true);

  update public.business_snapshots
  set state = v_state,
      revision = revision + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where company_id = v_company_id
  returning revision into v_next_revision;

  insert into public.sales_ledger(company_id, sale_id, location_id, occurred_at, total, status, sale_data, created_by)
  values (
    v_company_id, v_sale ->> 'id', v_location_id,
    coalesce(nullif(v_sale ->> 'date', '')::timestamptz, now()),
    coalesce(nullif(v_sale ->> 'total', '')::numeric, 0),
    coalesce(nullif(v_sale ->> 'status', ''), 'Concluída'), v_sale, auth.uid()
  );
  insert into public.audit_events(company_id, actor_id, action, detail, event_data)
  values (v_company_id, auth.uid(), 'Venda concluída', coalesce(v_sale ->> 'reference', 'Venda'), v_sale);
  if not exists (select 1 from public.business_backups where company_id = v_company_id and created_at::date = current_date) then
    insert into public.business_backups(company_id, state, created_by) values (v_company_id, v_state, auth.uid());
  end if;
  return jsonb_build_object('sale', v_sale, 'revision', v_next_revision, 'duplicate', false);
end;
$$;

-- Mantém auditoria e uma cópia diária também nas restantes operações sincronizadas.
create or replace function public.save_vendamais_state(p_state jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_next_revision bigint;
  v_action text;
  v_detail text;
begin
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  update public.business_snapshots
     set state = coalesce(p_state, '{}'::jsonb),
         revision = public.business_snapshots.revision + 1,
         updated_at = now(), updated_by = auth.uid()
   where public.business_snapshots.company_id = v_company_id
     and public.business_snapshots.revision = p_expected_revision
  returning public.business_snapshots.revision into v_next_revision;
  if not found then return null; end if;

  v_action := coalesce(p_state #>> '{auditLog,0,action}', 'Dados sincronizados');
  v_detail := coalesce(p_state #>> '{auditLog,0,detail}', 'Alteração operacional sincronizada');
  insert into public.audit_events(company_id, actor_id, action, detail)
  values (v_company_id, auth.uid(), v_action, v_detail);
  if not exists (select 1 from public.business_backups where company_id = v_company_id and created_at::date = current_date) then
    insert into public.business_backups(company_id, state, created_by) values (v_company_id, p_state, auth.uid());
  end if;
  return jsonb_build_object('revision', v_next_revision);
end;
$$;

-- Um operador cria a conta pelo VendaMais e pede acesso com o NIF da empresa.
create or replace function public.request_vendamais_access(p_company_nif text, p_full_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'Inicie sessão antes de pedir acesso.'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    return jsonb_build_object('status', 'Já possui acesso');
  end if;
  select id into v_company_id from public.companies where nif = nullif(trim(p_company_nif), '');
  if v_company_id is null then raise exception 'Empresa não encontrada. Confirme o NIF.'; end if;
  insert into public.access_requests(company_id, user_id, full_name, status, requested_at, reviewed_at, reviewed_by)
  values (v_company_id, auth.uid(), nullif(trim(p_full_name), ''), 'Pendente', now(), null, null)
  on conflict (user_id) do update set company_id = excluded.company_id, full_name = excluded.full_name,
    status = 'Pendente', requested_at = now(), reviewed_at = null, reviewed_by = null;
  return jsonb_build_object('status', 'Pendente');
end;
$$;

-- O gerente aprova dentro da aplicação e associa o operador à loja correcta.
create or replace function public.review_vendamais_access(p_request_id uuid, p_role text, p_location_id text, p_approve boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_request public.access_requests%rowtype;
begin
  if not public.is_company_manager() then raise exception 'Apenas administrador ou gerente pode gerir acessos.'; end if;
  select * into v_request from public.access_requests where id = p_request_id for update;
  if not found or v_request.company_id is distinct from public.current_company_id() then raise exception 'Pedido de acesso não encontrado.'; end if;
  if p_approve then
    if p_role not in ('Administrador', 'Gerente', 'Vendedor') then raise exception 'Função inválida.'; end if;
    insert into public.profiles(id, company_id, full_name, role, location_id)
    values (v_request.user_id, v_request.company_id, v_request.full_name, p_role, nullif(p_location_id, ''))
    on conflict (id) do update set company_id = excluded.company_id, full_name = excluded.full_name,
      role = excluded.role, location_id = excluded.location_id, active = true;
    update public.access_requests set status = 'Aprovado', reviewed_at = now(), reviewed_by = auth.uid() where id = p_request_id;
    insert into public.audit_events(company_id, actor_id, action, detail)
    values (v_request.company_id, auth.uid(), 'Acesso aprovado', v_request.full_name || ' · ' || p_role);
    return jsonb_build_object('status', 'Aprovado');
  end if;
  update public.access_requests set status = 'Recusado', reviewed_at = now(), reviewed_by = auth.uid() where id = p_request_id;
  insert into public.audit_events(company_id, actor_id, action, detail)
  values (v_request.company_id, auth.uid(), 'Acesso recusado', v_request.full_name);
  return jsonb_build_object('status', 'Recusado');
end;
$$;

grant execute on function public.record_vendamais_sale(jsonb, bigint) to authenticated;
grant execute on function public.request_vendamais_access(text, text) to authenticated;
grant execute on function public.review_vendamais_access(uuid, text, text, boolean) to authenticated;
