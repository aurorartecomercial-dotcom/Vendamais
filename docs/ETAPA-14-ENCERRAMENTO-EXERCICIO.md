# Etapa 14 — Encerramento do exercício

## O que acrescenta
- Analisa o exercício civil completo (1 de Janeiro a 31 de Dezembro), para todas as lojas.
- Exige saldos de abertura guardados e equilibrados.
- Rejeita lançamentos desequilibrados e contas que não pertençam ao plano interno.
- Calcula rendimentos, gastos e resultado anual (lucro/prejuízo).
- Prepara saldos do próximo exercício: contas de rendimento e gasto ficam a zero; o resultado é transferido para a conta interna 88.1; as restantes contas mantêm os saldos líquidos.
- Só grava os novos saldos de abertura após confirmação; se já existirem, pede confirmação de substituição.
- Não bloqueia, apaga ou altera o exercício encerrado nem cria lançamentos contabilísticos definitivos.

## Limitações importantes
- A preparação é local ao navegador (`localStorage`), não sincronizada com Supabase nem partilhada entre computadores.
- O resultado depende do diário operacional actualmente convertido em partidas dobradas e dos saldos de abertura inseridos pelo utilizador.
- O plano de contas é interno e a conta 88.1 é uma conta interna de apuramento; a correspondência oficial e o lançamento de encerramento devem ser revistos por contabilista certificado conforme o PGCA aplicável.
- Não é um fecho oficial, não bloqueia períodos, não gera demonstrações oficiais nem SAF-T (AO), e não envia dados à AGT.
- Faça cópia de segurança e reconcilie bancos, caixa, clientes, fornecedores, existências, IVA, imobilizado e inventário antes de utilizar os saldos preparados.

## Instalação
Substitua os ficheiros do projecto pelos desta etapa, preservando o `supabase-config.js`. Não há migração SQL nesta etapa.
