# Painel do administrador — VendaMais

## Indicadores da visão geral

- **Vendas de hoje:** soma das vendas concluídas no dia e no local seleccionado.
- **Faturação do mês:** soma das vendas concluídas desde o primeiro dia do mês no local seleccionado.
- **Resultado estimado:** vendas líquidas sem IVA, menos custo histórico dos artigos vendidos e custos operacionais considerados. Se existir custo ausente, zero ou inferior a 1% do preço de venda em alguma linha, o resultado aparece como **Por apurar** até ser confirmado.
- **Dinheiro nos caixas abertos:** valor esperado nos turnos que continuam abertos no local seleccionado. Não representa saldo bancário nem substitui a contagem física do caixa.
- **Valor do stock:** quantidade actual no local multiplicada pelo custo unitário registado.
- **Stock reduzido:** produtos cuja quantidade está no limite mínimo ou abaixo dele.

## Balanço e relatórios

O relatório permite filtrar por datas e loja e apresenta faturação, vendas sem IVA, resultado estimado, contas a receber, contas a pagar, custos operacionais, valor actual do stock e ticket médio.

A comparação utiliza um período anterior com a mesma duração. O gráfico mostra faturação e despesas operacionais registadas por dia em intervalos até 31 dias e por mês em intervalos maiores.

## Regras de interpretação

- Faturação não é lucro.
- Resultado líquido estimado não é saldo de caixa.
- Contas a receber e contas a pagar são saldos, não receitas ou despesas adicionais do período por si só.
- O valor do stock é uma avaliação actual e não deve ser somado ao faturamento.
- Custos fixos configurados por loja e despesas fixas registadas podem duplicar o mesmo encargo; o utilizador deve lançar cada custo apenas uma vez.
- A verificação de custo muito baixo (inferior a 1% do preço de venda) é um alerta preventivo, não uma conclusão contabilística. Confirme casos especiais antes de corrigir o registo.
- Os valores do caixa aberto são valores esperados calculados a partir do fundo inicial, vendas, recebimentos e movimentos do turno.

## Testes

Executar `npm test` para validar sintaxe, ficheiros, ecrãs e salvaguardas principais do painel.
