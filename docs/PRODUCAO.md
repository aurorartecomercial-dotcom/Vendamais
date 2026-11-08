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
3. Crie a autenticação dos utilizadores e associe cada um à empresa na tabela `profiles`.
4. Guarde as chaves públicas apenas num ambiente de servidor; nunca publique chaves privadas ou `.env`.
5. Faça a interface usar a API/Supabase em vez do armazenamento local antes de disponibilizar a vários operadores.
6. Contrate um fornecedor autorizado antes de activar pagamentos Multicaixa ou uma impressora fiscal.
7. Valide com contabilista e AGT a numeração, assinatura, certificação e obrigação fiscal de cada documento.

## Segurança essencial

- Não use a selecção local de operador como autenticação em produção: implemente palavra-passe, MFA quando aplicável, recuperação de acesso e expiração de sessão.
- Registe auditoria no servidor, sem permitir que o operador a edite.
- Faça cópias automáticas da base de dados e teste periodicamente a restauração.
- Use HTTPS, permissões por empresa e transacções de base de dados para reduzir stock e registar vendas numa única operação atómica.

## Impressão e pagamentos

O VendaMais utiliza a caixa de impressão do navegador, que permite guardar documentos como PDF ou enviar a uma impressora já configurada no computador. Integrações reais de POS, Multicaixa e impressora fiscal dependem do modelo do equipamento, fornecedor e credenciais da empresa; não devem ser simuladas como pagamentos confirmados.
