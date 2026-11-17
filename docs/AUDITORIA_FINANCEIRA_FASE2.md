# Auditoria e correcções financeiras — Fase 2

Data: 2026-11-16  
Versão: 2.0.1

## Correcções implementadas

1. Núcleo financeiro (`finance-core.js`) para arredondar valores monetários a duas casas e calcular subtotal, desconto, base tributável, IVA e total de forma consistente.
2. Rateio mensal de custos fixos com arredondamento monetário.
3. Prevenção de dupla contagem: quando a despesa é explicitamente marcada como correspondente ao custo fixo configurado (loja, categoria e mês), o custo configurado deixa de ser somado para esse mês. Registos antigos sem esta marcação mantêm a correspondência automática por compatibilidade. A tabela identifica a cobertura por despesa real.
4. Resumo de meios de pagamento baseado em vendas efectivamente pagas e recebimentos registados, sem tratar facturas a crédito como dinheiro recebido.
5. Compras pagas em dinheiro e despesas pagas em dinheiro passam a gerar saídas no caixa. Compras liquidadas por outros meios ficam no histórico de pagamentos a fornecedores. Despesas a crédito têm saldo pendente, permitem liquidação parcial ou total e entram nas contas a pagar. Cada factura recorrente a crédito deve ser lançada como ocorrência única.
6. Custo médio ponderado do stock nas entradas de compra e nas devoluções. Cada venda continua a guardar o custo histórico aplicado naquele momento.
7. Validação e normalização da soma `valor pago + saldo pendente = total` em vendas e compras; os relatórios também sinalizam totais de compra que não correspondem às linhas de artigos.
8. Rollback local se a gravação falhar em compras, pagamentos, recebimentos, despesas, devoluções e movimentos de caixa.
9. Devolução total exige reembolso integral do montante já recebido, evitando anular o documento e devolver apenas parte do valor sem tratamento contabilístico específico.
10. Actualizações de vendas no Supabase que falhem ficam numa fila local por empresa e são reenviadas quando a ligação regressa.
11. Migração SQL que recalcula preço, custo histórico, desconto, IVA, total e liquidação no servidor, verifica stock e repete a verificação de idempotência depois do bloqueio transaccional.

## Modelo de cálculo usado

- Subtotal: soma de preço unitário × quantidade.
- Desconto: subtotal × percentagem de desconto.
- Base tributável: subtotal − desconto.
- IVA: base tributável × taxa configurada.
- Total: base tributável + IVA.
- Vendas líquidas: faturação com IVA − IVA liquidado.
- Resultado bruto: vendas líquidas − custo dos produtos vendidos.
- Resultado operacional estimado: resultado bruto − custos fixos − custos variáveis.
- Stock: quantidade disponível × custo médio unitário registado.

## Testes executados

`npm test` executa a verificação de sintaxe, a verificação estrutural e sete testes unitários financeiros. Na execução desta entrega, todos passaram.

## Limitações que permanecem

- A migração SQL foi criada e revista estaticamente, mas não foi executada num projecto Supabase real nesta sessão.
- Não foram executados testes de concorrência, RLS ou integração contra a base de dados real.
- O custo médio é global por produto, não separado por loja; o ERP actual não mantém camadas de custo por localização.
- Despesas recorrentes a crédito não são aceites como uma única regra mensal: cada factura a crédito deve ser registada como ocorrência única para que a dívida e as liquidações sejam controladas individualmente.
- Os custos fixos configurados continuam a ser uma estimativa orçamental quando não existe uma despesa real correspondente. A correspondência usa categoria, loja e mês e deve ser confirmada pelo utilizador.
- A taxa de IVA é configurável, mas a aplicação não certifica documentos fiscais nem substitui o software de facturação certificado ou a validação de um contabilista/AGT.
- O resultado continua a ser uma demonstração de gestão, não um balanço contabilístico completo com diário, razão, activos, passivos, depreciações e reconciliação bancária.
- A autenticação local por PIN e a segurança multiempresa/RLS ainda exigem uma auditoria própria antes de produção.
