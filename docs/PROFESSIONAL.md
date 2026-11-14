# VendaMais Profissional — instalação e controlo

Esta versão reforça a operação multi-loja: cada venda online baixa o stock e grava o documento na mesma transacção central; existe uma fila local para vendas quando a internet cai; o administrador aprova novos acessos directamente no sistema; e a base guarda auditoria e cópias automáticas diárias.

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

## Criar acesso para um vendedor ou gerente

O administrador já não precisa de criar o utilizador manualmente dentro do painel Supabase.

1. O colaborador abre o VendaMais, introduz a URL/chave pública da empresa e cria a sua própria conta por e-mail.
2. Depois de confirmar o e-mail, escolhe **Pedir acesso à empresa**, informa o nome e o NIF da empresa.
3. O administrador entra em **Definições → Ligar dados online → Gerir acessos**.
4. Escolhe a função e a loja do pedido, depois carrega em **Aprovar**.

Um vendedor só consegue vender na loja atribuída. Gerente e administrador podem consultar a empresa inteira.

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
