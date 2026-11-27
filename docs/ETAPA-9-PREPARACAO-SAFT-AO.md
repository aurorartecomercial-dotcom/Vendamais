# Etapa 9 — Diagnóstico de preparação SAF-T (AO) de contabilidade

## O que esta etapa acrescenta
- Nova aba **SAF-T (AO)** em Balanço e relatórios.
- Diagnóstico interno do período anual/parcial seleccionado.
- Verificação de identificação básica da entidade (denominação, NIF com 10 algarismos, morada e contacto).
- Verificação de existência de movimentos contabilísticos, equilíbrio débito/crédito e linhas com valores negativos.
- Sinalização explícita de contas internas por classificar e da falta de mapeamento integral para o plano de contas aplicável.
- Exportação de um relatório JSON de diagnóstico, com as verificações e pendências encontradas.

## O que NÃO faz
- Não gera ficheiro XML SAF-T (AO).
- Não valida XML contra o XSD SAF-T AO 1.01_01.
- Não declara conformidade com o Decreto Executivo n.º 317/20 ou com o Decreto Presidencial n.º 71/25.
- Não transmite nem submete dados à AGT.
- Não substitui revisão de contabilista nem validação/homologação do software.
- O relatório JSON exportado não pode ser submetido à AGT.

## Base normativa consultada
O comunicado da AGT sobre o SAF-T de contabilidade informa que a estrutura deve seguir o Decreto Executivo n.º 317/20 e conter cabeçalho, tabelas mestres e movimentos contabilísticos. O mesmo comunicado indicou a entrega do exercício de 2025 como facultativa e recomendou preparação para o exercício de 2026, a entregar em 2027.

A estrutura XSD SAF-T AO 1.01_01 está publicada no repositório público `assoft-portugal/SAF-T-AO`. A utilização do XSD e a validação efectiva do XML ainda não fazem parte desta etapa.

## Instalação
Não requer migração SQL. Substituir os ficheiros pela versão desta etapa, preservando `supabase-config.js`, e publicar no GitHub Pages.

## Testes
`npm test` inclui testes unitários do diagnóstico. Estes testes não equivalem a validação oficial XSD nem a teste de submissão na AGT.
