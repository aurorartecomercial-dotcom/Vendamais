-- Correcção para uma base VendaMais já criada.
-- Execute todo este ficheiro no Supabase SQL Editor uma única vez.

drop function if exists public.bootstrap_vendamais_company(text, text, jsonb, jsonb);
drop function if exists public.save_vendamais_state(jsonb, bigint);

create function public.bootstrap_vendamais_company(
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

  return jsonb_build_object(
    'id', auth.uid(), 'company_id', v_company_id,
    'full_name', coalesce(nullif(auth.jwt() ->> 'email', ''), 'Administrador'),
    'role', 'Administrador', 'location_id', v_location_id, 'active', true
  );
end;
$$;

create function public.save_vendamais_state(p_state jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_next_revision bigint;
begin
  if public.current_company_id() is null then raise exception 'Utilizador sem empresa atribuída.'; end if;
  update public.business_snapshots
     set state = coalesce(p_state, '{}'::jsonb), revision = business_snapshots.revision + 1,
         updated_at = now(), updated_by = auth.uid()
   where business_snapshots.company_id = public.current_company_id()
     and business_snapshots.revision = p_expected_revision
  returning business_snapshots.revision into v_next_revision;
  if found then return jsonb_build_object('revision', v_next_revision); end if;
  return null;
end;
$$;

grant execute on function public.bootstrap_vendamais_company(text, text, jsonb, jsonb) to authenticated;
grant execute on function public.save_vendamais_state(jsonb, bigint) to authenticated;
