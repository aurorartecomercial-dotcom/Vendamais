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
| `settings` | Dados da empresa, taxa de IVA e limite de stock padrão. |
| `products` | Catálogo, preço de custo, preço de venda, stock e mínimo. |
| `customers` | Contactos e identificação dos clientes. |
| `receipts` | Recebimentos de vendas a crédito, ligados ao documento e ao cliente. |
| `suppliers` | Contactos e identificação dos fornecedores. |
| `sales` | Vendas concluídas e linhas de venda com o custo histórico. |
| `purchases` | Compras a fornecedores e custos unitários. |
| `movements` | Entradas, saídas e ajustes manuais de inventário. |
| `meta` | Versão do esquema e data da última alteração. |

Guardar o preço e o custo em cada linha de venda preserva a coerência dos relatórios mesmo quando o preço actual do produto muda.

## Regras de negócio principais

### Venda

1. O utilizador adiciona produtos disponíveis ao carrinho.
2. A quantidade não pode ultrapassar o stock actual.
3. O sistema calcula subtotal, desconto, IVA e total.
4. Ao confirmar o pagamento, cria uma venda e reduz o stock de cada produto.
5. A venda guarda uma cópia dos dados de facturação do cliente e passa a alimentar histórico, inventário e relatórios.

### Crédito de cliente

1. Apenas clientes guardados podem receber vendas a crédito.
2. Empresas exigem NIF; cada cliente pode ter um limite de crédito opcional.
3. A venda a crédito começa com saldo pendente e data de vencimento.
4. A ficha de cliente permite registar recebimentos parciais ou totais; os saldos são recalculados no histórico e nos relatórios.

### Compra

1. Selecciona-se fornecedor, data, pagamento e linhas de compra.
2. Ao guardar, o custo unitário do produto é actualizado.
3. A quantidade entra em stock e é criado um movimento de inventário.

### Cópias de segurança

O ficheiro JSON exportado representa o documento completo de dados. Ao restaurar, a aplicação normaliza campos ausentes e preserva a versão actual do esquema sempre que possível.

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
