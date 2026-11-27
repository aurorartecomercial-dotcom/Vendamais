# Etapa 13 — Saldos de abertura e balancete acumulado

## O que foi acrescentado
- Registo manual de saldos de abertura por exercício e por conta interna.
- Validação de contas existentes, valores não negativos, ausência de duplicados e apenas um lado (débito ou crédito) por conta.
- Bloqueio da gravação quando o total de abertura a débito não coincide com o total a crédito.
- Balancete com colunas separadas para abertura, movimentos do período e saldo final devedor/credor.
- Dados guardados no `localStorage` do navegador, separados por identificador fiscal ou nome da empresa e exercício.

## Limitações importantes
- Os saldos de abertura não são sincronizados com Supabase nem partilhados automaticamente entre computadores/navegadores.
- O registo é manual; deve ser conferido com o balancete de encerramento do exercício anterior e validado por contabilista.
- O balancete soma os movimentos gerados pelo motor contabilístico actual, que continua a ser uma representação operacional preliminar.
- Esta etapa não gera SAF-T (AO), não valida XSD e não representa certificação ou aprovação da AGT.
- O balanço patrimonial e a demonstração de resultados existentes não foram convertidos automaticamente em demonstrações oficiais completas.

## Como usar
1. Abra Contabilidade → Balancete.
2. Escolha o exercício correspondente ao período.
3. Introduza os saldos iniciais nas contas necessárias, colocando cada valor apenas em débito ou crédito.
4. Confirme que os totais coincidem e carregue em Guardar saldos de abertura.
5. Consulte o balancete acumulado para comparar abertura, movimentos e fecho.

Antes de substituir os ficheiros publicados, preserve o seu `supabase-config.js`. Não é necessária migração SQL nesta etapa.
