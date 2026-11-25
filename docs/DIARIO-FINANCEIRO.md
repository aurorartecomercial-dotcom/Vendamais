# Diário financeiro e integridade dos movimentos

Versão funcional: 2.2.1 (actualização local)

## Modelo implementado

O VendaMais mantém os registos operacionais existentes (vendas, compras, despesas, recebimentos e pagamentos) e acrescenta `journalEntries`, um diário financeiro com um lançamento por evento. O diário é guardado no mesmo estado local e acompanha a sincronização do estado empresarial já existente.

Cada lançamento tem uma chave `idempotencyKey`, origem e referência do registo, data, loja, valor, classificação e impactos independentes:

- `cashImpact`: entrada ou saída de tesouraria;
- `profitImpact`: efeito no resultado;
- `inventoryImpact`: valor de mercadoria incorporada no estoque;
- `receivableImpact`: aumento/redução de valores a receber;
- `liabilityImpact`: aumento/redução de valores a pagar.

## Regras de classificação

| Operação | Caixa | Lucro | Estoque | Dívida |
|---|---:|---:|---:|---:|
| Despesa fixa ou variável | Saída quando paga | Reduz pelo valor da despesa | — | Aumenta se ficar a crédito |
| Liquidação posterior de despesa | Saída | Não altera novamente | — | Reduz |
| Compra de mercadoria | Saída quando paga | Não é despesa operacional imediata | Aumenta | Aumenta na compra e reduz com pagamentos |
| Pagamento a fornecedor | Saída | Não altera | — | Reduz |
| Retirada pessoal | Saída | Não reduz | — | — |
| Pagamento de dívida antiga | Saída | Não reduz novamente | — | Reduz |
| Venda | Entrada pelo valor recebido | Receita líquida menos custo histórico | — | Aumenta a receber se houver crédito |
| Recebimento de cliente | Entrada | Não reconhece a venda novamente | — | Reduz a receber |
| Devolução | Saída pelo reembolso | Reverte o resultado da venda | Repõe mercadoria | Anula saldo a receber aplicável |

## Compatibilidade e prevenção de duplicação

- O `localStorage` existente é preservado; a versão do esquema passa para 8.
- Na primeira leitura de dados antigos, o sistema constrói lançamentos históricos a partir dos registos-base e das liquidações existentes.
- A migração usa chaves idempotentes e não volta a criar o mesmo lançamento quando a aplicação é aberta novamente.
- Movimentos de caixa que já são reflexo de compras/despesas/pagamentos não são importados como uma segunda operação. Movimentos manuais antigos são importados como ajustes neutros de lucro.
- As colecções operacionais antigas continuam a ser mantidas para compatibilidade com os ecrãs e relatórios existentes. O diário não apaga nem substitui esses dados.

## Onde consultar

Em **Balanço & relatórios → Diário financeiro**, filtre o período e a loja. O resumo apresenta quantidade de lançamentos e impactos acumulados em caixa, lucro, estoque, contas a receber e contas a pagar.

## Limites importantes

Este diário é um registo de gestão operacional com impactos separados e controlo de duplicação. Ainda não é um sistema de contabilidade geral de partidas dobradas, não gera automaticamente balancete/razão fiscal e não substitui validação de contabilista ou requisitos da AGT. O pagamento de uma dívida antiga permite seleccionar e liquidar uma compra ou despesa que já esteja pendente no VendaMais, actualizando o respectivo saldo e histórico de pagamentos. Dívidas anteriores que ainda não estejam registadas no sistema precisam primeiro de ser introduzidas como saldo inicial/documentadas antes da liquidação.

## Testes

`npm test` valida sintaxe, estrutura, cálculos financeiros e a separação entre caixa, lucro, estoque e dívidas. A validação não substitui testes de interface em navegador nem testes de concorrência/RLS no projecto Supabase real.

## Limpeza segura de despesas indevidas

Se a empresa apresentar despesas que o administrador confirma nunca ter registado, o ficheiro `supabase/2026-11-clear-false-expenses-only.sql` cria a função administrativa `clear_vendamais_expenses_only()`. A função remove apenas despesas, liquidações de despesas, respectivos lançamentos do diário e movimentos de caixa explicitamente ligados a despesas. Não altera produtos, quantidades, movimentos de inventário, compras, vendas, recebimentos nem pagamentos a fornecedores. A execução é deliberada no SQL Editor do Supabase e exige utilizador autenticado com permissão de administrador/gerente. Antes de executar em produção, exporte/guarde uma cópia de segurança do estado da empresa.
