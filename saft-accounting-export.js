/* Exportação de trabalho do diário contabilístico derivado do VendaMais.
 * Não é SAF-T (AO): não inclui saldos de abertura/fecho nem validação XSD.
 */
(function attachVendaMaisSaftAccountingExport(root) {
  'use strict';
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const csvCell = value => {
    let text = String(value ?? '');
    // Evita que descrições importadas sejam interpretadas como fórmulas em folhas de cálculo.
    if (/^[\s]*[=+@]/.test(text) || /^[\s]*-/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  function prepare({ company = '', nif = '', start = '', end = '', locationId = 'all', postings = [], accountMappings = null } = {}) {
    const mapRows = accountMappings?.rows || [];
    const mapByInternal = new Map(mapRows.map(row => [row.internalCode, row]));
    const lines = [];
    const warnings = [];
    const unbalanced = [];
    const suspense = [];
    const negative = [];
    for (const posting of postings || []) {
      const debit = round(posting.debit), credit = round(posting.credit);
      if (!posting.balanced || Math.abs(debit - credit) > 0.009) unbalanced.push(posting.id || posting.reference || 'sem referência');
      for (const line of posting.lines || []) {
        const mapping = mapByInternal.get(line.accountCode) || {};
        const row = {
          date: String(posting.date || '').slice(0, 10),
          journalId: String(posting.id || ''),
          sourceType: String(posting.sourceType || ''),
          sourceId: String(posting.sourceId || ''),
          description: String(posting.description || ''),
          internalAccountCode: String(line.accountCode || ''),
          internalAccountName: String(line.accountName || ''),
          pgcaAccountCode: mapping.officialCode || '',
          pgcaParentCode: mapping.parentCode || '',
          accountReviewed: mapping.reviewed === true,
          debit: round(line.debit),
          credit: round(line.credit),
          locationId: String(posting.locationId || '')
        };
        if (row.internalAccountCode === '39.9') suspense.push(row.journalId || row.internalAccountCode);
        if (row.debit < 0 || row.credit < 0) negative.push(row.journalId || row.internalAccountCode);
        if (!row.pgcaAccountCode || !row.accountReviewed) warnings.push(`Conta ${row.internalAccountCode}: mapeamento PGCA ausente ou por rever.`);
        lines.push(row);
      }
    }
    const totalDebit = round(lines.reduce((sum, row) => sum + row.debit, 0));
    const totalCredit = round(lines.reduce((sum, row) => sum + row.credit, 0));
    const uniqueWarnings = [...new Set(warnings)];
    if (unbalanced.length) uniqueWarnings.push(`${unbalanced.length} lançamento(s) desequilibrado(s).`);
    if (suspense.length) uniqueWarnings.push(`${suspense.length} linha(s) na conta interna 39.9 por classificar.`);
    if (negative.length) uniqueWarnings.push(`${negative.length} linha(s) com valor negativo.`);
    if (!start || !end || end < start || start.slice(0, 4) !== end.slice(0, 4)) uniqueWarnings.push('Período inválido: seleccione datas dentro do mesmo exercício.');
    return {
      reportType: 'VENDA MAIS_DIARIO_CONTABILISTICO_PARA_REVISAO',
      formatVersion: '1.0', generatedAt: new Date().toISOString(),
      entity: { company: String(company || ''), nif: String(nif || '') },
      period: { start, end }, locationId,
      totals: { entries: (postings || []).length, lines: lines.length, debit: totalDebit, credit: totalCredit, difference: round(totalDebit - totalCredit) },
      controls: { balanced: unbalanced.length === 0 && Math.abs(totalDebit - totalCredit) < 0.01, unbalancedEntries: unbalanced, suspenseLines: suspense.length, negativeLines: negative.length, allAccountsMappedAndReviewed: lines.every(row => row.pgcaAccountCode && row.accountReviewed) },
      lines, warnings: uniqueWarnings,
      limitations: [
        'Exportação auxiliar para revisão contabilística; não é SAF-T (AO) e não pode ser submetida à AGT.',
        'Os lançamentos são derivados do diário financeiro operacional e exigem reconciliação com documentos e extratos.',
        'Não inclui saldos de abertura/fecho, plano de contas oficial completo, tabelas mestres ou validação XSD.',
        'Os códigos PGCA são os introduzidos pelo utilizador e não foram certificados pelo VendaMais.'
      ]
    };
  }
  function toCsv(report) {
    const headers = ['Data','ID_Lancamento','Tipo_Origem','ID_Origem','Descricao','Conta_Interna','Nome_Conta_Interna','Conta_PGCA','Conta_Agregadora_PGCA','Conta_Revista','Debito_AOA','Credito_AOA','ID_Loja'];
    const rows = (report?.lines || []).map(row => [row.date,row.journalId,row.sourceType,row.sourceId,row.description,row.internalAccountCode,row.internalAccountName,row.pgcaAccountCode,row.pgcaParentCode,row.accountReviewed ? 'SIM' : 'NAO',row.debit.toFixed(2),row.credit.toFixed(2),row.locationId]);
    return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
  }
  root.VendaMaisSaftAccountingExport = Object.freeze({ prepare, toCsv });
})(typeof window !== 'undefined' ? window : globalThis);
