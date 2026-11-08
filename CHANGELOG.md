# Registo de alterações

Todas as alterações relevantes deste projecto são documentadas neste ficheiro.

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
