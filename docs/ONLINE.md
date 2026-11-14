# VendaMais Online: lojas ligadas e controlo diário

O GitHub serve para guardar e publicar o código da aplicação. Os dados de vendas não devem ser gravados num repositório GitHub: seriam públicos ou difíceis de proteger, não permitem consultas em tempo real e poderiam entrar em conflito quando duas lojas vendem ao mesmo tempo.

Esta edição usa **Supabase** como base de dados central com login individual. A aplicação continua a manter uma cópia de trabalho no navegador para resposta rápida, mas, quando está ligada, cada venda é escrita no livro central antes de ser confirmada. O administrador vê o resumo diário de todas as lojas sem esperar que alguém exporte um ficheiro.

## 1. Criar a base da empresa

1. Crie um projecto em [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor** → **New query**, cole todo o conteúdo de `supabase/schema.sql` e carregue em **Run**.
3. Em **Project Settings** → **API**, copie:
   - **Project URL**;
   - a chave pública **anon** ou **publishable**.

> Nunca use a chave `service_role` no VendaMais, no GitHub ou num computador de loja. Essa chave dá acesso total à base de dados.

Em **Authentication** → **URL Configuration**, adicione o endereço final da aplicação em **Site URL** e em **Redirect URLs**. Caso mantenha a confirmação de e-mail activa, o primeiro administrador deve confirmar o e-mail antes de entrar.

## 2. Ligar o primeiro administrador

1. Publique ou abra a aplicação num endereço web (veja a secção GitHub abaixo).
2. Entre em **Definições** → **Ligar dados online**.
3. Cole o URL e a chave pública do projecto.
4. Escolha **Criar conta**, indique o e-mail e uma palavra-passe com pelo menos 8 caracteres.
5. Depois de entrar, escolha **Criar e sincronizar**. O sistema envia as lojas, produtos, stock, clientes e vendas que já estavam no navegador.

O indicador com a nuvem no topo passa a mostrar **Online**. Pode clicar nele para confirmar o estado da ligação ou terminar a sessão.

## 3. Criar acessos para cada loja

> Depois de executar `supabase/2026-11-professional-upgrade.sql`, siga o fluxo de convites em [VendaMais Profissional](PROFESSIONAL.md): o administrador cria o convite, escolhe a loja e o vendedor entra directamente nela. Não precisa de criar UUIDs nem executar comandos manuais.

Cada pessoa deve ter o seu próprio e-mail e palavra-passe. Não partilhe a conta do administrador. No modo profissional, use exclusivamente **Gerir acessos → Convidar colaborador**: o administrador escolhe a loja antes de o vendedor criar a conta, por isso não há UUIDs, NIFs nem escolhas de empresa do lado do vendedor.

## 4. Publicar no GitHub Pages

No computador onde está a pasta `vendamais`:

```powershell
git init
git add .
git commit -m "VendaMais online"
git branch -M main
git remote add origin https://github.com/SEU-UTILIZADOR/vendamais.git
git push -u origin main
```

No GitHub, abra **Settings** → **Pages**, escolha **Deploy from a branch**, seleccione `main` e a pasta `/(root)`. O endereço ficará semelhante a `https://SEU-UTILIZADOR.github.io/vendamais/`; use-o nas configurações de URL do Supabase.

O ficheiro `.env.example` é apenas um exemplo para desenvolvimento. Não é preciso, nem correcto, publicar um `.env` com chaves privadas. A chave anon é introduzida por cada navegador quando se liga à base e é protegida pelas políticas de acesso da base.

## Funcionamento e cuidados

- **Vendas:** são gravadas no `sales_ledger` central antes de o recibo ser confirmado. É isso que alimenta o quadro “Fecho de hoje por loja” e os relatórios.
- **Outros dados:** catálogo, stock, clientes, fornecedores, despesas e caixas são sincronizados como estado da empresa. Se outra loja alterar esses mesmos dados, o sistema descarrega a versão mais recente em vez de sobrescrever silenciosamente.
- **PIN antigo:** o PIN local nunca é enviado para a nuvem. Depois da ligação, a conta Supabase é a credencial de acesso entre computadores.
- **Ligação à internet:** não confirme vendas online se o indicador mostrar falha. A aplicação mantém a cópia local, mas a confirmação é bloqueada até a venda poder ser enviada à base central.
- **Fiscalidade:** este projecto não substitui software de facturação certificado. Confirme com contabilista/AGT os requisitos de numeração, assinatura e documentos fiscais em Angola.
