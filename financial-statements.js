/* Demonstrações financeiras preliminares construídas a partir do balancete interno. */
(function attachVendaMaisFinancialStatements(root) {
  'use strict';
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  function build({ trialRows = [], accounts = [], incomePostings = [], openingRows = [] } = {}) {
    const accountByCode = new Map(accounts.map(account => [account.code, account]));
    const balances = trialRows.map(row => ({ ...row, account: accountByCode.get(row.code) || { code: row.code, name: row.name, type: 'Misto' } }));
    const sum = rows => round(rows.reduce((total, row) => total + row.value, 0));
    const assets = balances.filter(row => row.account.type === 'Activo').map(row => ({ code: row.code, name: row.name, value: round(Number(row.closingDebit || 0) - Number(row.closingCredit || 0)) })).filter(row => Math.abs(row.value) >= 0.01);
    const liabilities = balances.filter(row => row.account.type === 'Passivo').map(row => ({ code: row.code, name: row.name, value: round(Number(row.closingCredit || 0) - Number(row.closingDebit || 0)) })).filter(row => Math.abs(row.value) >= 0.01);
    const equityAccounts = balances.filter(row => row.account.type === 'Capital').map(row => ({ code: row.code, name: row.name, value: round(Number(row.closingCredit || 0) - Number(row.closingDebit || 0)) })).filter(row => Math.abs(row.value) >= 0.01);
    const periodTotals = new Map();
    for (const posting of incomePostings) for (const line of posting.lines || []) {
      const account = accountByCode.get(line.accountCode); if (!account) continue;
      const current = periodTotals.get(line.accountCode) || { debit: 0, credit: 0 };
      current.debit += Number(line.debit || 0); current.credit += Number(line.credit || 0); periodTotals.set(line.accountCode, current);
    }
    const revenueAccounts = balances.filter(row => row.account.type === 'Rendimento').map(row => ({ ...row, periodDebit: periodTotals.get(row.code)?.debit || 0, periodCredit: periodTotals.get(row.code)?.credit || 0 }));
    const expenseAccounts = balances.filter(row => row.account.type === 'Gasto').map(row => ({ ...row, periodDebit: periodTotals.get(row.code)?.debit || 0, periodCredit: periodTotals.get(row.code)?.credit || 0 }));
    const revenue = round(revenueAccounts.reduce((total, row) => total + row.periodCredit - row.periodDebit, 0));
    const expenses = round(expenseAccounts.reduce((total, row) => total + row.periodDebit - row.periodCredit, 0));
    const result = round(revenue - expenses);
    const accumulatedRevenue = round(revenueAccounts.reduce((total, row) => total + Number(row.movementCredit || 0) - Number(row.movementDebit || 0), 0));
    const accumulatedExpenses = round(expenseAccounts.reduce((total, row) => total + Number(row.movementDebit || 0) - Number(row.movementCredit || 0), 0));
    const accumulatedResult = round(accumulatedRevenue - accumulatedExpenses);
    const openingCapital = round(openingRows.filter(row => ['51.1','88.1'].includes(row.accountCode)).reduce((total, row) => total + Number(row.credit || 0) - Number(row.debit || 0), 0));
    const totalAssets = sum(assets), totalLiabilities = sum(liabilities), totalEquity = sum(equityAccounts);
    const balanceDifference = round(totalAssets - totalLiabilities - totalEquity - accumulatedResult);
    const equityMovement = [
      { label: 'Capital e resultados acumulados na abertura', value: openingCapital },
      { label: 'Resultado acumulado no exercício', value: accumulatedResult },
      { label: 'Capital próprio no fecho (contas identificadas + resultado acumulado)', value: round(totalEquity + accumulatedResult) }
    ];
    return {
      balanceSheet: { assets, liabilities, equity: equityAccounts, currentResult: accumulatedResult, totalAssets, totalLiabilities, totalEquity: round(totalEquity + accumulatedResult), difference: balanceDifference, balanced: Math.abs(balanceDifference) < 0.01 },
      incomeStatement: { revenue, expenses, result, revenueLines: revenueAccounts.map(row => ({ code: row.code, name: row.name, value: round(Number(row.periodCredit || 0) - Number(row.periodDebit || 0)) })).filter(row => row.value), expenseLines: expenseAccounts.map(row => ({ code: row.code, name: row.name, value: round(Number(row.periodDebit || 0) - Number(row.periodCredit || 0)) })).filter(row => row.value) },
      changesInEquity: equityMovement,
      controls: { trialRows: trialRows.length, openingRows: openingRows.length, postings: incomePostings.length, hasOpeningBalances: openingRows.length > 0 }
    };
  }
  root.VendaMaisFinancialStatements = Object.freeze({ build });
})(typeof window !== 'undefined' ? window : globalThis);
