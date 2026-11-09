# VendaMais

> Sistema local de ponto de venda, inventário e gestão comercial para pequenos e médios negócios.

VendaMais reúne vendas, clientes, fornecedores, compras, inventário e balanço num único painel simples de usar. É uma aplicação web estática: funciona num navegador moderno sem servidor, instalação ou dependências externas.

## Funcionalidades

| Área | O que permite fazer |
| --- | --- |
| Ponto de venda | Procurar artigos, montar carrinho, aplicar desconto, escolher cliente e meio de pagamento. |
| Recibos | Gerar uma janela de impressão após a conclusão de cada venda. |
| Produtos e stock | Registar códigos, categorias, preço de custo, preço de venda e limite mínimo. |
| Inventário | Registar entradas, saídas e ajustes; consultar o histórico de movimentos. |
| Compras | Registar compras por fornecedor e actualizar automaticamente custo e stock. |
| Clientes e fornecedores | Manter contactos, NIF, morada e histórico comercial. |
| Clientes empresariais e crédito | Distinguir particular/empresa, exigir NIF empresarial, definir crédito, emitir venda a crédito e registar recebimentos. |
| Caixa e turnos | Abrir e fechar caixa por operador, controlar fundo inicial, movimentos físicos, contagem e diferenças. |
| Documentos e devoluções | Consultar e imprimir documentos; processar devoluções com nota de crédito interna e reposição de stock. |
| Operação | Perfis de Administrador, Gerente e Caixa, além de um registo local de auditoria. |
| Stock avançado | Código de barras, unidade, armazém, lote e aviso de validade próxima. |
| Balanço | Consultar faturação, IVA, custo dos produtos vendidos, margem, pagamentos e artigos mais vendidos. |
| Segurança dos dados | Exportar/restaurar cópias completas em JSON e relatórios organizados em Excel. |

## Requisitos

- Navegador actual: Edge, Chrome ou Firefox.
- Opcional para desenvolvimento: [Node.js](https://nodejs.org/) 20 ou superior.

## Começar rapidamente

### Utilização directa

Abra o ficheiro `index.html` no navegador. A aplicação inicia com dados de demonstração e guarda as alterações apenas no navegador desse computador.

### Desenvolvimento local

```bash
git clone https://github.com/SEU-UTILIZADOR/vendamais.git
cd vendamais
npm run serve
```

Depois abra `http://localhost:4173`.

Não há dependências para instalar. O comando usa apenas o Node.js para disponibilizar os ficheiros localmente.

## Comandos

```bash
npm run serve   # inicia servidor local em http://localhost:4173
npm run check   # valida sintaxe e estrutura essencial do projecto
npm test        # executa a mesma validação
```

Para usar outra porta:

```bash
PORT=8080 npm run serve
```

No Windows PowerShell:

```powershell
$env:PORT=8080; npm run serve
```

## Estrutura do projecto

```text
vendamais/
├── index.html              # estrutura e ecrãs da aplicação
├── styles.css              # design responsivo
├── app.js                  # lógica de vendas, stock, relatórios e backups
├── package.json            # comandos de desenvolvimento e validação
├── scripts/
│   ├── serve.mjs           # servidor local sem dependências
│   └── verify.mjs          # verificações automatizadas
├── docs/ARQUITETURA.md     # modelo de dados e fluxos principais
└── .github/workflows/ci.yml # validação automática no GitHub Actions
```

## Dados, cópias e privacidade

- Os dados são guardados em `localStorage` do navegador; não são enviados para nenhum serviço.
- Crie uma cópia periódica em **Definições → Guardar cópia**.
- Para mudar de computador, use **Restaurar cópia** no novo navegador.
- Limpar os dados do navegador sem criar uma cópia apaga os registos locais.
- Em cada venda, a aplicação guarda uma cópia do nome, NIF e morada de facturação do cliente para preservar o documento mesmo depois de a ficha ser alterada.
- Em **Balanço & relatórios**, use **Exportar relatório Excel**. O ficheiro contém as folhas Resumo, Vendas, Artigos vendidos, Stock actual, Clientes e Fornecedores, com colunas já preparadas para filtrar no Excel.
- Para começar a trabalhar apenas com os seus dados, guarde primeiro uma cópia e use **Definições → Limpar dados comerciais**. Esta operação mantém a empresa e os utilizadores, mas remove produtos, clientes, fornecedores, documentos, compras, stock e movimentos.

## Preparação para produção

Esta edição é uma base sólida para uso numa máquina, demonstrações e pequenos negócios. Para uma operação comercial com vários utilizadores, caixas ou filiais, a evolução recomendada é:

1. Criar uma API protegida e uma base de dados centralizada.
2. Implementar autenticação, perfis de acesso e registo de auditoria.
3. Ligar facturação à solução certificada/regras fiscais aplicáveis em Angola.
4. Disponibilizar cópias automáticas, sincronização e relatórios contabilísticos avançados.

> O projecto não substitui software de facturação certificado nem valida obrigações fiscais. Confirme as regras aplicáveis antes de o usar para emissão oficial de documentos.

Consulte também [Produção e segurança](docs/PRODUCAO.md): o projecto inclui um esquema PostgreSQL/Supabase inicial, mas a conta da base de dados, autenticação, credenciais bancárias e certificação devem ser configuradas pela empresa antes da operação online.

## Contribuir

Contribuições são bem-vindas. Consulte [CONTRIBUTING.md](CONTRIBUTING.md), crie uma branch descritiva e execute `npm run check` antes de abrir um pull request.

## Licença

Distribuído sob a licença [MIT](LICENSE).
