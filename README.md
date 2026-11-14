# VendaMais

> Sistema de ponto de venda, inventário e gestão comercial para pequenos e médios negócios, com modo local e sincronização online multi-loja.

VendaMais reúne vendas, clientes, fornecedores, compras, inventário e balanço num único painel simples de usar. É uma aplicação web estática: funciona num navegador moderno sem servidor, instalação ou dependências externas.

## Funcionalidades

| Área | O que permite fazer |
| --- | --- |
| Ponto de venda | Procurar artigos, montar carrinho, aplicar desconto, escolher cliente e meio de pagamento. |
| Recibos | Gerar uma janela de impressão após a conclusão de cada venda. |
| Produtos e stock | Registar códigos, categorias, preço de custo, preço de venda e limite mínimo, com stock separado por local. |
| Lojas & armazéns | Criar locais de operação, consultar stock por loja/armazém e atribuir cada vendedor ao seu local. |
| Inventário | Registar entradas, saídas, ajustes e transferências rastreáveis entre locais. |
| Compras | Registar compras por fornecedor e local de entrada, actualizando automaticamente custo e stock. |
| Clientes e fornecedores | Manter contactos, NIF, morada e histórico comercial. |
| Clientes empresariais e crédito | Distinguir particular/empresa, exigir NIF empresarial, definir crédito, emitir venda a crédito e registar recebimentos. |
| Caixa e turnos | Abrir e fechar caixa por operador, controlar fundo inicial, movimentos físicos, contagem e diferenças. |
| Documentos e devoluções | Consultar e imprimir documentos; processar devoluções com nota de crédito interna e reposição de stock. |
| Operação | Acesso por PIN com perfis distintos de Administrador, Gerente e Vendedor. Cada novo vendedor recebe automaticamente uma loja exclusiva; a gestão pode criar e atribuir lojas nas Definições. |
| Stock avançado | Código de barras, unidade, armazém, lote e aviso de validade próxima. |
| Balanço | Consultar faturação, IVA, custo dos produtos vendidos, margem, pagamentos e artigos mais vendidos. |
| Gestão financeira por loja | Comparar faturação com e sem IVA, custos fixos e variáveis, custo histórico dos produtos e resultado estimado de cada loja ou de todas em conjunto. |
| Dados online multi-loja | Liga a empresa a uma base Supabase segura: a venda é registada no livro central antes da confirmação e o administrador recebe o fecho diário de cada loja. |
| Despesas recorrentes | Registar despesas únicas ou mensais (renda, salários, internet, energia), classificadas por tipo de custo e loja. |
| Vendas semanais | Consultar a faturação por Semana 1 a Semana 5 de cada mês. |
| Relatório por vendedor | Consultar as vendas de cada vendedor por dia e por mês, com quantidade de vendas, faturação, média e valor por receber. |
| Segurança dos dados | Exportar/restaurar cópias completas em JSON e relatórios organizados em Excel. |

## Requisitos

- Navegador actual: Edge, Chrome ou Firefox.
- Opcional para desenvolvimento: [Node.js](https://nodejs.org/) 20 ou superior.

## Começar rapidamente

### Utilização directa

Abra o ficheiro `index.html` no navegador. A aplicação inicia com dados de demonstração e guarda as alterações apenas no navegador desse computador.

No primeiro acesso, seleccione o utilizador e use o PIN temporário `0000`. O sistema obriga a criar um PIN pessoal antes de continuar. Crie os restantes utilizadores em **Definições → Gestão de lojas e vendedores → Utilizadores**.

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
├── cloud.js                # login e sincronização com a base online
├── package.json            # comandos de desenvolvimento e validação
├── scripts/
│   ├── serve.mjs           # servidor local sem dependências
│   └── verify.mjs          # verificações automatizadas
├── docs/ARQUITETURA.md     # modelo de dados e fluxos principais
├── supabase/schema.sql     # estrutura segura da base central
└── .github/workflows/ci.yml # validação automática no GitHub Actions
```

## Dados, cópias e privacidade

- Sem ligação online, os dados são guardados em `localStorage` do navegador.
- Com **Definições → Ligar dados online**, a empresa passa a usar Supabase: as vendas são gravadas num livro central e catálogo/stock/configurações são sincronizados entre lojas. A cópia local passa a ser apenas uma cópia de trabalho.
- Crie uma cópia periódica em **Definições → Guardar cópia**.
- Para mudar de computador, use **Restaurar cópia** no novo navegador.
- Limpar os dados do navegador sem criar uma cópia apaga os registos locais.
- Em cada venda, a aplicação guarda uma cópia do nome, NIF e morada de facturação do cliente para preservar o documento mesmo depois de a ficha ser alterada.
- Em **Balanço & relatórios**, use **Exportar relatório Excel**. O ficheiro contém resumo, vendas, artigos vendidos, stock, clientes, fornecedores, despesas, lojas, custos fixos e três folhas de desempenho dos vendedores, com colunas já preparadas para filtrar no Excel.
- Para começar a trabalhar apenas com os seus dados, guarde primeiro uma cópia e use **Definições → Limpar dados comerciais**. Esta operação mantém a empresa e os utilizadores, mas remove produtos, clientes, fornecedores, documentos, compras, stock e movimentos.
- As cópias de segurança não incluem PINs. Após restaurar uma cópia, cada utilizador entra com o PIN temporário `0000` e cria um PIN novo.

## Áreas e permissões

| Perfil | Acesso permitido |
| --- | --- |
| Administrador | Todas as áreas. Gere utilizadores, PINs, definições, cópias, integrações e limpeza de dados. |
| Gerente | Vendas, produtos, stock, inventário, clientes, fornecedores, compras, caixa, documentos, devoluções e relatórios. Não altera utilizadores nem definições gerais. |
| Vendedor | Apenas nova venda, abertura/fecho do próprio caixa e consulta/impressão dos documentos que emitiu. Pode cadastrar um cliente durante a venda, mas não muda preços, stock, compras, fornecedores ou relatórios. |

O administrador define o local atribuído ao criar cada utilizador. O vendedor fica automaticamente limitado a esse local; administradores e gerentes podem seleccionar o local de operação no topo da aplicação. Para mover mercadoria, use **Inventário → Transferir stock**, nunca ajuste manualmente ambos os lados.

> No modo local, esta separação protege apenas a operação no navegador. Para segurança real entre computadores, ligue a base online e use uma conta individual para cada operador.

## Preparação para produção

Esta edição inclui a ligação opcional a Supabase para operação com lojas e computadores diferentes. Consulte o guia completo de [dados online, utilizadores e publicação no GitHub Pages](docs/ONLINE.md) antes de a activar.

Para uma operação comercial com vários utilizadores, caixas ou filiais:

1. Crie o projecto Supabase e execute `supabase/schema.sql`.
2. Crie contas individuais e atribua-as à loja certa.
3. Publique o código no GitHub Pages ou noutra hospedagem HTTPS.
4. Lembre-se de ligar facturação à solução certificada/regras fiscais aplicáveis em Angola.

> O projecto não substitui software de facturação certificado nem valida obrigações fiscais. Confirme as regras aplicáveis antes de o usar para emissão oficial de documentos.

Consulte também [Produção e segurança](docs/PRODUCAO.md): as credenciais bancárias e a certificação devem ser configuradas pela empresa antes da operação comercial.

## Contribuir

Contribuições são bem-vindas. Consulte [CONTRIBUTING.md](CONTRIBUTING.md), crie uma branch descritiva e execute `npm run check` antes de abrir um pull request.

## Licença

Distribuído sob a licença [MIT](LICENSE).
