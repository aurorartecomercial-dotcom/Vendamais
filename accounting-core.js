/* Contabilidade de partidas dobradas do VendaMais.
 * Os lançamentos são derivados, sem escrita, do diário financeiro operacional.
 * Subcontas internas alinhadas por classes ao PGCA (Decreto 82/01); validação profissional necessária.
 */
(function attachVendaMaisAccounting(root) {
  'use strict';
  const round = n => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
  const ACCOUNTS = [
    ['11','Imobilizações corpóreas','Activo'],['12','Imobilizações incorpóreas','Activo'],
    ['22','Mercadorias / existências','Activo'],['31.1','Clientes c/c','Activo'],['32.1','Fornecedores c/c','Passivo'],
    ['34.1','Estado — IVA a pagar','Passivo'],['39.9','Valores por classificar','Misto'],
    ['41.1','Caixa','Activo'],['42.1','Depósitos à ordem','Activo'],
    ['51.1','Capital social','Capital'],['61.1','Vendas de mercadorias','Rendimento'],['61.9','Devoluções e abatimentos de vendas','Rendimento'],
    ['71.1','Custo das mercadorias vendidas','Gasto'],['72.1','Fornecimentos e serviços externos','Gasto'],['72.2','Despesas fixas','Gasto'],['72.3','Despesas variáveis','Gasto'],['78.9','Outros gastos por classificar','Gasto'],['88.1','Resultado do exercício (apuramento)','Capital']
  ].map(([code,name,type])=>({code,name,type}));
  const ACCOUNT = Object.fromEntries(ACCOUNTS.map(a=>[a.code,a]));
  const isBank = method => /transfer|multicaixa|tpa|dep[oó]sito|banco/i.test(String(method||''));
  const cashAccount = method => isBank(method) ? '42.1' : '41.1';
  const line = (code, debit=0, credit=0) => ({accountCode:code, accountName:ACCOUNT[code]?.name || 'Conta por classificar', debit:round(debit), credit:round(credit)});
  const sum = (rows,key) => round(rows.reduce((s,r)=>s+Number(r[key]||0),0));
  function buildLedger(data, {start='0000-01-01',end='9999-12-31',locationId='all'}={}) {
    const sales = data.sales || [], returns = data.returns || [], expenses = data.expenses || [];
    const journal = (data.journalEntries||[]).filter(e=>String(e.date||'').slice(0,10)>=start && String(e.date||'').slice(0,10)<=end && (locationId==='all'||e.locationId===locationId));
    const postings=[];
    for (const e of journal) {
      const amount=round(Math.abs(e.amount)), cash=round(Math.abs(e.cashImpact)), ar=round(Math.max(0,e.receivableImpact||0)), ap=round(Math.max(0,e.liabilityImpact||0));
      let rows=[]; const sale=sales.find(x=>x.id===e.sourceId);
      if(e.sourceType==='sale' && sale){
        const tax=round(Math.max(0,Number(sale.tax||0))), cost=round((sale.items||[]).reduce((s,i)=>s+Number(i.cost||0)*Number(i.quantity||0),0));
        const paid=round(Math.max(0,e.cashImpact||0)); const due=round(Math.max(0,e.receivableImpact||0));
        if(paid) rows.push(line(cashAccount(e.payment),paid));
        if(due) rows.push(line('31.1',due));
        rows.push(line('61.1',0,Math.max(0,amount-tax)));
        if(tax) rows.push(line('34.1',0,tax));
        if(cost){rows.push(line('71.1',cost));rows.push(line('22',0,cost));}
      } else if(e.sourceType==='purchase') {
        const stock=round(e.inventoryImpact||amount); if(stock) rows.push(line('22',stock)); if(stock) rows.push(line('32.1',0,stock));
      } else if(e.sourceType==='supplier-payment') {
        if(amount) {rows.push(line('32.1',amount));rows.push(line(cashAccount(e.payment),0,amount));}
      } else if(e.sourceType==='expense') {
        const paid=round(Math.max(0,-Number(e.cashImpact||0))), due=round(Math.max(0,e.liabilityImpact||0));
        const expenseDoc=expenses.find(x=>x.id===e.sourceId); const code=(expenseDoc?.costType==='Fixo'||/fix/i.test(`${e.category} ${e.eventType}`))?'72.2':'72.3';
        rows.push(line(code,amount)); if(paid) rows.push(line(cashAccount(e.payment),0,paid)); if(due) rows.push(line('32.1',0,due));
      } else if(e.sourceType==='expense-payment') {
        if(amount){rows.push(line('32.1',amount));rows.push(line(cashAccount(e.payment),0,amount));}
      } else if(e.sourceType==='receipt') {
        if(amount){rows.push(line(cashAccount(e.payment),amount));rows.push(line('31.1',0,amount));}
      } else if(e.sourceType==='return') {
        const ret=returns.find(x=>x.id===e.sourceId); const original=sales.find(x=>x.id===ret?.saleId);
        const tax=round(original?.tax||0), cost=round((original?.items||[]).reduce((s,i)=>s+Number(i.cost||0)*Number(i.quantity||0),0));
        const refund=round(Math.max(0,-Number(e.cashImpact||0))), customerCredit=round(Math.max(0,-Number(e.receivableImpact||0)));
        rows.push(line('61.9',Math.max(0,amount-tax))); if(tax) rows.push(line('34.1',tax));
        if(refund) rows.push(line(cashAccount(e.payment),0,refund)); if(customerCredit) rows.push(line('31.1',0,customerCredit));
        if(cost){rows.push(line('22',cost));rows.push(line('71.1',0,cost));}
      } else {
        const impact=round(Number(e.cashImpact||0));
        if(impact>0){rows.push(line(cashAccount(e.payment),impact));rows.push(line(e.category==='Entrada de capital'?'51.1':'39.9',0,impact));}
        else if(impact<0){rows.push(line(e.category==='Retirada pessoal'?'51.1':'39.9',-impact));rows.push(line(cashAccount(e.payment),0,-impact));}
      }
      let debit=sum(rows,'debit'), credit=sum(rows,'credit');
      // Diferenças de origem ficam explícitas em valores por classificar, nunca são escondidas.
      if(Math.abs(debit-credit)>0.009){const diff=round(Math.abs(debit-credit));rows.push(debit<credit?line('39.9',diff,0):line('39.9',0,diff));debit=sum(rows,'debit');credit=sum(rows,'credit');}
      if(rows.length) postings.push({id:e.id,date:e.date,locationId:e.locationId,sourceType:e.sourceType,sourceId:e.sourceId,description:e.description||e.eventType,reference:e.eventType,lines:rows,debit,credit,balanced:Math.abs(debit-credit)<0.01});
    }
    return postings;
  }
  function accountBalances(postings){
    const map=new Map(ACCOUNTS.map(a=>[a.code,{...a,debit:0,credit:0,balance:0}]));
    postings.forEach(p=>p.lines.forEach(l=>{const a=map.get(l.accountCode)||{code:l.accountCode,name:l.accountName,type:'Misto',debit:0,credit:0,balance:0};a.debit=round(a.debit+l.debit);a.credit=round(a.credit+l.credit);map.set(l.accountCode,a);}));
    return [...map.values()].map(a=>({...a,balance:round(a.debit-a.credit),side:a.debit>a.credit?'Devedor':a.credit>a.debit?'Credor':'Nulo'})).filter(a=>a.debit||a.credit||a.code==='39.9');
  }
  function summarize(postings){const balances=accountBalances(postings);return {postings:postings.length,debit:sum(postings,'debit'),credit:sum(postings,'credit'),balanced:postings.every(p=>p.balanced),suspense:balances.find(a=>a.code==='39.9')?.balance||0,balances};}
  function trialBalance(postings){return accountBalances(postings).map(a=>({...a,trialDebit:Math.max(0,a.balance),trialCredit:Math.max(0,-a.balance)}));}
  function incomeStatement(postings){const b=accountBalances(postings);const revenue=round(b.filter(a=>a.type==='Rendimento').reduce((s,a)=>s-a.balance,0));const expenses=round(b.filter(a=>a.type==='Gasto').reduce((s,a)=>s+a.balance,0));return {revenue,expenses,result:round(revenue-expenses)};}
  function cashFlow(postings){const rows=[];postings.forEach(p=>p.lines.forEach(l=>{if(['41.1','42.1'].includes(l.accountCode))rows.push({date:p.date,description:p.description,account:l.accountName,inflow:l.debit,outflow:l.credit});}));return rows;}
  root.VendaMaisAccounting=Object.freeze({ACCOUNTS,buildLedger,accountBalances,summarize,trialBalance,incomeStatement,cashFlow});
})(typeof window!=='undefined'?window:globalThis);
