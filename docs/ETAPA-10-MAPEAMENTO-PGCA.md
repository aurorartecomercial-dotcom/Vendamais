# Etapa 10 — Mapeamento de contas para o PGCA

## O que foi acrescentado
- Ecrã de mapeamento na aba SAF-T (AO) dos relatórios.
- Lista das contas internas utilizadas pelo motor contabilístico.
- Campos para código PGCA e conta agregadora, mais confirmação de revisão contabilística.
- Guardar e recuperar o mapeamento no armazenamento local do navegador.
- Diagnóstico com total de contas, contas mapeadas, revistas, por mapear e códigos duplicados.
- O diagnóstico SAF-T deixa de considerar o mapeamento concluído enquanto todas as contas não tiverem código e revisão, ou existirem linhas em 39.9.

## Importante
Os códigos oficiais não são preenchidos automaticamente. As contas internas actuais são uma estrutura operacional do VendaMais e não devem ser confundidas com o plano oficial completo da empresa. O utilizador deve confirmar cada código e conta agregadora com o contabilista, segundo o PGCA aplicável.

O mapeamento fica guardado apenas neste navegador/dispositivo. Não é sincronizado com Supabase nem com outros utilizadores.

Esta etapa não gera XML SAF-T, não valida o XSD, não implementa assinatura digital, não submete ficheiros à AGT e não certifica o software. O diagnóstico JSON continua a ser apenas interno.

## Base de referência
- Decreto n.º 82/01, de 16 de Novembro — Plano Geral de Contabilidade.
- Decreto Executivo n.º 317/20, de 14 de Dezembro — estrutura de dados SAF-T (AO).
- XSD SAF-T AO público consultado para compreender os campos AccountID e GroupingCode; confirmar sempre a versão aplicável junto da AGT.
