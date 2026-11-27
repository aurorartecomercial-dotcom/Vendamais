/* Gestão local do mapeamento das contas internas para o PGCA.
 * Não inclui correspondências oficiais pré-preenchidas: cada código deve ser confirmado por contabilista.
 */
(function attachVendaMaisPgcaMapping(root) {
  'use strict';
  const STORAGE_KEY = 'vendamais.pgca-account-mapping.v1';
  const validCode = value => /^\d{1,3}(?:\.\d{1,3})*$/.test(String(value || '').trim());
  function read() {
    try {
      const parsed = JSON.parse(root.localStorage?.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
  }
  function save(mapping) {
    const clean = {};
    for (const [internalCode, value] of Object.entries(mapping || {})) {
      const officialCode = String(value?.officialCode || '').trim();
      const parentCode = String(value?.parentCode || '').trim();
      clean[internalCode] = {
        officialCode: validCode(officialCode) ? officialCode : '',
        parentCode: validCode(parentCode) ? parentCode : '',
        reviewed: value?.reviewed === true
      };
    }
    root.localStorage?.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }
  function analyze(accounts, mapping = read()) {
    const rows = (accounts || []).map(account => {
      const value = mapping[account.code] || {};
      return { internalCode: account.code, internalName: account.name, officialCode: value.officialCode || '', parentCode: value.parentCode || '', reviewed: value.reviewed === true };
    });
    const assigned = rows.filter(row => validCode(row.officialCode));
    const duplicates = assigned.reduce((all, row) => { all[row.officialCode] = (all[row.officialCode] || 0) + 1; return all; }, {});
    const duplicateCodes = Object.keys(duplicates).filter(code => duplicates[code] > 1);
    return { rows, total: rows.length, mapped: assigned.length, reviewed: rows.filter(row => row.reviewed && validCode(row.officialCode)).length, missing: rows.length - assigned.length, duplicateCodes, complete: rows.length > 0 && assigned.length === rows.length && duplicateCodes.length === 0 && rows.every(row => row.reviewed) };
  }
  root.VendaMaisPgcaMapping = Object.freeze({ read, save, analyze, validCode, STORAGE_KEY });
})(typeof window !== 'undefined' ? window : globalThis);
