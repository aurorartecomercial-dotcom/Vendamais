# Etapa 2 — Estrutura de dados fiscais (preparação)

## Objectivo

Criar uma camada separada para guardar os dados estruturados e os snapshots de cada documento, sem alterar o livro de vendas existente. O registo fiscal liga-se a uma venda através de `(company_id, sale_id)` e guarda cópias dos dados do emitente, cliente, linhas, impostos, totais, local da operação, pagamento e origem.

## Ficheiro SQL

`supabase/2026-11-fiscal-document-data.sql`

É uma migração aditiva: cria a tabela `fiscal_document_records` e os índices/políticas associados. Não altera nem apaga `sales_ledger`, `business_snapshots`, produtos, stock, compras, clientes ou movimentos financeiros.

## Campos principais

- `internal_reference`: referência interna VendaMais, nunca série AGT.
- `document_type`: tipo comercial do documento.
- `lifecycle_status`: `internal_preview`, `pending_review`, `blocked` ou `cancelled`.
- `issuer_snapshot` e `customer_snapshot`: dados congelados no momento do documento.
- `lines_snapshot`: artigos, quantidades, preços, descontos e classificações fiscais disponíveis.
- `tax_summary`: resumo por código/taxa/motivo, a confirmar com a especificação oficial.
- `totals_snapshot`: base tributável, imposto, descontos e total.
- `operation_location_snapshot` e `payment_snapshot`: contexto da operação e pagamentos.
- `source_snapshot`: referência à venda original e versão do esquema.

## Segurança e preservação

- RLS activo e limitado à empresa do utilizador.
- Criação e actualização apenas por Administrador/Gerente.
- Não existe política de eliminação.
- A tabela não permite declarar um documento como autorizado/certificado.
- A chave estrangeira impede criar um registo fiscal sem venda correspondente.

## Limites desta etapa

Esta migração ainda não está ligada ao fluxo de emissão do `app.js`; por isso não cria registos automaticamente. Não gera série fiscal, hash, assinatura, QR code, SAF-T nem transmissão à AGT. Os nomes e conteúdos exactos dos campos fiscais devem ser ajustados à especificação técnica oficial aplicável e ao enquadramento do contribuinte antes de produção.

## Aplicação segura

1. Fazer backup do projecto Supabase.
2. Aplicar primeiro num projecto de teste/homologação.
3. Executar o SQL no Supabase SQL Editor.
4. Testar com Administrador, Gerente e Vendedor e confirmar isolamento entre empresas.
5. Só depois planear a ligação ao fluxo de documentos numa etapa seguinte.

Não executar automaticamente em produção.
