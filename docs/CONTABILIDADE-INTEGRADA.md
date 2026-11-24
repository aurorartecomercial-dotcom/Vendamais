# Contabilidade integrada do VendaMais

## Regra de não duplicação

A fonte única da consulta contabilística de gestão é `data.journalEntries`. A vista `accountingView` apenas lê essa colecção e filtra por período e loja. Não cria vendas, despesas, compras, pagamentos nem movimentos de caixa.

Cada evento é identificado por `idempotencyKey` em `postFinancialEntry`. Antes de inserir, a aplicação verifica se a chave já existe. As operações de origem continuam nos seus módulos: vendas em `sales`, compras em `purchases`, despesas em `expenses`, recebimentos em `receipts`, pagamentos a fornecedores em `supplierPayments`, liquidações de despesas em `expensePayments` e movimentos manuais em `cashMovements`.

## Tratamento dos eventos

- Venda: reconhece o resultado e separa o valor recebido do saldo a receber.
- Recebimento de cliente: aumenta caixa e reduz contas a receber; não reconhece uma segunda venda.
- Compra: reconhece a entrada em stock e a obrigação; o pagamento liquida a obrigação e reduz caixa, sem reconhecer outra compra.
- Despesa: reconhece o custo uma vez; pagamentos posteriores liquidam a obrigação e reduzem caixa, sem reconhecer novamente a despesa.
- Movimento manual de caixa: entra no diário uma vez. Movimentos automáticos ligados a compra, despesa ou liquidação são excluídos da reconstrução histórica para não duplicar os respectivos eventos.

## Limite funcional

Esta área é um diário financeiro e resumo de gestão. Não é ainda contabilidade formal de partidas dobradas: não tem plano de contas parametrizável, lançamentos de débito/crédito, razão por conta, balancete contabilístico certificado ou reconciliação bancária. Os valores não devem ser apresentados como demonstrações legais ou fiscais sem validação e implementação contabilística própria.
