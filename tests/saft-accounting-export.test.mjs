import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = { globalThis: {} };
vm.runInNewContext(await readFile(new URL('../saft-accounting-export.js', import.meta.url), 'utf8'), context);
const exporter = context.globalThis.VendaMaisSaftAccountingExport;
const mappings = { rows: [{ internalCode: '41.1', officialCode: '11.1.1', parentCode: '11.1', reviewed: true }] };
test('prepara exportação de lançamentos com conta PGCA e totais', () => {
  const report = exporter.prepare({ company: 'Empresa Teste', nif: '5412345678', start: '2026-01-01', end: '2026-12-31', postings: [{ id: 'j1', date: '2026-02-01', balanced: true, debit: 10, credit: 10, lines: [{ accountCode: '41.1', accountName: 'Caixa', debit: 10, credit: 0 }, { accountCode: '39.9', accountName: 'Por classificar', debit: 0, credit: 10 }] }], accountMappings: mappings });
  assert.equal(report.totals.entries, 1);
  assert.equal(report.totals.debit, 10);
  assert.equal(report.totals.credit, 10);
  assert.equal(report.lines[0].pgcaAccountCode, '11.1.1');
  assert.equal(report.controls.suspenseLines, 1);
  assert.ok(report.warnings.length > 0);
  assert.match(report.limitations[0], /não é SAF-T/);
});
test('CSV usa separador seguro, aspas e protege fórmulas', () => {
  const csv = exporter.toCsv({ lines: [{ date: '2026-01-01', description: '=HYPERLINK("x")', debit: 1, credit: 0 }] });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes("'=HYPERLINK("));
  assert.ok(csv.includes('"Data";'));
});
test('assinala lançamentos desequilibrados e valores negativos', () => {
  const report = exporter.prepare({ start: '2026-01-01', end: '2026-12-31', postings: [{ id: 'j2', balanced: false, debit: 5, credit: 3, lines: [{ accountCode: '41.1', debit: -5, credit: 0 }] }] });
  assert.equal(report.controls.balanced, false);
  assert.equal(report.controls.negativeLines, 1);
  assert.equal(report.controls.unbalancedEntries.length, 1);
});
