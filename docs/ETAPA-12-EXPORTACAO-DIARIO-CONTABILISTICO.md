# Etapa 12 — Exportação auxiliar do diário contabilístico

Esta etapa acrescenta exportação JSON e CSV dos lançamentos derivados pelo motor contabilístico (`VendaMaisAccounting.buildLedger`) para o período e loja seleccionados no relatório. Cada linha inclui a data, referência do lançamento, origem, descrição, conta interna, código PGCA introduzido no mapeamento, conta agregadora, estado de revisão, débito e crédito.

O ficheiro inclui totais, diferenças, linhas em conta interna por classificar (39.9), valores negativos e avisos sobre contas não mapeadas ou ainda não revistas. O CSV usa UTF-8 com BOM e separador ponto e vírgula; textos potencialmente interpretados como fórmulas em folhas de cálculo são neutralizados.

## Limites importantes

- É um pacote auxiliar de trabalho para revisão do contabilista, não é SAF-T (AO) e não pode ser submetido à AGT.
- Os lançamentos são derivados do diário financeiro operacional e devem ser reconciliados com documentos, caixa, bancos, clientes, fornecedores e inventário.
- Não inclui saldos de abertura/fecho, plano de contas oficial completo, tabelas mestres, documentos comerciais completos nem validação XSD.
- Os códigos PGCA são os introduzidos pelo utilizador; o VendaMais não os certifica.
- Não foi acrescentada migração SQL. Os mapeamentos continuam locais ao navegador.

## Utilização

Em Balanço & relatórios → SAF-T (AO), seleccione o período e a loja, reveja os avisos e exporte JSON ou CSV. Mesmo quando o total débito/crédito está equilibrado, isso não prova que a classificação contabilística esteja correcta.
