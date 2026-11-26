-- VendaMais | Etapa 2: estrutura de dados para preparação fiscal
-- MIGRACAO ADITIVA. Nao atribui series AGT, nao assina documentos e nao comunica com a AGT.
-- Fazer backup e testar primeiro num projecto Supabase de homologacao.

create table if not exists public.fiscal_document_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  sale_id text not null,
  internal_reference text not null,
  document_type text not null default 'Factura-Recibo',
  lifecycle_status text not null default 'internal_preview'
    check (lifecycle_status in ('internal_preview','pending_review','blocked','cancelled')),
  issue_datetime timestamptz,
  currency_code char(3) not null default 'AOA',
  issuer_snapshot jsonb not null default '{}'::jsonb,
  customer_snapshot jsonb not null default '{}'::jsonb,
  lines_snapshot jsonb not null default '[]'::jsonb
    check (jsonb_typeof(lines_snapshot) = 'array'),
  tax_summary jsonb not null default '[]'::jsonb
    check (jsonb_typeof(tax_summary) = 'array'),
  totals_snapshot jsonb not null default '{}'::jsonb,
  operation_location_snapshot jsonb not null default '{}'::jsonb,
  payment_snapshot jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  schema_version text not null default 'vendamais-fiscal-data-1.0',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sale_id),
  unique (company_id, internal_reference),
  constraint fiscal_record_sale_fk foreign key (company_id, sale_id)
    references public.sales_ledger(company_id, sale_id) on delete restrict
);

create index if not exists fiscal_records_company_issue_idx
  on public.fiscal_document_records(company_id, issue_datetime desc);
create index if not exists fiscal_records_company_status_idx
  on public.fiscal_document_records(company_id, lifecycle_status, created_at desc);

alter table public.fiscal_document_records enable row level security;

-- Utilizadores autenticados apenas consultam documentos da sua empresa.
drop policy if exists fiscal_records_select_company on public.fiscal_document_records;
create policy fiscal_records_select_company on public.fiscal_document_records
  for select to authenticated
  using (company_id = public.current_company_id());

-- Apenas Administrador/Gerente podem criar registos de preparacao fiscal.
drop policy if exists fiscal_records_insert_manager on public.fiscal_document_records;
create policy fiscal_records_insert_manager on public.fiscal_document_records
  for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and created_by = auth.uid()
    and public.is_company_manager()
    and lifecycle_status = 'internal_preview'
  );

-- Correcao de metadados de preparacao: nunca permite promover o registo
-- para estado fiscal autorizado (estado esse nem sequer existe nesta fase).
drop policy if exists fiscal_records_update_manager on public.fiscal_document_records;
create policy fiscal_records_update_manager on public.fiscal_document_records
  for update to authenticated
  using (company_id = public.current_company_id() and public.is_company_manager())
  with check (
    company_id = public.current_company_id()
    and public.is_company_manager()
    and lifecycle_status in ('internal_preview','pending_review','blocked','cancelled')
  );

-- Nao criar politica DELETE: o historico fica preservado.
grant select, insert, update on public.fiscal_document_records to authenticated;

comment on table public.fiscal_document_records is
  'Snapshots estruturados de documentos comerciais para preparacao fiscal. Nao representa documento validado pela AGT.';
comment on column public.fiscal_document_records.internal_reference is
  'Referencia interna do VendaMais; nao e serie fiscal atribuida pela AGT.';
comment on column public.fiscal_document_records.lifecycle_status is
  'Estado interno de preparacao. Nao existe estado autorizado/certificado nesta fase.';
