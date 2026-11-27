import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../fiscal-validation.js', import.meta.url), 'utf8');
const context = { window: {}, Date };
vm.runInNewContext(source, context);
const validate = context.window.VendaMaisFiscalValidation.validate;
const issuer = { company: 'Empresa Teste', nif: '5412345678' };
const sale = {
  id: 'sale-1', reference: 'VD-0001', date: '2026-11-27T10:00:00.000Z',
  items: [{ name: 'Produto', quantity: 2, price: 100, total: 200 }],
  subtotal: 200, discountValue: 0, tax: 0, total: 200, payment: 'Dinheiro'
};

test('aceita uma venda internamente consistente', () => {
  const result = validate(sale, issuer);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.length > 0, 'deve alertar que o enquadramento AGT ainda é provisório');
});

test('bloqueia total que não reconcilia com subtotal, desconto e IVA', () => {
  const result = validate({ ...sale, total: 230 }, issuer);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(message => message.includes('não corresponde')));
});

test('bloqueia linhas sem quantidade válida', () => {
  const result = validate({ ...sale, items: [{ name: 'Produto', quantity: 0, price: 100, total: 0 }] }, issuer);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(message => message.includes('quantidade')));
});

test('avisa quando o NIF do emitente não tem dez algarismos', () => {
  const result = validate(sale, { ...issuer, nif: '123' });
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some(message => message.includes('NIF')));
});

test('avisa quando uma linha permanece sem classificação fiscal interna', () => {
  const result = validate(sale, issuer);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some(message => message.includes('linha 1 continua por classificar')));
});

test('bloqueia taxa interna fora do intervalo permitido', () => {
  const result = validate({ ...sale, items: [{ ...sale.items[0], fiscalTreatment: 'RATE_CONFIGURED_PENDING_REVIEW', fiscalRate: 140 }] }, issuer);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(message => message.includes('entre 0 e 100%')));
});

test('avisa quando possível isenção não tem fundamento interno', () => {
  const result = validate({ ...sale, items: [{ ...sale.items[0], fiscalTreatment: 'EXEMPT_PENDING_REVIEW' }] }, issuer);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some(message => message.includes('não tem fundamento interno')));
});
