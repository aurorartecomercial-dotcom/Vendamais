# Registo de alterações

Todas as alterações relevantes deste projecto são documentadas neste ficheiro.

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
