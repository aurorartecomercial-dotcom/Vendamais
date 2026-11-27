# Etapa 5 — Validação interna dos dados fiscais

## Objectivo

Executar uma verificação de consistência dos dados da venda e do emitente antes de criar o registo interno da Etapa 4. A validação ocorre no navegador e os resultados são guardados em `source_snapshot.preflight` para rastreabilidade.

## Bloqueios

- Nome da empresa ausente.
- Venda sem identificador/referência ou data válida.
- Venda sem linhas.
- Linhas sem descrição, quantidade positiva ou preço/total numérico não negativo.
- Subtotal, desconto, IVA ou total inválidos/negativos.
- Total diferente de subtotal menos desconto mais IVA (tolerância de 0,02 AOA).
- Total igual ou inferior a zero.

## Avisos

- NIF do emitente fora do formato de 10 algarismos (não bloqueia o registo interno, mas exige confirmação).
- Meio de pagamento ausente.
- Classificação do IVA continua provisória e não validada segundo regras oficiais.

## Aplicação e testes

1. Substituir os ficheiros do projecto pela versão desta etapa, preservando `supabase-config.js` e demais configurações próprias.
2. Executar `npm test`.
3. Publicar em ambiente de teste e tentar preparar uma venda consistente e outra com total divergente.
4. Confirmar no registo criado `source_snapshot.preflight`, incluindo `valid`, `errors`, `warnings`, `checkedAt` e `ruleset`.

## Limitações e segurança

Esta é uma validação preliminar de consistência operacional, executada no cliente. Não é validação fiscal oficial, não confirma NIF junto da AGT, não determina taxas/isencões, não atribui série nem numeração fiscal, não assina documentos e não gera SAF-T AO. Não deve ser tratada como mecanismo de segurança contra um cliente adulterado; as regras críticas devem ser reproduzidas no servidor antes de produção fiscal.

A migração SQL das Etapas 2 e 3 não é alterada nesta etapa. O registo continua com `UNCLASSIFIED_INTERNAL` e estado `internal_preview`.
