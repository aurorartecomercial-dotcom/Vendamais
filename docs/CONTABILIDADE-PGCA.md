# Contabilidade organizada — VendaMais

## Estrutura implementada

A área contabilística apresenta Diário Geral, Razão, Balancete de Verificação, Balanço patrimonial preliminar, Demonstração de Resultados, Fluxo de Caixa e Plano de Contas. Os relatórios são calculados a partir de `data.journalEntries`, sem criar documentos operacionais nem duplicar vendas, compras, despesas, recebimentos ou pagamentos.

## Partidas dobradas

O módulo `accounting-core.js` converte cada evento do diário operacional em linhas de débito e crédito. Exemplos:

- Venda: débito de caixa/banco e clientes; crédito de vendas e IVA liquidável; reconhecimento do custo da mercadoria vendida contra existências.
- Compra: débito de existências e crédito de fornecedores.
- Pagamento de fornecedor: débito de fornecedores e crédito de caixa/banco.
- Despesa: débito de gastos e crédito de caixa/banco e/ou fornecedores.
- Liquidação de despesa: débito de fornecedores e crédito de caixa/banco.
- Recebimento de cliente: débito de caixa/banco e crédito de clientes.
- Movimento de caixa sem classificação suficiente: contrapartida em valores por classificar, sem assumir automaticamente que é receita ou gasto.

## Plano de contas

A estrutura usa as classes do Plano Geral de Contabilidade de Angola (PGCA), aprovado pelo Decreto n.º 82/01: classe 1 — Meios Fixos e Investimentos; classe 2 — Existências; classe 3 — Terceiros; classe 4 — Meios Monetários; classe 5 — Capital e Reservas; classe 6 — Proveitos e Ganhos por Natureza; classe 7 — Custos e Perdas por Natureza; classe 8 — Resultados. As subcontas incluídas são uma estrutura interna inicial e devem ser validadas e ajustadas por contabilista certificado à actividade, regime fiscal e plano de contas completo da empresa.

## Limitações e controlos importantes

- O sistema operacional ainda não fornece saldos de abertura completos, activos fixos, depreciações, empréstimos, impostos detalhados, salários e todos os eventos bancários. Por isso, o balanço apresentado é preliminar e pode não fechar.
- Diferenças de valor são encaminhadas para `39.9 — Valores por classificar`, visíveis para análise; não são escondidas nem tratadas como lucro.
- O fluxo de caixa considera apenas as contas de caixa e bancos efectivamente identificadas. A classificação do método de pagamento deve ser confirmada nos dados da empresa.
- Não foram criadas migrações SQL nem novas tabelas persistentes nesta fase: os relatórios são derivados em memória do diário financeiro actual.
- Antes de declarar a contabilidade fiscal/legal pronta, é necessário parametrizar saldos iniciais, plano completo, IVA e outros impostos, períodos/fechos, reconciliação bancária, imobilizado, permissões e trilho de auditoria imutável, e obter validação profissional local.
