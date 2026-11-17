-- VendaMais — segurança de movimentos de caixa solicitados por vendedores.
-- Executar UMA vez no Supabase SQL Editor, depois de schema.sql e dos upgrades existentes.
-- Não requer service_role no navegador. A autorização é verificada no servidor.

create or replace function public.save_vendamais_state(
  p_state jsonb,
  p_expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_role text;
  v_old_state jsonb;
  v_new_state jsonb := coalesce(p_state, '{}'::jsonb);
  v_old_requests jsonb := '[]'::jsonb;
  v_new_requests jsonb := '[]'::jsonb;
  v_old_movements jsonb := '[]'::jsonb;
  v_new_movements jsonb := '[]'::jsonb;
  v_request jsonb;
  v_session jsonb;
  v_request_id text;
  v_app_user_id text;
  v_next_revision bigint;
  v_old_count integer;
  v_new_count integer;
begin
  if auth.uid() is null or v_company_id is null then
    raise exception 'Utilizador sem sessão ou empresa atribuída.';
  end if;

  select role into v_role
  from public.profiles
  where id = auth.uid() and company_id = v_company_id and active;
  if v_role is null then raise exception 'Perfil inactivo ou inexistente.'; end if;

  -- Bloqueia o snapshot para que as validações e a gravação sejam atómicas.
  select state into v_old_state
  from public.business_snapshots
  where company_id = v_company_id and revision = p_expected_revision
  for update;
  if not found then return null; end if;

  -- O frontend usa IDs internos para os funcionários. O cloudUserId liga
  -- esse ID interno ao UUID real da sessão Supabase.
  select u.value ->> 'id' into v_app_user_id
  from jsonb_array_elements(coalesce(v_old_state -> 'users', '[]'::jsonb)) u(value)
  where u.value ->> 'cloudUserId' = auth.uid()::text
  limit 1;
  v_app_user_id := coalesce(v_app_user_id, auth.uid()::text);

  v_old_requests := coalesce(v_old_state -> 'cashMovementRequests', '[]'::jsonb);
  v_new_requests := coalesce(v_new_state -> 'cashMovementRequests', '[]'::jsonb);
  v_old_movements := coalesce(v_old_state -> 'cashMovements', '[]'::jsonb);
  v_new_movements := coalesce(v_new_state -> 'cashMovements', '[]'::jsonb);

  if jsonb_typeof(v_new_requests) <> 'array' or jsonb_typeof(v_new_movements) <> 'array' then
    raise exception 'Estrutura de movimentos de caixa inválida.';
  end if;

  if v_role = 'Vendedor' then
    -- Vendedor nunca lança, altera ou apaga movimentos directamente.
    if v_new_movements is distinct from v_old_movements then
      raise exception 'O vendedor só pode movimentar o caixa através de um pedido sujeito a aprovação.';
    end if;

    -- Os pedidos anteriores são imutáveis para o vendedor: não pode aprovar,
    -- rejeitar, editar ou apagar pedidos, nem mesmo os seus próprios.
    if jsonb_typeof(v_old_requests) <> 'array' then
      raise exception 'Histórico de pedidos de caixa inválido.';
    end if;
    v_old_count := jsonb_array_length(v_old_requests);
    v_new_count := jsonb_array_length(v_new_requests);
    if (select count(*) from jsonb_array_elements(v_new_requests)) <>
       (select count(distinct value ->> 'id') from jsonb_array_elements(v_new_requests)) then
      raise exception 'Cada pedido de movimento deve ter um identificador único.';
    end if;
    if v_new_count < v_old_count then
      raise exception 'Não é permitido apagar pedidos de movimento de caixa.';
    end if;

    for v_request in select value from jsonb_array_elements(v_old_requests) loop
      v_request_id := coalesce(v_request ->> 'id', '');
      if v_request_id = '' or not exists (
        select 1 from jsonb_array_elements(v_new_requests) n(value)
        where n.value ->> 'id' = v_request_id and n.value = v_request
      ) then
        raise exception 'Não é permitido alterar ou remover pedidos existentes.';
      end if;
    end loop;

    -- Apenas novos pedidos pendentes, do próprio vendedor (ID interno mapeado), para o seu turno.
    for v_request in
      select n.value
      from jsonb_array_elements(v_new_requests) n(value)
      where not exists (
        select 1 from jsonb_array_elements(v_old_requests) o(value)
        where o.value ->> 'id' = n.value ->> 'id'
      )
    loop
      if coalesce(v_request ->> 'id', '') = ''
         or coalesce(v_request ->> 'userId', '') <> v_app_user_id
         or coalesce(v_request ->> 'status', '') <> 'Pendente'
         or coalesce(v_request ->> 'type', '') not in ('Entrada', 'Saída')
         or coalesce(nullif(v_request ->> 'amount', '')::numeric, 0) <= 0
         or length(trim(coalesce(v_request ->> 'note', ''))) = 0
         or coalesce(v_request ->> 'decidedBy', '') <> ''
         or coalesce(v_request ->> 'decidedAt', '') <> '' then
        raise exception 'Pedido de movimento inválido. Só são aceites pedidos pendentes do próprio vendedor.';
      end if;

      select value into v_session
      from jsonb_array_elements(coalesce(v_old_state -> 'cashSessions', '[]'::jsonb)) s(value)
      where s.value ->> 'id' = v_request ->> 'sessionId'
        and s.value ->> 'userId' = v_app_user_id
        and s.value ->> 'status' = 'Aberto'
        and s.value ->> 'locationId' = coalesce(v_request ->> 'locationId', '')
      limit 1;
      if v_session is null then
        raise exception 'O pedido tem de pertencer a um caixa aberto do próprio vendedor.';
      end if;
    end loop;
  elsif v_role <> 'Administrador' then
    -- Gerente pode efectuar movimentos manuais conforme as permissões actuais,
    -- mas a decisão de pedidos de vendedores é exclusiva do administrador.
    if v_new_requests is distinct from v_old_requests then
      raise exception 'Só o administrador pode aprovar, rejeitar ou alterar pedidos de movimento de caixa.';
    end if;
  end if;

  update public.business_snapshots
     set state = v_new_state,
         revision = revision + 1,
         updated_at = now(),
         updated_by = auth.uid()
   where company_id = v_company_id and revision = p_expected_revision
  returning revision into v_next_revision;

  if found then return jsonb_build_object('revision', v_next_revision); end if;
  return null;
end;
$$;

revoke all on function public.save_vendamais_state(jsonb, bigint) from public;
grant execute on function public.save_vendamais_state(jsonb, bigint) to authenticated;

comment on function public.save_vendamais_state(jsonb, bigint) is
'Grava estado VendaMais com validação de servidor: vendedores só podem acrescentar pedidos pendentes de movimentos no seu próprio caixa; só Administrador pode decidir pedidos.';
