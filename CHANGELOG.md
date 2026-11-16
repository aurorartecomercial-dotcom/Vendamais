# Registo de alterações

## [2.1.0] — 2026-11-16

### Adicionado

- O perfil Vendedor passa a ter acesso ao painel inicial, sem receber acesso aos relatórios gerais, produtos, stock ou definições.
- Criado painel individual do vendedor com vendas do dia, faturação diária e mensal, ticket médio, estado do próprio caixa, gráfico de sete dias e vendas recentes filtradas pelo identificador do operador.
- O painel do vendedor não apresenta lucro, custos, indicadores globais ou vendas de outros operadores.
- Aplicado acabamento visual premium responsivo aos cartões, painéis, navegação e gráficos, sem substituir os fluxos existentes.

### Segurança e validação pendente antes de produção

- A função Supabase `save_vendamais_state` deve ser endurecida no servidor. A interface por perfil não é uma fronteira de segurança. A correcção exige desenhar operações RPC específicas para as alterações legítimas do vendedor (caixa e cliente) antes de bloquear a escrita geral; não se deve simplesmente retirar o acesso do vendedor, pois isso interromperia operações actuais.
- É necessária validação integrada num projecto Supabase de teste, com contas reais de Administrador, Gerente e Vendedor, incluindo RLS, sincronização concorrente e fluxos de caixa.

## [2.0.1] — 2026-11-16

### Corrigido e reforçado

- Criado núcleo financeiro com arredondamento monetário a duas casas, cálculo uniforme de subtotal, desconto, IVA e total, validação de pagamentos e rateio mensal.
- Relatórios deixam de somar simultaneamente o custo fixo configurado e a despesa fixa real correspondente no mesmo mês/categoria, com marcação explícita para novos registos.
- Resumo de meios de pagamento passa a considerar recebimentos reais e não a totalidade de facturas a crédito.
- Compras e despesas pagas em dinheiro passam a movimentar o caixa; pagamentos iniciais a fornecedores ficam registados no histórico; despesas a crédito passam a integrar contas a pagar e permitem liquidação parcial ou total.
- Custo de stock passa a usar custo médio ponderado nas entradas de compra e nas devoluções, mantendo o custo histórico em cada venda.
- Pagamentos, despesas, compras, movimentos e devoluções passam a reverter a alteração local se a gravação no navegador falhar.
- Devolução total exige o reembolso integral do montante já recebido, evitando anular uma venda com reembolso parcial.
- Adicionada migração Supabase para recalcular e validar no servidor os preços, custos, descontos, IVA, total, pagamento, stock e idempotência das vendas.
- Acrescentados testes unitários aos cálculos financeiros.


Todas as alterações relevantes deste projecto são documentadas neste ficheiro.

## [2.0.0] — 2026-11-14

### Adicionado

- Identidade visual por empresa com doze combinações de cores profissionais: Esmeralda, Oceano, Safira, Violeta, Ameixa, Coral, Pôr do sol, Lima, Turquesa, Ardósia, Cereja e Noite azul.
- Escolha de cores durante o registo da empresa online e em **Definições → Dados da empresa**.
- Cor individual por loja ou armazém, seleccionada ao criar/editar o local e mostrada nos cartões e no selector de local.
- A identidade escolhida é sincronizada com a empresa, para que administrador, vendedores e lojas vejam a mesma imagem visual.

## [1.9.1] — 2026-11-14

### Corrigido

- A actualização SQL pode agora ser executada novamente numa base que já tenha a política de vendas por loja criada.

## [1.9.0] — 2026-11-14

### Corrigido e melhorado

- O administrador cria a loja e atribui o vendedor a uma loja já existente; criar vendedor deixou de gerar uma loja com o nome do colaborador.
- Novo fluxo de convite online: o administrador informa e-mail, função e loja; o vendedor cria apenas a própria palavra-passe e entra directamente na loja preparada.
- As contas sem convite passam a explicar que vendedores não devem registar empresas. Empresas diferentes continuam separadas no Supabase por regras de acesso e identificador próprio.
- Adicionado `supabase-config.js` para publicar a URL e a chave pública uma vez, sem pedir esses dados em cada telemóvel.

## [1.8.1] — 2026-11-14

### Corrigido

- O ecrã de entrada online passa a mostrar **Criar conta** para não levar vendedores a pensar que devem criar uma empresa ou receber privilégios de administrador.

## [1.8.0] — 2026-11-14

### Adicionado

- Venda central atómica no Supabase: numeração sequencial no servidor, baixa de stock por loja, documento e auditoria numa única transacção.
- Fila de vendas pendentes para indisponibilidade de internet, com sincronização automática ao recuperar a ligação.
- Pedidos e aprovação de acessos online: o colaborador cria a própria conta e o administrador atribui função e loja no VendaMais.
- Auditoria central e cópia automática diária da empresa na base de dados.
- Painel operacional para gestores: caixas abertos, cobranças vencidas, alertas de stock, vendas pendentes e metas diária/mensal por loja.
- Guia de instalação profissional e migração SQL de actualização da base.

