/* Resumo fiscal interno a partir das classificações guardadas nas linhas de venda. Não é declaração fiscal. */
(function attachVendaMaisFiscalReport(root) {
  'use strict';
  const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const TYPES = {
    RATE_CONFIGURED_PENDING_REVIEW: 'Taxa configurada — por validar',
    EXEMPT_PENDING_REVIEW: 'Possível isenção — por validar',
    NOT_SUBJECT_PENDING_REVIEW: 'Possível não sujeição — por validar',
    UNCLASSIFIED_INTERNAL: 'Por classificar'
  };
  function summarize(sales = []) {
    const groups = new Map(); let lineCount = 0, unresolvedCount = 0, estimatedTax = 0, estimatedBase = 0;
    (Array.isArray(sales) ? sales : []).forEach(sale => {
      const items = Array.isArray(sale.items) ? sale.items : [];
      const grossAfterLineDiscount = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0) * Number(item.price || 0) - Number(item.discountValue || 0)), 0);
      const lineDiscounts = items.reduce((sum, item) => sum + Number(item.discountValue || 0), 0);
      const generalDiscount = Math.max(0, Number(sale.discountValue || 0) - lineDiscounts);
      items.forEach(item => {
        lineCount += 1;
        const gross = Math.max(0, Number(item.quantity || 0) * Number(item.price || 0) - Number(item.discountValue || 0));
        const allocatedDiscount = grossAfterLineDiscount > 0 ? generalDiscount * gross / grossAfterLineDiscount : 0;
        const base = round(Math.max(0, gross - allocatedDiscount));
        const treatment = item.fiscalTreatment || 'UNCLASSIFIED_INTERNAL';
        const rateValid = treatment === 'RATE_CONFIGURED_PENDING_REVIEW' && item.fiscalRate !== '' && item.fiscalRate !== null && item.fiscalRate !== undefined && Number.isFinite(Number(item.fiscalRate)) && Number(item.fiscalRate) >= 0 && Number(item.fiscalRate) <= 100;
        const rate = rateValid ? Number(item.fiscalRate) : null;
        const key = `${treatment}|${rateValid ? rate : 'n/a'}`;
        const row = groups.get(key) || { treatment, label: TYPES[treatment] || 'Classificação desconhecida', rate, lines: 0, quantity: 0, base: 0, estimatedTax: 0, unresolved: true };
        row.lines += 1; row.quantity += Number(item.quantity || 0); row.base = round(row.base + base);
        if (rateValid) { const tax = round(base * rate / 100); row.estimatedTax = round(row.estimatedTax + tax); row.unresolved = false; estimatedTax = round(estimatedTax + tax); estimatedBase = round(estimatedBase + base); }
        else unresolvedCount += 1;
        groups.set(key, row);
      });
    });
    return { rows: [...groups.values()].sort((a,b) => a.label.localeCompare(b.label) || (a.rate ?? -1) - (b.rate ?? -1)), lineCount, unresolvedCount, estimatedTax, estimatedBase, salesCount: (sales || []).length, disclaimer: 'Resumo interno estimado. Taxas e enquadramentos não foram validados pela AGT; não representa IVA liquidado nem declaração fiscal.' };
  }
  root.VendaMaisFiscalReport = Object.freeze({ summarize });
})(typeof window !== 'undefined' ? window : globalThis);
