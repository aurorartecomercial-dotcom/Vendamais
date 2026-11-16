-- VendaMais ERP — reforço de integridade financeira do livro de vendas.
-- Executar DEPOIS de schema.sql e 2026-11-professional-upgrade.sql.
-- A função recalcula preços, custo histórico, desconto, IVA e total no servidor.

create or replace function public.record_vendamais_sale(p_sale jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  v_validated_items jsonb := '[]'::jsonb;
  v_product jsonb;
  v_product_index bigint;
  v_quantity numeric;
  v_price numeric;
  v_cost numeric;
  v_stock numeric;
  v_total_stock numeric;
  v_subtotal numeric := 0;
  v_discount_pct numeric;
  v_discount numeric;
  v_tax_rate numeric;
  v_taxable numeric;
  v_tax numeric;
  v_total numeric;
  v_paid numeric;
  v_balance numeric;
  v_received numeric;
  v_sequence bigint;
  v_operator_name text;
  v_role text;
  v_matched boolean;
begin
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  if nullif(v_sale ->> 'id', '') is null then raise exception 'Venda sem identificador.'; end if;
  if v_location_id is null then raise exception 'Venda sem loja atribuída.'; end if;
  if coalesce(v_sale ->> 'status', 'Concluída') <> 'Concluída' then raise exception 'Só é possível registar uma venda concluída.'; end if;

  select role, full_name into v_role, v_operator_name
  from public.profiles where id = auth.uid() and active;
  if v_role is null then raise exception 'Perfil de utilizador inactivo ou inexistente.'; end if;
  if v_role = 'Vendedor' and v_location_id is distinct from public.current_location_id() then
    raise exception 'Não tem autorização para vender nesta loja.';
  end if;

  -- Primeira verificação idempotente: evita repetir uma venda já confirmada.
  select sale_data into v_existing
  from public.sales_ledger
  where company_id = v_company_id and sale_id = v_sale ->> 'id';
  if v_existing is not null then
    select revision into v_revision from public.business_snapshots where company_id = v_company_id;
    return jsonb_build_object('sale', v_existing, 'revision', v_revision, 'duplicate', true);
  end if;

  -- O bloqueio serializa as vendas da empresa; a segunda verificação fecha a corrida.
  select state, revision into v_state, v_revision
  from public.business_snapshots
  where company_id = v_company_id
  for update;
  if v_state is null then raise exception 'Estado da empresa não encontrado.'; end if;

  select sale_data into v_existing
  from public.sales_ledger
  where company_id = v_company_id and sale_id = v_sale ->> 'id';
  if v_existing is not null then
    return jsonb_build_object('sale', v_existing, 'revision', v_revision, 'duplicate', true);
  end if;

  v_tax_rate := coalesce(nullif(v_state #>> '{settings,taxRate}', '')::numeric, 0);
  if v_tax_rate < 0 or v_tax_rate > 100 then raise exception 'Taxa de IVA configurada inválida.'; end if;
  v_discount_pct := coalesce(nullif(v_sale ->> 'discount', '')::numeric, 0);
  if v_discount_pct < 0 or v_discount_pct > 100 then raise exception 'Percentagem de desconto inválida.'; end if;
  if v_role = 'Vendedor' and v_discount_pct <> 0 then raise exception 'O vendedor não tem autorização para aplicar descontos.'; end if;
  if jsonb_typeof(v_sale -> 'items') is distinct from 'array' then
    raise exception 'A venda deve conter uma lista válida de artigos.';
  end if;
  if jsonb_array_length(v_sale -> 'items') = 0 then
    raise exception 'A venda deve conter pelo menos um artigo.';
  end if;

  for v_item in select value from jsonb_array_elements(v_sale -> 'items') loop
    v_quantity := coalesce(nullif(v_item ->> 'quantity', '')::numeric, 0);
    if v_quantity <= 0 then raise exception 'Quantidade inválida na venda.'; end if;
    v_matched := false;
    for v_product_index, v_product in
      select ordinality - 1, value
      from jsonb_array_elements(coalesce(v_state -> 'products', '[]'::jsonb)) with ordinality
    loop
      if v_product ->> 'id' = v_item ->> 'productId' then
        v_matched := true;
        v_price := coalesce(nullif(v_product ->> 'price', '')::numeric, -1);
        v_cost := coalesce(nullif(v_product ->> 'cost', '')::numeric, -1);
        if v_price < 0 or v_cost < 0 then raise exception 'Preço ou custo inválido no cadastro do produto %.', coalesce(v_product ->> 'name', ''); end if;
        v_stock := coalesce(nullif(v_product #>> array['stockByLocation', v_location_id], '')::numeric, 0);
        if v_stock < v_quantity then raise exception 'Stock insuficiente para % na loja seleccionada.', coalesce(v_product ->> 'name', 'produto'); end if;
        v_product := jsonb_set(v_product, array['stockByLocation', v_location_id], to_jsonb(v_stock - v_quantity), true);
        select coalesce(sum(value::numeric), 0) into v_total_stock
        from jsonb_each_text(coalesce(v_product -> 'stockByLocation', '{}'::jsonb));
        v_product := jsonb_set(v_product, '{stock}', to_jsonb(v_total_stock), true);
        v_state := jsonb_set(v_state, array['products', v_product_index::text], v_product, false);
        v_subtotal := v_subtotal + (v_price * v_quantity);
        v_validated_items := v_validated_items || jsonb_build_array(
          v_item || jsonb_build_object(
            'name', coalesce(v_product ->> 'name', v_item ->> 'name', 'Produto'),
            'code', coalesce(v_product ->> 'code', v_item ->> 'code', ''),
            'price', v_price,
            'cost', v_cost,
            'quantity', v_quantity
          )
        );
        exit;
      end if;
    end loop;
    if not v_matched then raise exception 'Produto da venda não existe no catálogo central.'; end if;
  end loop;

  v_subtotal := round(v_subtotal, 2);
  v_discount := round(v_subtotal * v_discount_pct / 100, 2);
  v_taxable := round(v_subtotal - v_discount, 2);
  v_tax := round(v_taxable * v_tax_rate / 100, 2);
  v_total := round(v_taxable + v_tax, 2);

  -- O servidor rejeita divergências em vez de cobrar silenciosamente outro preço.
  if abs(coalesce(nullif(v_sale ->> 'subtotal', '')::numeric, -999999999) - v_subtotal) > 0.01
     or abs(coalesce(nullif(v_sale ->> 'discountValue', '')::numeric, -999999999) - v_discount) > 0.01
     or abs(coalesce(nullif(v_sale ->> 'tax', '')::numeric, -999999999) - v_tax) > 0.01
     or abs(coalesce(nullif(v_sale ->> 'total', '')::numeric, -999999999) - v_total) > 0.01 then
    raise exception 'Os preços, o desconto ou o IVA foram alterados. Actualize a venda e tente novamente.';
  end if;

  if coalesce(v_sale ->> 'payment', '') = 'Crédito' then
    if v_role = 'Vendedor' then raise exception 'O vendedor não tem autorização para vender a crédito.'; end if;
    v_paid := 0;
    v_balance := v_total;
  else
    v_paid := v_total;
    v_balance := 0;
    if coalesce(v_sale ->> 'payment', '') = 'Dinheiro' then
      v_received := coalesce(nullif(v_sale ->> 'amountReceived', '')::numeric, 0);
      if v_received + 0.001 < v_total then raise exception 'O valor recebido é inferior ao total da venda.'; end if;
    end if;
  end if;

  update public.companies
  set sale_sequence = sale_sequence + 1
  where id = v_company_id
  returning sale_sequence into v_sequence;

  v_sale := jsonb_set(v_sale, '{reference}', to_jsonb('VD-' || lpad(v_sequence::text, 6, '0')), true);
  v_sale := jsonb_set(v_sale, '{operatorId}', to_jsonb(auth.uid()::text), true);
  v_sale := jsonb_set(v_sale, '{operatorName}', to_jsonb(coalesce(v_operator_name, 'Operador')), true);
  v_sale := jsonb_set(v_sale, '{items}', v_validated_items, true);
  v_sale := jsonb_set(v_sale, '{subtotal}', to_jsonb(v_subtotal), true);
  v_sale := jsonb_set(v_sale, '{discountValue}', to_jsonb(v_discount), true);
  v_sale := jsonb_set(v_sale, '{taxRate}', to_jsonb(v_tax_rate), true);
  v_sale := jsonb_set(v_sale, '{tax}', to_jsonb(v_tax), true);
  v_sale := jsonb_set(v_sale, '{total}', to_jsonb(v_total), true);
  v_sale := jsonb_set(v_sale, '{amountPaid}', to_jsonb(v_paid), true);
  v_sale := jsonb_set(v_sale, '{balanceDue}', to_jsonb(v_balance), true);
  v_sale := jsonb_set(v_sale, '{paymentStatus}', to_jsonb(case when v_balance > 0 then 'Pendente' else 'Pago' end), true);
  v_sale := jsonb_set(v_sale, '{syncStatus}', to_jsonb('Sincronizada'::text), true);

  update public.business_snapshots
  set state = v_state, revision = revision + 1, updated_at = now(), updated_by = auth.uid()
  where company_id = v_company_id
  returning revision into v_next_revision;

  insert into public.sales_ledger(company_id, sale_id, location_id, occurred_at, total, status, sale_data, created_by)
  values (v_company_id, v_sale ->> 'id', v_location_id,
    coalesce(nullif(v_sale ->> 'date', '')::timestamptz, now()), v_total,
    'Concluída', v_sale, auth.uid());

  insert into public.audit_events(company_id, actor_id, action, detail, event_data)
  values (v_company_id, auth.uid(), 'Venda concluída', coalesce(v_sale ->> 'reference', 'Venda'), v_sale);

  if not exists (select 1 from public.business_backups where company_id = v_company_id and created_at::date = current_date) then
    insert into public.business_backups(company_id, state, created_by) values (v_company_id, v_state, auth.uid());
  end if;

  return jsonb_build_object('sale', v_sale, 'revision', v_next_revision, 'duplicate', false);
end;
$$;

grant execute on function public.record_vendamais_sale(jsonb, bigint) to authenticated;

comment on function public.record_vendamais_sale(jsonb, bigint) is
'Venda transaccional com validação no servidor de preço, custo, stock, desconto, IVA, total, pagamento e idempotência.';