### Segurança

- Vendedores online apenas podem consultar e registar vendas da loja atribuída.
- O servidor substitui o operador e a numeração enviados pelo navegador pelos dados da conta autenticada.

## [1.7.0] — 2026-11-11

### Adicionado

- Novo separador **Vendedores** no balanço: resumo individual, vendas diárias e consolidação mensal, com faturação, média por venda e saldo por receber.
- Configuração de custos fixos mensais em cada loja (renda, energia, água, internet, salários, segurança e outros).
- Folhas **Custos fixos**, **Vendedores**, **Vendas diárias** e **Vendas mensais** no relatório Excel.

### Corrigido e melhorado

- O resultado financeiro passa a usar uma única regra em todo o sistema: vendas sem IVA menos custo histórico dos produtos, custos fixos e custos variáveis.
- Os custos mensais configurados são imputados proporcionalmente aos dias do período seleccionado e são separados das despesas fixas registadas, deixando a origem de cada valor visível.
- A demonstração financeira, produtos, vendas por semana, despesas e desempenho por loja foram reorganizados com mais detalhe e fórmulas explicadas no ecrã.
- Restaurada a separação real entre os perfis Gerente e Administrador: o gerente opera e consulta relatórios, enquanto definições e utilizadores permanecem reservados ao administrador.

## [1.6.2] — 2026-11-10

### Alterado

- Separados visualmente os ambientes de Administrador, Gerente e Vendedor, com identificação e contexto próprios na navegação.
- Mantido o controlo central de acesso por perfil (`ROLE_VIEWS`): os vendedores continuam limitados a vendas, caixa próprio e documentos das próprias vendas.
- Clarificadas as autorizações de cada perfil no ecrã de gestão de utilizadores, sem alterar os fluxos de vendas, stock, caixa ou persistência.

### Nota de segurança

- As permissões continuam a ser aplicadas no navegador nesta edição local. Para segurança real entre dispositivos, a autorização deve ser validada também no servidor e na base de dados.

## [1.6.1] — 2026-11-10

### Corrigido

- Escapados os nomes de clientes e fornecedores apresentados nos cabeçalhos dos modais de recebimento e pagamento, evitando interpretação de HTML fornecido pelo utilizador nesses pontos.
- A conclusão de uma venda passa a guardar uma cópia do estado anterior e a repor os dados em memória se a persistência local falhar; a aplicação deixa de anunciar uma venda como concluída nesse cenário.

### Nota técnica

- Esta versão continua a ser uma aplicação local: PINs e permissões no navegador não constituem autenticação/segurança adequada para produção multiutilizador. A migração da autenticação e das operações financeiras para o servidor continua obrigatória antes de disponibilizar o sistema online.

## [1.6.0] — 2026-11-09

### Adicionado

- Gestão de lojas e armazéns, acessível apenas ao administrador.
- Stock separado por local para cada produto, com selector de local de operação no topo da aplicação.
- Transferências de stock entre locais, com referência própria, validação de disponibilidade, movimentos de entrada/saída e auditoria.
- Atribuição obrigatória de local a cada utilizador; vendedores ficam limitados ao local definido pelo administrador.
- Caixa por local e exportação Excel com a nova folha **Stock por local**.

### Alterado

- Vendas, compras, produtos, ajustes de inventário, alertas e movimentos passaram a respeitar o local de operação.
- Relatórios Excel passaram a incluir o local em cada venda e a distinguir stock total de stock por loja/armazém.
- Limpar dados comerciais preserva os locais configurados para a empresa.

## [1.5.0] — 2026-11-09

### Adicionado

- Acesso por utilizador com PIN pessoal de 4 a 8 dígitos, bloqueio manual de sessão e alteração obrigatória do PIN inicial.
- Área de vendedor limitada a nova venda, caixa próprio e documentos emitidos pelo próprio utilizador.
- Migração automática do perfil antigo `Caixa` para o novo perfil `Vendedor`.

### Alterado

- Administrador mantém acesso total e exclusivo às definições, cópias, utilizadores, integrações e limpeza de dados.
- Gerente opera produtos, inventário, compras, fornecedores, clientes, caixa, documentos e relatórios, sem gerir utilizadores ou definições gerais.
- Vendedor deixa de alterar produtos, stock, preços, compras, fornecedores, relatórios e configurações; vendas a crédito, descontos, recebimentos e devoluções exigem gerente ou administrador.
- Cópias de segurança deixam de incluir PINs. Depois de restaurar uma cópia, cada utilizador deve entrar com o PIN temporário e criar um PIN novo.

