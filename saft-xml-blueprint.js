/* Modelo XML orientativo para estudo da estrutura SAF-T (AO).
 * Contém marcadores PREENCHER e comentários; não é um ficheiro SAF-T válido.
 */
(function attachVendaMaisSaftXmlBlueprint(root) {
  'use strict';
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  function buildTemplate({ company = '', nif = '', address = '', start = '', end = '', phone = '', email = '' } = {}) {
    const year = start && /^\d{4}/.test(start) ? start.slice(0, 4) : 'PREENCHER';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- MODELO DE ESTUDO VendaMais. NAO SUBMETER A AGT. Contem campos PREENCHER e nao foi validado por XSD. -->\n<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO_1.01_01">\n  <Header>\n    <AuditFileVersion>1.01_01</AuditFileVersion>\n    <CompanyID>${esc(company || 'PREENCHER')}</CompanyID>\n    <TaxRegistrationNumber>${esc(nif || 'PREENCHER')}</TaxRegistrationNumber>\n    <TaxAccountingBasis>PREENCHER</TaxAccountingBasis>\n    <CompanyName>${esc(company || 'PREENCHER')}</CompanyName>\n    <CompanyAddress>\n      <AddressDetail>${esc(address || 'PREENCHER')}</AddressDetail>\n      <City>PREENCHER</City>\n      <Country>AO</Country>\n    </CompanyAddress>\n    <FiscalYear>${year}</FiscalYear>\n    <StartDate>${esc(start || 'PREENCHER')}</StartDate>\n    <EndDate>${esc(end || 'PREENCHER')}</EndDate>\n    <CurrencyCode>AOA</CurrencyCode>\n    <DateCreated>${new Date().toISOString().slice(0, 19)}</DateCreated>\n    <TaxEntity>Sede</TaxEntity>\n    <ProductCompanyTaxID>PREENCHER_NIF_PRODUTOR_SOFTWARE</ProductCompanyTaxID>\n    <SoftwareValidationNumber>PREENCHER_NUMERO_VALIDACAO_AGT</SoftwareValidationNumber>\n    <ProductID>VendaMais</ProductID>\n    <ProductVersion>2.5.0</ProductVersion>\n    ${phone ? `<Telephone>${esc(phone)}</Telephone>` : '<!-- Telephone: opcional -->'}\n    ${email ? `<Email>${esc(email)}</Email>` : '<!-- Email: opcional -->'}\n  </Header>\n  <MasterFiles>\n    <!-- Inserir todas as contas PGCA, incluindo contas integradoras, saldos de abertura/fecho e conta agregadora. -->\n    <!-- Inserir clientes, fornecedores, produtos e tabela de impostos quando aplicavel. -->\n  </MasterFiles>\n  <!-- GeneralLedgerEntries: NumberOfEntries, TotalDebit, TotalCredit e diarios/transacoes. -->\n  <!-- SourceDocuments: documentos comerciais aplicaveis, com os respectivos dados de origem. -->\n</AuditFile>`;
    const missing = [];
    if (!company.trim()) missing.push('Nome da empresa');
    if (!/^\d{10}$/.test(String(nif).replace(/\D/g, ''))) missing.push('NIF da empresa (formato de 10 algarismos)');
    if (!address.trim()) missing.push('Morada fiscal');
    if (!start || !end || end < start || start.slice(0, 4) !== end.slice(0, 4)) missing.push('Período anual válido');
    missing.push('TaxAccountingBasis confirmado');
    missing.push('NIF do produtor do software');
    missing.push('Número de validação do software atribuído pela AGT');
    missing.push('Plano de contas completo, saldos de abertura/fecho e movimentos contabilísticos');
    missing.push('Tabelas mestres e documentos comerciais aplicáveis');
    missing.push('Validação integral contra o XSD aplicável');
    return { xml, missing, isOfficial: false, xsdValidated: false };
  }
  root.VendaMaisSaftXmlBlueprint = Object.freeze({ buildTemplate });
})(typeof window !== 'undefined' ? window : globalThis);
