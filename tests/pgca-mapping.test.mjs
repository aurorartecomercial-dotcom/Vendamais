import test from 'node:test';
import assert from 'node:assert/strict';
import '../pgca-mapping.js';
const engine = globalThis.VendaMaisPgcaMapping;

test('mapeamento PGCA começa sem códigos oficiais presumidos', () => {
  const result = engine.analyze([{ code: '41.1', name: 'Caixa' }, { code: '61.1', name: 'Vendas' }], {});
  assert.equal(result.mapped, 0);
  assert.equal(result.missing, 2);
  assert.equal(result.complete, false);
});

test('mapeamento exige revisão e detecta código duplicado', () => {
  const accounts = [{ code: '41.1', name: 'Caixa' }, { code: '42.1', name: 'Banco' }];
  const result = engine.analyze(accounts, {
    '41.1': { officialCode: '431', parentCode: '43', reviewed: true },
    '42.1': { officialCode: '431', parentCode: '43', reviewed: true }
  });
  assert.deepEqual(result.duplicateCodes, ['431']);
  assert.equal(result.complete, false);
});

test('mapeamento completo só fica válido quando todas as contas são revistas', () => {
  const accounts = [{ code: '41.1', name: 'Caixa' }];
  const result = engine.analyze(accounts, { '41.1': { officialCode: '431', parentCode: '43', reviewed: true } });
  assert.equal(result.complete, true);
});
