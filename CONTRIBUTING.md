# Como contribuir

Obrigado por contribuir para o VendaMais.

## Processo recomendado

1. Crie uma branch curta e descritiva, por exemplo `feat/credito-clientes`.
2. Mantenha cada alteração focada num único objectivo.
3. Preserve a interface em português e a compatibilidade com ecrãs móveis.
4. Execute `npm run check` antes de criar o pull request.
5. Descreva no pull request o problema, a solução e como validou a alteração.

## Princípios do projecto

- Não adicionar dependências sem uma necessidade clara.
- Não guardar dados privados em ficheiros de demonstração.
- Não alterar a estrutura de cópia de segurança sem prever compatibilidade com versões anteriores.
- Validar todo o valor introduzido pelo utilizador antes de o guardar ou usar em cálculos.
- Usar texto claro, acessível e consistente em português.

## Convenções

- JavaScript moderno, sem bibliotecas obrigatórias.
- Indentação de dois espaços.
- Nomes de funções em inglês e texto da interface em português.
- Valores monetários em kwanza (`Kz`) e datas apresentadas em português.

## Antes de submeter

```bash
npm run check
```

Verifique também manualmente, no navegador, uma venda, uma compra, um ajuste de stock, a exportação CSV e uma cópia/restauro de dados.
