-- Reinicia apenas o Diário Financeiro da empresa autenticada.
-- Remove vendas/despesas de teste e os respectivos registos financeiros.
-- PRESERVA produtos, quantidades actuais, movimentos de inventário, compras,
-- clientes, fornecedores, lojas, utilizadores e demais dados de catálogo.
-- Executar no SQL Editor do Supabase; requer sessão de administrador.

create or replace function public.reset_vendamais_financial_diary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_state jsonb;
  v_sales integer := 0;
  v_expenses integer := 0;
  v_revision bigint;
begin
  if auth.uid() is null then raise exception 'Inicie sessão.'; end if;
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  if not public.is_company_manager() then raise exception 'Apenas o administrador ou gerente autorizado pode reiniciar o diário.'; end if;

  select state into v_state from public.business_snapshots
   where company_id = v_company_id for update;
  if v_state is null then raise exception 'Estado da empresa não encontrado.'; end if;

  v_sales := jsonb_array_length(coalesce(v_state -> 'sales', '[]'::jsonb));
  v_expenses := jsonb_array_length(coalesce(v_state -> 'expenses', '[]'::jsonb));

  -- Remover vendas do livro central para que os relatórios também comecem a zero.
  delete from public.sales_ledger where company_id = v_company_id;

  -- Limpar apenas colecções financeiras/transaccionais; não tocar em products/movements.
  v_state := jsonb_set(v_state, '{sales}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{expenses}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{expensePayments}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{receipts}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{journalEntries}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{cashMovements}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{meta,lastUpdated}', to_jsonb(now()::text), true);

  update public.business_snapshots set state = v_state, revision = revision + 1,
    updated_at = now(), updated_by = auth.uid()
   where company_id = v_company_id returning revision into v_revision;

  insert into public.audit_events(company_id, actor_id, action, detail)
  values (v_company_id, auth.uid(), 'Diário financeiro reiniciado',
    'Vendas e despesas de teste removidas; catálogo e stock preservados.');

  return jsonb_build_object('ok', true, 'removed_sales', v_sales,
    'removed_expenses', v_expenses, 'revision', v_revision, 'stock_preserved', true);
end;
$$;

revoke all on function public.reset_vendamais_financial_diary() from public, anon;
grant execute on function public.reset_vendamais_financial_diary() to authenticated;
