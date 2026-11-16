# VendaMais Premium 2.1 — implementação e auditoria

## Base utilizada

Implementação baseada no projecto VendaMais 2.0.2 enviado em `vendamais.zip`. A aplicação continua a ser uma SPA HTML/CSS/JavaScript sem dependências externas, com persistência local opcional e integração Supabase.

## Alterações efectivamente aplicadas

### Área do vendedor

- `app.js`: o perfil Vendedor passa a poder abrir `dashboard`; o novo `renderSellerDashboard()` calcula apenas vendas cujo `operatorId` corresponde ao utilizador autenticado localmente.
- Indicadores apresentados: número de vendas hoje, faturação de hoje, faturação do mês, ticket médio do mês e estado/valor esperado do próprio caixa.
- Gráfico de sete dias e lista de vendas recentes limitados às vendas do operador actual.
- Não são apresentados custos, lucro, stock geral, vendas de colegas ou relatórios administrativos.
- O painel usa a estrutura de ecrã existente, sem duplicar módulos.

### Interface premium

- `styles.css`: refinamento de cartões, sombras, estados hover, navegação, gráfico, cantos e comportamento responsivo.
- Nenhum framework ou dependência externa foi introduzido.

### Validação

- `scripts/verify.mjs`: passou a exigir a existência do painel do vendedor, acesso ao dashboard pelo perfil e filtro por `operatorId`.
- `README.md`: documentação actualizada para reflectir o painel individual.
- `CHANGELOG.md`: registo das alterações e das pendências de segurança.

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `app.js` | Acesso ao dashboard do vendedor e renderização individual |
| `styles.css` | Acabamento premium responsivo |
| `scripts/verify.mjs` | Verificações de regressão do dashboard individual |
| `README.md` | Descrição actualizada do perfil vendedor |
| `CHANGELOG.md` | Registo da versão 2.1.0 e avisos de produção |

## Funcionalidades existentes preservadas

A implementação não remove nem substitui ponto de venda, caixa, documentos, catálogo, stock, compras, clientes, fornecedores, relatórios, exportação Excel, cópias de segurança, auditoria, convites, aprovação remota de descontos ou sincronização Supabase.

## Auditoria de segurança — bloqueador de produção

A função `public.save_vendamais_state(p_state, p_expected_revision)` definida nas migrações actuais actualiza o snapshot da empresa com base no utilizador autenticado e na revisão, mas não verifica dentro da função se o utilizador é Administrador/Gerente nem valida que um Vendedor só alterou campos operacionais permitidos. Como é uma função `SECURITY DEFINER`, a segurança não pode depender apenas dos botões escondidos no browser.

**Não foi aplicada uma migração SQL simplista para bloquear Vendedores**, porque o código actual também usa a sincronização geral para persistir operações legítimas do vendedor, como abertura/fecho do próprio caixa e registo de cliente durante a venda. Bloquear a função sem substituir estes fluxos quebraria funcionalidades.

Antes de produção, é necessário: 

1. Criar RPCs transaccionais específicas para abrir/fechar caixa e registar movimentos permitidos, sempre verificando `auth.uid()`, empresa, loja e titularidade do turno.
2. Decidir como persistir clientes criados pelo vendedor, validando os campos permitidos e a empresa.
3. Alterar `cloud.js` para usar essas RPCs nas operações do vendedor.
4. Restringir `save_vendamais_state` a Administrador/Gerente e validar a função no servidor.
5. Testar tentativas de chamada directa, adulteração de payload, acesso cruzado entre lojas/empresas e concorrência.

## Limitações desta entrega

- A interface premium e o painel individual foram implementados no código.
- Não foi possível executar testes de integração contra o projecto Supabase do utilizador, porque não foram fornecidas credenciais nem um ambiente de teste.
- Não foi feita qualquer alteração à base de dados real.
- Metas individuais, comissões, notificações e reconciliação bancária não foram inventadas nem simuladas; exigem regras de negócio e estrutura de dados próprias antes de serem implementadas.
- O modo local continua a ser apropriado apenas para utilização controlada num dispositivo; não oferece isolamento de segurança real entre utilizadores com acesso técnico ao navegador.

## Testes

Executar `npm test` com Node.js 20 ou superior. Os testes cobrem sintaxe, estrutura essencial e cálculos financeiros, mas não substituem os testes manuais e de integração listados acima.
