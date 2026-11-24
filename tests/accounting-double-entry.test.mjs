import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context={globalThis:{}};vm.runInNewContext(await readFile(new URL('../accounting-core.js',import.meta.url),'utf8'),context);
const accounting=context.globalThis.VendaMaisAccounting;
const base={sales:[{id:'s1',total:114,tax:14,items:[{cost:25,quantity:2}]}],returns:[],journalEntries:[
{id:'j1',date:'2026-11-01',sourceType:'sale',sourceId:'s1',eventType:'Venda',amount:114,cashImpact:100,receivableImpact:14,locationId:'l1',payment:'Dinheiro'},
{id:'j2',date:'2026-11-02',sourceType:'purchase',sourceId:'p1',eventType:'Compra',amount:80,inventoryImpact:80,liabilityImpact:80,locationId:'l1'},
{id:'j3',date:'2026-11-03',sourceType:'supplier-payment',sourceId:'sp1',eventType:'Pagamento fornecedor',amount:30,cashImpact:-30,liabilityImpact:-30,locationId:'l1',payment:'Dinheiro'},
{id:'j4',date:'2026-11-04',sourceType:'expense',sourceId:'e1',eventType:'Despesa',category:'Despesa fixa',amount:20,cashImpact:-12,liabilityImpact:8,locationId:'l1'},
{id:'j5',date:'2026-11-05',sourceType:'expense-payment',sourceId:'ep1',eventType:'Pagamento despesa',amount:8,cashImpact:-8,liabilityImpact:-8,locationId:'l1',payment:'Dinheiro'}]};
test('converte eventos existentes em partidas dobradas equilibradas sem criar eventos',()=>{
 const postings=accounting.buildLedger(base,{start:'2026-11-01',end:'2026-11-30',locationId:'all'});
 assert.equal(postings.length,5);assert.ok(postings.every(p=>p.balanced));
 const summary=accounting.summarize(postings);assert.equal(summary.debit,summary.credit);assert.equal(summary.balanced,true);
});
test('filtra por período e loja',()=>{
 const rows=accounting.buildLedger(base,{start:'2026-11-02',end:'2026-11-04',locationId:'l1'});assert.equal(rows.length,3);
});
test('liquidação de fornecedor não volta a reconhecer compra nem stock',()=>{
 const rows=accounting.buildLedger(base);const payment=rows.find(p=>p.id==='j3');assert.equal(payment.lines.some(l=>l.accountCode==='22'),false);assert.equal(payment.lines.find(l=>l.accountCode==='32.1').debit,30);
});
