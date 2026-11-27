/* Pré-visualização interna de impostos por linha. Nunca altera o total comercial nem substitui validação AGT. */
(function attachVendaMaisFiscalPreview(root) {
  'use strict';
  const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const RATE = 'RATE_CONFIGURED_PENDING_REVIEW';
  const EXEMPT = 'EXEMPT_PENDING_REVIEW';
  const NOT_SUBJECT = 'NOT_SUBJECT_PENDING_REVIEW';
  const UNCLASSIFIED = 'UNCLASSIFIED_INTERNAL';

  function calculate(items = [], globalDiscountPercent = 0) {
    const rows = (Array.isArray(items) ? items : []).map((item, index) => {
      const quantity = Number(item.quantity || 0), price = Number(item.price || 0), lineDiscount = Number(item.discountPct || 0);
      if (![quantity, price, lineDiscount].every(Number.isFinite) || quantity < 0 || price < 0 || lineDiscount < 0 || lineDiscount > 100) throw new RangeError(`Linha ${index + 1}: quantidade, preço ou desconto inválido.`);
      const gross = round(quantity * price);
      const afterLineDiscount = round(gross * (1 - lineDiscount / 100));
      return { name: String(item.name || `Linha ${index + 1}`), treatment: item.fiscalTreatment || UNCLASSIFIED, rate: item.fiscalRate, gross, afterLineDiscount, base: afterLineDiscount, estimatedTax: null, status: 'unresolved' };
    });
    const pct = Number(globalDiscountPercent || 0);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new RangeError('O desconto geral deve estar entre 0 e 100%.');
    const totalBeforeGlobal = round(rows.reduce((sum, row) => sum + row.afterLineDiscount, 0));
    const globalDiscount = round(totalBeforeGlobal * pct / 100);
    rows.forEach(row => {
      const share = totalBeforeGlobal > 0 ? row.afterLineDiscount / totalBeforeGlobal : 0;
      row.base = round(row.afterLineDiscount - globalDiscount * share);
      if (row.treatment === RATE && row.rate !== '' && row.rate !== null && row.rate !== undefined && Number.isFinite(Number(row.rate)) && Number(row.rate) >= 0 && Number(row.rate) <= 100) {
        row.rate = Number(row.rate);
        row.estimatedTax = round(row.base * row.rate / 100);
        row.status = 'pending_review';
      } else if (row.treatment === EXEMPT || row.treatment === NOT_SUBJECT) {
        row.status = 'requires_legal_review';
      } else {
        row.status = 'unclassified';
      }
    });
    const calculable = rows.filter(row => row.estimatedTax !== null);
    return {
      rows,
      globalDiscount,
      estimatedTax: round(calculable.reduce((sum, row) => sum + row.estimatedTax, 0)),
      unresolvedCount: rows.filter(row => row.status !== 'pending_review').length,
      pendingReviewCount: calculable.length,
      fullyClassified: rows.length > 0 && rows.every(row => row.status === 'pending_review'),
      disclaimer: 'Simulação interna com taxas ainda por validar. Não é o IVA oficial da venda nem altera o total comercial.'
    };
  }
  root.VendaMaisFiscalPreview = Object.freeze({ calculate });
})(typeof window !== 'undefined' ? window : globalThis);
