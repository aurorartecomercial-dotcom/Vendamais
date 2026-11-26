# Etapa 4 — Integração controlada com os documentos de venda

## Objectivo

Ligar a aplicação à tabela `fiscal_document_records` criada na Etapa 2 e protegida pelos mecanismos internos da Etapa 3. Nesta fase, a criação do registo é uma acção manual e explícita do Administrador/Gerente na lista de documentos.

## O que foi acrescentado

- Acção **Preparar registo fiscal** na lista de documentos, apenas para perfis Administrador/Gerente.
- A acção exige sessão Supabase activa; o modo exclusivamente local não cria registos centrais.
- A aplicação recolhe a venda já gravada em `sales_ledger` e envia snapshots do emitente, cliente, linhas, valores, pagamento e local.
- A referência da venda é guardada como `internal_reference`; não é apresentada como série AGT.
- A operação é idempotente por `(company_id, sale_id)`: se já existir um registo completo, não cria outro.
- A aplicação exige que o servidor devolva `integrity_hash` e `sealed_at`. Se os triggers da Etapa 3 não estiverem activos, apresenta erro em vez de declarar a preparação concluída.
- A classificação fiscal das linhas fica explicitamente provisória (`UNCLASSIFIED_INTERNAL`); não se presume taxa, isenção ou enquadramento fiscal definitivo.

## Como testar

1. Confirmar que as migrações das Etapas 2 e 3 foram executadas sem erros no projecto Supabase de teste.
2. Entrar online com um utilizador Administrador ou Gerente.
3. Abrir Documentos e escolher uma venda de teste não devolvida.
4. Clicar em **Preparar registo fiscal**.
5. Confirmar a mensagem de sucesso e consultar `public.fiscal_document_records`.
6. Confirmar `internal_reference`, `sale_id`, snapshots, `integrity_hash` com 64 caracteres hexadecimais e `sealed_at` preenchido.
7. Repetir a acção para a mesma venda: deve indicar que o registo já existia, sem duplicar.
8. Entrar como Vendedor: a acção não deve aparecer. Tentar a operação directamente na API também deve ser bloqueado pelas políticas RLS.
9. Confirmar que stock, caixa, movimentos financeiros e `sales_ledger` não foram alterados pela preparação do registo.

## Limitações que permanecem

- A acção é manual; não é criada automaticamente no momento da venda.
- Ainda não há validação fiscal oficial das regras de IVA, isenções, NIF, séries, numeração, assinatura ou comunicação.
- `UNCLASSIFIED_INTERNAL` é um marcador provisório, não um código fiscal reconhecido pela AGT.
- O hash da Etapa 3 é interno e não é assinatura digital nem hash fiscal oficial.
- A impressão actual continua a ser documento de gestão e não deve ser apresentada como factura fiscal certificada.
- Não foi possível testar esta integração contra a base Supabase real do utilizador; os testes executados são testes locais de sintaxe e regressão.

**Não declarar o VendaMais certificado pela AGT com base nesta etapa.** A implementação das regras oficiais, SAF-T AO, assinatura, comunicação e homologação deve seguir a documentação técnica e o processo formal aplicável da AGT.
