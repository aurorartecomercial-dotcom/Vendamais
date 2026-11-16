/* Núcleo financeiro puro do VendaMais. Não depende do DOM nem do armazenamento. */
(function attachVendaMaisFinance(root) {
  'use strict';

  const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const finiteNonNegative = value => Number.isFinite(Number(value)) && Number(value) >= 0;

  function calculateSaleTotals(subtotalValue, discountPercentValue, taxRateValue) {
    const subtotal = roundMoney(Number(subtotalValue));
    const discount = Math.min(100, Math.max(0, Number(discountPercentValue) || 0));
    const taxRate = Math.min(100, Math.max(0, Number(taxRateValue) || 0));
    if (!finiteNonNegative(subtotal)) throw new RangeError('Subtotal inválido.');
    const discountValue = roundMoney(subtotal * discount / 100);
    const taxable = roundMoney(subtotal - discountValue);
    const tax = roundMoney(taxable * taxRate / 100);
    return { subtotal, discount, discountValue, taxable, taxRate, tax, total: roundMoney(taxable + tax) };
  }

  function calculateCartTotals(items, globalDiscountPercentValue, taxRateValue) {
    const lines = (items || []).map(item => {
      const quantity = Number(item.quantity || 0), price = Number(item.price || 0), pct = Number(item.discountPct || 0);
      if (![quantity, price, pct].every(Number.isFinite) || quantity < 0 || price < 0 || pct < 0 || pct > 100) throw new RangeError('Linha de venda inválida.');
      const gross = roundMoney(quantity * price);
      const discountValue = roundMoney(gross * pct / 100);
      return { ...item, gross, discountValue, net: roundMoney(gross - discountValue) };
    });
    const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.gross, 0));
    const itemDiscountValue = roundMoney(lines.reduce((sum, line) => sum + line.discountValue, 0));
    const globalDiscount = Math.min(100, Math.max(0, Number(globalDiscountPercentValue) || 0));
    const globalDiscountValue = roundMoney((subtotal - itemDiscountValue) * globalDiscount / 100);
    const discountValue = roundMoney(itemDiscountValue + globalDiscountValue);
    const taxable = roundMoney(subtotal - discountValue);
    const taxRate = Math.min(100, Math.max(0, Number(taxRateValue) || 0));
    const tax = roundMoney(taxable * taxRate / 100);
    return { lines, subtotal, discount: globalDiscount, itemDiscountValue, globalDiscountValue, discountValue, taxable, taxRate, tax, total: roundMoney(taxable + tax) };
  }

  function validateSettlement(totalValue, amountPaidValue, balanceDueValue) {
    const total = roundMoney(Number(totalValue));
    const amountPaid = roundMoney(Number(amountPaidValue));
    const balanceDue = roundMoney(Number(balanceDueValue));
    if (![total, amountPaid, balanceDue].every(finiteNonNegative)) return { valid: false, reason: 'Valores de pagamento inválidos.' };
    if (Math.abs(roundMoney(amountPaid + balanceDue) - total) > 0.01) return { valid: false, reason: 'O valor pago e o saldo pendente não correspondem ao total do documento.' };
    return { valid: true, total, amountPaid, balanceDue };
  }

  function prorateMonthlyCost(monthlyValue, daysIncluded, daysInMonth) {
    const monthly = Number(monthlyValue);
    const included = Number(daysIncluded);
    const days = Number(daysInMonth);
    if (![monthly, included, days].every(Number.isFinite) || monthly < 0 || included < 0 || days <= 0 || included > days) {
      throw new RangeError('Parâmetros inválidos para rateio mensal.');
    }
    return roundMoney(monthly * included / days);
  }

  function weightedAverageCost(currentQuantity, currentCost, incomingQuantity, incomingCost) {
    const q0 = Number(currentQuantity), c0 = Number(currentCost), q1 = Number(incomingQuantity), c1 = Number(incomingCost);
    if (![q0, c0, q1, c1].every(Number.isFinite) || q0 < 0 || c0 < 0 || q1 < 0 || c1 < 0 || q0 + q1 <= 0) throw new RangeError('Parâmetros inválidos para custo médio ponderado.');
    return roundMoney(((q0 * c0) + (q1 * c1)) / (q0 + q1));
  }

  function sumMoney(values) {
    return roundMoney((values || []).reduce((total, value) => total + Number(value || 0), 0));
  }

  function hasActualFixedExpense(expenses, locationId, categories, monthKey) {
    const monthStart = `${monthKey}-01`;
    const [year, month] = monthKey.split('-').map(Number);
    const monthEnd = `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    return (expenses || []).some(expense => expense.locationId === locationId && categories.includes(expense.category) && expense.costType === 'Fixo' && expense.coversConfiguredCost !== false && expense.occurrenceDate >= monthStart && expense.occurrenceDate <= monthEnd);
  }

  root.VendaMaisFinance = Object.freeze({ roundMoney, calculateSaleTotals, calculateCartTotals, validateSettlement, prorateMonthlyCost, sumMoney, finiteNonNegative, hasActualFixedExpense, weightedAverageCost });
})(typeof window !== 'undefined' ? window : globalThis);
