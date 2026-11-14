# VendaMais Profissional — instalação e controlo

Esta versão reforça a operação multi-loja: cada venda online baixa o stock e grava o documento na mesma transacção central; existe uma fila local para vendas quando a internet cai; cada empresa fica isolada; o administrador cria convites já associados à loja certa; e a base guarda auditoria e cópias automáticas diárias.

## Actualização obrigatória da base online

No projecto Supabase já criado, abra **SQL Editor** → **New query**, cole integralmente o conteúdo de:

```text
supabase/2026-11-professional-upgrade.sql
```

Depois carregue em **Run**. A mensagem deve indicar sucesso. Este script não remove produtos, vendas ou configurações existentes; cria segurança, auditoria, cópias e funções novas.

> Se a base ainda não tiver o esquema inicial, execute primeiro `supabase/schema.sql` e depois este ficheiro.

## Primeiro acesso do administrador

1. Abra VendaMais e entre em **Definições → Ligar dados online**.
2. Inicie sessão com a conta já confirmada no Supabase.
3. Se a empresa ainda não foi criada, escolha **Criar a minha empresa** e confirme os dados.
4. A nuvem no topo deve mostrar **Online**.

## Fluxo correcto: administrador prepara, vendedor entra

O administrador cria primeiro as lojas e os produtos da sua empresa. Depois prepara cada colaborador. O vendedor nunca cria loja e nunca informa NIF da empresa.

1. Como administrador, crie a loja em **Definições → Lojas & armazéns** e registe os produtos/stock dessa loja.
2. Abra **Definições → Ligar dados online → Gerir acessos → Convidar colaborador**.
3. Indique o nome, o e-mail do vendedor, a função **Vendedor** e a loja onde irá trabalhar.
4. O vendedor abre o mesmo VendaMais, cria a própria conta com **exactamente o e-mail convidado**, confirma o e-mail e entra.
5. A associação é automática: a aplicação mostra a loja que o administrador escolheu e os produtos/stock já criados.

Um vendedor só consegue vender na loja atribuída. Gerente e administrador podem consultar a empresa inteira. A opção de registar empresa é exclusiva para quem é realmente proprietário de um negócio novo.

## Configurar URL e chave uma única vez

Para os vendedores não receberem os campos **URL** e **chave** no telemóvel, antes de publicar edite `supabase-config.js` e cole a chave pública **Publishable** (ou **anon**) do projecto no campo `anonKey`. O URL deste projecto já está preenchido.

Essa chave é pública por desenho e pode estar no GitHub Pages. Nunca coloque a chave `service_role`. Depois de publicar, todos os aparelhos abrem directamente o ecrã de e-mail e palavra-passe.

## Empresas e dados separados

Cada empresa recebe um identificador interno próprio. Todas as tabelas importantes — catálogo/stock, lojas, vendas, cópias, auditoria e convites — têm esse identificador, e as regras de segurança do Supabase só deixam uma conta ler ou escrever a empresa presente no seu perfil. Portanto, uma loja de roupa e uma mercearia podem usar o mesmo projecto Supabase sem se misturarem: não partilham produtos, vendas, vendedores nem stock.

## Vendas sem internet

- Quando a internet falhar, uma venda concluída fica marcada como pendente neste navegador.
- Assim que a ligação voltar, o sistema sincroniza automaticamente e a nuvem volta a **Online**.
- Não limpe dados do navegador, não use “Restaurar cópia” e não trabalhe no modo incógnito enquanto a nuvem indicar **Vendas pendentes**.

## Controlo do administrador

- **Painel inicial:** caixas abertos, dívidas vencidas, stock baixo, vendas pendentes e metas por loja.
- **Lojas & armazéns:** defina metas diária e mensal ao criar/editar uma loja.
- **Dados online → Cópias online:** consulte as cópias centrais. A primeira alteração sincronizada de cada dia cria uma cópia automática.
- **Auditoria:** no modo online, mostra o registo central de operações; não depende de um único computador.

## Limites importantes

- O botão Multicaixa apenas regista o método de pagamento. Uma cobrança real requer contrato e integração certificada com o fornecedor.
- O recibo do navegador não substitui facturação certificada. Confirme a numeração, certificação e regras da AGT com o contabilista antes de emitir documentos fiscais oficiais.
- Para maior segurança, active confirmação de e-mail e MFA no Supabase para administradores.
