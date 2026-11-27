# Etapa 11 — Modelo de estrutura XML SAF-T (AO)

Esta etapa acrescenta ao relatório SAF-T uma pré-visualização e exportação de um modelo XML orientativo, com namespace SAF-T AO 1.01_01 e secções Header, MasterFiles, GeneralLedgerEntries e SourceDocuments.

O modelo contém marcadores `PREENCHER` e comentários de orientação. Não inclui movimentos reais, plano de contas completo, saldos de abertura/fecho, tabelas mestres nem documentos de origem. Também não contém NIF do produtor do software nem número de validação AGT. Por isso, **não é um ficheiro SAF-T válido, não foi validado contra XSD e não pode ser submetido à AGT**.

A estrutura foi preparada como referência técnica com base no Decreto Executivo n.º 317/20 e no XSD SAF-T AO 1.01_01 publicado no repositório público ASSOFT. A versão aplicável e os requisitos devem ser confirmados junto da AGT e do contabilista responsável.

Não exige migração SQL. O modelo é gerado localmente no navegador a partir dos dados de identificação disponíveis e usa marcadores explícitos para os campos em falta.
