# Etapa 8 — Resumo fiscal interno

Esta etapa acrescenta a aba **Resumo fiscal** em Balanço e relatórios. O resumo considera as vendas concluídas já filtradas pelo período e loja seleccionados e agrupa as linhas por tratamento fiscal interno e taxa configurada.

## Indicadores
- Linhas analisadas e linhas sem classificação/taxa utilizável.
- Base estimada apenas para linhas com `RATE_CONFIGURED_PENDING_REVIEW` e taxa numérica entre 0 e 100.
- Imposto meramente estimado com a taxa interna gravada na linha da venda.
- Possíveis isenções e não sujeições permanecem pendentes de revisão; não são presumidas como imposto zero validado.

## Limites importantes
- Não altera vendas, total comercial, caixa, stock ou documentos.
- Não muda nem determina o IVA legal da operação.
- Não valida taxas, códigos, motivos de isenção ou enquadramentos perante a AGT.
- Não é declaração fiscal, SAF-T AO nem relatório oficial da AGT.
- As linhas de vendas antigas sem os campos fiscais guardados surgem como por classificar.

## Instalação
Não requer migração SQL. Publicar os ficheiros desta versão, preservando `supabase-config.js`. Executar `npm test` antes da publicação.
