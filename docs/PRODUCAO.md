# VendaMais Pro — passagem para produção

## O que a aplicação local já oferece

- Operadores com funções de Administrador, Gerente e Caixa.
- Turnos de caixa, fundo inicial, entradas/saídas, contagem e diferença no fecho.
- Documentos, impressão, devolução com nota de crédito interna e reposição de stock.
- Produtos com código de barras, unidade, armazém, lote e validade.
- Clientes empresariais, NIF, crédito, extracto de recebimentos e auditoria local.

## O que precisa de configuração externa

Uma aplicação local não pode, por si só, permitir vários computadores em simultâneo, autenticar com segurança na internet ou processar pagamentos bancários. Para isso, configure:

1. Crie um projecto PostgreSQL/Supabase da empresa.
2. Execute [schema.sql](../supabase/schema.sql) no editor SQL.
3. Siga o guia de [dados online](ONLINE.md) para criar a primeira conta, sincronizar os dados e atribuir cada operador à sua loja.
4. Use apenas a chave pública anon/publishable no navegador; nunca publique chaves privadas, `service_role` ou um `.env` real.
5. Publique a interface numa origem HTTPS (por exemplo, GitHub Pages) e registe essa origem em Authentication → URL Configuration no Supabase.
6. Contrate um fornecedor autorizado antes de activar pagamentos Multicaixa ou uma impressora fiscal.
7. Valide com contabilista e AGT a numeração, assinatura, certificação e obrigação fiscal de cada documento.

## Segurança essencial

- Não use a selecção local de operador como autenticação em produção. A edição online usa palavra-passe por conta Supabase; active confirmação de e-mail, MFA e políticas de palavra-passe conforme a sua operação.
- Registe auditoria no servidor, sem permitir que o operador a edite.
- Faça cópias automáticas da base de dados e teste periodicamente a restauração.
- Use HTTPS, permissões por empresa e transacções de base de dados para reduzir stock e registar vendas numa única operação atómica.

## Impressão e pagamentos

O VendaMais utiliza a caixa de impressão do navegador, que permite guardar documentos como PDF ou enviar a uma impressora já configurada no computador. Integrações reais de POS, Multicaixa e impressora fiscal dependem do modelo do equipamento, fornecedor e credenciais da empresa; não devem ser simuladas como pagamentos confirmados.
