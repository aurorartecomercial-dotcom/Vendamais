import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../saft-xml-blueprint.js', import.meta.url), 'utf8');
const context = { globalThis: {}, Date };
vm.runInNewContext(source, context);
const api = context.globalThis.VendaMaisSaftXmlBlueprint;
test('modelo inclui namespace e secções principais sem declarar conformidade', () => {
  const result = api.buildTemplate({ company: 'Loja & Filhos', nif: '5412345678', address: 'Luanda', start: '2026-01-01', end: '2026-12-31' });
  assert.match(result.xml, /urn:OECD:StandardAuditFile-Tax:AO_1\.01_01/);
  assert.match(result.xml, /<MasterFiles>/);
  assert.match(result.xml, /GeneralLedgerEntries/);
  assert.match(result.xml, /Loja &amp; Filhos/);
  assert.equal(result.isOfficial, false);
  assert.equal(result.xsdValidated, false);
});
test('modelo assinala dados obrigatórios ainda em falta', () => {
  const result = api.buildTemplate();
  assert.ok(result.missing.includes('NIF do produtor do software'));
  assert.ok(result.missing.includes('Número de validação do software atribuído pela AGT'));
  assert.ok(result.missing.includes('Validação integral contra o XSD aplicável'));
});
