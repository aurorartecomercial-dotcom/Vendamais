-- VendaMais ERP — Central de Aprovação Remota de Descontos
-- Executar DEPOIS de schema.sql, 2026-11-professional-upgrade.sql e
-- 2026-11-financial-integrity.sql.

create table if not exists public.discount_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete restrict,
  requester_name text not null,
  product_id text not null,
  product_name text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_percent numeric(7,3) not null check (discount_percent > 0 and discount_percent <= 100),
  discount_value numeric(14,2) not null check (discount_value >= 0),
  reason text not null check (length(trim(reason)) > 0),
  location_id text not null,
  cash_session_id text not null default '',
  status text not null default 'Pendente' check (status in ('Pendente','Aprovado','Rejeitado','Utilizado','Expirado')),
  decided_by uuid references auth.users(id),
  decided_name text,
  decided_at timestamptz,
  decision_note text not null default '',
  sale_id text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists discount_requests_company_status_created_idx
  on public.discount_requests(company_id, status, created_at desc);
create index if not exists discount_requests_requester_idx
  on public.discount_requests(company_id, requester_id, created_at desc);

alter table public.discount_requests enable row level security;
grant select on public.discount_requests to authenticated;
drop policy if exists discount_requests_read_company on public.discount_requests;
create policy discount_requests_read_company on public.discount_requests
for select to authenticated
using (
  company_id = public.current_company_id()
  and (requester_id = auth.uid() or public.is_company_manager())
);

create or replace function public.request_vendamais_discount(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_role text;
  v_name text;
  v_state jsonb;
  v_product jsonb;
  v_location text := coalesce(nullif(p_request ->> 'location_id',''), '');
  v_product_id text := coalesce(nullif(p_request ->> 'product_id',''), '');
  v_quantity numeric := coalesce(nullif(p_request ->> 'quantity','')::numeric, 0);
  v_unit_price numeric := coalesce(nullif(p_request ->> 'unit_price','')::numeric, -1);
  v_pct numeric := coalesce(nullif(p_request ->> 'discount_percent','')::numeric, 0);
  v_reason text := trim(coalesce(p_request ->> 'reason',''));
  v_stock numeric := 0;
  v_result public.discount_requests;
begin
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  select role, full_name into v_role, v_name from public.profiles where id = auth.uid() and active;
  if v_role is distinct from 'Vendedor' then raise exception 'A solicitação remota está disponível para vendedores.'; end if;
  if v_location is distinct from public.current_location_id() then raise exception 'Não pode solicitar desconto para outra loja.'; end if;
  if v_product_id = '' or v_quantity <= 0 or v_unit_price < 0 or v_pct <= 0 or v_pct > 100 or v_reason = '' then
    raise exception 'Os dados do pedido de desconto são inválidos.';
  end if;
  select state into v_state from public.business_snapshots where company_id = v_company_id;
  select value into v_product from jsonb_array_elements(coalesce(v_state -> 'products','[]'::jsonb)) where value ->> 'id' = v_product_id limit 1;
  if v_product is null then raise exception 'Produto não encontrado no catálogo da empresa.'; end if;
  if abs(coalesce(nullif(v_product ->> 'price','')::numeric, -999999) - v_unit_price) > 0.01 then raise exception 'O preço do produto foi alterado. Actualize o carrinho.'; end if;
  v_stock := coalesce(nullif(v_product #>> array['stockByLocation',v_location],'')::numeric, 0);
  if v_stock < v_quantity then raise exception 'Stock insuficiente para solicitar o desconto.'; end if;

  insert into public.discount_requests(company_id, requester_id, requester_name, product_id, product_name, quantity, unit_price, discount_percent, discount_value, reason, location_id, cash_session_id)
  values (v_company_id, auth.uid(), coalesce(v_name,'Vendedor'), v_product_id,
    coalesce(v_product ->> 'name', p_request ->> 'product_name', 'Produto'), v_quantity, v_unit_price, v_pct,
    round(v_unit_price * v_quantity * v_pct / 100, 2), v_reason, v_location,
    coalesce(p_request ->> 'cash_session_id','')) returning * into v_result;
  insert into public.audit_events(company_id, actor_id, action, detail, event_data)
  values (v_company_id, auth.uid(), 'Pedido de desconto', v_result.product_name || ' · ' || v_pct || '%', to_jsonb(v_result));
  return to_jsonb(v_result);
end;
$$;

create or replace function public.review_vendamais_discount(p_request_id uuid, p_approve boolean, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_name text;
  v_role text;
  v_request public.discount_requests;
begin
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  select full_name, role into v_name, v_role from public.profiles where id = auth.uid() and active;
  if v_role is distinct from 'Administrador' then raise exception 'Apenas o administrador pode decidir pedidos de desconto.'; end if;
  select * into v_request from public.discount_requests
  where id = p_request_id and company_id = v_company_id for update;
  if not found then raise exception 'Pedido de desconto não encontrado.'; end if;
  if v_request.status <> 'Pendente' then raise exception 'Este pedido já foi decidido ou utilizado.'; end if;
  update public.discount_requests set
    status = case when p_approve then 'Aprovado' else 'Rejeitado' end,
    decided_by = auth.uid(), decided_name = coalesce(v_name,'Gestor'), decided_at = now(),
    decision_note = left(trim(coalesce(p_note,'')), 500)
  where id = p_request_id returning * into v_request;
  insert into public.audit_events(company_id, actor_id, action, detail, event_data)
  values (v_company_id, auth.uid(), case when p_approve then 'Desconto aprovado' else 'Desconto rejeitado' end,
    v_request.product_name || ' · ' || v_request.discount_percent || '% · solicitado por ' || v_request.requester_name, to_jsonb(v_request));
  return to_jsonb(v_request);
end;
$$;

grant execute on function public.request_vendamais_discount(jsonb) to authenticated;
grant execute on function public.review_vendamais_discount(uuid, boolean, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'discount_requests') then
    alter publication supabase_realtime add table public.discount_requests;
  end if;
end;
$$;

comment on table public.discount_requests is 'Pedidos de desconto por produto, com aprovação remota e trilho de auditoria.';
