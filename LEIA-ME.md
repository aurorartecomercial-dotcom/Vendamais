# VendaMais — Sistema de Vendas

> A documentação principal do projecto está em [README.md](README.md).

Aplicação local de gestão comercial para uma pequena ou média loja. Para usar, abra o ficheiro `index.html` num navegador moderno (Chrome, Edge ou Firefox). Não requer instalação nem ligação à internet.

## Módulos incluídos

- **Ponto de venda:** procura de produtos, carrinho, descontos, IVA configurável, cliente e pagamentos em dinheiro, Multicaixa ou transferência.
- **Recibo:** ao concluir uma venda abre um recibo pronto para imprimir ou guardar como PDF.
- **Produtos e stock:** catálogo com códigos, categorias, preço de custo, preço de venda, limites mínimos e alertas de reposição.
- **Inventário:** entradas, saídas e ajustes manuais com histórico de movimentos e valorização de stock.
- **Clientes:** contactos, NIF, histórico e total de compras.
- **Fornecedores:** contactos e compras relacionadas.
- **Compras:** registo de facturas de fornecedores e actualização automática do stock e custo unitário.
- **Balanço e relatórios:** cálculos explicados de faturação, IVA, custo dos produtos vendidos, margem, despesas e resultado; inclui relatórios diários e mensais por vendedor e exportação Excel organizada.
- **Cópia de segurança:** exportação e restauro integral dos dados em formato JSON.
- **Áreas por função:** Administrador, Gerente e Vendedor com PIN pessoal e ecrãs limitados ao trabalho de cada perfil.

## Dados e segurança

Os dados são guardados somente no navegador deste computador. Use regularmente **Definições → Guardar cópia**. Para começar com os seus produtos, clientes e fornecedores, use **Definições → Limpar dados comerciais** depois de guardar a cópia. No primeiro acesso, use o PIN temporário `0000`; cada utilizador terá de escolher o seu próprio PIN.

## Limites desta versão local

Esta versão é adequada para operar numa máquina. Para uso simultâneo por vários caixas, facturação certificada, contas de utilizador e sincronização entre computadores, será necessário ligar o sistema a uma base de dados e serviço online.
