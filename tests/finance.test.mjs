import test from 'node:test';
import assert from 'node:assert/strict';
import '../finance-core.js';

const finance = globalThis.VendaMaisFinance;

test('calcula subtotal, desconto, IVA e total com arredondamento monetário', () => {
  const result = finance.calculateSaleTotals(5000, 20, 14);
  assert.deepEqual(result, { subtotal: 5000, discount: 20, discountValue: 1000, taxable: 4000, taxRate: 14, tax: 560, total: 4560 });
});

test('arredonda cada etapa para duas casas decimais', () => {
  const result = finance.calculateSaleTotals(19.99, 12.5, 14);
  assert.equal(result.discountValue, 2.5);
  assert.equal(result.tax, 2.45);
  assert.equal(result.total, 19.94);
});

test('valida que valor pago mais saldo corresponde ao total', () => {
  assert.equal(finance.validateSettlement(1200, 500, 700).valid, true);
  assert.equal(finance.validateSettlement(1200, 500, 600).valid, false);
});

test('rateia custo mensal pelos dias incluídos no mês', () => {
  assert.equal(finance.prorateMonthlyCost(150000, 15, 30), 75000);
  assert.equal(finance.prorateMonthlyCost(31000, 31, 31), 31000);
});

test('não soma custo fixo configurado quando existe despesa real da mesma categoria no mês', () => {
  const expenses = [{ locationId: 'loja-a', category: 'Renda', costType: 'Fixo', occurrenceDate: '2026-11-16', coversConfiguredCost: true }];
  assert.equal(finance.hasActualFixedExpense(expenses, 'loja-a', ['Renda'], '2026-11'), true);
  assert.equal(finance.hasActualFixedExpense([{ ...expenses[0], coversConfiguredCost: false }], 'loja-a', ['Renda'], '2026-11'), false);
  assert.equal(finance.hasActualFixedExpense(expenses, 'loja-b', ['Renda'], '2026-11'), false);
  assert.equal(finance.hasActualFixedExpense(expenses, 'loja-a', ['Renda'], '2026-12'), false);
});

test('soma valores monetários sem acumular resíduos binários', () => {
  assert.equal(finance.sumMoney([0.1, 0.2, 0.3]), 0.6);
});

test('calcula custo médio ponderado após uma nova compra ou devolução', () => {
  assert.equal(finance.weightedAverageCost(10, 100, 10, 140), 120);
  assert.equal(finance.weightedAverageCost(5, 120, 1, 60), 110);
});
