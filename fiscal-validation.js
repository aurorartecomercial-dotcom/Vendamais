/* VendaMais — validação interna de dados antes de preparar registos fiscais.
 * Não substitui regras oficiais, validação da AGT ou classificação tributária.
 */
window.VendaMaisFiscalValidation = (() => {
  const finite = value => Number.isFinite(Number(value));
  const close = (a, b) => Math.abs(Number(a) - Number(b)) <= 0.02;

  function validate(sale, issuer = {}) {
    const errors = [];
    const warnings = [];
    if (!issuer.company || !String(issuer.company).trim()) errors.push('Indique o nome da empresa nas Definições.');
    const nif = String(issuer.nif || '').replace(/\s+/g, '');
    if (!/^\d{10}$/.test(nif)) warnings.push('O NIF do emitente não tem 10 algarismos; confirme-o antes de qualquer utilização fiscal.');
    if (!sale || !sale.id || !sale.reference) errors.push('A venda não tem identificador e referência interna.');
    const date = new Date(sale?.date || '');
    if (!sale?.date || Number.isNaN(date.getTime())) errors.push('A data da venda está ausente ou inválida.');
    const items = Array.isArray(sale?.items) ? sale.items : [];
    if (!items.length) errors.push('A venda não contém linhas de produtos/serviços.');
    items.forEach((item, index) => {
      const n = index + 1;
      if (!String(item?.name || '').trim()) errors.push(`A linha ${n} não tem descrição.`);
      if (!finite(item?.quantity) || Number(item.quantity) <= 0) errors.push(`A quantidade da linha ${n} deve ser superior a zero.`);
      if (!finite(item?.price) || Number(item.price) < 0) errors.push(`O preço da linha ${n} é inválido.`);
      if (item?.total !== undefined && (!finite(item.total) || Number(item.total) < 0)) errors.push(`O total da linha ${n} é inválido.`);
      const treatment = String(item?.fiscalTreatment || 'UNCLASSIFIED_INTERNAL');
      const allowedTreatments = ['UNCLASSIFIED_INTERNAL', 'RATE_CONFIGURED_PENDING_REVIEW', 'EXEMPT_PENDING_REVIEW', 'NOT_SUBJECT_PENDING_REVIEW'];
      if (!allowedTreatments.includes(treatment)) errors.push(`A classificação interna da linha ${n} é desconhecida.`);
      if (item?.fiscalRate !== '' && item?.fiscalRate !== undefined && (!finite(item.fiscalRate) || Number(item.fiscalRate) < 0 || Number(item.fiscalRate) > 100)) errors.push(`A taxa interna da linha ${n} deve estar entre 0 e 100%.`);
      if (['EXEMPT_PENDING_REVIEW', 'NOT_SUBJECT_PENDING_REVIEW'].includes(treatment) && !String(item?.fiscalReason || '').trim()) warnings.push(`A linha ${n} está marcada para análise de isenção/não sujeição, mas não tem fundamento interno registado.`);
      if (treatment === 'UNCLASSIFIED_INTERNAL') warnings.push(`A linha ${n} continua por classificar fiscalmente.`);
    });
    for (const [label, value] of [['Subtotal', sale?.subtotal], ['Desconto', sale?.discountValue || 0], ['IVA', sale?.tax || 0], ['Total', sale?.total]]) {
      if (!finite(value) || Number(value) < 0) errors.push(`${label} inválido ou negativo.`);
    }
    if (finite(sale?.subtotal) && finite(sale?.discountValue || 0) && finite(sale?.tax || 0) && finite(sale?.total)) {
      const expected = Number(sale.subtotal) - Number(sale.discountValue || 0) + Number(sale.tax || 0);
      if (!close(expected, sale.total)) errors.push('O total não corresponde a subtotal menos desconto mais IVA.');
    }
    if (finite(sale?.total) && Number(sale.total) <= 0) errors.push('O total da venda deve ser superior a zero.');
    if (!String(sale?.payment || '').trim()) warnings.push('O meio de pagamento não está indicado.');
    warnings.push('As classificações e taxas por produto são apenas internas; não alteram o cálculo do IVA da venda e não foram validadas segundo as regras oficiais da AGT.');
    return { valid: errors.length === 0, errors, warnings, checkedAt: new Date().toISOString(), ruleset: 'vendamais-internal-preflight-1.1' };
  }

  return { validate };
})();
