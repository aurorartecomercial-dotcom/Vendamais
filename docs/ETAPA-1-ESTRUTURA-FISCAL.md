# Etapa 1 — Estrutura fiscal dos documentos (preparação)

## Estado desta entrega

Esta etapa melhora a pré-visualização impressa dos documentos internos e evita que uma impressão ainda não validada seja confundida com uma factura fiscal.

**Importante:** esta alteração não certifica o VendaMais, não cria séries autorizadas pela AGT, não gera assinaturas digitais ou hashes fiscais e não transmite facturas à AGT.

## Alterações implementadas

- A impressão passa a identificar-se como pré-visualização e mostra o aviso **“DOCUMENTO NÃO VALIDADO PELA AGT — SEM VALIDADE FISCAL”**.
- A referência `VD-...` é identificada como referência interna, não como série fiscal AGT.
- São apresentados, quando disponíveis, os dados de contacto da empresa, o NIF do cliente e o endereço do local da operação.
- O total é apresentado também por extenso, em kwanzas e cêntimos.
- Quando o IVA é zero, o documento assinala que o motivo legal da não liquidação ainda precisa de ser configurado; o sistema não inventa uma isenção.
- A impressão deixa explícito que ainda não inclui série fiscal autorizada, assinatura digital ou hash fiscal.

## Requisitos legais a tratar na fase de integração

A estrutura deverá ser completada com base no Decreto Presidencial n.º 71/25, nomeadamente o artigo 10.º, e na documentação técnica oficial da AGT para facturação electrónica. A lista de campos e regras deve ser confirmada para cada tipo de documento e enquadramento tributário.

Antes de emitir documentos fiscais reais, ainda será necessário, entre outros pontos:
1. Confirmar o enquadramento fiscal e os dados reais do contribuinte.
2. Obter a validação/certificação aplicável do software.
3. Implementar o processo oficial de criação/gestão de séries e numeração autorizada.
4. Implementar a estrutura de dados, assinatura digital e transmissão exigidas pela AGT.
5. Garantir conservação, integridade, correção/anulação e auditoria dos documentos.
6. Testar a integração no ambiente disponibilizado pela AGT e obter a autorização necessária.

## Compatibilidade e preservação

Esta etapa altera apenas a função de impressão em `app.js` e acrescenta esta documentação. Não altera vendas existentes, produtos, stock, compras, movimentos de inventário, clientes, fornecedores ou tabelas SQL.
