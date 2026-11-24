# Plano técnico — VendaMais ERP Modular

## Decisão de produto

Transformar o VendaMais numa plataforma ERP modular para vários setores, reorganizando profundamente a interface sem substituir as regras de negócio, os dados comerciais nem os fluxos financeiros já existentes.

Este documento é um plano de execução. Um módulo descrito como futuro ou planeado não deve ser apresentado na interface como funcionalidade já disponível.

## Princípios obrigatórios

1. Preservar os identificadores e o formato dos dados existentes até existir migração versionada, testada e reversível.
2. Separar apresentação, autorização, regras de negócio e persistência.
3. A interface pode esconder opções, mas a autorização real tem de ser aplicada no servidor para instalações online.
4. Cada operação financeira ou de stock deve ser atómica, idempotente quando aplicável e auditável.
5. Cada empresa deve permanecer isolada; cada utilizador só opera nas lojas e funções atribuídas.
6. Não executar migrações SQL destrutivas nem rotinas de limpeza como parte de uma reorganização visual.
7. Cada etapa deve passar pelos testes existentes e acrescentar testes para o comportamento novo.

## Arquitetura-alvo

```text
VendaMais ERP
├── Shell da aplicação
│   ├── Seletor de módulos autorizados
│   ├── Área do administrador
│   ├── Área do gerente
│   └── Área do operador/vendedor
├── Núcleo partilhado
│   ├── Empresas, utilizadores e permissões
│   ├── Clientes e fornecedores
│   ├── Produtos, catálogo e inventário
│   ├── Caixa, pagamentos e documentos
│   ├── Diário financeiro e auditoria
│   └── Relatórios e exportações
├── Módulos de negócio
│   ├── Comércio (módulo existente)
│   ├── Restaurante e bares (planeado)
│   ├── Hotelaria (futuro)
│   ├── Contabilidade (evolução futura)
│   ├── Recursos humanos (futuro)
│   └── Gestão escolar/hospitalar (futuro)
└── Adaptadores de persistência
    ├── armazenamento local (modo limitado)
    └── Supabase/PostgreSQL (modo online)
```

Os módulos devem declarar metadados explícitos: `id`, `name`, `status`, `requiredPermissions`, `navigation`, `routes` e `dataDependencies`. A ativação de um módulo não concede automaticamente permissões de administrador nem acesso a dados de outra empresa.

## Estado de execução — 2026-11-24

- **Fundação do catálogo modular iniciada:** página Módulos ERP disponível para os três perfis; Comércio e vendas é o único módulo activo; os outros seis setores estão identificados como planeados.
- **Ainda não concluído:** layouts independentes completos por perfil, permissões granulares por módulo, configuração/activação por empresa e implementação do módulo Restaurante.
- **Validação executada:** verificação estática da interface e 10 testes unitários financeiros aprovados. Não houve execução de SQL nem alteração ao esquema/dados.

## Fases de execução

### Fase 0 — Baseline e segurança de alteração

- Manter uma branch de trabalho separada.
- Executar `npm test` antes e depois de cada alteração.
- Registar os ecrãs, funções, tabelas, RPCs e regras que não podem regredir.
- Criar cópia de segurança dos dados e da base antes de qualquer migração online.
- Não alterar o esquema de dados nesta fase.

### Fase 1 — Shell e áreas por perfil

- Reorganizar a navegação em Operação, Gestão comercial, Análise e Administração.
- Preservar as rotas/ecrãs e os controlos de acesso existentes.
- Criar uma base visual comum e layouts próprios por perfil, sem duplicar a lógica de negócio.
- Garantir que o vendedor não vê nem abre ecrãs de gestão; o gerente não administra utilizadores/empresa; o administrador mantém o controlo global da empresa.
- Acrescentar testes de matriz perfil × ecrã.

### Fase 2 — Catálogo modular

- Introduzir um registo central de módulos, inicialmente apenas com Comércio ativo.
- Separar configuração/estado de ativação de módulo das permissões de utilizador.
- Mostrar módulos futuros como indisponíveis ou não os mostrar; nunca simular funcionalidades prontas.
- Criar testes para ativação, visibilidade, permissões e dependências.

### Fase 3 — Dashboard e relatórios

- Criar dashboard por perfil e por módulo.
- Reutilizar fontes de dados existentes para faturação, IVA, custo, resultado estimado, caixa, stock e contas a receber/pagar.
- Distinguir sempre faturação, lucro estimado, saldo de caixa e saldo bancário.
- Adicionar gráficos e PDF sem alterar a origem dos cálculos financeiros.

### Fase 4 — Restaurante e bares

