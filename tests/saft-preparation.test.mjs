import test from 'node:test';
import assert from 'node:assert/strict';
import '../saft-preparation.js';
const analyze = globalThis.VendaMaisSaftPreparation.analyze;

test('diagnóstico SAF-T identifica dados da entidade em falta', () => {
  const result = analyze({ start: '2026-01-01', end: '2026-12-31', postings: [] });
  assert.equal(result.readyForOfficialExport, false);
  assert.ok(result.checks.some(check => check.id === 'nif' && !check.ok));
  assert.ok(result.totals.blockers > 0);
});

test('diagnóstico marca lançamentos desequilibrados e valores negativos', () => {
  const result = analyze({ company: 'Empresa', nif: '1234567890', address: 'Luanda', phone: '900000000', start: '2026-01-01', end: '2026-12-31', postings: [{ debit: 10, credit: 9, balanced: false, lines: [{ debit: -1, credit: 0 }] }] });
  assert.equal(result.checks.find(check => check.id === 'balance').ok, false);
  assert.equal(result.checks.find(check => check.id === 'negative').ok, false);
  assert.equal(result.checks.find(check => check.id === 'schema').ok, false);
});

test('diagnóstico nunca se apresenta como ficheiro SAF-T oficial', () => {
  const result = analyze({});
  assert.equal(result.reportType, 'DIAGNOSTICO_INTERNO_PREPARACAO_SAFT_AO_CONTABILIDADE');
  assert.match(result.disclaimer, /NÃO é SAF-T/);
  assert.equal(result.readyForOfficialExport, false);
});
