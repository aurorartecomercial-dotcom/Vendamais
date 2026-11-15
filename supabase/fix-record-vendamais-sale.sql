-- Correcao pontual do erro "could not determine polymorphic type because input has type unknown".
-- Execute no Supabase SQL Editor. Recria apenas a funcao de registo de vendas.
-- Nao apaga nem altera vendas existentes, tabelas ou dados.

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
  v_sale := jsonb_set(v_sale, '{syncStatus}', to_jsonb('Sincronizada'::text), true);

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

grant execute on function public.record_vendamais_sale(jsonb, bigint) to authenticated;
