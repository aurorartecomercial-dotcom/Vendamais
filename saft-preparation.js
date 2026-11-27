/* Diagnóstico de preparação para SAF-T (AO) de contabilidade.
 * Não gera nem declara conformidade de um ficheiro SAF-T oficial.
 */
(function attachVendaMaisSaftPreparation(root) {
  'use strict';
  const digits = value => String(value || '').replace(/\D/g, '');
  function analyze({ company = '', nif = '', address = '', phone = '', start = '', end = '', postings = [], accountMappings = null } = {}) {
    const checks = [];
    const add = (id, label, ok, detail, severity = 'blocker') => checks.push({ id, label, ok: Boolean(ok), detail, severity: ok ? 'ok' : severity });
    add('company', 'Nome / denominação do sujeito passivo', String(company).trim().length > 0, 'Confirmar a denominação legal exacta da empresa.');
    add('nif', 'NIF do sujeito passivo', /^\d{10}$/.test(digits(nif)), 'É necessário confirmar o NIF válido da entidade; o diagnóstico verifica apenas 10 algarismos.');
    add('address', 'Morada do sujeito passivo', String(address).trim().length > 0, 'Preencher e confirmar a morada fiscal completa.');
    add('phone', 'Contacto do sujeito passivo', String(phone).trim().length > 0, 'Confirmar um contacto da entidade.');
    add('period', 'Período anual de tributação', Boolean(start && end && end >= start && start.slice(0, 4) === end.slice(0, 4)), 'O SAF-T de contabilidade é preparado para um período anual, total ou parcial, dentro do mesmo exercício.');
    add('entries', 'Movimentos contabilísticos no período', Array.isArray(postings) && postings.length > 0, 'Não existem lançamentos contabilísticos no período seleccionado.', 'warning');
    const unbalanced = (postings || []).filter(p => !p.balanced || Math.abs(Number(p.debit || 0) - Number(p.credit || 0)) > 0.009);
    add('balance', 'Equilíbrio débito / crédito', unbalanced.length === 0, `${unbalanced.length} lançamento(s) desequilibrado(s).`);
    const negative = (postings || []).reduce((count, p) => count + (p.lines || []).filter(line => Number(line.debit || 0) < 0 || Number(line.credit || 0) < 0).length, 0);
    add('negative', 'Ausência de valores negativos nos movimentos', negative === 0, `${negative} linha(s) com valor negativo; corrigir a origem em vez de exportar valores negativos.`);
    const suspense = (postings || []).reduce((count, p) => count + (p.lines || []).filter(line => line.accountCode === '39.9').length, 0);
    const mappingComplete = Boolean(accountMappings?.complete);
    add('mapping', 'Mapeamento para o plano de contas oficial', mappingComplete && suspense === 0, `${accountMappings?.mapped || 0}/${accountMappings?.total || 0} contas internas com código PGCA; ${accountMappings?.reviewed || 0} revistas; ${suspense} linha(s) em contas internas “por classificar”. Confirmar códigos e contas agregadoras com contabilista.`, 'blocker');
    add('schema', 'Validação XML contra XSD SAF-T (AO)', false, 'Ainda não foi gerado XML SAF-T nem validado contra o XSD oficial aplicável.', 'blocker');
    add('review', 'Revisão contabilística e fiscal', false, 'Exige revisão por contabilista responsável e confirmação das regras e versão técnica em vigor.', 'blocker');
    const blockers = checks.filter(c => !c.ok && c.severity === 'blocker').length;
    const warnings = checks.filter(c => !c.ok && c.severity === 'warning').length;
    return {
      reportType: 'DIAGNOSTICO_INTERNO_PREPARACAO_SAFT_AO_CONTABILIDADE',
      generatedAt: new Date().toISOString(), period: { start, end },
      entity: { company: String(company || ''), nif: String(nif || ''), address: String(address || ''), phone: String(phone || '') },
      accountMapping: accountMappings || null,
      totals: { postings: (postings || []).length, debit: Number((postings || []).reduce((s,p)=>s+Number(p.debit||0),0).toFixed(2)), credit: Number((postings || []).reduce((s,p)=>s+Number(p.credit||0),0).toFixed(2)), blockers, warnings },
      readyForOfficialExport: blockers === 0 && warnings === 0,
      checks,
      disclaimer: 'Este ficheiro é apenas um diagnóstico interno em JSON. NÃO é SAF-T (AO), não é XML, não foi validado contra XSD e não pode ser submetido à AGT.'
    };
  }
  root.VendaMaisSaftPreparation = Object.freeze({ analyze });
})(typeof window !== 'undefined' ? window : globalThis);
