# Etapa 3 — Integridade interna e trilho de auditoria

## O que esta etapa acrescenta

A migração `supabase/2026-11-fiscal-integrity-audit.sql` acrescenta:

- `integrity_hash`: SHA-256 calculado no servidor PostgreSQL sobre os dados estruturados do documento;
- `sealed_at`: instante em que o snapshot foi selado;
- `hash_algorithm`: identificação do algoritmo usado;
- `fiscal_document_audit`: histórico de criação e mudanças de estado;
- trigger que calcula o hash na criação, impede alteração posterior dos dados do snapshot e regista mudanças de estado;
- RLS para consulta do histórico apenas dentro da empresa actual; utilizadores autenticados não recebem permissões directas de escrita no histórico.

## Limites importantes

Este SHA-256 é um mecanismo interno de detecção de alterações. **Não é** assinatura digital qualificada, hash fiscal oficial, código de validação, QR Code ou prova de comunicação/aceitação pela AGT. Não inventa nem atribui séries AGT e não altera a impressão para sugerir certificação.

O histórico regista eventos internos, mas não constitui, isoladamente, um arquivo inviolável contra administradores da base de dados, proprietários do projecto ou operadores com privilégios elevados. Para maior garantia será necessário controlo operacional, backups, monitorização externa e requisitos oficiais da AGT.

## Aplicação

1. Fazer backup da base de dados.
2. Confirmar que a migração da Etapa 2 foi aplicada e que `public.fiscal_document_records` existe.
3. Executar esta migração primeiro num projecto de homologação.
4. Criar um registo de teste através do fluxo autorizado e confirmar `integrity_hash` com 64 caracteres hexadecimais e `sealed_at` preenchido.
5. Tentar alterar uma coluna de snapshot: o trigger deve rejeitar a alteração.
6. Alterar o estado interno: deve surgir evento `status_changed` em `fiscal_document_audit`.
7. Testar isolamento entre empresas e acesso por perfis diferentes.

Esta etapa ainda não liga automaticamente a tabela ao fluxo de vendas da aplicação e não implementa assinatura digital nem integração AGT.