## [1.4.0] — 2026-11-09

### Adicionado

- Exportação de relatórios em Excel (`.xlsx`) sem depender de serviços externos ou de internet.
- Livro de relatório com folhas organizadas: Resumo, Vendas, Artigos vendidos, Stock actual, Clientes e Fornecedores.
- Exportação Excel dos documentos comerciais, com colunas, cabeçalhos, filtros, datas e valores monetários formatados.
- Opção protegida para limpar os dados comerciais e começar com produtos, clientes e fornecedores próprios.

### Alterado

- Os botões de exportação passaram de CSV para Excel, eliminando o problema de toda a informação abrir numa única coluna.

## [1.3.1] — 2026-11-09

### Corrigido

- Numeração automática de vendas, compras e notas de crédito baseada na maior referência existente, evitando repetição após restauros.
- Devoluções registam valor reembolsado e meio de reembolso, em vez de assumirem que todo o valor foi devolvido em dinheiro.
- Reembolso em dinheiro exige caixa aberto; devoluções anulam o saldo em dívida sem duplicar movimentos de caixa.
- Apenas administradores podem criar ou alterar utilizadores e preferências de integração.
- O último administrador activo não pode ser removido ou rebaixado por engano.

## [1.3.0] — 2026-11-09

### Adicionado

- Turnos de caixa, fundo inicial, movimentos, fecho com contagem e diferenças.
- Documentos comerciais, impressão, exportação e devolução com nota de crédito interna.
- Perfis operacionais de Administrador, Gerente e Caixa, com selecção de sessão local.
- Registo de auditoria local das principais operações.
- Produtos com código de barras, unidades, armazém, lote e validade.
- Sugestão de reposição, compras a crédito e pagamentos parciais a fornecedores.
- Esquema PostgreSQL/Supabase e guia de segurança para implantação multiutilizador.

### Segurança

- Vendas e recebimentos em dinheiro exigem um turno de caixa aberto.
- Devoluções em dinheiro exigem caixa aberto e registam saída de caixa.

## [1.2.0] — 2026-11-09

### Adicionado

- Cadastro de cliente particular ou empresa, directamente no ponto de venda.
- NIF obrigatório para empresa, contacto, e-mail, morada de facturação e limite de crédito.
- Selecção rápida e edição de dados de cliente durante a venda.
- Factura-recibo, factura e venda a dinheiro como tipos de documento.
- Valores recebidos, cálculo de troco, vendas a crédito, vencimento e registo de recebimentos.
- Saldos pendentes visíveis em clientes, painel, relatórios e exportação CSV.

### Melhorado

- Os dados de facturação do cliente ficam gravados na própria venda, preservando documentos históricos.
- Restauros de cópias anteriores são actualizados automaticamente para o novo modelo de dados.

## [1.1.0] — 2026-11-08

### Adicionado

- Documentação de instalação, desenvolvimento, arquitectura e contribuição.
- Scripts sem dependências para servidor local e validação do projecto.
- Configuração inicial de GitHub Actions.
- Licença MIT, `.gitignore` e `.editorconfig`.
- Metadados de versão para cópias locais.

### Melhorado

- Normalização de dados restaurados para tolerar cópias de versões anteriores.
- Feedback quando o navegador não consegue guardar os dados localmente.
- Acessibilidade de janelas modais: foco inicial, fecho por `Esc` e devolução do foco.

## [1.0.0] — 2026-11-08

### Adicionado

- Ponto de venda, recibos, gestão de produtos, stock, clientes, fornecedores, compras e relatórios.


## Melhorias de interface e contabilidade

- Menu lateral com rolagem própria para manter Balanço & Relatórios e Definições acessíveis em ecrãs baixos.
- Aparência da área de gestão uniformizada entre Administrador e Gerente.
- Registo de despesas operacionais por categoria, data, meio de pagamento e loja.
- Demonstração de resultados com resultado bruto e resultado líquido estimado após despesas.
- Indicadores de contas a receber e contas a pagar a fornecedores.
- Exportação Excel actualizada com folha dedicada às despesas e resumo financeiro revisto.


## 2.0.2 — Central de Aprovação de Descontos

- Adicionada solicitação de desconto por produto pelo vendedor, sem fechar o caixa nem criar uma venda separada.
- Adicionada central remota para o administrador aprovar ou rejeitar pedidos em tempo real através do Supabase Realtime.
- A aprovação fica vinculada ao produto, preço, quantidade e caixa/turno original, quando informado.
- O servidor valida a aprovação e consome-a uma única vez no registo transaccional da venda.
- O desconto de produto é reflectido nos totais, IVA, margem e relatórios, sem aplicar desconto aos restantes artigos.
- Incluída migração SQL e testes unitários para descontos por linha.
