# Revisão técnica — Fase 1

Data: 2026-11-10  
Versão revista: 1.6.0  
Versão com correções pontuais: 1.6.1

## Correções aplicadas nesta entrega

1. Escapados os nomes do cliente e do fornecedor nos cabeçalhos dos modais de recebimento e pagamento. Estes valores são dados editáveis e não devem ser interpolados diretamente em HTML.
2. A conclusão de uma venda passa a guardar o estado anterior, verificar o retorno de `saveData()` e repor o estado em memória se a persistência local falhar. Nesse caso, a interface não anuncia a venda como concluída.
3. Acrescentadas verificações estáticas para impedir regressões nestes pontos.
4. Actualizada a versão para 1.6.1 e registadas as alterações no changelog.

## Riscos ainda abertos — não considerar produção

### Críticos

- **Autenticação local:** `normaliseUser()` mantém `pin` como texto simples e o login compara directamente `next.pin` com o PIN introduzido. Os dados estão no `localStorage`; qualquer pessoa com acesso ao perfil do navegador pode ler ou alterar esses dados. Hash no próprio navegador não substitui autenticação no servidor.
- **Autorização local:** funções como `isAdministrator()`, `canManage()` e `canAccessView()` protegem a interface, mas não protegem dados contra manipulação pelo utilizador. As permissões têm de ser impostas na API/banco de dados.
- **Persistência local:** `localStorage` não oferece transações, concorrência entre dispositivos nem garantias adequadas para registos financeiros. A correção de rollback nesta fase cobre especificamente a conclusão de venda; as restantes operações ainda precisam de tratamento equivalente e, em produção, transações no servidor.
- **Integridade multiempresa no SQL:** as políticas RLS filtram registos por `company_id`, mas várias chaves estrangeiras não garantem que os registos relacionados pertençam à mesma empresa. É necessário reforçar as relações com chaves únicas/compostas e constraints, e validar o desenho com testes de isolamento entre empresas.

### Altos

- **Revisão XSS incompleta:** foram corrigidos dois pontos confirmados nos modais de recebimento e pagamento. É necessária uma auditoria sistemática de todas as interpolações em `innerHTML`, `insertAdjacentHTML` e `document.write`, incluindo atributos HTML e identificadores.
- **Operações financeiras:** compra, recebimento, pagamento a fornecedor, devolução, transferência e movimentos de caixa devem ser operações atómicas. Não basta corrigir apenas a venda.
- **Testes:** `npm run check` verifica sintaxe, ficheiros, ecrãs e presença de símbolos. Não executa testes de comportamento, integração, segurança ou interface.
- **Datas e fuso horário:** funções de data usam `toISOString()`, que converte para UTC. É necessário testar datas locais em Angola e evitar diferenças de dia em operações perto da meia-noite.

## Próximas tarefas técnicas

1. Fazer inventário de todos os pontos de renderização HTML e eliminar interpolação insegura.
2. Definir autenticação real com Supabase Auth; remover PINs como credenciais de segurança local.
3. Rever RLS, privilégios, funções `SECURITY DEFINER` e isolamento multiempresa.
4. Criar RPCs/transações para vendas, compras, recebimentos, pagamentos, devoluções, transferências e caixa.
5. Introduzir testes unitários e de integração com cenários de concorrência e falhas de persistência.
6. Separar `app.js` em módulos sem alterar o comportamento funcional.

## Verificação executada

Com Node.js v22.16.0:

```text
npm run check
Validação concluída: 9 ficheiros e 11 ecrãs verificados.
```

Esta validação passou. Não foi executado um teste manual completo de todos os fluxos no navegador, nem testes contra um projecto Supabase real.
