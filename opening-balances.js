/* Saldos de abertura e balancete acumulado. Dados introduzidos manualmente; não substituem validação contabilística. */
(function attachVendaMaisOpeningBalances(root) {
  'use strict';
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  function validate(rows = [], accounts = []) {
    const known = new Set(accounts.map(account => account.code));
    const seen = new Set(); const errors = [];
    const clean = [];
    for (const row of rows) {
      const code = String(row.accountCode || '').trim();
      const debit = Number(row.debit || 0), credit = Number(row.credit || 0);
      if (!code || (!debit && !credit)) continue;
      if (!known.has(code)) errors.push(`Conta ${code || '(vazia)'} não existe no plano interno.`);
      if (seen.has(code)) errors.push(`Conta ${code} repetida.`);
      seen.add(code);
      if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) errors.push(`Conta ${code}: valores inválidos ou negativos.`);
      if (debit > 0 && credit > 0) errors.push(`Conta ${code}: indique saldo devedor OU credor, não ambos.`);
      clean.push({ accountCode: code, debit: round(debit), credit: round(credit) });
    }
    const totalDebit = round(clean.reduce((sum, row) => sum + row.debit, 0));
    const totalCredit = round(clean.reduce((sum, row) => sum + row.credit, 0));
    if (Math.abs(totalDebit - totalCredit) >= 0.01) errors.push('Os saldos de abertura não estão equilibrados: débito e crédito devem ser iguais.');
    if (!clean.length) errors.push('Introduza pelo menos um saldo de abertura.');
    return { valid: errors.length === 0, rows: clean, totalDebit, totalCredit, difference: round(totalDebit - totalCredit), errors };
  }
  function buildTrialBalance({ accounts = [], openingRows = [], postings = [] } = {}) {
    const map = new Map(accounts.map(account => [account.code, {
      code: account.code, name: account.name, type: account.type,
      openingDebit: 0, openingCredit: 0, movementDebit: 0, movementCredit: 0
    }]));
    for (const row of openingRows) {
      const account = map.get(row.accountCode);
      if (!account) continue;
      account.openingDebit = round(account.openingDebit + Number(row.debit || 0));
      account.openingCredit = round(account.openingCredit + Number(row.credit || 0));
    }
    for (const posting of postings) for (const line of posting.lines || []) {
      const account = map.get(line.accountCode);
      if (!account) continue;
      account.movementDebit = round(account.movementDebit + Number(line.debit || 0));
      account.movementCredit = round(account.movementCredit + Number(line.credit || 0));
    }
    const rows = [...map.values()].map(row => {
      const debitNet = round(row.openingDebit - row.openingCredit + row.movementDebit - row.movementCredit);
      return { ...row, closingDebit: Math.max(0, debitNet), closingCredit: Math.max(0, -debitNet) };
    }).filter(row => row.openingDebit || row.openingCredit || row.movementDebit || row.movementCredit);
    const total = key => round(rows.reduce((sum, row) => sum + row[key], 0));
    const totals = {
      openingDebit: total('openingDebit'), openingCredit: total('openingCredit'),
      movementDebit: total('movementDebit'), movementCredit: total('movementCredit'),
      closingDebit: total('closingDebit'), closingCredit: total('closingCredit')
    };
    totals.openingBalanced = Math.abs(totals.openingDebit - totals.openingCredit) < 0.01;
    totals.movementsBalanced = Math.abs(totals.movementDebit - totals.movementCredit) < 0.01;
    totals.closingBalanced = Math.abs(totals.closingDebit - totals.closingCredit) < 0.01;
    return { rows, totals };
  }
  root.VendaMaisOpeningBalances = Object.freeze({ validate, buildTrialBalance });
})(typeof window !== 'undefined' ? window : globalThis);
