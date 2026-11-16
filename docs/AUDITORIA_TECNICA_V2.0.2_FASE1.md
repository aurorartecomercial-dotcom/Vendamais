# Auditoria técnica — VendaMais ERP 2.0.2

Data: 2026-11-16  
Escopo: auditoria estática do ZIP `vendamais-erp-2.0.2-aprovacao-descontos.zip`, sem alteração de funcionalidades ou dados.

## 1. Inventário

- 32 entradas no ZIP original.
- 464.912 bytes descomprimidos.
- Aplicação principal: `app.js` (235.880 bytes), `cloud.js`, `finance-core.js`, `index.html` e `styles.css`.
- Integração Supabase e cinco scripts SQL, incluindo schema, upgrade profissional, integridade financeira, aprovação de descontos e reset de dados.
- Suite de testes: `tests/finance.test.mjs`.

## 2. Verificação executada

Com Node.js v22.16.0:

```text
npm test
Validação estrutural: 18 ficheiros e 11 ecrãs verificados.
Testes unitários: 9 aprovados, 0 falhados.
```

Os testes cobrem cálculos de subtotal/desconto/IVA, arredondamento, liquidação, rateio de custos, dupla contagem de custos fixos, custo médio ponderado e descontos por produto.

Limite: a suite não executa testes reais de navegador, concorrência, RLS, autenticação ou integração com uma instância Supabase.

## 3. Constatações e prioridades

### Crítico — autenticação local e sessão

`app.js` guarda o PIN no registo local de utilizador (`normaliseUser`) e resolve a sessão em `getSessionUser()`. A resolução contém fallback para outro utilizador activo, incluindo administrador. Isto não constitui autenticação segura entre computadores e pode associar uma operação à identidade errada num equipamento partilhado.

Acção: introduzir Supabase Auth como identidade efectiva no modo online; rever o fallback de sessão e separar claramente o modo local/offline do modo autenticado. Não considerar hash local como substituto da autenticação do servidor.

### Crítico — autorização e isolamento

As verificações `isAdministrator()`, `canManage()` e `canAccessView()` são executadas na interface. O SQL possui RLS e funções `SECURITY DEFINER`, mas a cobertura e as relações empresa/loja/utilizador necessitam de revisão específica e testes negativos de isolamento.

Acção: validar cada RPC `SECURITY DEFINER`, `search_path`, grants, identidade do chamador, empresa e loja; reforçar constraints compostas para impedir relações cruzadas entre empresas; testar vendedor, gerente e administrador em empresas/lojas diferentes.

### Crítico — função de limpeza de dados

`supabase/2026-11-professional-upgrade.sql` define `public.reset_vendamais_business_data()` duas vezes e concede `EXECUTE` a `authenticated` nas duas definições. A função elimina registos de `sales_ledger` e limpa colecções operacionais no snapshot (produtos, clientes, fornecedores, vendas, compras, movimentos, recebimentos, pagamentos, transferências, caixas, despesas, devoluções e auditLog local do snapshot). A função verifica `is_company_manager()`.

Acção: não executar esta função nem scripts de reset na evolução. Antes de qualquer uso futuro, rever a necessidade, limitar a autorização ao administrador, exigir confirmação explícita e cópia de segurança verificável. A evolução do ERP não necessita de limpeza de dados.

### Alto — auditoria

Existe auditoria local em `data.auditLog`, limitada aos 500 eventos mais recentes, e existe tabela central `audit_events`. A UI consulta os eventos centrais quando online. Nem todas as operações locais estão garantidamente cobertas por eventos centrais imutáveis.

Acção: centralizar no servidor eventos de operações críticas, com actor, empresa, loja, entidade, identificador, instante, resultado e antes/depois quando aplicável. Impedir update/delete por utilizadores comuns.

### Alto — renderização dinâmica / XSS

A análise estática encontrou 59 atribuições `.innerHTML`, seis chamadas `insertAdjacentHTML` e uma chamada `document.write` em `app.js`. Há vários usos de `escapeHtml`, mas a quantidade de pontos exige revisão individual de todos os dados interpolados, incluindo atributos, identificadores e dados importados/restaurados.

Acção: auditar cada sink, preferir `textContent` e criação de elementos DOM, e aplicar escaping contextual quando HTML for necessário. Acrescentar testes de payloads XSS nos campos de cliente, produto, fornecedor, notas e nomes de utilizador.

### Alto — transacções e concorrência

`localStorage` não fornece transacções entre dispositivos. A documentação do próprio projecto reconhece que as operações financeiras para além dos fluxos corrigidos precisam de garantias atómicas no servidor. As migrações não foram executadas nem testadas numa base Supabase real nesta auditoria.

Acção: consolidar RPCs transaccionais para vendas, compras, stock, caixa, recebimentos, pagamentos, devoluções, transferências e comissões; implementar idempotência e testes concorrentes no PostgreSQL.

### Médio — testes e fuso horário

Os nove testes existentes são unitários financeiros. O script `verify.mjs` é sobretudo estrutural. Não há evidência nesta entrega de testes browser/E2E, RLS, concorrência, reconexão offline ou testes de datas locais em Angola.

Acção: acrescentar testes de integração, E2E e regressão; cobrir `Africa/Luanda`, datas próximas da meia-noite, reconexão e sincronização repetida.

## 4. Capacidades existentes a preservar

- Vendas, caixa e turnos.
- Produtos, inventário e stock por local.
- Compras, fornecedores, despesas, recebimentos e pagamentos.
- Transferências entre locais.
- Clientes e histórico comercial básico.
- Relatórios financeiros e desempenho por loja/vendedor.
- Aprovação remota de descontos por Supabase Realtime.
- `localStorage`, cópia/restauro e sincronização Supabase.

## 5. Decisões para as fases seguintes

1. Não substituir a aplicação nem apagar dados existentes.
2. Não executar `reset_vendamais_business_data()` nem scripts de limpeza.
3. Fazer migrações incrementais e aditivas; confirmar a ordem e o estado real antes de aplicar SQL.
4. Reutilizar `audit_events`, perfis, empresas, lojas, vendas e clientes onde já existirem estruturas adequadas.
5. Implementar funcionalidades por etapas, com testes de regressão em cada etapa.
6. Não declarar produção validada sem testes contra um projecto Supabase real e sem revisão de segurança.

## 6. Limitações desta auditoria

A auditoria foi estática e local ao conteúdo do ZIP. Não houve acesso à conta Supabase, à base de dados de produção, a credenciais, nem aos computadores dos vendedores. Por isso, não se afirma que qualquer migração esteja aplicada ou que as políticas RLS estejam correctas em execução.
