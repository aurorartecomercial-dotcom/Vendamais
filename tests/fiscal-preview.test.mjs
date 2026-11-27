import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../fiscal-preview.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const calculate = context.window.VendaMaisFiscalPreview.calculate;

test('calcula simulação por linha para taxa interna ainda pendente de revisão', () => {
  const result = calculate([{ name: 'Artigo', quantity: 2, price: 100, fiscalTreatment: 'RATE_CONFIGURED_PENDING_REVIEW', fiscalRate: 14 }]);
  assert.equal(result.estimatedTax, 28);
  assert.equal(result.rows[0].status, 'pending_review');
  assert.equal(result.unresolvedCount, 0);
});

test('distribui desconto geral proporcionalmente pelas linhas', () => {
  const result = calculate([
    { name: 'A', quantity: 1, price: 100, fiscalTreatment: 'RATE_CONFIGURED_PENDING_REVIEW', fiscalRate: 10 },
    { name: 'B', quantity: 1, price: 100, fiscalTreatment: 'RATE_CONFIGURED_PENDING_REVIEW', fiscalRate: 20 }
  ], 10);
  assert.equal(result.rows[0].base, 90);
  assert.equal(result.rows[1].base, 90);
  assert.equal(result.estimatedTax, 27);
});

test('não presume taxa zero para possíveis isenções ou não sujeições', () => {
  const result = calculate([{ name: 'Artigo', quantity: 1, price: 100, fiscalTreatment: 'EXEMPT_PENDING_REVIEW', fiscalRate: '' }]);
  assert.equal(result.estimatedTax, 0);
  assert.equal(result.rows[0].estimatedTax, null);
  assert.equal(result.rows[0].status, 'requires_legal_review');
  assert.equal(result.unresolvedCount, 1);
});

test('marca produtos sem classificação como não calculados', () => {
  const result = calculate([{ name: 'Artigo', quantity: 1, price: 100 }]);
  assert.equal(result.rows[0].estimatedTax, null);
  assert.equal(result.unresolvedCount, 1);
});

test('rejeita taxa de desconto geral inválida', () => {
  assert.throws(() => calculate([], 101), /entre 0 e 100/);
});
