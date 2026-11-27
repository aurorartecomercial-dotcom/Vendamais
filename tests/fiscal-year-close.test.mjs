import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../fiscal-year-close.js', import.meta.url), 'utf8');
const context = { globalThis: {} }; vm.runInNewContext(source, context);
const close = context.globalThis.VendaMaisFiscalYearClose;
const accounts = [
  { code: '41.1', name: 'Caixa', type: 'Activo' },
  { code: '51.1', name: 'Capital', type: 'Capital' },
  { code: '61.1', name: 'Vendas', type: 'Rendimento' },
  { code: '72.1', name: 'Gastos', type: 'Gasto' },
  { code: '88.1', name: 'Resultado', type: 'Capital' },
  { code: '39.9', name: 'Suspense', type: 'Misto' }
];
test('prepara saldos do próximo ano e transfere lucro para 88.1', () => {
  const result = close.prepare({ year: 2026, accounts, openingRows: [{ accountCode: '41.1', debit: 100, credit: 0 }, { accountCode: '51.1', debit: 0, credit: 100 }], postings: [{ id: 'v1', reference: 'Venda', balanced: true, debit: 50, credit: 50, lines: [{ accountCode: '41.1', debit: 50, credit: 0 }, { accountCode: '61.1', debit: 0, credit: 50 }] }, { id: 'e1', reference: 'Gasto', balanced: true, debit: 20, credit: 20, lines: [{ accountCode: '72.1', debit: 20, credit: 0 }, { accountCode: '41.1', debit: 0, credit: 20 }] }] });
  assert.equal(result.valid, true); assert.equal(result.result, 30); assert.equal(result.nextYear, 2027);
  assert.equal(result.nextDebit, result.nextCredit);
  assert.equal(result.nextOpeningRows.find(row => row.accountCode === '61.1'), undefined);
  assert.equal(result.nextOpeningRows.find(row => row.accountCode === '72.1'), undefined);
  assert.equal(result.nextOpeningRows.find(row => row.accountCode === '88.1').credit, 30);
});
test('recusa saldos iniciais desequilibrados', () => {
  const result = close.prepare({ year: 2026, accounts, openingRows: [{ accountCode: '41.1', debit: 10, credit: 0 }], postings: [] });
  assert.equal(result.valid, false); assert.ok(result.errors.some(error => error.includes('não estão equilibrados')));
});
test('recusa lançamento contabilístico não equilibrado', () => {
  const result = close.prepare({ year: 2026, accounts, openingRows: [{ accountCode: '41.1', debit: 10, credit: 0 }, { accountCode: '51.1', debit: 0, credit: 10 }], postings: [{ id: 'bad', balanced: false, debit: 10, credit: 9, lines: [{ accountCode: '41.1', debit: 10, credit: 0 }, { accountCode: '51.1', debit: 0, credit: 9 }] }] });
  assert.equal(result.valid, false); assert.ok(result.errors.some(error => error.includes('não equilibrado')));
});
test('transfere prejuízo a débito na conta 88.1', () => {
  const result = close.prepare({ year: 2026, accounts, openingRows: [{ accountCode: '41.1', debit: 100, credit: 0 }, { accountCode: '51.1', debit: 0, credit: 100 }], postings: [{ id: 'e1', balanced: true, debit: 25, credit: 25, lines: [{ accountCode: '72.1', debit: 25, credit: 0 }, { accountCode: '41.1', debit: 0, credit: 25 }] }] });
  assert.equal(result.valid, true); assert.equal(result.result, -25); assert.equal(result.nextOpeningRows.find(row => row.accountCode === '88.1').debit, 25);
});

test('exige saldos de abertura antes de encerrar', () => {
  const result = close.prepare({ year: 2026, accounts, openingRows: [], postings: [] });
  assert.equal(result.valid, false); assert.ok(result.errors.some(error => error.includes('saldos de abertura')));
});
