-- Criação de empresa sempre vazia, independentemente do estado enviado pelo navegador.
create or replace function public.bootstrap_vendamais_company(
  p_company_name text,
  p_nif text,
  p_initial_state jsonb,
  p_initial_sales jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_name text;
  v_location_id text;
  v_profile jsonb;
  v_state jsonb;
  v_zero_costs jsonb := '{"Renda":0,"Energia":0,"Água":0,"Internet":0,"Salários":0,"Segurança":0,"Outros":0}'::jsonb;
begin
  if auth.uid() is null then raise exception 'É necessário iniciar sessão.'; end if;

  select jsonb_build_object(
    'id', p.id, 'company_id', p.company_id, 'full_name', p.full_name,
    'role', p.role, 'location_id', p.location_id, 'active', p.active
  ) into v_profile
  from public.profiles p where p.id = auth.uid();
  if v_profile is not null then return v_profile; end if;

  v_name := nullif(trim(p_company_name), '');
  if v_name is null then raise exception 'Indique o nome da empresa.'; end if;
  v_location_id := coalesce(nullif(p_initial_state #>> '{settings,activeLocationId}', ''), 'loc_main');
  v_state := coalesce(p_initial_state, '{}'::jsonb);
  v_state := jsonb_set(v_state, '{products}', '[]'::jsonb, true);
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
  v_state := jsonb_set(v_state, '{auditLog}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{locations}',
    coalesce((select jsonb_agg(jsonb_set(location, '{fixedCosts}', v_zero_costs, true) order by ordinality)
      from jsonb_array_elements(coalesce(v_state -> 'locations', '[]'::jsonb)) with ordinality as item(location, ordinality)), '[]'::jsonb), true);

  insert into public.companies (name, nif, owner_id)
  values (v_name, nullif(trim(p_nif), ''), auth.uid())
  returning companies.id into v_company_id;

  insert into public.profiles (id, company_id, full_name, role, location_id)
  values (auth.uid(), v_company_id, coalesce(nullif(auth.jwt() ->> 'email', ''), 'Administrador'), 'Administrador', v_location_id);

  insert into public.business_snapshots (company_id, state, revision, updated_by)
  values (v_company_id, v_state, 0, auth.uid());



  return jsonb_build_object(
    'id', auth.uid(), 'company_id', v_company_id,
    'full_name', coalesce(nullif(auth.jwt() ->> 'email', ''), 'Administrador'),
    'role', 'Administrador', 'location_id', v_location_id, 'active', true
  );
end;
$$;


-- Limpeza definitiva dos dados comerciais da empresa activa.
-- Mantém identidade da empresa, utilizadores, lojas e histórico de auditoria central.
create or replace function public.reset_vendamais_business_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_state jsonb;
  v_zero_costs jsonb := '{"Renda":0,"Energia":0,"Água":0,"Internet":0,"Salários":0,"Segurança":0,"Outros":0}'::jsonb;
  v_revision bigint;
begin
  if auth.uid() is null then raise exception 'Inicie sessão.'; end if;
  if v_company_id is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  if not public.is_company_manager() then raise exception 'Apenas o administrador ou gerente autorizado pode limpar os dados.'; end if;

  select state into v_state
    from public.business_snapshots
   where company_id = v_company_id
   for update;
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
  v_state := jsonb_set(v_state, '{auditLog}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{locations}',
    coalesce((
      select jsonb_agg(jsonb_set(location, '{fixedCosts}', v_zero_costs, true) order by ordinality)
        from jsonb_array_elements(coalesce(v_state -> 'locations', '[]'::jsonb)) with ordinality as item(location, ordinality)
    ), '[]'::jsonb), true);

  update public.business_snapshots
     set state = v_state,
         revision = revision + 1,
         updated_at = now(),
         updated_by = auth.uid()
   where company_id = v_company_id
   returning revision into v_revision;

  insert into public.audit_events(company_id, actor_id, action, detail)
  values (v_company_id, auth.uid(), 'Dados comerciais limpos', 'Livro de vendas e dados operacionais reiniciados pelo administrador.');

  return jsonb_build_object('ok', true, 'revision', v_revision);
end;
$$;

revoke all on function public.reset_vendamais_business_data() from public;
grant execute on function public.reset_vendamais_business_data() to authenticated;
