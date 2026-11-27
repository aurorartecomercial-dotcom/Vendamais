import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = { globalThis: {} };
vm.runInNewContext(await readFile(new URL('../opening-balances.js', import.meta.url), 'utf8'), context);
const engine = context.globalThis.VendaMaisOpeningBalances;
const accounts = [{ code: '41.1', name: 'Caixa', type: 'Activo' }, { code: '51.1', name: 'Capital', type: 'Capital' }, { code: '61.1', name: 'Vendas', type: 'Rendimento' }];
test('valida saldos de abertura equilibrados', () => {
  const result = engine.validate([{ accountCode: '41.1', debit: 100, credit: 0 }, { accountCode: '51.1', debit: 0, credit: 100 }], accounts);
  assert.equal(result.valid, true);
  assert.equal(result.totalDebit, 100);
  assert.equal(result.totalCredit, 100);
});
test('rejeita abertura desequilibrada, conta repetida e saldo dos dois lados', () => {
  const result = engine.validate([{ accountCode: '41.1', debit: 100 }, { accountCode: '41.1', credit: 20 }, { accountCode: '51.1', credit: 50 }], accounts);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('repetida')));
  assert.ok(result.errors.some(error => error.includes('débito e crédito')));
});
test('calcula saldo final com abertura e movimentos do período', () => {
  const result = engine.buildTrialBalance({
    accounts,
    openingRows: [{ accountCode: '41.1', debit: 100, credit: 0 }, { accountCode: '51.1', debit: 0, credit: 100 }],
    postings: [{ lines: [{ accountCode: '41.1', debit: 30, credit: 0 }, { accountCode: '61.1', debit: 0, credit: 30 }] }]
  });
  const cash = result.rows.find(row => row.code === '41.1');
  const capital = result.rows.find(row => row.code === '51.1');
  const sales = result.rows.find(row => row.code === '61.1');
  assert.equal(cash.closingDebit, 130);
  assert.equal(capital.closingCredit, 100);
  assert.equal(sales.closingCredit, 30);
  assert.equal(result.totals.openingBalanced, true);
  assert.equal(result.totals.closingBalanced, true);
});
test('não aceita contas desconhecidas nem valores negativos', () => {
  const result = engine.validate([{ accountCode: '99.9', debit: -5, credit: 0 }], accounts);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('não existe')));
  assert.ok(result.errors.some(error => error.includes('negativos')));
});
