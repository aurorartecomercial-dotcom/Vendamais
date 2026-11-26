-- VendaMais | Etapa 3: integridade interna e trilho de auditoria fiscal
-- ADITIVO à migração 2026-11-fiscal-document-data.sql.
-- Hash SHA-256 interno de integridade; NÃO é assinatura/hash fiscal oficial AGT.
-- Aplicar primeiro em homologação e após backup.

create extension if not exists pgcrypto with schema extensions;

alter table public.fiscal_document_records
  add column if not exists integrity_hash text,
  add column if not exists hash_algorithm text not null default 'SHA-256',
  add column if not exists sealed_at timestamptz;

create table if not exists public.fiscal_document_audit (
  id uuid primary key default gen_random_uuid(),
  fiscal_document_id uuid not null references public.fiscal_document_records(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  event_type text not null check (event_type in ('created','status_changed')),
  old_status text,
  new_status text not null,
  event_payload jsonb not null default '{}'::jsonb,
  event_hash text not null,
  actor_id uuid,
  occurred_at timestamptz not null default now()
);

create index if not exists fiscal_audit_document_time_idx
  on public.fiscal_document_audit(fiscal_document_id, occurred_at, id);
create index if not exists fiscal_audit_company_time_idx
  on public.fiscal_document_audit(company_id, occurred_at desc);

alter table public.fiscal_document_audit enable row level security;
drop policy if exists fiscal_audit_select_company on public.fiscal_document_audit;
create policy fiscal_audit_select_company on public.fiscal_document_audit
  for select to authenticated
  using (company_id = public.current_company_id());
revoke insert, update, delete, truncate on public.fiscal_document_audit from anon, authenticated;
grant select on public.fiscal_document_audit to authenticated;

create or replace function public.vendamais_fiscal_record_digest(p_record public.fiscal_document_records)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(convert_to(jsonb_build_object(
    'id', (p_record).id,
    'company_id', (p_record).company_id,
    'sale_id', (p_record).sale_id,
    'internal_reference', (p_record).internal_reference,
    'document_type', (p_record).document_type,
    'issue_datetime', (p_record).issue_datetime,
    'currency_code', (p_record).currency_code,
    'issuer_snapshot', (p_record).issuer_snapshot,
    'customer_snapshot', (p_record).customer_snapshot,
    'lines_snapshot', (p_record).lines_snapshot,
    'tax_summary', (p_record).tax_summary,
    'totals_snapshot', (p_record).totals_snapshot,
    'operation_location_snapshot', (p_record).operation_location_snapshot,
    'payment_snapshot', (p_record).payment_snapshot,
    'source_snapshot', (p_record).source_snapshot,
    'schema_version', (p_record).schema_version,
    'created_by', (p_record).created_by,
    'created_at', (p_record).created_at
  )::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.vendamais_fiscal_record_guard()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_payload jsonb;
  v_event_type text;
begin
  if tg_op = 'INSERT' then
    if new.lifecycle_status <> 'internal_preview' then
      raise exception 'Novo registo fiscal só pode iniciar em internal_preview';
    end if;
    new.hash_algorithm := 'SHA-256';
    new.sealed_at := coalesce(new.sealed_at, now());
    new.integrity_hash := public.vendamais_fiscal_record_digest(new);
    return new;
  end if;

  -- Snapshot comercial/fiscal e hash são imutáveis após a criação.
  if row(new.company_id, new.sale_id, new.internal_reference, new.document_type,
         new.issue_datetime, new.currency_code, new.issuer_snapshot, new.customer_snapshot,
         new.lines_snapshot, new.tax_summary, new.totals_snapshot,
         new.operation_location_snapshot, new.payment_snapshot, new.source_snapshot,
         new.schema_version, new.created_by, new.created_at, new.integrity_hash,
         new.hash_algorithm, new.sealed_at)
     is distinct from
     row(old.company_id, old.sale_id, old.internal_reference, old.document_type,
         old.issue_datetime, old.currency_code, old.issuer_snapshot, old.customer_snapshot,
         old.lines_snapshot, old.tax_summary, old.totals_snapshot,
         old.operation_location_snapshot, old.payment_snapshot, old.source_snapshot,
         old.schema_version, old.created_by, old.created_at, old.integrity_hash,
         old.hash_algorithm, old.sealed_at) then
    raise exception 'Conteúdo selado: não é permitido alterar os dados do documento. Registe um novo documento correctivo conforme as regras aplicáveis.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.vendamais_fiscal_record_audit()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_payload jsonb;
  v_hash text;
  v_event_type text;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'created';
    v_payload := jsonb_build_object('document_id', new.id, 'company_id', new.company_id,
      'new_status', new.lifecycle_status, 'integrity_hash', new.integrity_hash,
      'occurred_at', now());
    v_hash := encode(extensions.digest(convert_to(v_payload::text, 'UTF8'), 'sha256'), 'hex');
    insert into public.fiscal_document_audit
      (fiscal_document_id, company_id, event_type, old_status, new_status, event_payload, event_hash, actor_id)
    values (new.id, new.company_id, v_event_type, null, new.lifecycle_status,
      v_payload, v_hash, auth.uid());
    return new;
  end if;
  if new.lifecycle_status is distinct from old.lifecycle_status then
    v_event_type := 'status_changed';
    v_payload := jsonb_build_object('document_id', old.id, 'company_id', old.company_id,
      'old_status', old.lifecycle_status, 'new_status', new.lifecycle_status,
      'integrity_hash', old.integrity_hash, 'occurred_at', now());
    v_hash := encode(extensions.digest(convert_to(v_payload::text, 'UTF8'), 'sha256'), 'hex');
    insert into public.fiscal_document_audit
      (fiscal_document_id, company_id, event_type, old_status, new_status, event_payload, event_hash, actor_id)
    values (old.id, old.company_id, v_event_type, old.lifecycle_status, new.lifecycle_status,
      v_payload, v_hash, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vendamais_fiscal_record_guard on public.fiscal_document_records;
create trigger trg_vendamais_fiscal_record_guard
before insert or update on public.fiscal_document_records
for each row execute function public.vendamais_fiscal_record_guard();

drop trigger if exists trg_vendamais_fiscal_record_audit on public.fiscal_document_records;
create trigger trg_vendamais_fiscal_record_audit
after insert or update on public.fiscal_document_records
for each row execute function public.vendamais_fiscal_record_audit();

comment on column public.fiscal_document_records.integrity_hash is
  'SHA-256 interno do snapshot selado. Não é assinatura digital nem hash fiscal oficial AGT.';
comment on table public.fiscal_document_audit is
  'Trilho de auditoria interno, append-only para utilizadores autenticados; não substitui registo/transmissão AGT.';
