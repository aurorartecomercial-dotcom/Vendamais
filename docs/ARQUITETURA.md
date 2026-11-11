# Arquitectura do VendaMais

## Visão geral

VendaMais é uma aplicação de página única (SPA) sem dependências externas. Foi desenhada para poder ser publicada como um repositório simples, hospedada em qualquer serviço de ficheiros estáticos e aberta sem configuração complexa.

```text
index.html  → estrutura dos ecrãs
styles.css  → interface responsiva
app.js      → estado, regras de negócio e persistência
localStorage → dados do negócio no navegador
```

## Modelo de dados

Os dados são guardados como um único documento versionado na chave `vendamais_local_v1` do `localStorage`.

| Colecção | Conteúdo |
| --- | --- |
| `settings` | Dados da empresa, taxa de IVA, limite de stock padrão e local de operação seleccionado. |
| `locations` | Lojas e armazéns activos da empresa. |
| `products` | Catálogo, preço de custo, preço de venda, mínimo e `stockByLocation` (quantidade por local). |
| `customers` | Contactos e identificação dos clientes. |
| `receipts` | Recebimentos de vendas a crédito, ligados ao documento e ao cliente. |
| `supplierPayments` | Pagamentos a fornecedores e liquidação parcial de compras a crédito. |
| `cashSessions` / `cashMovements` | Turnos de caixa, fundo inicial, movimentos físicos e fechos. |
| `users` | Operadores locais e respectivas funções de acesso. |
| `auditLog` | Registo local das operações relevantes. |
| `suppliers` | Contactos e identificação dos fornecedores. |
| `sales` | Vendas concluídas e linhas de venda com o custo histórico. |
| `purchases` | Compras a fornecedores e custos unitários. |
| `movements` | Entradas, saídas, ajustes e movimentos de transferência, sempre ligados a um local. |
| `transfers` | Documento de transferência entre origem e destino, com artigos e operador responsável. |
| `expenses` | Despesas únicas ou mensais recorrentes, classificadas como fixas/variáveis e associadas a uma loja. |
| `meta` | Versão do esquema e data da última alteração. |

Guardar o preço e o custo em cada linha de venda preserva a coerência dos relatórios mesmo quando o preço actual do produto muda.

## Regras de negócio principais

### Venda

1. O utilizador adiciona produtos disponíveis ao carrinho.
2. A quantidade não pode ultrapassar o stock do local de operação.
3. O sistema calcula subtotal, desconto, IVA e total.
4. Ao confirmar o pagamento, cria uma venda e reduz o stock do local de operação.
5. A venda guarda uma cópia dos dados de facturação do cliente e passa a alimentar histórico, inventário e relatórios.

### Crédito de cliente

1. Apenas clientes guardados podem receber vendas a crédito.
2. Empresas exigem NIF; cada cliente pode ter um limite de crédito opcional.
3. A venda a crédito começa com saldo pendente e data de vencimento.
4. A ficha de cliente permite registar recebimentos parciais ou totais; os saldos são recalculados no histórico e nos relatórios.

### Caixa e documentos

1. Cada operador abre um turno com um fundo inicial.
2. Vendas e recebimentos em dinheiro exigem um turno aberto; pagamentos a fornecedores e devoluções em dinheiro geram saídas de caixa.
3. No fecho, o operador introduz o valor contado; qualquer diferença exige justificação.
4. Uma devolução cria uma nota de crédito interna, repõe o stock e preserva a venda original como devolvida para auditoria.
5. Referências automáticas são calculadas a partir da maior referência existente; ao restaurar uma cópia, a próxima venda, compra ou nota de crédito mantém a sequência.

### Multiutilizador

A interface local aplica três perfis operacionais e PIN por utilizador:

| Perfil | Área disponível |
| --- | --- |
| Administrador | Acesso total, incluindo configurações, utilizadores, cópias, integrações e limpeza de dados. |
| Gerente | Operação comercial, stock, compras, caixa, documentos, devoluções e relatórios. |
| Vendedor | Nova venda, caixa próprio e documentos emitidos pelo próprio vendedor. Não altera catálogo, preços, stock, compras, fornecedores, relatórios ou definições. |

Os PINs são uma barreira operacional local e não seguem nas cópias de segurança. Como a edição local guarda dados no navegador, esta separação não substitui autenticação de servidor contra alguém que possua acesso técnico ao dispositivo. A separação segura de utilizadores e empresas é fornecida pelo esquema PostgreSQL/Supabase em [PRODUCAO.md](PRODUCAO.md); em produção, a autorização deve ser sempre validada no servidor.

### Compra

1. Selecciona-se fornecedor, local de entrada, data, pagamento e linhas de compra.
2. Ao guardar, o custo unitário do produto é actualizado.
3. A quantidade entra no local seleccionado e é criado um movimento de inventário.

### Locais e transferências

1. O administrador cria lojas e armazéns em **Definições → Lojas & armazéns**.
2. Cada utilizador recebe um local atribuído; vendedores não podem mudar de local.
3. Administradores e gerentes escolhem o local de operação no topo da aplicação.
4. Uma transferência valida o stock na origem, baixa a quantidade na origem e acrescenta a mesma quantidade no destino, criando dois movimentos ligados à mesma referência.
5. Um local com stock ou operadores activos não pode ser desactivado, protegendo a rastreabilidade.

### Cópias de segurança

O ficheiro JSON exportado representa o documento completo de dados. Ao restaurar, a aplicação normaliza campos ausentes e preserva a versão actual do esquema sempre que possível.

### Gestão financeira por loja e despesas recorrentes

O relatório de gestão permite filtrar uma loja ou consolidar todas as lojas. Por local, apresenta faturação, custo histórico dos produtos vendidos, despesas fixas, despesas variáveis, número de vendas e resultado líquido estimado. O cálculo considera a faturação sem IVA, subtrai o custo das mercadorias vendidas e as despesas do período.

As despesas podem ser únicas ou mensais recorrentes. Uma recorrência é projectada nos meses abrangidos pelo relatório a partir da data de início, sem criar lançamentos duplicados na base de dados. Cada despesa pertence a uma loja e é classificada como fixa ou variável. As vendas podem ser analisadas por semana do mês (dias 1–7, 8–14, 15–21, 22–28 e 29–31).

### Relatórios Excel e preparação inicial

O sistema gera ficheiros Excel (`.xlsx`) no próprio navegador, sem bibliotecas externas. O relatório de gestão inclui folhas para resumo, vendas, artigos vendidos, stock total, stock por local, clientes, fornecedores, despesas e desempenho financeiro por loja; cada folha tem cabeçalhos, filtros e valores numéricos próprios para análise no Excel. A opção de limpar dados comerciais remove apenas a operação do negócio, preservando a configuração da empresa, os locais e os utilizadores para permitir iniciar o catálogo com dados próprios.

## Decisões técnicas

- **Sem dependências:** reduz risco de vulnerabilidades transitivas e facilita a publicação.
- **HTML, CSS e JavaScript separados:** manutenção e revisão de código mais simples.
- **Servidor local próprio:** útil no desenvolvimento, sem necessidade de instalar ferramentas adicionais.
- **Validação automática:** protege a estrutura mínima através de `npm run check` e GitHub Actions.
- **Dados locais por defeito:** privacidade por desenho para a versão inicial.

## Evolução recomendada

Para transformar o projecto numa solução multiutilizador, separe a camada de dados da interface:

```text
Interface VendaMais → API autenticada → Base de dados → Backups / auditoria
```

Uma API deverá validar todas as operações do lado do servidor, aplicar permissões por função, usar transacções para movimentos de stock e manter registos de auditoria imutáveis.
