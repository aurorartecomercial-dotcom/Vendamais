-- Remove apenas despesas e liquidações de despesas da empresa autenticada.
-- Preserva produtos, stock, movimentos de inventário, compras, vendas,
-- clientes, fornecedores, recebimentos e pagamentos a fornecedores.
-- Execute no SQL Editor do Supabase, com a sessão do administrador da empresa.

create or replace function public.clear_vendamais_expenses_only()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_state jsonb;
  v_removed_expenses integer := 0;
  v_removed_expense_payments integer := 0;
  v_removed_journal integer := 0;
  v_removed_cash integer := 0;
  v_revision bigint;
begin
  if auth.uid() is null then raise exception 'Inicie sessão.'; end if;
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  if not public.is_company_manager() then
    raise exception 'Apenas o administrador ou gerente autorizado pode limpar despesas.';
  end if;

  select state into v_state
    from public.business_snapshots
   where company_id = v_company_id
   for update;
  if v_state is null then raise exception 'Estado da empresa não encontrado.'; end if;

  v_removed_expenses := jsonb_array_length(coalesce(v_state -> 'expenses', '[]'::jsonb));
  v_removed_expense_payments := jsonb_array_length(coalesce(v_state -> 'expensePayments', '[]'::jsonb));
  v_removed_journal := (
    select count(*) from jsonb_array_elements(coalesce(v_state -> 'journalEntries', '[]'::jsonb)) e
     where e ->> 'sourceType' in ('expense', 'expense-payment')
        or coalesce(e ->> 'idempotencyKey', '') like 'expense:%'
        or coalesce(e ->> 'idempotencyKey', '') like 'expense-payment:%'
  );
  v_removed_cash := (
    select count(*) from jsonb_array_elements(coalesce(v_state -> 'cashMovements', '[]'::jsonb)) m
     where coalesce(m ->> 'note', '') ~* '^(Despesa:|Liquidação de despesa:)'
  );

  v_state := jsonb_set(v_state, '{expenses}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{expensePayments}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{journalEntries}', coalesce((
    select jsonb_agg(e order by ordinality)
      from jsonb_array_elements(coalesce(v_state -> 'journalEntries', '[]'::jsonb)) with ordinality as x(e, ordinality)
     where e ->> 'sourceType' not in ('expense', 'expense-payment')
       and coalesce(e ->> 'idempotencyKey', '') not like 'expense:%'
       and coalesce(e ->> 'idempotencyKey', '') not like 'expense-payment:%'
  ), '[]'::jsonb), true);
  v_state := jsonb_set(v_state, '{cashMovements}', coalesce((
    select jsonb_agg(m order by ordinality)
      from jsonb_array_elements(coalesce(v_state -> 'cashMovements', '[]'::jsonb)) with ordinality as x(m, ordinality)
     where coalesce(m ->> 'note', '') !~* '^(Despesa:|Liquidação de despesa:)'
  ), '[]'::jsonb), true);
  v_state := jsonb_set(v_state, '{meta,lastUpdated}', to_jsonb(now()::text), true);

  update public.business_snapshots
     set state = v_state,
         revision = revision + 1,
         updated_at = now(),
         updated_by = auth.uid()
   where company_id = v_company_id
   returning revision into v_revision;

  return jsonb_build_object(
    'ok', true,
    'removed_expenses', v_removed_expenses,
    'removed_expense_payments', v_removed_expense_payments,
    'removed_journal_entries', v_removed_journal,
    'removed_linked_cash_movements', v_removed_cash,
    'revision', v_revision,
    'stock_preserved', true
  );
end;
$$;

revoke all on function public.clear_vendamais_expenses_only() from public, anon;
grant execute on function public.clear_vendamais_expenses_only() to authenticated;
