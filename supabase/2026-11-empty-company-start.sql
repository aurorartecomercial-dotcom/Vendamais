-- VendaMais: início de empresa sem dados fictícios e limpeza sincronizada.
-- Execute no Supabase SQL Editor depois de schema.sql e da atualização profissional.

create or replace function public.clear_vendamais_business_data(p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_revision bigint;
begin
  v_company_id := public.current_company_id();
  if auth.uid() is null or v_company_id is null then
    raise exception 'É necessário iniciar sessão numa empresa.';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and company_id = v_company_id
      and active = true and role = 'Administrador'
  ) then
    raise exception 'Apenas o administrador pode limpar os dados comerciais.';
  end if;
  if jsonb_typeof(p_state) <> 'object' then
    raise exception 'O estado vazio da empresa é inválido.';
  end if;

  delete from public.sales_ledger where company_id = v_company_id;

  update public.business_snapshots
     set state = p_state,
         revision = revision + 1,
         updated_at = now(),
         updated_by = auth.uid()
   where company_id = v_company_id
   returning revision into v_revision;

  if v_revision is null then
    raise exception 'Não foi encontrado o registo central desta empresa.';
  end if;

  update public.companies set sale_sequence = 0 where id = v_company_id;

  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(company_id, actor_id, action, detail, event_data)
    values (v_company_id, auth.uid(), 'Dados comerciais limpos',
      'Vendas e dados de demonstração removidos pelo administrador.',
      jsonb_build_object('operation', 'clear_business_data'));
  end if;

  return jsonb_build_object('success', true, 'revision', v_revision);
end;
$$;

revoke all on function public.clear_vendamais_business_data(jsonb) from public;
grant execute on function public.clear_vendamais_business_data(jsonb) to authenticated;