- Definir entidades e estados para salas, mesas, reservas, comandas, pedidos, linhas de pedido, cozinha/bar e pagamentos.
- Integrar produtos e stock partilhados, com baixa de stock controlada e auditável.
- Suportar transferência de mesa, divisão de conta, cancelamento autorizado e impressão.
- Criar RPCs transacionais para operações concorrentes; testar pedidos duplicados, cancelamentos e falhas parciais.
- Só ativar o módulo após migrações e testes de integração estarem concluídos.

### Fase 5 — Robustez de produção

- Rever autenticação e ciclo de sessão; sessão inválida deve terminar em pedido de autenticação, nunca escolher automaticamente outro utilizador.
- Rever todas as inserções HTML dinâmicas e manter escape/DOM seguro para dados não confiáveis.
- Rever RLS e permissões `EXECUTE` de todas as funções `SECURITY DEFINER`.
- Validar isolamento multiempresa e restrição por loja em cada operação.
- Testar concorrência, idempotência, auditoria, backups e recuperação.

### Fase 6 — Novos setores

- Hotelaria, recursos humanos, contabilidade, escolar e hospitalar serão projetos modulares separados.
- Cada módulo terá requisitos, modelo de dados, permissões, migrações e testes próprios.
- Contabilidade completa e faturação fiscal certificada exigem análise das regras legais e integração apropriada; não serão inferidas a partir dos relatórios de gestão atuais.

## Inventário técnico observado no ZIP analisado

- Aplicação SPA estática, sem dependências externas de runtime declaradas.
- `index.html` contém os ecrãs; `styles.css` contém a apresentação; `app.js` concentra estado, regras, navegação e persistência local.
- `cloud.js` integra o Supabase; `finance-core.js` contém cálculos financeiros reutilizáveis.
- Os perfis locais atuais são Administrador, Gerente e Vendedor.
- O esquema SQL contém empresas, perfis, snapshots e livro central de vendas, com políticas RLS e funções RPC.
- Os testes automatizados existentes cobrem dez casos do núcleo financeiro e verificações estáticas da interface/estrutura.

## Riscos e verificações pendentes antes de produção

- `getSessionUser()` escolhe um administrador ou outro utilizador ativo quando o identificador guardado não corresponde a uma sessão válida. Rever o fluxo completo de inicialização, restauro e autenticação antes de alterar esta função, para que uma sessão inválida nunca herde outra identidade.
- A análise estática encontrou 67 usos de `innerHTML`, 6 de `insertAdjacentHTML` e 1 de `document.write` em `app.js`. A contagem não prova XSS; cada ponto que recebe dados de utilizador, sincronização ou base de dados precisa de revisão contextual.
- `supabase/2026-11-professional-upgrade.sql` contém duas definições de `reset_vendamais_business_data()` e concede `EXECUTE` a `authenticated`. Não executar esta migração sem revisão SQL específica e validação dos privilégios pretendidos.
- A interface local limita a limpeza comercial ao Administrador, mas a função SQL usa `is_company_manager()`, que no esquema inclui Administrador e Gerente. Esta diferença permite que um Gerente online invoque uma operação destrutiva se tiver acesso à RPC. Corrigir a autorização no servidor para Administrador apenas antes de produção.
- A autorização da interface local não protege contra alguém que controla o navegador/dispositivo. A operação multiutilizador deve usar autenticação e validação no servidor.
- Os testes atuais não demonstram, por si só, segurança multiempresa, RLS, concorrência ou funcionamento real do Supabase.

## Critérios de aceitação de cada etapa

- `npm test` passa sem regressões.
- A matriz de permissões é testada para Administrador, Gerente e Vendedor.
- Nenhum fluxo financeiro ou de stock muda sem teste de regra de negócio correspondente.
- Nenhuma migração é aplicada sem cópia de segurança, revisão e procedimento de reversão.
- Os dados de empresas diferentes permanecem isolados nos testes de integração.
- O módulo só é anunciado como disponível quando as suas páginas, permissões, dados e operações estiverem implementados e testados.


## Entrega 2.3.1 — Separação da área administrativa

- A página `adminView` é exclusiva do perfil Administrador através da lista `ROLE_VIEWS` e da verificação central `canAccessView`.
- A área administrativa apresenta indicadores agregados e atalhos para Definições, Relatórios e Módulos.
- Gerente e Vendedor continuam a utilizar a área operacional (`dashboardView`) e não recebem a rota `admin`.
- Os ecrãs comerciais existentes continuam a ser reutilizados; não foram criadas tabelas, migrações ou cópias paralelas de dados.
- Esta separação é de interface e autorização da aplicação cliente; não substitui a validação de permissões no servidor/Supabase.
