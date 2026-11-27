# Etapa 7 — Pré-visualização fiscal interna por linha

## Objectivo

Dar visibilidade, no carrinho do POS, à simulação do imposto por produto com base nos campos internos criados na Etapa 6, sem alterar o cálculo comercial da venda.

## Comportamento

- Produtos com `RATE_CONFIGURED_PENDING_REVIEW` e taxa numérica entre 0 e 100 mostram uma estimativa por linha, identificada como pendente de revisão.
- O desconto próprio da linha e o desconto geral são considerados; o desconto geral é distribuído proporcionalmente pelas bases das linhas.
- Produtos marcados como possível isenção ou não sujeição não recebem automaticamente taxa zero: ficam pendentes de análise jurídica/fiscal.
- Produtos sem classificação permanecem não calculados.
- O painel mostra o total estimado apenas das linhas com taxa interna configurada e a quantidade de linhas ainda não resolvidas.

## Segurança de cálculo e limites

- A pré-visualização é informativa e interna. Não é usada para gravar a venda, calcular pagamento, imprimir recibo ou criar o snapshot fiscal.
- O total oficial/comercial da venda continua a usar o cálculo geral existente em `finance-core.js` e a taxa geral das Definições.
- A taxa da Etapa 6 continua marcada como pendente de revisão. Não se afirma que seja taxa legalmente aplicável.
- Não se presume que o preço seja líquido ou bruto para efeitos de qualquer regra AGT além da aritmética interna actual.
- Isenções, não sujeições, regimes especiais, arredondamentos oficiais e enquadramentos por produto carecem de confirmação documental e legal.
- Não foi adicionada migração SQL.

## Testes

`npm test` inclui testes de cálculo, desconto proporcional, produtos não classificados, possíveis isenções e limites de desconto.
