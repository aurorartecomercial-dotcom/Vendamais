# Etapa 6 — Catálogo de classificação fiscal interna

## Objectivo

Adicionar ao cadastro de produtos campos de preparação fiscal interna, para organizar a informação que deverá ser revista antes de qualquer configuração fiscal oficial. Esta etapa não altera o cálculo do IVA no POS.

## Campos no produto

- `fiscalTreatment`: `UNCLASSIFIED_INTERNAL`, `RATE_CONFIGURED_PENDING_REVIEW`, `EXEMPT_PENDING_REVIEW` ou `NOT_SUBJECT_PENDING_REVIEW`.
- `fiscalRate`: taxa percentual interna opcional, limitada a 0–100.
- `fiscalReason`: fundamento ou observação interna, até 240 caracteres.

Os valores são marcadores operacionais do VendaMais. Não são códigos fiscais nem classificações oficiais da AGT. “Possível isenção” e “possível não sujeição” exigem análise legal e documental antes de qualquer utilização fiscal.

## Integração com vendas e registo interno

- Ao adicionar o produto ao carrinho, os campos são copiados para a linha da venda.
- Ao preparar o registo interno da Etapa 4, a informação é guardada em `lines_snapshot` como `fiscal_classification_internal`, `fiscal_rate_internal` e `fiscal_reason_internal`.
- A pré-validação da Etapa 5 alerta para linhas por classificar e para possíveis isenções/não sujeições sem fundamento interno.
- Taxas fora do intervalo 0–100 são bloqueadas na pré-validação.

## Limitações importantes

- O cálculo actual do IVA da venda continua a usar a configuração geral existente. A taxa por produto nesta etapa não é aplicada ao preço, ao total, à impressão ou ao resumo de IVA.
- Não são calculados impostos diferentes por linha nem produzidos códigos de motivo oficiais.
- Não há consulta de NIF, validação jurídica de isenções, séries fiscais, assinatura, comunicação ou homologação AGT.
- Não foi adicionada migração SQL; os campos ficam no cadastro JSON já utilizado pelo sistema e nos snapshots JSON existentes.
- Os dados devem ser revistos por contabilista/fiscalista com base na legislação e documentação técnica oficial aplicável.

## Testes

Executar `npm test`. Os testes cobrem sintaxe, verificações do projecto, regressão e avisos/bloqueios da pré-validação.
