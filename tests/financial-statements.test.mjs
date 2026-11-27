import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../financial-statements.js', import.meta.url), 'utf8');
const context = { globalThis: {} }; vm.runInNewContext(source, context);
const build = context.globalThis.VendaMaisFinancialStatements.build;
const accounts = [
  { code:'41.1', name:'Caixa', type:'Activo' }, { code:'32.1', name:'Fornecedores', type:'Passivo' },
  { code:'51.1', name:'Capital', type:'Capital' }, { code:'61.1', name:'Vendas', type:'Rendimento' },
  { code:'72.1', name:'Gastos', type:'Gasto' }
];
test('demonstrações usam saldos finais do balancete e resultado do período', () => {
  const result = build({ accounts, trialRows: [
    { code:'41.1', name:'Caixa', closingDebit:150, closingCredit:0, movementDebit:50, movementCredit:0 },
    { code:'32.1', name:'Fornecedores', closingDebit:0, closingCredit:20, movementDebit:0, movementCredit:10 },
    { code:'51.1', name:'Capital', closingDebit:0, closingCredit:100, movementDebit:0, movementCredit:0 },
    { code:'61.1', name:'Vendas', movementDebit:0, movementCredit:80 },
    { code:'72.1', name:'Gastos', movementDebit:50, movementCredit:0 }
  ], incomePostings:[{ lines:[{accountCode:'61.1',debit:0,credit:80},{accountCode:'72.1',debit:50,credit:0}] }], openingRows:[{accountCode:'51.1', debit:0, credit:100}] });
  assert.equal(result.incomeStatement.result, 30);
  assert.equal(result.balanceSheet.totalAssets, 150);
  assert.equal(result.balanceSheet.totalLiabilities, 20);
  assert.equal(result.balanceSheet.totalEquity, 130);
  assert.equal(result.balanceSheet.balanced, true);
  assert.equal(result.changesInEquity[1].value, 30);
});
test('diferença patrimonial fica explícita quando as contas não fecham', () => {
  const result = build({ accounts, trialRows:[{code:'41.1',name:'Caixa',closingDebit:100,closingCredit:0}] });
  assert.equal(result.balanceSheet.balanced, false);
  assert.equal(result.balanceSheet.difference, 100);
});
