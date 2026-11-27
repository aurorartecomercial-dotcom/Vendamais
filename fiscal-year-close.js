/* Encerramento anual auxiliar: apura resultado e prepara saldos do exercício seguinte. */
(function attachVendaMaisFiscalYearClose(root) {
  'use strict';
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  function prepare({ year, accounts = [], openingRows = [], postings = [] } = {}) {
    const yearNumber = Number(year);
    const errors = [], warnings = [];
    if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2099) errors.push('Exercício inválido para encerramento.');
    const known = new Set(accounts.map(account => account.code));
    const seen = new Set();
    for (const row of openingRows) {
      if (!known.has(row.accountCode)) errors.push(`Conta de abertura desconhecida: ${row.accountCode}.`);
      if (seen.has(row.accountCode)) errors.push(`Conta de abertura repetida: ${row.accountCode}.`);
      seen.add(row.accountCode);
      if (!Number.isFinite(Number(row.debit)) || !Number.isFinite(Number(row.credit)) || Number(row.debit) < 0 || Number(row.credit) < 0 || (Number(row.debit) > 0 && Number(row.credit) > 0)) errors.push(`Saldo de abertura inválido na conta ${row.accountCode}.`);
    }
    if (!openingRows.length) errors.push('Registe e guarde os saldos de abertura antes de encerrar o exercício.');
    const openingDebit = round(openingRows.reduce((sum, row) => sum + Number(row.debit || 0), 0));
    const openingCredit = round(openingRows.reduce((sum, row) => sum + Number(row.credit || 0), 0));
    if (Math.abs(openingDebit - openingCredit) >= 0.01) errors.push('Os saldos de abertura não estão equilibrados.');
    for (const posting of postings) if (!posting.balanced || Math.abs(Number(posting.debit || 0) - Number(posting.credit || 0)) >= 0.01) errors.push(`Lançamento não equilibrado: ${posting.reference || posting.id || 'sem referência'}.`);

    const balances = new Map(accounts.map(account => [account.code, { ...account, net: 0 }]));
    for (const row of openingRows) {
      const account = balances.get(row.accountCode);
      if (account) account.net = round(account.net + Number(row.debit || 0) - Number(row.credit || 0));
    }
    for (const posting of postings) for (const line of posting.lines || []) {
      const account = balances.get(line.accountCode);
      if (!account) { errors.push(`Lançamento usa conta fora do plano interno: ${line.accountCode}.`); continue; }
      account.net = round(account.net + Number(line.debit || 0) - Number(line.credit || 0));
    }
    const incomeRows = [...balances.values()].filter(account => ['Rendimento', 'Gasto'].includes(account.type));
    const revenue = round(incomeRows.filter(account => account.type === 'Rendimento').reduce((sum, account) => sum - account.net, 0));
    const expenses = round(incomeRows.filter(account => account.type === 'Gasto').reduce((sum, account) => sum + account.net, 0));
    const result = round(revenue - expenses);
    const resultAccount = balances.get('88.1');
    if (!resultAccount) errors.push('A conta interna 88.1 — Resultado do exercício — não existe.');
    else resultAccount.net = round(resultAccount.net - result);

    const nextOpeningRows = [...balances.values()].filter(account => !['Rendimento', 'Gasto'].includes(account.type)).map(account => ({
      accountCode: account.code,
      debit: account.net > 0 ? round(account.net) : 0,
      credit: account.net < 0 ? round(-account.net) : 0
    })).filter(row => row.debit || row.credit);
    const nextDebit = round(nextOpeningRows.reduce((sum, row) => sum + row.debit, 0));
    const nextCredit = round(nextOpeningRows.reduce((sum, row) => sum + row.credit, 0));
    if (Math.abs(nextDebit - nextCredit) >= 0.01) errors.push('Os saldos preparados para o exercício seguinte não estão equilibrados.');
    if (postings.length === 0) warnings.push('Não existem movimentos contabilísticos no exercício.');
    if (balances.get('39.9')?.net) warnings.push('A conta 39.9 — Valores por classificar — mantém saldo; reveja antes do encerramento.');
    if (Math.abs(result) < 0.01) warnings.push('Resultado do exercício igual a zero.');
    return { valid: errors.length === 0, year: yearNumber, nextYear: yearNumber + 1, revenue, expenses, result, resultType: result > 0 ? 'Lucro' : result < 0 ? 'Prejuízo' : 'Nulo', postings: postings.length, openingDebit, openingCredit, nextOpeningRows, nextDebit, nextCredit, errors, warnings };
  }
  root.VendaMaisFiscalYearClose = Object.freeze({ prepare });
})(typeof window !== 'undefined' ? window : globalThis);
