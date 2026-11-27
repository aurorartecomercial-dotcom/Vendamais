import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../fiscal-report.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const summarize = context.window.VendaMaisFiscalReport.summarize;

test('resume linhas por tratamento e taxa interna', () => {
  const result = summarize([{ items: [
    { name: 'A', quantity: 2, price: 100, fiscalTreatment: 'RATE_CONFIGURED_PENDING_REVIEW', fiscalRate: 14 },
    { name: 'B', quantity: 1, price: 50, fiscalTreatment: 'UNCLASSIFIED_INTERNAL' }
  ] }]);
  assert.equal(result.lineCount, 2);
  assert.equal(result.unresolvedCount, 1);
  assert.equal(result.estimatedBase, 200);
  assert.equal(result.estimatedTax, 28);
  assert.equal(result.rows.length, 2);
});

test('distribui desconto geral proporcionalmente entre linhas', () => {
  const result = summarize([{ discountValue: 20, items: [
    { quantity: 1, price: 100, discountValue: 0, fiscalTreatment: 'RATE_CONFIGURED_PENDING_REVIEW', fiscalRate: 10 },
    { quantity: 1, price: 100, discountValue: 0, fiscalTreatment: 'RATE_CONFIGURED_PENDING_REVIEW', fiscalRate: 20 }
  ] }]);
  assert.equal(result.estimatedBase, 180);
  assert.equal(result.estimatedTax, 27);
});

test('possível isenção não é tratada como taxa zero validada', () => {
  const result = summarize([{ items: [{ quantity: 1, price: 100, fiscalTreatment: 'EXEMPT_PENDING_REVIEW' }] }]);
  assert.equal(result.unresolvedCount, 1);
  assert.equal(result.estimatedTax, 0);
  assert.equal(result.rows[0].unresolved, true);
});
