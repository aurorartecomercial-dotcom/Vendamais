/* VendaMais — aplicação local de gestão comercial */
const STORE = 'vendamais_local_v1';
const STORAGE_VERSION = 9;
const USER_SESSION = 'vendamais_user_session_v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icons = ['◈', '◇', '◉', '◆', '✦', '⬡'];
const FIXED_COST_LABELS = ['Renda', 'Energia', 'Água', 'Internet', 'Salários', 'Segurança', 'Outros'];
const BRAND_THEMES = Object.freeze([
  { id: 'esmeralda', name: 'Esmeralda', primary: '#126951', deep: '#123e35', secondary: '#36b987', light: '#a7ead0', soft: '#e6f4ee' },
  { id: 'oceano', name: 'Oceano', primary: '#0e7490', deep: '#083344', secondary: '#22b8cf', light: '#9be7f1', soft: '#e0f7fb' },
  { id: 'safira', name: 'Safira', primary: '#2563eb', deep: '#172554', secondary: '#7c9cff', light: '#b7c9ff', soft: '#eaf0ff' },
  { id: 'violeta', name: 'Violeta', primary: '#7e22ce', deep: '#3b0764', secondary: '#c084fc', light: '#e2b8ff', soft: '#f5eaff' },
  { id: 'ameixa', name: 'Ameixa', primary: '#9d174d', deep: '#500724', secondary: '#ec4899', light: '#f7b2d0', soft: '#fce9f1' },
  { id: 'coral', name: 'Coral', primary: '#c2410c', deep: '#7c2d12', secondary: '#fb7185', light: '#fdba9b', soft: '#fff0e8' },
  { id: 'por-do-sol', name: 'Pôr do sol', primary: '#b45309', deep: '#78350f', secondary: '#f59e0b', light: '#fbd38d', soft: '#fff7df' },
  { id: 'limao', name: 'Lima', primary: '#4d7c0f', deep: '#365314', secondary: '#a3cf3d', light: '#d0ee8d', soft: '#f2f9df' },
  { id: 'turquesa', name: 'Turquesa', primary: '#0f766e', deep: '#134e4a', secondary: '#2dd4bf', light: '#9ff1df', soft: '#ddfaf3' },
  { id: 'ardosia', name: 'Ardósia', primary: '#334155', deep: '#0f172a', secondary: '#7c8ca3', light: '#c8d2df', soft: '#eef2f6' },
  { id: 'cereja', name: 'Cereja', primary: '#b91c1c', deep: '#7f1d1d', secondary: '#f05252', light: '#ffb5b5', soft: '#fff0f0' },
  { id: 'noite-azul', name: 'Noite azul', primary: '#4338ca', deep: '#1e1b4b', secondary: '#6d8dff', light: '#b9c7ff', soft: '#eef0ff' }
]);
let cart = [];
let previouslyFocused = null;

function dateISO(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
function dateTime(offset = 0, hour = 10) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}
function uid(prefix) { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }
function money(value) { return `${Number(value || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`; }
function roundMoney(value) { return window.VendaMaisFinance?.roundMoney(Number(value) || 0) ?? Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100; }
function captureDataSnapshot() { return JSON.stringify(data); }
function persistOrRollback(snapshot, rerender = true) { if (saveData()) return true; data = normaliseData(JSON.parse(snapshot)); currentUser = getSessionUser(); if (rerender) renderAll(); return false; }
function number(value) { return Number(value || 0).toLocaleString('pt-PT', { maximumFractionDigits: 2 }); }
function shortDate(value) { return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }
function fullDate(value) { return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: value.length > 10 ? 'short' : undefined }).format(new Date(value.length > 10 ? value : `${value}T12:00:00`)); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function emptyRow(columns, label = 'Ainda não existem registos.') { return `<tr><td colspan="${columns}"><div class="empty-state">${label}</div></td></tr>`; }
function brandTheme(id) { return BRAND_THEMES.find(theme => theme.id === id) || BRAND_THEMES[0]; }
function themePickerHtml(name, selected, title = 'Cores da empresa', note = 'Escolha uma combinação que represente o seu negócio.') {
  const active = brandTheme(selected).id;
  return `<fieldset class="theme-picker"><legend>${escapeHtml(title)}</legend><p>${escapeHtml(note)}</p><div class="theme-choices">${BRAND_THEMES.map(theme => `<label class="theme-choice" title="${escapeHtml(theme.name)}"><input type="radio" name="${escapeHtml(name)}" value="${theme.id}" ${theme.id === active ? 'checked' : ''} /><span class="theme-choice-card" style="--choice-a:${theme.primary};--choice-b:${theme.secondary};--choice-c:${theme.light}"><span class="theme-swatch"><i></i><i></i><i></i></span><b>${escapeHtml(theme.name)}</b></span></label>`).join('')}</div></fieldset>`;
}
function applyLocationAccent(locationId = data?.settings?.activeLocationId) {
  const location = (data?.locations || []).find(item => item.id === locationId);
  const colour = brandTheme(location?.colorId);
  const root = document.documentElement;
  root.style.setProperty('--location-color', colour.primary);
  root.style.setProperty('--location-soft', colour.soft);
  root.style.setProperty('--location-light', colour.light);
}
function applyBrandTheme(themeId = data?.settings?.themeId) {
  const theme = brandTheme(themeId);
  const root = document.documentElement;
  root.style.setProperty('--green', theme.primary);
  root.style.setProperty('--green-deep', theme.deep);
  root.style.setProperty('--green-soft', theme.soft);
  root.style.setProperty('--brand-light', theme.light);
  root.style.setProperty('--brand-secondary', theme.secondary);
  root.style.setProperty('--brand-gradient', `linear-gradient(155deg, ${theme.deep} 0%, ${theme.primary} 54%, ${theme.secondary} 145%)`);
  document.body?.setAttribute('data-brand-theme', theme.id);
  applyLocationAccent();
}

function demoData() {
  const products = [
    { id: 'p_agua', code: 'BEB-001', name: 'Água mineral 1,5L', category: 'Bebidas', price: 350, cost: 210, stock: 34, minStock: 10 },
    { id: 'p_sumol', code: 'BEB-002', name: 'Sumo tropical 33cl', category: 'Bebidas', price: 500, cost: 310, stock: 6, minStock: 8 },
    { id: 'p_arroz', code: 'ALI-001', name: 'Arroz agulha 5kg', category: 'Alimentação', price: 4950, cost: 3750, stock: 18, minStock: 6 },
    { id: 'p_oleo', code: 'ALI-002', name: 'Óleo alimentar 1L', category: 'Alimentação', price: 1900, cost: 1450, stock: 4, minStock: 8 },
    { id: 'p_caderno', code: 'PAP-001', name: 'Caderno A5 pautado', category: 'Papelaria', price: 750, cost: 400, stock: 41, minStock: 12 },
    { id: 'p_sabao', code: 'HIG-001', name: 'Sabão em pó 1kg', category: 'Higiene', price: 2450, cost: 1810, stock: 13, minStock: 5 },
    { id: 'p_caneta', code: 'PAP-002', name: 'Caneta azul', category: 'Papelaria', price: 250, cost: 110, stock: 3, minStock: 10 },
    { id: 'p_leite', code: 'ALI-003', name: 'Leite UHT 1L', category: 'Alimentação', price: 850, cost: 570, stock: 22, minStock: 8 }
  ];
  const line = (id, qty) => {
    const p = products.find(item => item.id === id);
    return { productId: p.id, name: p.name, code: p.code, price: p.price, cost: p.cost, quantity: qty };
  };
  const makeSale = (id, offset, customerId, payment, items, discount = 0, operatorId = 'u_caixa') => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountValue = subtotal * discount / 100;
    const tax = (subtotal - discountValue) * .14;
    return { id, reference: `VD-${id.slice(-4).toUpperCase()}`, date: dateTime(offset, 9 + Math.abs(offset) % 7), locationId: 'loc_main', customerId, payment, operatorId, operatorName: operatorId === 'u_gerente' ? 'Gestor da loja' : 'Vendedor principal', items, subtotal, discount, discountValue, tax, total: subtotal - discountValue + tax, status: 'Concluída' };
  };
  const sales = [
    makeSale('sale_1001', -6, 'c_ana', 'Multicaixa', [line('p_agua', 2), line('p_arroz', 1)]),
    makeSale('sale_1002', -5, '', 'Dinheiro', [line('p_sumol', 3), line('p_caneta', 2)]),
    makeSale('sale_1003', -4, 'c_lucas', 'Transferência', [line('p_sabao', 1), line('p_oleo', 2)], 3, 'u_gerente'),
    makeSale('sale_1004', -3, '', 'Multicaixa', [line('p_leite', 4), line('p_caderno', 3)]),
    makeSale('sale_1005', -2, 'c_ana', 'Multicaixa', [line('p_arroz', 2), line('p_agua', 4)]),
    makeSale('sale_1006', -1, '', 'Dinheiro', [line('p_sumol', 2), line('p_caneta', 5)]),
    makeSale('sale_1007', 0, 'c_lucas', 'Multicaixa', [line('p_leite', 2), line('p_sabao', 1)], 0, 'u_gerente')
  ];
  return {
    meta: { schemaVersion: STORAGE_VERSION, lastUpdated: new Date().toISOString() },
    settings: { company: 'Comercial Horizonte, Lda.', nif: '5412345678', phone: '+244 923 000 000', email: 'geral@comercialhorizonte.ao', address: 'Luanda, Angola', taxRate: 14, stockLimit: 5, defaultWarehouse: 'Armazém principal', activeLocationId: 'loc_main', themeId: 'esmeralda' },
    locations: [
      { id: 'loc_main', name: 'Loja principal', type: 'Loja', address: 'Luanda, Angola', active: true, colorId: 'oceano', fixedCosts: { Renda: 150000, Energia: 25000, Internet: 15000, Salários: 220000 } },
      { id: 'loc_central', name: 'Armazém central', type: 'Armazém', address: 'Luanda, Angola', active: true, colorId: 'por-do-sol' }
    ],
    products,
    customers: [
      { id: 'c_ana', type: 'Particular', name: 'Ana Manuel', phone: '+244 923 444 120', email: 'ana.manuel@email.ao', nif: '003456789LA012', address: 'Viana, Luanda', creditLimit: 0 },
      { id: 'c_lucas', type: 'Particular', name: 'Lucas Tavares', phone: '+244 922 181 222', email: '', nif: '002116789LA037', address: 'Maianga, Luanda', creditLimit: 0 },
      { id: 'c_maria', type: 'Empresa', name: 'Maria & Filhos, Lda.', phone: '+244 924 860 110', email: 'compras@mariafilhos.ao', nif: '5001123901', address: 'Cacuaco, Luanda', creditLimit: 250000 }
    ],
    suppliers: [
      { id: 's_kimb', name: 'Kimbos Distribuição', phone: '+244 222 300 210', email: 'vendas@kimbos.ao', nif: '5000872165', address: 'Luanda' },
      { id: 's_papel', name: 'Papelaria Nacional', phone: '+244 924 305 020', email: '', nif: '5400943831', address: 'Benfica, Luanda' },
      { id: 's_alim', name: 'Alimenta Angola', phone: '+244 222 724 450', email: 'comercial@alimenta.ao', nif: '5411982312', address: 'Viana, Luanda' }
    ],
    sales,
    receipts: [],
    supplierPayments: [],
    users: [
      { id: 'u_admin', name: 'Administrador', initials: 'AD', role: 'Administrador', active: true, pin: '0000', pinMustChange: true },
      { id: 'u_caixa', name: 'Vendedor principal', initials: 'VP', role: 'Vendedor', active: true, pin: '0000', pinMustChange: true },
      { id: 'u_gerente', name: 'Gestor da loja', initials: 'GL', role: 'Gerente', active: true, pin: '0000', pinMustChange: true }
    ],
    cashSessions: [],
    cashMovements: [],
    expenses: [],
    returns: [],
    transfers: [],
    auditLog: [],
    integrations: { thermalPrinter: false, barcodeScanner: true, multicaixa: false, accountingExport: false },
    purchases: [
      { id: 'buy_201', reference: 'CP-0201', date: dateISO(-7), supplierId: 's_kimb', payment: 'Transferência', total: 52000, items: [{ productId: 'p_agua', name: 'Água mineral 1,5L', quantity: 100, unitCost: 210 }, { productId: 'p_sumol', name: 'Sumo tropical 33cl', quantity: 100, unitCost: 310 }] },
      { id: 'buy_202', reference: 'CP-0202', date: dateISO(-3), supplierId: 's_alim', payment: 'Crédito', total: 132600, items: [{ productId: 'p_oleo', name: 'Óleo alimentar 1L', quantity: 60, unitCost: 1450 }, { productId: 'p_leite', name: 'Leite UHT 1L', quantity: 80, unitCost: 570 }] }
    ],
    movements: [
      { id: 'm_1', date: dateTime(-7, 10), productId: 'p_agua', productName: 'Água mineral 1,5L', type: 'Entrada', quantity: 100, note: 'Compra CP-0201' },
      { id: 'm_2', date: dateTime(-7, 10), productId: 'p_sumol', productName: 'Sumo tropical 33cl', type: 'Entrada', quantity: 100, note: 'Compra CP-0201' },
      { id: 'm_3', date: dateTime(-3, 11), productId: 'p_oleo', productName: 'Óleo alimentar 1L', type: 'Entrada', quantity: 60, note: 'Compra CP-0202' },
      { id: 'm_4', date: dateTime(-3, 11), productId: 'p_leite', productName: 'Leite UHT 1L', type: 'Entrada', quantity: 80, note: 'Compra CP-0202' }
    ]
  };
}

function emptyBusinessData(previous = {}) {
  const base = blankData(previous);
  base.settings = { ...base.settings, ...(previous.settings || {}) };
  base.locations = (Array.isArray(previous.locations) && previous.locations.length ? previous.locations : base.locations)
    .map(location => normaliseLocation({ ...location, fixedCosts: Object.fromEntries(FIXED_COST_LABELS.map(label => [label, 0])) }));
  base.settings.activeLocationId = base.locations.find(location => location.active)?.id || base.locations[0].id;
  base.users = (Array.isArray(previous.users) && previous.users.length ? previous.users : base.users)
    .filter(user => user.active).map(user => normaliseUser(user, base.settings.activeLocationId));
  if (!base.users.some(user => user.role === 'Administrador')) base.users.unshift(normaliseUser({ id: uid('usr'), name: 'Administrador', initials: 'AD', role: 'Administrador', active: true, pin: '0000', pinMustChange: true }, base.settings.activeLocationId));
  return normaliseData(base);
}

function customerSnapshot(customer) {
  if (!customer) return { id: '', type: 'Consumidor final', name: 'Consumidor final', nif: '', phone: '', email: '', address: '' };
  return { id: customer.id || '', type: customer.type === 'Empresa' ? 'Empresa' : 'Particular', name: customer.name || 'Cliente sem nome', nif: customer.nif || '', phone: customer.phone || '', email: customer.email || '', address: customer.address || '' };
}
function normaliseCustomer(customer = {}) {
  return { ...customer, type: customer.type === 'Empresa' ? 'Empresa' : 'Particular', name: String(customer.name || '').trim(), phone: String(customer.phone || '').trim(), email: String(customer.email || '').trim(), nif: String(customer.nif || '').trim().toUpperCase(), address: String(customer.address || '').trim(), creditLimit: Math.max(0, Number(customer.creditLimit || 0)) };
}
function normaliseRole(role) { return role === 'Caixa' ? 'Vendedor' : ['Administrador', 'Gerente', 'Vendedor'].includes(role) ? role : 'Vendedor'; }
function normaliseUser(user = {}, fallbackLocationId = 'loc_main') {
  const pin = String(user.pin || ''); const hasValidPin = /^\d{4,8}$/.test(pin);
  return { ...user, name: String(user.name || 'Utilizador').trim(), initials: String(user.initials || '').trim().toUpperCase().slice(0, 3), role: normaliseRole(user.role), viewPermissions: user.viewPermissions && typeof user.viewPermissions === 'object' ? { ...user.viewPermissions } : {}, locationId: String(user.locationId || fallbackLocationId), active: user.active !== false, pin: hasValidPin ? pin : '0000', pinMustChange: hasValidPin ? Boolean(user.pinMustChange) : true };
}
function normaliseLocation(location = {}) {
  const fixedCosts = Object.fromEntries(FIXED_COST_LABELS.map(label => [label, Math.max(0, Number(location.fixedCosts?.[label] || 0))]));
  return { ...location, id: String(location.id || uid('loc')), name: String(location.name || 'Local sem nome').trim(), type: location.type === 'Armazém' ? 'Armazém' : 'Loja', address: String(location.address || '').trim(), active: location.active !== false, colorId: brandTheme(location.colorId).id, dailyTarget: Math.max(0, Number(location.dailyTarget || 0)), monthlyTarget: Math.max(0, Number(location.monthlyTarget || 0)), fixedCosts };
}
function normaliseStockMap(value, fallbackLocationId, legacyStock = 0) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : { [fallbackLocationId]: legacyStock };
  const mapped = {};
  Object.entries(source).forEach(([locationId, stock]) => { mapped[String(locationId)] = Math.max(0, Number(stock || 0)); });
  if (!Object.keys(mapped).length) mapped[fallbackLocationId] = 0;
  return mapped;
}
function totalStock(product) { return sum(Object.values(product.stockByLocation || {}), value => value); }
function normaliseProduct(product = {}, fallbackLocationId = 'loc_main') {
  const stockByLocation = normaliseStockMap(product.stockByLocation, fallbackLocationId, product.stock);
  return { ...product, stockByLocation, stock: totalStock({ stockByLocation }), unit: product.unit || 'un.', barcode: String(product.barcode || '').trim(), warehouse: product.warehouse || 'Armazém principal', expiryDate: product.expiryDate || '', lot: String(product.lot || '').trim(), fiscalTreatment: product.fiscalTreatment || 'UNCLASSIFIED_INTERNAL', fiscalRate: product.fiscalRate === '' || product.fiscalRate === undefined || product.fiscalRate === null ? '' : Number(product.fiscalRate), fiscalReason: String(product.fiscalReason || '').trim() };
}
function normaliseLedgerSettlement(totalValue, paidValue, balanceValue, isCredit) {
  const total = roundMoney(Math.max(0, Number(totalValue) || 0));
  const hasPaid = paidValue !== undefined && paidValue !== null;
  const hasBalance = balanceValue !== undefined && balanceValue !== null;
  const rawBalance = hasBalance ? Number(balanceValue) : (isCredit ? total : 0);
  const rawPaid = hasPaid ? Number(paidValue) : (total - (Number.isFinite(rawBalance) ? rawBalance : 0));
  const settlementIntegrityWarning = (hasPaid && (!Number.isFinite(rawPaid) || rawPaid < 0 || rawPaid > total + 0.01)) || (hasBalance && (!Number.isFinite(rawBalance) || rawBalance < 0 || rawBalance > total + 0.01)) || (hasPaid && hasBalance && Math.abs(roundMoney(rawPaid + rawBalance) - total) > 0.01);
  let balanceDue = roundMoney(Math.min(total, Math.max(0, Number.isFinite(rawBalance) ? rawBalance : 0)));
  let amountPaid = roundMoney(Math.min(total, Math.max(0, Number.isFinite(rawPaid) ? rawPaid : total - balanceDue)));
  // Corrige a exibição de dados antigos, mas mantém um alerta para revisão manual.
  if (Math.abs(roundMoney(amountPaid + balanceDue) - total) > 0.01) balanceDue = roundMoney(Math.max(0, total - amountPaid));
  return { total, amountPaid, balanceDue, settlementIntegrityWarning, paymentStatus: balanceDue <= 0 ? 'Pago' : (amountPaid > 0 ? 'Parcial' : 'Pendente') };
}
function normaliseSale(sale = {}, customers = []) {
  const credit = sale.payment === 'Crédito' || sale.paymentStatus === 'Pendente' || Number(sale.balanceDue || 0) > 0;
  const settlement = normaliseLedgerSettlement(sale.total, sale.amountPaid, sale.balanceDue, credit);
  const customer = sale.customer?.name ? sale.customer : customerSnapshot(customers.find(item => item.id === sale.customerId));
  return { ...sale, ...settlement, locationId: sale.locationId || '', operatorId: sale.operatorId || '', operatorName: String(sale.operatorName || '').trim(), customer, documentType: sale.documentType || (credit ? 'Factura' : 'Factura-Recibo'), dueDate: sale.dueDate || '' };
}
function normalisePurchase(purchase = {}) {
  const credit = purchase.payment === 'Crédito' || purchase.paymentStatus === 'Pendente' || Number(purchase.balanceDue || 0) > 0;
  return { ...purchase, ...normaliseLedgerSettlement(purchase.total, purchase.amountPaid, purchase.balanceDue, credit) };
}

function blankData(previous = {}) {
  const settings = { company: '', nif: '', phone: '', email: '', address: '', taxRate: 0, stockLimit: 5, defaultWarehouse: 'Armazém principal', activeLocationId: 'loc_main', themeId: 'esmeralda', ...(previous.settings || {}) };
  const zeroCosts = Object.fromEntries(FIXED_COST_LABELS.map(label => [label, 0]));
  const locations = Array.isArray(previous.locations) && previous.locations.length
    ? previous.locations.map(location => ({ ...location, fixedCosts: { ...zeroCosts } }))
    : [{ id: 'loc_main', name: 'Loja principal', type: 'Loja', address: '', active: true, colorId: 'esmeralda', fixedCosts: { ...zeroCosts } }];
  const admin = (Array.isArray(previous.users) ? previous.users : []).find(user => user.role === 'Administrador' && user.active);
  const users = admin ? [{ ...admin, locationId: locations[0].id, pinMustChange: true }] : [{ id: 'u_admin', name: 'Administrador', initials: 'AD', role: 'Administrador', active: true, pin: '0000', pinMustChange: true, locationId: locations[0].id }];
  return { meta: { schemaVersion: STORAGE_VERSION, lastUpdated: new Date().toISOString() }, settings, locations, products: [], customers: [], suppliers: [], sales: [], purchases: [], movements: [], receipts: [], supplierPayments: [], expensePayments: [], transfers: [], cashSessions: [], cashMovements: [], cashMovementRequests: [], expenses: [], journalEntries: [], returns: [], auditLog: [], users, integrations: { thermalPrinter: false, barcodeScanner: true, multicaixa: false, accountingExport: false } };
}

function normaliseData(candidate) {
  const base = blankData();
  const source = candidate && typeof candidate === 'object' && candidate.settings ? candidate : base;
  const collections = ['suppliers', 'movements', 'receipts', 'supplierPayments', 'expensePayments', 'cashSessions', 'cashMovements', 'cashMovementRequests', 'returns', 'auditLog', 'transfers', 'expenses', 'journalEntries', 'restaurantTables', 'restaurantOrders'];
  const restored = { ...base, ...source, settings: { ...base.settings, ...source.settings }, meta: { ...base.meta, ...source.meta, schemaVersion: STORAGE_VERSION } };
  collections.forEach(key => { restored[key] = Array.isArray(source[key]) ? source[key] : []; });
  restored.locations = (Array.isArray(source.locations) && source.locations.length ? source.locations : base.locations).map(normaliseLocation);
  const fallbackLocationId = restored.locations.find(location => location.id === restored.settings.activeLocationId && location.active)?.id || restored.locations.find(location => location.active)?.id || restored.locations[0].id;
  restored.settings.activeLocationId = fallbackLocationId;
  restored.settings.themeId = brandTheme(restored.settings.themeId).id;
  restored.users = (Array.isArray(source.users) ? source.users : base.users).map(user => normaliseUser(user, fallbackLocationId)).map(user => ({ ...user, locationId: restored.locations.some(location => location.id === user.locationId && location.active) ? user.locationId : fallbackLocationId }));
  restored.products = (Array.isArray(source.products) ? source.products : []).map(product => normaliseProduct(product, fallbackLocationId));
  restored.products.forEach(product => {
    product.stockByLocation = Object.fromEntries(Object.entries(product.stockByLocation || {}).filter(([locationId]) => restored.locations.some(location => location.id === locationId)));
    if (!Object.keys(product.stockByLocation).length) product.stockByLocation[fallbackLocationId] = 0;
    syncProductStock(product);
  });
  restored.purchases = (Array.isArray(source.purchases) ? source.purchases : []).map(purchase => ({ ...normalisePurchase(purchase), locationId: purchase.locationId || fallbackLocationId }));
  restored.customers = (Array.isArray(source.customers) ? source.customers : []).map(normaliseCustomer);
  restored.sales = (Array.isArray(source.sales) ? source.sales : []).map(sale => ({ ...normaliseSale(sale, restored.customers), locationId: sale.locationId || fallbackLocationId }));
  restored.movements = restored.movements.map(movement => ({ ...movement, locationId: movement.locationId || fallbackLocationId }));
  restored.cashSessions = restored.cashSessions.map(session => ({ ...session, locationId: session.locationId || fallbackLocationId }));
  restored.transfers = restored.transfers.map(transfer => ({ ...transfer, fromLocationId: transfer.fromLocationId || fallbackLocationId, toLocationId: transfer.toLocationId || fallbackLocationId, items: Array.isArray(transfer.items) ? transfer.items : [] }));
  restored.integrations = { ...base.integrations, ...(source.integrations || {}) };
  restored.settings.enabledModules = Array.isArray(source.settings?.enabledModules) ? [...new Set(source.settings.enabledModules.filter(key => ['commerce', 'restaurant', 'accounting'].includes(key)))] : ['commerce'];
  restored.restaurantTables = restored.restaurantTables.map(table => ({ ...table, id: String(table.id || uid('table')), name: String(table.name || 'Mesa').trim(), locationId: String(table.locationId || fallbackLocationId), capacity: Math.max(1, Number(table.capacity || 4)), status: ['Livre', 'Ocupada', 'Reservada'].includes(table.status) ? table.status : 'Livre', active: table.active !== false }));
  restored.restaurantOrders = restored.restaurantOrders.map(order => ({ ...order, id: String(order.id || uid('order')), tableId: String(order.tableId || ''), locationId: String(order.locationId || fallbackLocationId), status: ['Recebido', 'Em preparação', 'Pronto', 'Servido', 'Cancelado'].includes(order.status) ? order.status : 'Recebido', items: Array.isArray(order.items) ? order.items : [] }));
  backfillFinancialJournal(restored);
  return restored;
}
function financialEntryExists(key) { return (data.journalEntries || []).some(entry => entry.idempotencyKey === key); }
function postFinancialEntry(entry) {
  data.journalEntries ||= [];
  const key = String(entry.idempotencyKey || `${entry.sourceType}:${entry.sourceId}:${entry.eventType}`);
  if (financialEntryExists(key)) return false;
  const amount = roundMoney(Math.abs(Number(entry.amount || 0)));
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Valor inválido para o diário financeiro.');
  data.journalEntries.push({ id: uid('journal'), idempotencyKey: key, date: entry.date || new Date().toISOString(), locationId: entry.locationId || currentLocationId(), sourceType: entry.sourceType || 'manual', sourceId: entry.sourceId || '', eventType: entry.eventType || 'Movimento', category: entry.category || 'Operação', description: entry.description || '', amount, cashImpact: roundMoney(Number(entry.cashImpact || 0)), profitImpact: roundMoney(Number(entry.profitImpact || 0)), inventoryImpact: roundMoney(Number(entry.inventoryImpact || 0)), liabilityImpact: roundMoney(Number(entry.liabilityImpact || 0)), receivableImpact: roundMoney(Number(entry.receivableImpact || 0)), payment: entry.payment || '', userId: entry.userId || currentUser?.id || '', note: entry.note || '' });
  return true;
}
function backfillFinancialJournal(target) {
  const rows = Array.isArray(target.journalEntries) ? target.journalEntries : [];
  const has = key => rows.some(entry => entry.idempotencyKey === key);
  const add = entry => { if (!has(entry.idempotencyKey)) rows.push({ id: uid('journal'), date: entry.date || '', locationId: entry.locationId || '', sourceType: entry.sourceType, sourceId: entry.sourceId, eventType: entry.eventType, category: entry.category, description: entry.description, amount: roundMoney(Math.abs(Number(entry.amount || 0))), cashImpact: roundMoney(Number(entry.cashImpact || 0)), profitImpact: roundMoney(Number(entry.profitImpact || 0)), inventoryImpact: roundMoney(Number(entry.inventoryImpact || 0)), liabilityImpact: roundMoney(Number(entry.liabilityImpact || 0)), receivableImpact: roundMoney(Number(entry.receivableImpact || 0)), payment: entry.payment || '', userId: entry.userId || '', note: entry.note || '', idempotencyKey: entry.idempotencyKey }); };
  (target.sales || []).forEach(sale => { const cost = (sale.items || []).reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0); const laterReceipts = (target.receipts || []).filter(item => item.saleId === sale.id).reduce((sum, item) => sum + Number(item.amount || 0), 0); const initialPaid = Math.max(0, Number(sale.amountPaid ?? (sale.payment === 'Crédito' ? 0 : sale.total)) - laterReceipts); add({ idempotencyKey: `sale:${sale.id}:created`, date: sale.date, locationId: sale.locationId, sourceType: 'sale', sourceId: sale.id, eventType: 'Venda', category: 'Receita de vendas', description: `Venda ${sale.reference || ''}`.trim(), amount: sale.total, cashImpact: initialPaid, profitImpact: Number(sale.total || 0) - Number(sale.tax || 0) - cost, receivableImpact: Math.max(0, Number(sale.total || 0) - initialPaid), payment: sale.payment, userId: sale.operatorId }); });
  (target.receipts || []).forEach(receipt => { const sale = target.sales?.find(item => item.id === receipt.saleId); add({ idempotencyKey: `receipt:${receipt.id}`, date: receipt.date, locationId: sale?.locationId, sourceType: 'receipt', sourceId: receipt.id, eventType: 'Recebimento de cliente', category: 'Liquidação de cliente', description: receipt.note || `Recebimento ${sale?.reference || ''}`, amount: receipt.amount, cashImpact: Number(receipt.amount || 0), receivableImpact: -Number(receipt.amount || 0), payment: receipt.payment, userId: receipt.userId }); });
  (target.expenses || []).forEach(expense => { const laterPayments = (target.expensePayments || []).filter(item => item.expenseId === expense.id).reduce((sum, item) => sum + Number(item.amount || 0), 0); const paid = Math.max(0, Number(expense.amountPaid ?? (expense.payment === 'Crédito' ? 0 : expense.amount)) - laterPayments); add({ idempotencyKey: `expense:${expense.id}:created`, date: expense.date, locationId: expense.locationId, sourceType: 'expense', sourceId: expense.id, eventType: 'Despesa', category: expense.category || (expense.costType === 'Fixo' ? 'Despesa fixa' : 'Despesa variável'), description: expense.description, amount: expense.amount, cashImpact: -paid, profitImpact: -Number(expense.amount || 0), liabilityImpact: Math.max(0, Number(expense.amount || 0) - paid), payment: expense.payment, userId: expense.userId }); });
  (target.purchases || []).forEach(purchase => { const paid = Number(purchase.amountPaid ?? (purchase.payment === 'Crédito' ? 0 : purchase.total)); add({ idempotencyKey: `purchase:${purchase.id}:created`, date: purchase.date, locationId: purchase.locationId, sourceType: 'purchase', sourceId: purchase.id, eventType: 'Compra de mercadoria', category: 'Estoque', description: `Compra ${purchase.reference || ''}`.trim(), amount: purchase.total, cashImpact: 0, inventoryImpact: Number(purchase.total || 0), liabilityImpact: Number(purchase.total || 0), payment: purchase.payment, userId: purchase.userId }); });
  (target.supplierPayments || []).forEach(payment => { add({ idempotencyKey: `supplier-payment:${payment.id}`, date: payment.date, locationId: target.purchases?.find(item => item.id === payment.purchaseId)?.locationId, sourceType: 'supplier-payment', sourceId: payment.id, eventType: 'Pagamento de dívida', category: 'Liquidação de fornecedor', description: payment.note || 'Pagamento a fornecedor', amount: payment.amount, cashImpact: -Number(payment.amount || 0), liabilityImpact: -Number(payment.amount || 0), payment: payment.payment, userId: payment.userId }); });
  (target.expensePayments || []).forEach(payment => { const expense = target.expenses?.find(item => item.id === payment.expenseId); add({ idempotencyKey: `expense-payment:${payment.id}`, date: payment.date, locationId: expense?.locationId, sourceType: 'expense-payment', sourceId: payment.id, eventType: 'Liquidação de despesa', category: 'Pagamento de despesa', description: payment.note || `Liquidação: ${expense?.description || 'despesa'}`, amount: payment.amount, cashImpact: -Number(payment.amount || 0), liabilityImpact: -Number(payment.amount || 0), payment: payment.payment, userId: payment.userId }); });
  (target.cashMovements || []).forEach(movement => { const note = String(movement.note || ''); const linkedOperation = /^(Compra |Despesa:|Liquidação de despesa:|Pagamento fornecedor |Reembolso )/i.test(note); if (linkedOperation) return; const requestKey = movement.requestId ? `cash-request:${movement.requestId}:approved` : `cash-movement:${movement.id}`; add({ idempotencyKey: requestKey, date: movement.date, locationId: target.cashSessions?.find(item => item.id === movement.sessionId)?.locationId, sourceType: movement.requestId ? 'cash-request' : 'cash-movement', sourceId: movement.requestId || movement.id, eventType: movement.type === 'Saída' ? 'Saída manual' : 'Entrada manual', category: 'Movimento de caixa legado', description: note, amount: movement.amount, cashImpact: movement.type === 'Saída' ? -Number(movement.amount || 0) : Number(movement.amount || 0), userId: movement.userId }); });
  target.journalEntries = rows;
}
function loadData() { try { return normaliseData(JSON.parse(localStorage.getItem(STORE))); } catch { return normaliseData(null); } }
let data = loadData();
function getSessionUser() { const id = localStorage.getItem(USER_SESSION); return id ? (data.users.find(user => user.id === id && user.active) || null) : null; }
let currentUser = getSessionUser();
let sessionLocked = true;
let pinChangeRequired = false;
function saveData(options = {}) {
  data.meta = { ...data.meta, schemaVersion: STORAGE_VERSION, lastUpdated: new Date().toISOString() };
  try { localStorage.setItem(STORE, JSON.stringify(data)); if (!options.skipCloudSync) window.VendaMaisCloud?.scheduleSave(data); return true; }
  catch { notify('Não foi possível guardar os dados neste navegador.'); return false; }
}
function notify(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('show'), 2800); }
function productById(id) { return data.products.find(item => item.id === id); }
function customerById(id) { return data.customers.find(item => item.id === id); }
function supplierById(id) { return data.suppliers.find(item => item.id === id); }
function userById(id) { return data.users.find(item => item.id === id); }
function locationById(id) { return data.locations.find(location => location.id === id); }
function activeLocations() { return data.locations.filter(location => location.active); }
function currentLocationId() {
  const assigned = currentUser?.locationId;
  if (isSeller() && locationById(assigned)?.active) return assigned;
  return locationById(data.settings.activeLocationId)?.active ? data.settings.activeLocationId : (activeLocations()[0]?.id || data.locations[0]?.id || '');
}
function currentLocation() { return locationById(currentLocationId()); }
function locationName(id) { return locationById(id)?.name || 'Local não definido'; }
function stockAt(product, locationId = currentLocationId()) { return Math.max(0, Number(product?.stockByLocation?.[locationId] || 0)); }
function syncProductStock(product) { product.stock = totalStock(product); return product.stock; }
function setStockAt(product, locationId, value) {
  if (!product || !locationId) return false;
  product.stockByLocation ||= {};
  product.stockByLocation[locationId] = Math.max(0, Number(value || 0));
  syncProductStock(product);
  return true;
}
function changeStock(product, locationId, delta) {
  const next = stockAt(product, locationId) + Number(delta || 0);
  if (next < 0) return false;
  return setStockAt(product, locationId, next);
}
function currentCashSession() { return data.cashSessions.find(session => session.status === 'Aberto' && session.userId === currentUser?.id && session.locationId === currentLocationId()); }
function currentCashForAll(locationId = currentLocationId()) { return data.cashSessions.find(session => session.status === 'Aberto' && session.locationId === locationId); }
const MODULE_CATALOG = Object.freeze([
  { id: 'commerce', name: 'Comércio e vendas', description: 'Ponto de venda, produtos, stock, compras, clientes, caixa e relatórios.', icon: '🛒', status: 'active', entryView: 'dashboard' },
  { id: 'restaurant', name: 'Restaurante e bares', description: 'Mesas, comandas, pedidos e acompanhamento de cozinha. Fecho financeiro integrado em fase seguinte.', icon: '🍽️', status: 'active', entryView: 'restaurant' },
  { id: 'hotel', name: 'Hotelaria', description: 'Quartos, hóspedes, reservas, check-in e check-out.', icon: '🏨', status: 'planned' },
  { id: 'accounting', name: 'Contabilidade', description: 'Partidas dobradas, plano de contas, diário geral, razão, balancete e demonstrações financeiras integradas.', icon: '📊', status: 'active', entryView: 'accounting' },
  { id: 'hr', name: 'Recursos humanos', description: 'Funcionários, departamentos, horários, férias e salários.', icon: '👥', status: 'planned' },
  { id: 'school', name: 'Gestão escolar', description: 'Alunos, turmas, matrículas, avaliações e propinas.', icon: '🎓', status: 'planned' },
  { id: 'health', name: 'Gestão hospitalar', description: 'Pacientes, consultas, agenda e gestão clínica.', icon: '🏥', status: 'planned' }
]);
const ROLE_VIEWS = {
  Administrador: ['modules', 'admin', 'dashboard', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'cash', 'documents', 'reports', 'accounting', 'settings', 'restaurant'],
  Gerente: ['modules', 'dashboard', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'cash', 'documents', 'reports', 'accounting', 'restaurant'],
  Vendedor: ['modules', 'dashboard', 'pos', 'cash', 'documents']
};
function canManage() { return currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente'; }
function isAdministrator() { return currentUser?.role === 'Administrador'; }
function isSeller() { return currentUser?.role === 'Vendedor'; }
function audit(action, detail) { data.auditLog.unshift({ id: uid('audit'), date: new Date().toISOString(), userId: currentUser?.id || '', userName: currentUser?.name || 'Sistema', action, detail }); data.auditLog = data.auditLog.slice(0, 500); }
function nextReference(prefix, items) { const expression = new RegExp(`^${prefix}-(\\d+)$`); const highest = items.reduce((max, item) => { const match = String(item.reference || '').match(expression); return match ? Math.max(max, Number(match[1])) : max; }, 0); return `${prefix}-${String(highest + 1).padStart(4, '0')}`; }
function saleCustomer(sale) { return sale.customer?.name ? sale.customer : customerSnapshot(customerById(sale.customerId)); }
function saleCustomerName(sale) { return saleCustomer(sale).name || 'Consumidor final'; }
function saleBalanceDue(sale) { return Math.max(0, Number(sale.balanceDue || 0)); }
function categoryList() { return [...new Set(data.products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function saleCost(sale) { return roundMoney((sale.items || []).reduce((total, item) => total + Number(item.cost || 0) * Number(item.quantity || 0), 0)); }
function sum(array, fn) { return array.reduce((total, item) => total + Number(fn(item) || 0), 0); }
function dayStart(value) { return value ? new Date(`${value}T00:00:00`).getTime() : -Infinity; }
function dayEnd(value) { return value ? new Date(`${value}T23:59:59`).getTime() : Infinity; }
function salesBetween(start, end) { return data.sales.filter(sale => { const time = new Date(sale.date).getTime(); return sale.status !== 'Devolvida' && time >= dayStart(start) && time <= dayEnd(end); }); }
function monthStart() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`; }

function setTitle(view) {
  const titles = { modules: 'Módulos ERP', accounting: 'Contabilidade', admin: 'Painel administrativo', restaurant: 'Restaurante e bares', dashboard: isAdministrator() ? 'Visão geral' : 'Área operacional', pos: 'Nova venda', products: 'Produtos & stock', inventory: 'Inventário', customers: 'Clientes', suppliers: 'Fornecedores', purchases: 'Compras', cash: 'Caixa & turnos', documents: 'Documentos comerciais', reports: 'Balanço & relatórios', settings: 'Definições' };
  $('#viewTitle').textContent = titles[view];
}
function canAccessView(view) {
  if (!currentUser || !ROLE_VIEWS[currentUser.role]?.includes(view)) return false;
  if (view === 'admin' || view === 'settings') return isAdministrator();
  if (view === 'restaurant' && !(data.settings.enabledModules || ['commerce']).includes('restaurant')) return false;
  if (view === 'accounting' && (!(data.settings.enabledModules || ['commerce']).includes('accounting') || isSeller())) return false;
  if (currentUser.viewPermissions && Object.hasOwn(currentUser.viewPermissions, view)) return currentUser.viewPermissions[view] === true;
  return true;
}
function applyRoleInterface() {
  const shell = $('.app-shell');
  const workspace = $('#workspaceContext');
  applyLocationAccent();
  const workspaceConfig = {
    Administrador: { key: 'admin', title: 'Área administrativa', description: 'Gestão da empresa, utilizadores, módulos, lojas e controlo financeiro.' },
    Gerente: { key: 'manager', title: 'Área de gestão', description: 'Operação comercial, stock, caixa e relatórios. As definições ficam reservadas ao administrador.' },
    Vendedor: { key: 'seller', title: 'Área do vendedor', description: 'Vendas, caixa próprio e documentos pessoais.' }
  };
  const activeWorkspace = workspaceConfig[currentUser?.role] || workspaceConfig.Vendedor;
  if (shell) shell.dataset.workspace = activeWorkspace.key;
  if (workspace) workspace.innerHTML = `<strong>${activeWorkspace.title}</strong><span>${activeWorkspace.description}</span>`;
  $$('.nav-link').forEach(item => { item.hidden = !canAccessView(item.dataset.view); });
  const dashboardLink = $('.nav-link[data-view="dashboard"]');
  if (dashboardLink) dashboardLink.innerHTML = `<i>▦</i> ${isAdministrator() ? 'Visão geral' : 'Área operacional'}`;
  const navigationGroups = {
    operations: ['dashboard', 'pos', 'cash', 'documents', 'restaurant'],
    management: ['products', 'inventory', 'customers', 'suppliers', 'purchases'],
    analysis: ['reports', 'accounting'],
    administration: ['admin', 'settings']
  };
  for (const [group, views] of Object.entries(navigationGroups)) {
    const label = $(`.nav-label[data-nav-group="${group}"]`);
    if (label) label.hidden = !views.some(canAccessView);
  }
  const role = $('#sessionRole'); if (role && currentUser) role.textContent = currentUser.role;
  const locationSelect = $('#activeLocationSelect');
  if (locationSelect) {
    const locations = activeLocations();
    locationSelect.innerHTML = locations.map(location => `<option value="${location.id}">${escapeHtml(location.name)} · ${escapeHtml(location.type)}</option>`).join('');
    locationSelect.value = currentLocationId();
    locationSelect.disabled = isSeller();
    locationSelect.title = isSeller() ? `O vendedor trabalha no local atribuído: ${locationName(currentLocationId())}.` : 'Seleccione o local de operação.';
  }
  const quickSale = $('#quickSale'); if (quickSale) quickSale.hidden = !canAccessView('pos'); const discountInbox = $('#discountInboxButton'); if (discountInbox) discountInbox.hidden = !isAdministrator();
  const cashMovement = $('#cashMovement'); if (cashMovement) cashMovement.hidden = !canManage();
  const exportDocumentsButton = $('#exportDocuments'); if (exportDocumentsButton) exportDocumentsButton.hidden = !canManage();
}
function showView(view) {
  if (sessionLocked) return accountModal();
  if (!canAccessView(view)) return notify('O seu perfil não tem permissão para abrir esta área.');
  $$('.view').forEach(item => item.classList.remove('active'));
  $(`#${view}View`).classList.add('active');
  $$('.nav-link').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  setTitle(view);
  $('#sidebar').classList.remove('open');
  renderView(view);
}
function renderView(view) {
  if (view === 'modules') renderModuleCatalog();
  if (view === 'admin') renderAdminWorkspace();
  if (view === 'restaurant') renderRestaurant();
  if (view === 'dashboard') renderDashboard();
  if (view === 'pos') renderPos();
  if (view === 'products') renderProducts();
  if (view === 'inventory') renderInventory();
  if (view === 'customers') renderCustomers();
  if (view === 'suppliers') renderSuppliers();
  if (view === 'purchases') renderPurchases();
  if (view === 'cash') renderCash();
  if (view === 'documents') renderDocuments();
  if (view === 'reports') renderReports();
  if (view === 'accounting') renderAccounting();
  if (view === 'settings') renderSettings();
}
function renderAll() { applyBrandTheme(); renderView($('.view.active').id.replace('View', '')); }

function renderAdminWorkspace() {
  if (!isAdministrator()) return notify('Apenas o administrador pode abrir a central administrativa.');
  const host = $('#adminMetrics');
  if (!host) return;
  const activeUsers = data.users.filter(user => user.active).length;
  const activeLocationsCount = activeLocations().length;
  const monthSales = salesBetween(monthStart(), dateISO());
  const monthRevenue = sum(monthSales, sale => sale.total);
  host.innerHTML = [
    ['Utilizadores activos', activeUsers, 'Contas com acesso activo', '♙'],
    ['Locais activos', activeLocationsCount, 'Lojas e armazéns', '⌂'],
    ['Vendas neste mês', monthSales.length, 'Documentos concluídos', '▣'],
    ['Faturação do mês', money(monthRevenue), 'Total com IVA incluído', '↗']
  ].map(([label, value, hint, icon]) => `<article class="metric-card"><div class="metric-top"><span>${escapeHtml(label)}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint">${escapeHtml(hint)}</div></article>`).join('');
}

function renderModuleCatalog() {
  const host = $('#moduleCatalog');
  if (!host) return;
  host.innerHTML = MODULE_CATALOG.map(module => {
    const available = module.status === 'active';
    const status = available ? 'Disponível' : 'Planeado';
    const enabled = (data.settings.enabledModules || ['commerce']).includes(module.id);
    const action = available && enabled
      ? `<button class="btn primary" type="button" data-module-open="${module.id}">Abrir módulo</button>`
      : available ? '<span class="module-status planned">Desactivado nesta empresa</span>' : '<button class="btn secondary" type="button" disabled aria-disabled="true">Em desenvolvimento</button>';
    const toggle = isAdministrator() && available ? `<button class="text-btn" type="button" data-module-toggle="${module.id}">${enabled ? 'Desactivar' : 'Activar'} nesta empresa</button>` : '';
    return `<article class="module-card ${available ? 'is-active' : 'is-planned'}"><div class="module-card-icon" aria-hidden="true">${module.icon}</div><div class="module-card-copy"><span class="module-status ${available ? 'available' : 'planned'}">${available ? (enabled ? 'Disponível nesta empresa' : 'Implementado · desactivado') : status}</span><h3>${escapeHtml(module.name)}</h3><p>${escapeHtml(module.description)}</p></div><div class="module-card-action">${action}${toggle}</div></article>`;
  }).join('');
}
function openModule(moduleId) {
  const module = MODULE_CATALOG.find(item => item.id === moduleId);
  if (!module || module.status !== 'active') return notify('Este módulo ainda não está disponível.');
  if (!(data.settings.enabledModules || ['commerce']).includes(module.id)) return notify('Este módulo está desactivado nesta empresa.');
  if (module.id === 'commerce' || module.id === 'restaurant' || module.id === 'accounting') return showView(module.entryView);
}

function toggleCompanyModule(moduleId) {
  if (!isAdministrator()) return notify('Apenas o administrador pode activar módulos da empresa.');
  const module = MODULE_CATALOG.find(item => item.id === moduleId && item.status === 'active');
  if (!module) return notify('Este módulo ainda não está disponível para activação.');
  data.settings.enabledModules ||= ['commerce'];
  const enabled = data.settings.enabledModules.includes(moduleId);
  data.settings.enabledModules = enabled ? data.settings.enabledModules.filter(key => key !== moduleId) : [...data.settings.enabledModules, moduleId];
  audit(enabled ? 'Módulo desactivado' : 'Módulo activado', module.name);
  saveData(); renderModuleCatalog(); notify(`${module.name}: ${enabled ? 'desactivado' : 'activado'}.`);
}
let restaurantDraftItems = [];
function renderRestaurant() {
  if (!canAccessView('restaurant') || !(data.settings.enabledModules || []).includes('restaurant')) return notify('O módulo Restaurante está indisponível para esta empresa ou perfil.');
  const locationId = currentLocationId();
  const tables = data.restaurantTables.filter(table => table.active && table.locationId === locationId);
  const orders = data.restaurantOrders.filter(order => order.locationId === locationId && !['Servido', 'Cancelado'].includes(order.status));
  const host = $('#restaurantTables'); const orderHost = $('#restaurantOrders');
  if (!host || !orderHost) return;
  host.innerHTML = tables.length ? tables.map(table => {
    const order = orders.find(item => item.tableId === table.id);
    const status = order?.status || table.status;
    return `<article class="restaurant-table-card status-${status.toLowerCase().replaceAll(' ', '-')}" data-table-card="${escapeHtml(table.id)}"><div class="restaurant-table-top"><span class="restaurant-table-icon">▦</span><span class="module-status ${status === 'Livre' ? 'available' : 'planned'}">${escapeHtml(status)}</span></div><h3>${escapeHtml(table.name)}</h3><p>${table.capacity} lugares · ${escapeHtml(locationName(table.locationId))}</p><div class="inline-actions"><button class="btn primary" type="button" data-restaurant-order="${escapeHtml(table.id)}">${order ? 'Abrir comanda' : 'Nova comanda'}</button>${!order ? `<button class="btn secondary" type="button" data-table-status="${escapeHtml(table.id)}">Reservar</button>` : ''}</div></article>`;
  }).join('') : '<div class="empty-state">Ainda não existem mesas neste local. Crie a primeira mesa para começar.</div>';
  orderHost.innerHTML = orders.length ? orders.map(order => `<article class="restaurant-order-row"><div><b>${escapeHtml(tables.find(table => table.id === order.tableId)?.name || 'Mesa removida')}</b><span>${escapeHtml(order.reference || order.id)} · ${order.items.length} linha(s) · ${escapeHtml(order.status)}</span></div><div class="inline-actions">${order.status === 'Recebido' ? `<button class="action-btn" data-order-state="Em preparação" data-order-id="${escapeHtml(order.id)}">Enviar cozinha</button>` : ''}${order.status === 'Em preparação' ? `<button class="action-btn" data-order-state="Pronto" data-order-id="${escapeHtml(order.id)}">Marcar pronto</button>` : ''}${order.status === 'Pronto' ? `<button class="action-btn" data-order-state="Servido" data-order-id="${escapeHtml(order.id)}">Servido</button>` : ''}</div></article>`).join('') : '<div class="empty-state">Não existem comandas activas.</div>';
  const createButton = $('#newRestaurantTable'); if (createButton) createButton.hidden = !canManage();
}
function restaurantTableModal() {
  if (!canManage()) return notify('Apenas gerente ou administrador pode gerir mesas.');
  openModal(`${modalHeader('Nova mesa', 'Crie uma mesa para o local de operação actual.')}<form id="restaurantTableForm"><div class="modal-form"><label>Nome / número<input name="name" required maxlength="40" placeholder="Ex.: Mesa 01" /></label><label>Capacidade<input name="capacity" type="number" min="1" max="50" value="4" required /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Criar mesa</button></div></form>`);
  $('#restaurantTableForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const name = values.name.trim(); if (!name) return notify('Indique o nome da mesa.'); if (data.restaurantTables.some(table => table.active && table.locationId === currentLocationId() && table.name.toLowerCase() === name.toLowerCase())) return notify('Já existe uma mesa com esse nome neste local.'); data.restaurantTables.push({ id: uid('table'), name, capacity: Math.max(1, Number(values.capacity || 4)), locationId: currentLocationId(), status: 'Livre', active: true, createdAt: new Date().toISOString() }); audit('Mesa criada', name); saveData(); closeModal(); renderRestaurant(); });
}
function restaurantOrderModal(tableId) {
  const table = data.restaurantTables.find(item => item.id === tableId && item.active && item.locationId === currentLocationId());
  if (!table) return notify('Mesa não encontrada neste local.');
  if (!canAccessView('restaurant')) return notify('Sem autorização para abrir comandas.');
  let order = data.restaurantOrders.find(item => item.tableId === tableId && !['Servido', 'Cancelado'].includes(item.status));
  if (order) {
    openModal(`${modalHeader(`Comanda · ${table.name}`, `Estado: ${order.status}. A comanda fica guardada neste equipamento e sincroniza com o estado da empresa quando a ligação online está activa.`)}<div class="restaurant-order-lines">${order.items.map(line => `<div class="restaurant-order-line"><b>${escapeHtml(line.name)}</b><span>${number(line.quantity)} × ${money(line.price)}</span></div>`).join('')}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button>${order.status === 'Recebido' ? `<button class="btn primary" type="button" data-order-state="Em preparação" data-order-id="${escapeHtml(order.id)}">Enviar para cozinha</button>` : ''}</div>`);
    return;
  }
  restaurantDraftItems = [];
  const productOptions = data.products.filter(product => stockAt(product) > 0).map(product => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)} · ${money(product.price)}</option>`).join('');
  openModal(`${modalHeader(`Nova comanda · ${table.name}`, 'Registe os artigos pedidos. O stock e a faturação não são movimentados nesta fase; o fecho integrado será activado após validação transaccional.') }<form id="restaurantOrderForm"><div class="modal-form"><label class="full">Produto<select id="restaurantProduct" required>${productOptions}</select></label><label>Quantidade<input id="restaurantQuantity" type="number" min="1" step="1" value="1" required /></label><div class="form-action"><button class="btn secondary" id="addRestaurantItem" type="button">Adicionar artigo</button></div></div><div id="restaurantDraftList" class="restaurant-order-lines"><div class="empty-state">Adicione os artigos da comanda.</div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar comanda</button></div></form>`);
  const drawDraft = () => { const host = $('#restaurantDraftList'); if (host) host.innerHTML = restaurantDraftItems.length ? restaurantDraftItems.map(item => `<div class="restaurant-order-line"><b>${escapeHtml(item.name)} × ${number(item.quantity)}</b><span>${money(item.price * item.quantity)}</span></div>`).join('') : '<div class="empty-state">Adicione os artigos da comanda.</div>'; };
  $('#addRestaurantItem').addEventListener('click', () => { const product = productById($('#restaurantProduct').value); const quantity = Math.max(1, Math.floor(Number($('#restaurantQuantity').value || 1))); if (!product) return notify('Seleccione um produto.'); if (quantity > stockAt(product)) return notify('Quantidade superior ao stock disponível neste local.'); const existing = restaurantDraftItems.find(item => item.productId === product.id); if (existing) { if (existing.quantity + quantity > stockAt(product)) return notify('Quantidade total superior ao stock disponível.'); existing.quantity += quantity; } else restaurantDraftItems.push({ productId: product.id, name: product.name, quantity, price: Number(product.price), cost: Number(product.cost || 0) }); drawDraft(); });
  $('#restaurantOrderForm').addEventListener('submit', event => { event.preventDefault(); if (!restaurantDraftItems.length) return notify('Adicione pelo menos um artigo.'); const created = { id: uid('order'), reference: nextReference('CMD', data.restaurantOrders), tableId, locationId: currentLocationId(), items: restaurantDraftItems.map(item => ({ ...item })), status: 'Recebido', createdAt: new Date().toISOString(), createdBy: currentUser?.id || '' }; data.restaurantOrders.push(created); table.status = 'Ocupada'; audit('Comanda criada', `${table.name} · ${created.reference}`); saveData(); restaurantDraftItems = []; closeModal(); renderRestaurant(); notify(`Comanda ${created.reference} enviada para a operação.`); });
}
function updateRestaurantOrder(orderId, status) {
  const order = data.restaurantOrders.find(item => item.id === orderId && item.locationId === currentLocationId());
  if (!order || !['Em preparação', 'Pronto', 'Servido'].includes(status)) return notify('Comanda não encontrada ou estado inválido.');
  if (status === 'Em preparação' && !canManage()) return notify('Apenas gerente ou administrador pode enviar comandas para a cozinha.');
  order.status = status;
  const table = data.restaurantTables.find(item => item.id === order.tableId);
  if (table && status === 'Servido') table.status = 'Livre';
  audit('Estado da comanda alterado', `${order.reference} · ${status}`); saveData(); renderRestaurant();
}
function toggleRestaurantTableStatus(tableId) {
  if (!canManage()) return notify('Apenas gerente ou administrador pode reservar mesas.');
  const table = data.restaurantTables.find(item => item.id === tableId && item.locationId === currentLocationId());
  if (!table) return;
  table.status = table.status === 'Reservada' ? 'Livre' : 'Reservada'; audit('Estado da mesa alterado', `${table.name} · ${table.status}`); saveData(); renderRestaurant();
}

function renderDashboard() {
  if (isSeller()) return renderSellerDashboard();
  const welcomeTitle = $('#dashboardView .welcome-row h2');
  const welcomeDescription = $('#dashboardView .welcome-row p');
  if (welcomeTitle) welcomeTitle.textContent = `Área operacional · ${currentUser?.name || 'Equipa'}`;
  if (welcomeDescription) welcomeDescription.textContent = 'Acompanhe as vendas, o stock, o caixa e as tarefas da loja.';
  const stockPanel = $('#lowStockList')?.closest('article'); if (stockPanel) stockPanel.hidden = false;
  const reportLink = $('#recentSales')?.closest('article')?.querySelector('[data-go="reports"]'); if (reportLink) reportLink.hidden = false;
  const today = dateISO(); const start = monthStart();
  const locationId = currentLocationId(); const low = data.products.filter(product => stockAt(product, locationId) <= product.minStock);
  const todaySales = salesBetween(today, today).filter(sale => sale.locationId === locationId); const monthly = salesBetween(start, today).filter(sale => sale.locationId === locationId);
  const totalStock = sum(data.products, product => stockAt(product, locationId) * product.cost);
  const income = sum(monthly, sale => sale.total);
  const monthReport = calculateReport(start, today, locationId);
  const openCash = data.cashSessions.filter(session => session.status === 'Aberto' && session.locationId === locationId);
  const expectedCash = sum(openCash, session => cashSessionAmounts(session).expected);
  $('#metrics').innerHTML = [
    ['Vendas de hoje', money(sum(todaySales, sale => sale.total)), `${todaySales.length} transação${todaySales.length === 1 ? '' : 'ões'} concluídas`, '◷', 'positive'],
    ['Faturação do mês', money(income), `${monthly.length} vendas registadas`, '↗', 'positive'],
    ['Resultado estimado', monthReport.costIssues ? 'Por apurar' : money(monthReport.profit), monthReport.costIssues ? `${monthReport.costIssues} inconsistência(s) financeira(s)` : 'Após custos e despesas', '◇', monthReport.costIssues ? 'warning' : (monthReport.profit < 0 ? 'warning' : 'positive')],
    ['Dinheiro nos caixas abertos', money(expectedCash), openCash.length ? `${openCash.length} turno(s) aberto(s) · valor esperado` : 'Nenhum turno aberto', '▤', openCash.length ? 'positive' : ''],
    ['Valor do stock', money(totalStock), `${number(sum(data.products, product => stockAt(product, locationId)))} un. em ${locationName(locationId)}`, '◈', ''],
    ['Stock reduzido', low.length, low.length ? 'Requer reposição' : 'Todos os níveis estão bons', '⚠', low.length ? 'warning' : 'positive']
  ].map(([label, value, hint, icon, kind]) => `<article class="metric-card" title="${escapeHtml(label)}"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  const dayData = Array.from({ length: 7 }, (_, index) => { const offset = index - 6; const date = dateISO(offset); return { date, value: sum(salesBetween(date, date).filter(sale => sale.locationId === locationId), sale => sale.total), label: new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '') }; });
  const max = Math.max(...dayData.map(item => item.value), 1);
  $('#weekTotal').textContent = money(sum(dayData, item => item.value));
  $('#salesChart').innerHTML = dayData.map((item, index) => `<div class="bar-col"><span class="bar-value">${item.value ? number(item.value / 1000) + ' mil' : '—'}</span><div class="bar ${index === 6 ? 'today' : ''}" style="height:${Math.max(4, item.value / max * 100)}%"></div><span class="bar-label">${item.label}</span></div>`).join('');
  $('#lowStockList').innerHTML = low.length ? low.sort((a,b) => stockAt(a, locationId) - stockAt(b, locationId)).slice(0, 5).map((product, index) => `<div class="compact-item"><span class="mini-icon">${icons[index % icons.length]}</span><div class="item-main"><b>${escapeHtml(product.name)}</b><span>Limite: ${number(product.minStock)} un.</span></div><span class="stock-pill">${number(stockAt(product, locationId))} un.</span></div>`).join('') : '<div class="empty-state">O stock deste local está dentro dos níveis definidos.</div>';
  const recent = [...data.sales].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  $('#recentSales').innerHTML = recent.length ? recent.map(sale => `<tr><td><b>${sale.reference}</b><br><small class="muted">${shortDate(sale.date)}</small></td><td>${escapeHtml(saleCustomerName(sale))}</td><td class="money"><b>${money(sale.total)}</b></td><td><span class="status ${saleBalanceDue(sale) ? 'pending' : 'completed'}">${saleBalanceDue(sale) ? 'Em dívida' : 'Pago'}</span></td></tr>`).join('') : emptyRow(4);
  const costs = sum(monthly, saleCost); const tax = sum(monthly, sale => sale.tax);
  const receivable = sum(monthly, saleBalanceDue);
  $('#financialSummary').innerHTML = summaryRows([['Faturação (com IVA)', money(income)], ['IVA incluído', `− ${money(tax)}`], ['Vendas sem IVA', money(income - tax)], ['Valores por receber', money(receivable)], ['Custo dos produtos vendidos', `− ${money(costs)}`], ['Despesas operacionais', `− ${money(monthReport.operatingCosts)}`], [monthReport.costIssues ? 'Resultado (por apurar)' : 'Resultado líquido estimado', monthReport.costIssues ? 'Por apurar' : money(monthReport.profit), true]]);
  const todayPanel = $('#storeTodayPanel'); const todayTable = $('#storeTodayTable');
  if (todayPanel && todayTable) {
    const canSeeAllStores = canManage();
    todayPanel.hidden = !canSeeAllStores;
    if (canSeeAllStores) {
      const rows = data.locations.filter(location => location.type === 'Loja' && location.active).map(location => {
        const storeSales = salesBetween(today, today).filter(sale => sale.locationId === location.id);
        const last = [...storeSales].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return { location, sales: storeSales, total: sum(storeSales, sale => sale.total), last };
      }).sort((a, b) => b.total - a.total || a.location.name.localeCompare(b.location.name));
      todayTable.innerHTML = rows.length ? rows.map(row => `<tr><td><b>${escapeHtml(row.location.name)}</b><br><small class="muted">${escapeHtml(row.location.address || 'Sem morada registada')}</small></td><td>${row.sales.length}</td><td class="money"><b>${money(row.total)}</b></td><td>${row.last ? `${escapeHtml(row.last.reference)}<br><small class="muted">${fullDate(row.last.date)}</small>` : '<span class="muted">Sem vendas hoje</span>'}</td></tr>`).join('') : emptyRow(4, 'Não existem lojas activas para apresentar.');
    }
  }
  renderOperationalControl(today, start);
}
function renderSellerDashboard() {
  const today = dateISO();
  const start = monthStart();
  const ownSales = data.sales.filter(sale => sale.operatorId === currentUser.id && sale.status !== 'Devolvida');
  const todaySales = ownSales.filter(sale => String(sale.date || '').slice(0, 10) === today);
  const monthlySales = ownSales.filter(sale => String(sale.date || '').slice(0, 10) >= start && String(sale.date || '').slice(0, 10) <= today);
  const todayTotal = sum(todaySales, sale => sale.total);
  const monthTotal = sum(monthlySales, sale => sale.total);
  const average = monthlySales.length ? monthTotal / monthlySales.length : 0;
  const session = currentCashSession();
  const cash = cashSessionAmounts(session);
  const metricRows = [
    ['Vendas de hoje', todaySales.length, 'Operações concluídas hoje', '▣', todaySales.length ? 'positive' : ''],
    ['Faturação de hoje', money(todayTotal), 'Total das suas vendas hoje', '↗', todayTotal ? 'positive' : ''],
    ['Faturação do mês', money(monthTotal), `${monthlySales.length} venda(s) no período`, '◷', monthTotal ? 'positive' : ''],
    ['Ticket médio', money(average), 'Média por venda neste mês', '◈', ''],
    ['Estado do meu caixa', session ? 'Aberto' : 'Fechado', session ? `Esperado: ${money(cash.expected)}` : 'Abra o seu turno para começar', '▤', session ? 'positive' : 'warning']
  ];
  $('#metrics').innerHTML = metricRows.map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');

  const dayData = Array.from({ length: 7 }, (_, index) => {
    const date = dateISO(index - 6);
    const value = sum(ownSales.filter(sale => String(sale.date || '').slice(0, 10) === date), sale => sale.total);
    const label = new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '');
    return { date, value, label };
  });
  const max = Math.max(...dayData.map(item => item.value), 1);
  $('#weekTotal').textContent = money(sum(dayData, item => item.value));
  $('#salesChart').innerHTML = dayData.map((item, index) => `<div class="bar-col"><span class="bar-value">${item.value ? number(item.value / 1000) + ' mil' : '—'}</span><div class="bar ${index === 6 ? 'today' : ''}" style="height:${Math.max(4, item.value / max * 100)}%"></div><span class="bar-label">${item.label}</span></div>`).join('');

  const recent = [...ownSales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  $('#recentSales').innerHTML = recent.length ? recent.map(sale => `<tr><td><b>${escapeHtml(sale.reference || '—')}</b><br><small class="muted">${shortDate(sale.date)}</small></td><td>${escapeHtml(saleCustomerName(sale))}</td><td class="money"><b>${money(sale.total)}</b></td><td><span class="status ${saleBalanceDue(sale) ? 'pending' : 'completed'}">${saleBalanceDue(sale) ? 'Em dívida' : 'Pago'}</span></td></tr>`).join('') : emptyRow(4, 'Ainda não existem vendas associadas à sua conta.');
  $('#financialSummary').innerHTML = summaryRows([
    ['Faturação de hoje', money(todayTotal)],
    ['Vendas concluídas hoje', String(todaySales.length)],
    ['Faturação do mês', money(monthTotal)],
    ['Valor por receber', money(sum(monthlySales, saleBalanceDue))],
    ['Ticket médio', money(average), true]
  ]);

  const title = $('#dashboardView .welcome-row h2');
  const description = $('#dashboardView .welcome-row p');
  if (title) title.textContent = `Olá, ${currentUser.name.split(' ')[0]}`;
  if (description) description.textContent = 'Acompanhe o seu desempenho e as suas vendas.';
  const stockPanel = $('#lowStockList')?.closest('article');
  if (stockPanel) stockPanel.hidden = true;
  const storePanel = $('#storeTodayPanel');
  if (storePanel) storePanel.hidden = true;
  const operationalPanel = $('#operationalControlPanel');
  if (operationalPanel) operationalPanel.hidden = true;
  const recentTitle = $('#recentSales')?.closest('article')?.querySelector('h3');
  if (recentTitle) recentTitle.textContent = 'As minhas vendas recentes';
  const recentDescription = $('#recentSales')?.closest('article')?.querySelector('p');
  if (recentDescription) recentDescription.textContent = 'Apenas operações registadas na sua conta.';
  const reportLink = $('#recentSales')?.closest('article')?.querySelector('[data-go="reports"]');
  if (reportLink) reportLink.hidden = true;
}

function renderOperationalControl(today, monthStartDate) {
  let panel = $('#operationalControlPanel');
  if (!panel) {
    $('#dashboardView').insertAdjacentHTML('beforeend', '<article class="panel operational-control" id="operationalControlPanel"><div class="panel-head"><div><h3>Controlo operacional</h3><p>Alertas, caixa e metas das lojas.</p></div></div><div class="dashboard-grid control-grid"><div id="operationalAlerts" class="summary-list"></div><div id="storeGoals" class="summary-list"></div></div></article>');
    panel = $('#operationalControlPanel');
  }
  panel.hidden = !canManage();
  if (!canManage()) return;
  const openCash = data.cashSessions.filter(session => session.status === 'Aberto');
  const overdue = data.sales.filter(sale => saleBalanceDue(sale) > 0 && sale.dueDate && sale.dueDate < today && sale.status !== 'Devolvida');
  const allLow = data.locations.filter(location => location.active).reduce((count, location) => count + data.products.filter(product => stockAt(product, location.id) <= product.minStock).length, 0);
  const pending = window.VendaMaisCloud?.pendingCount?.() || 0;
  const missingSaleCosts = data.sales.reduce((count, sale) => count + sale.items.filter(item => { const cost = Number(item.cost); const price = Number(item.price); return !Number.isFinite(cost) || cost <= 0 || (price > 0 && cost < price * 0.01); }).length, 0);
  const productsWithoutCost = data.products.filter(product => { const cost = Number(product.cost); const price = Number(product.price); return !Number.isFinite(cost) || cost <= 0 || (price > 0 && cost < price * 0.01); }).length;
  $('#operationalAlerts').innerHTML = summaryRows([
    ['Caixas abertos', `${openCash.length} turno${openCash.length === 1 ? '' : 's'}`, openCash.length > 0],
    ['Documentos vencidos', `${overdue.length} em cobrança`, overdue.length > 0],
    ['Alertas de stock', `${allLow} referência${allLow === 1 ? '' : 's'}`, allLow > 0],
    ['Produtos sem custo de compra', `${productsWithoutCost} produto(s)`, productsWithoutCost > 0],
    ['Vendas com custo por confirmar', `${missingSaleCosts} linha(s)`, missingSaleCosts > 0],
    ['Vendas por sincronizar', `${pending} pendente${pending === 1 ? '' : 's'}`, pending > 0]
  ]);
  const stores = data.locations.filter(location => location.type === 'Loja' && location.active);
  $('#storeGoals').innerHTML = stores.length ? stores.map(location => {
    const todayRevenue = sum(salesBetween(today, today).filter(sale => sale.locationId === location.id), sale => sale.total);
    const monthRevenue = sum(salesBetween(monthStartDate, today).filter(sale => sale.locationId === location.id), sale => sale.total);
    const daily = Number(location.dailyTarget || 0); const monthly = Number(location.monthlyTarget || 0);
    const dailyText = daily ? `${money(todayRevenue)} / ${money(daily)}` : `${money(todayRevenue)} hoje`;
    const monthlyText = monthly ? `${money(monthRevenue)} / ${money(monthly)}` : `${money(monthRevenue)} no mês`;
    return `<div class="goal-row"><b>${escapeHtml(location.name)}</b><span>Diária: ${dailyText}</span><span>Mensal: ${monthlyText}</span></div>`;
  }).join('') : '<div class="empty-state">Crie uma loja para acompanhar metas.</div>';
}
function summaryRows(rows) { return rows.map(([label, value, total]) => `<div class="summary-row ${total ? 'total' : ''}"><span>${label}</span><strong>${value}</strong></div>`).join(''); }

function renderPos() {
  const categorySelect = $('#posCategory'); const previousCategory = categorySelect.value;
  categorySelect.innerHTML = '<option value="">Todas as categorias</option>' + categoryList().map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  categorySelect.value = previousCategory;
  const customerSelect = $('#saleCustomer'); const previousCustomer = customerSelect.value;
  customerSelect.innerHTML = '<option value="">Consumidor final</option>' + [...data.customers].sort((a,b) => a.name.localeCompare(b.name)).map(customer => `<option value="${customer.id}">${escapeHtml(customer.name)}${customer.type === 'Empresa' ? ' · Empresa' : ''}</option>`).join('');
  customerSelect.value = data.customers.some(customer => customer.id === previousCustomer) ? previousCustomer : '';
  $('#posLocationLabel').textContent = `${currentLocation()?.type || 'Local'}: ${locationName(currentLocationId())}`;
  renderSaleCustomerInfo();
  renderPosProducts(); renderCart();
}
function renderSaleCustomerInfo() {
  const customer = customerById($('#saleCustomer').value);
  const info = $('#saleCustomerInfo'); const edit = $('#editSaleCustomer');
  if (!customer) {
    info.innerHTML = '<span class="customer-info-muted">Venda a consumidor final. Cadastre um cliente para guardar nome, contacto e dados fiscais.</span>';
    edit.hidden = true;
    return;
  }
  const identity = customer.type === 'Empresa' ? 'Empresa' : 'Cliente particular';
  info.innerHTML = `<div><span class="customer-type-tag">${identity}</span><strong>${escapeHtml(customer.name)}</strong></div><span>${customer.nif ? `NIF: ${escapeHtml(customer.nif)}` : 'Sem NIF registado'}${customer.phone ? ` · ${escapeHtml(customer.phone)}` : ''}</span>`;
  edit.hidden = false;
}
function renderPosProducts() {
  const search = $('#productSearch').value.trim().toLowerCase(); const category = $('#posCategory').value;
  const locationId = currentLocationId(); const products = data.products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.code} ${product.barcode || ''}`.toLowerCase().includes(search)));
  $('#posProducts').innerHTML = products.length ? products.map((product, index) => { const available = stockAt(product, locationId); return `<button class="product-card ${available <= 0 ? 'sold-out' : ''}" data-add-product="${product.id}" ${available <= 0 ? 'disabled' : ''}><span class="product-image">${icons[index % icons.length]}</span><b>${escapeHtml(product.name)}</b><span class="code">${escapeHtml(product.code)}${product.barcode ? ` · ${escapeHtml(product.barcode)}` : ''}</span><footer><strong>${money(product.price)}</strong><small>${number(available)} ${escapeHtml(product.unit || 'un.')}</small></footer></button>`; }).join('') : '<div class="empty-state">Nenhum produto encontrado.</div>';
  updateProductScrollControls();
}
function updateProductScrollControls() {
  const scroller = $('#productScroll'); if (!scroller) return;
  const up = $('#productsScrollUp'); const down = $('#productsScrollDown');
  const canScroll = scroller.scrollHeight > scroller.clientHeight + 2;
  if (up) { up.disabled = !canScroll || scroller.scrollTop <= 2; up.hidden = !canScroll; }
  if (down) { down.disabled = !canScroll || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2; down.hidden = !canScroll; }
}
function scrollProducts(direction) {
  const scroller = $('#productScroll'); if (!scroller) return;
  scroller.scrollBy({ top: direction * Math.max(220, scroller.clientHeight * .72), behavior: 'smooth' });
  window.setTimeout(updateProductScrollControls, 260);
}
function cartNumbers() {
  return window.VendaMaisFinance.calculateCartTotals(cart, isSeller() ? 0 : Number($('#saleDiscount')?.value || 0), Number(data.settings.taxRate || 0));
}
function renderCart() {
  const count = sum(cart, item => item.quantity); $('#cartCount').textContent = `${count} artigo${count === 1 ? '' : 's'}`;
  $('#cartItems').innerHTML = cart.length ? cart.map(item => `<div class="cart-item"><div><b>${escapeHtml(item.name)}</b><small>${money(item.price)} cada${Number(item.discountPct || 0) ? ` · desconto aprovado ${number(item.discountPct)}%` : ''}${item.discountRequestStatus === 'Pendente' ? ' · pedido pendente' : ''}</small></div><div class="cart-item-right"><strong>${money(Number(item.price) * Number(item.quantity) - Number(item.price) * Number(item.quantity) * Number(item.discountPct || 0) / 100)}</strong><div class="quantity"><button data-cart-change="${item.productId}" data-change="-1">−</button><span>${number(item.quantity)}</span><button data-cart-change="${item.productId}" data-change="1">+</button></div></div></div>`).join('') : '<div class="empty-cart">O carrinho está vazio.<br><small>Escolha produtos ao lado.</small></div>';
  const totals = cartNumbers(); $('#cartSubtotal').textContent = money(totals.subtotal); $('#cartTax').textContent = money(totals.tax); $('#cartTotal').textContent = money(totals.total); $('#taxRateLabel').textContent = `${number(data.settings.taxRate)}%`; renderFiscalPreview(); const discountInput = $('#saleDiscount'); if (discountInput) { if (isSeller()) discountInput.value = '0'; discountInput.disabled = isSeller(); discountInput.title = isSeller() ? 'Descontos requerem autorização de gerente ou administrador.' : ''; } const requestButton = $('#requestProductDiscount'); if (requestButton) requestButton.hidden = !isSeller() || !cart.length || !window.VendaMaisCloud?.connected?.();
}
function renderFiscalPreview() {
  const host = $('#fiscalPreviewContent'); if (!host || !window.VendaMaisFiscalPreview) return;
  if (!cart.length) { host.textContent = 'Adicione artigos para consultar a simulação. Não altera o total da venda.'; return; }
  try {
    const result = window.VendaMaisFiscalPreview.calculate(cart, isSeller() ? 0 : Number($('#saleDiscount')?.value || 0));
    const rows = result.rows.map(row => {
      const status = row.status === 'pending_review' ? `Taxa ${number(row.rate)}% · por validar` : row.status === 'requires_legal_review' ? 'Possível isenção/não sujeição · requer análise' : 'Por classificar';
      const amount = row.estimatedTax === null ? 'Não calculado' : money(row.estimatedTax);
      return `<div class="fiscal-preview-row"><span>${escapeHtml(row.name)}<small>${escapeHtml(status)}</small></span><strong>${amount}</strong></div>`;
    }).join('');
    host.innerHTML = `${rows}<div class="fiscal-preview-total"><span>Imposto estimado nas linhas com taxa configurada</span><strong>${money(result.estimatedTax)}</strong></div><small>${result.unresolvedCount ? `${result.unresolvedCount} linha(s) sem enquadramento suficiente.` : 'Todas as linhas têm uma taxa interna configurada, ainda sujeita a revisão.'} ${escapeHtml(result.disclaimer)}</small>`;
  } catch (error) { host.textContent = `Não foi possível calcular a pré-visualização: ${error.message}`; }
}
function addToCart(id) { const product = productById(id); const available = stockAt(product); if (!product || available <= 0) return notify('Este produto não tem stock disponível neste local.'); const entry = cart.find(item => item.productId === id); if (entry) { if (entry.quantity >= available) return notify('A quantidade máxima disponível já está no carrinho.'); entry.quantity += 1; } else { cart.push({ productId: product.id, name: product.name, code: product.code, price: product.price, cost: product.cost, quantity: 1, fiscalTreatment: product.fiscalTreatment || 'UNCLASSIFIED_INTERNAL', fiscalRate: product.fiscalRate ?? '', fiscalReason: product.fiscalReason || '' }); } renderCart(); }
function changeCart(id, change) { const entry = cart.find(item => item.productId === id); if (!entry) return; if (entry.discountRequestStatus === 'Pendente') return notify('Aguarde a decisão do administrador antes de alterar a quantidade deste produto.'); const product = productById(id); const next = entry.quantity + change; if (next <= 0) cart = cart.filter(item => item.productId !== id); else if (next > stockAt(product)) return notify('Não há mais unidades em stock neste local.'); else { if (entry.discountApprovalId && next !== entry.quantity) { entry.discountPct = 0; entry.discountValue = 0; entry.discountApprovalId = ''; entry.discountRequestId = ''; entry.discountRequestStatus = ''; notify('A quantidade mudou. Solicite nova aprovação para manter o desconto.'); } entry.quantity = next; } renderCart(); }

function renderProducts() {
  const categoryFilter = $('#productCategoryFilter'); const previous = categoryFilter.value;
  categoryFilter.innerHTML = '<option value="">Todas as categorias</option>' + categoryList().map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join(''); categoryFilter.value = previous;
  filterProducts();
}
function filterProducts() {
  const search = $('.filter-input[data-table="products"]').value.trim().toLowerCase(); const category = $('#productCategoryFilter').value;
  const products = data.products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.code} ${product.barcode || ''}`.toLowerCase().includes(search)));
  $('#productsCount').textContent = `${products.length} produto${products.length === 1 ? '' : 's'}`;
  const locationId = currentLocationId(); $('#productsTable').innerHTML = products.length ? products.map((product, index) => { const localStock = stockAt(product, locationId); const low = localStock <= product.minStock; const expiry = product.expiryDate && product.expiryDate <= dateISO(30); return `<tr><td><div class="product-name"><span class="mini-icon">${icons[index % icons.length]}</span><div><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.code)}${product.barcode ? ` · ${escapeHtml(product.barcode)}` : ''}</small></div></div></td><td>${escapeHtml(product.category || '—')}</td><td class="money">${money(product.price)}</td><td class="money">${money(product.cost)}</td><td><b>${number(localStock)}</b> ${escapeHtml(product.unit || 'un.')}<br><small class="muted">Total: ${number(totalStock(product))}</small></td><td><span class="status ${low || expiry ? 'pending' : 'completed'}">${expiry ? 'Validade próxima' : (low ? 'Stock reduzido' : 'Em stock')}</span></td><td><button class="action-btn" data-product-action="edit" data-id="${product.id}">Editar</button></td></tr>`; }).join('') : emptyRow(7, 'Nenhum produto corresponde à pesquisa.');
}

function renderInventory() {
  const locationId = currentLocationId(); const location = currentLocation();
  const totalUnits = sum(data.products, product => stockAt(product, locationId)); const costValue = sum(data.products, product => stockAt(product, locationId) * product.cost); const salesValue = sum(data.products, product => stockAt(product, locationId) * product.price); const low = data.products.filter(product => stockAt(product, locationId) <= product.minStock).length; const expiring = data.products.filter(product => product.expiryDate && product.expiryDate <= dateISO(30)).length;
  $('#inventoryLocationHint').textContent = `${location?.type || 'Local'}: ${locationName(locationId)} · valor ao custo`;
  $('#inventoryMetrics').innerHTML = [['Unidades em stock', number(totalUnits), `${data.products.filter(product => stockAt(product, locationId) > 0).length} referências neste local`, '◈', ''], ['Valor ao custo', money(costValue), 'Capital em mercadoria', '◒', ''], ['Valor de venda', money(salesValue), 'Potencial de faturação', '↗', 'positive'], ['Alertas', low + expiring, `${low} stock reduzido · ${expiring} validade próxima`, '⚠', low + expiring ? 'warning' : 'positive']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#inventoryStatus').innerHTML = summaryRows([['Local de operação', `${locationName(locationId)} · ${location?.type || 'Local'}`], ['Referências com stock', `${data.products.filter(product => stockAt(product, locationId) > 0).length} produtos`], ['Em nível normal', `${data.products.length - low} produtos`], ['Abaixo do limite', `${low} produtos`], ['Valor total ao custo', money(costValue), true]]);
  const saleMovements = data.sales.filter(sale => sale.locationId === locationId && sale.status !== 'Devolvida').flatMap(sale => sale.items.map(item => ({ id: `sale-${sale.id}-${item.productId}`, date: sale.date, productId: item.productId, productName: item.name, type: 'Saída', quantity: item.quantity, note: sale.reference, locationId })));
  const movements = [...data.movements.filter(movement => movement.locationId === locationId), ...saleMovements].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 18);
  $('#movementsTable').innerHTML = movements.length ? movements.map(movement => { const outgoing = /Saída/.test(movement.type); return `<tr><td>${fullDate(movement.date)}</td><td><b>${escapeHtml(movement.productName)}</b></td><td><span class="status ${outgoing ? 'danger' : 'completed'}">${escapeHtml(movement.type)}</span></td><td><b class="${outgoing ? 'text-danger' : ''}">${outgoing ? '−' : '+'}${number(movement.quantity)}</b></td><td class="muted">${escapeHtml(movement.note || '—')}</td></tr>`; }).join('') : emptyRow(5);
  const transfers = [...data.transfers].filter(transfer => transfer.fromLocationId === locationId || transfer.toLocationId === locationId).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  $('#transfersTable').innerHTML = transfers.length ? transfers.map(transfer => `<tr><td>${fullDate(transfer.date)}</td><td><b>${escapeHtml(transfer.reference)}</b></td><td>${escapeHtml(locationName(transfer.fromLocationId))}</td><td>${escapeHtml(locationName(transfer.toLocationId))}</td><td>${number(sum(transfer.items, item => item.quantity))} un. / ${transfer.items.length} artigo${transfer.items.length === 1 ? '' : 's'}</td><td>${escapeHtml(transfer.operatorName || userById(transfer.operatorId)?.name || '—')}</td></tr>`).join('') : emptyRow(6, 'Ainda não existem transferências neste local.');
}

function customerStats(customerId) {
  const sales = data.sales.filter(sale => sale.customerId === customerId && sale.status !== 'Devolvida');
  return { count: sales.length, total: sum(sales, sale => sale.total), balance: sum(sales, saleBalanceDue), paid: sum(sales, sale => sale.amountPaid || 0) };
}
function renderCustomers() {
  const total = data.customers.length; const bought = data.customers.filter(customer => customerStats(customer.id).count).length; const revenue = sum(data.sales.filter(sale => sale.customerId), sale => sale.total); const outstanding = sum(data.customers, customer => customerStats(customer.id).balance);
  $('#customerMetrics').innerHTML = [['Clientes registados', total, 'Particulares e empresas', '♙', ''], ['Clientes activos', bought, 'Com pelo menos uma compra', '✓', 'positive'], ['Vendas a clientes', money(revenue), 'Histórico registado', '◷', ''], ['Saldo em dívida', money(outstanding), outstanding ? 'Requer cobrança' : 'Sem crédito em aberto', '◉', outstanding ? 'warning' : 'positive']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  filterCustomers();
}
function filterCustomers() { const search = $('.filter-input[data-table="customers"]').value.trim().toLowerCase(); const customers = data.customers.filter(customer => !search || `${customer.name} ${customer.type} ${customer.phone} ${customer.nif}`.toLowerCase().includes(search)); $('#customersTable').innerHTML = customers.length ? [...customers].sort((a,b) => a.name.localeCompare(b.name)).map(customer => { const stats = customerStats(customer.id); const inDebt = stats.balance > 0; return `<tr><td><b>${escapeHtml(customer.name)}</b><br><small class="muted">${escapeHtml(customer.email || 'Sem e-mail')}</small></td><td><span class="customer-type-tag">${customer.type}</span></td><td>${escapeHtml(customer.phone || '—')}</td><td>${escapeHtml(customer.nif || '—')}</td><td>${stats.count}</td><td class="money">${money(stats.total)}</td><td><span class="status ${inDebt ? 'pending' : 'completed'}">${inDebt ? money(stats.balance) : 'Regular'}</span></td><td>${inDebt ? `<button class="action-btn" data-customer-action="receive" data-id="${customer.id}">Receber</button>` : ''}<button class="action-btn" data-customer-action="edit" data-id="${customer.id}">Editar</button></td></tr>`; }).join('') : emptyRow(8, 'Nenhum cliente encontrado.'); }

function renderSuppliers() { filterSuppliers(); }
function filterSuppliers() { const search = $('.filter-input[data-table="suppliers"]').value.trim().toLowerCase(); const suppliers = data.suppliers.filter(supplier => !search || `${supplier.name} ${supplier.phone} ${supplier.nif}`.toLowerCase().includes(search)); $('#suppliersTable').innerHTML = suppliers.length ? suppliers.sort((a,b) => a.name.localeCompare(b.name)).map(supplier => { const purchases = data.purchases.filter(purchase => purchase.supplierId === supplier.id); return `<tr><td><b>${escapeHtml(supplier.name)}</b><br><small class="muted">${escapeHtml(supplier.email || 'Sem e-mail')}</small></td><td>${escapeHtml(supplier.phone || '—')}</td><td>${escapeHtml(supplier.nif || '—')}</td><td>${escapeHtml(supplier.address || '—')}</td><td>${purchases.length} compra${purchases.length === 1 ? '' : 's'}</td><td><button class="action-btn" data-supplier-action="edit" data-id="${supplier.id}">Editar</button></td></tr>`; }).join('') : emptyRow(6, 'Nenhum fornecedor encontrado.'); }

function renderPurchases() {
  const start = monthStart(); const monthly = data.purchases.filter(purchase => purchase.date >= start); const total = sum(monthly, purchase => purchase.total); const open = data.purchases.filter(purchase => Number(purchase.balanceDue || 0) > 0);
  $('#purchaseMetrics').innerHTML = [['Compras do mês', money(total), `${monthly.length} documentos`, '⊞', ''], ['Fornecedores activos', new Set(monthly.map(purchase => purchase.supplierId)).size, 'Com compras neste mês', '♧', ''], ['Contas a pagar', money(sum(open, purchase => purchase.balanceDue)), `${open.length} documento${open.length === 1 ? '' : 's'} pendente${open.length === 1 ? '' : 's'}`, '◷', open.length ? 'warning' : 'positive'], ['Última compra', data.purchases.length ? shortDate([...data.purchases].sort((a,b) => b.date.localeCompare(a.date))[0].date) : '—', 'Registo mais recente', '◒', '']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  const purchases = [...data.purchases].sort((a,b) => b.date.localeCompare(a.date));
  $('#purchasesTable').innerHTML = purchases.length ? purchases.map(purchase => { const pending = Number(purchase.balanceDue || 0) > 0; return `<tr><td><b>${purchase.reference}</b></td><td>${shortDate(purchase.date)}</td><td>${escapeHtml(supplierById(purchase.supplierId)?.name || 'Fornecedor removido')}</td><td>${sum(purchase.items, item => item.quantity)} un. / ${purchase.items.length} item${purchase.items.length === 1 ? '' : 's'}</td><td class="money"><b>${money(purchase.total)}</b>${pending ? `<br><small class="text-danger">Pendente: ${money(purchase.balanceDue)}</small>` : ''}</td><td><span class="status ${pending ? 'pending' : 'completed'}">${pending ? 'A pagar' : escapeHtml(purchase.payment)}</span>${pending ? `<button class="action-btn" data-purchase-action="pay" data-id="${purchase.id}">Pagar</button>` : ''}</td></tr>`; }).join('') : emptyRow(6);
}

function cashSessionAmounts(session) {
  if (!session) return { opening: 0, sales: 0, in: 0, out: 0, expected: 0 };
  const sales = sum(data.sales.filter(sale => sale.cashSessionId === session.id && sale.status !== 'Devolvida' && sale.payment === 'Dinheiro'), sale => sale.total);
  const receipts = sum(data.receipts.filter(receipt => receipt.cashSessionId === session.id && receipt.payment === 'Dinheiro'), receipt => receipt.amount);
  const movements = data.cashMovements.filter(movement => movement.sessionId === session.id);
  const incoming = sum(movements.filter(movement => movement.type === 'Entrada'), movement => movement.amount);
  const outgoing = sum(movements.filter(movement => movement.type === 'Saída'), movement => movement.amount);
  const opening = Number(session.openingAmount || 0);
  return { opening, sales: sales + receipts, directSales: sales, receipts, in: incoming, out: outgoing, expected: opening + sales + receipts + incoming - outgoing };
}
function renderCash() {
  const session = currentCashSession(); const otherSession = currentCashForAll(); const values = cashSessionAmounts(session);
  const locationId = currentLocationId(); const allToday = data.cashSessions.filter(item => item.locationId === locationId && item.openedAt?.slice(0, 10) === dateISO()); const closedToday = allToday.filter(item => item.status === 'Fechado').length;
  $('#cashMetrics').innerHTML = [['Estado do caixa', session ? 'Aberto' : (otherSession ? 'Ocupado' : 'Fechado'), session ? `Operador: ${currentUser.name} · ${locationName(locationId)}` : (otherSession ? `Operador: ${userById(otherSession.userId)?.name || 'outro'}` : `Sem turno em ${locationName(locationId)}`), '▤', session ? 'positive' : 'warning'], ['Fundo inicial', money(values.opening), session ? 'Valor de abertura' : 'Abra o seu turno', '◉', ''], ['Dinheiro esperado', money(values.expected), session ? 'Vendas e movimentos do turno' : 'Sem caixa activo', '↗', session ? 'positive' : ''], ['Turnos fechados hoje', closedToday, `${allToday.length} turno${allToday.length === 1 ? '' : 's'} iniciado${allToday.length === 1 ? '' : 's'} neste local`, '✓', '']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#cashPrimaryAction').textContent = session ? 'Fechar caixa' : 'Abrir caixa';
  $('#cashMovement').disabled = !session; $('#cashMovement').title = session ? '' : 'Abra o caixa para registar movimentos';
  $('#cashSessionTitle').textContent = session ? `Caixa aberto por ${currentUser.name}` : (otherSession ? 'Caixa em uso por outro operador' : 'Nenhum caixa aberto');
  $('#cashSessionInfo').textContent = session ? `Aberto em ${fullDate(session.openedAt)} · Fundo inicial: ${money(values.opening)}` : 'Abra um turno antes de efectuar vendas em dinheiro.';
  $('#cashSummary').innerHTML = session ? summaryRows([['Fundo inicial', money(values.opening)], ['Vendas em dinheiro', money(values.directSales)], ['Recebimentos em dinheiro', money(values.receipts)], ['Entradas avulsas', money(values.in)], ['Saídas avulsas', `− ${money(values.out)}`], ['Dinheiro esperado', money(values.expected), true]]) : '<div class="empty-state">Sem movimentos de caixa para mostrar.</div>';
  const movements = session ? data.cashMovements.filter(movement => movement.sessionId === session.id) : [];
  $('#cashMovementsTable').innerHTML = movements.length ? [...movements].sort((a,b) => new Date(b.date) - new Date(a.date)).map(movement => `<tr><td>${fullDate(movement.date)}</td><td><span class="status ${movement.type === 'Saída' ? 'danger' : 'completed'}">${movement.type}</span></td><td>${escapeHtml(movement.note)}</td><td class="money"><b class="${movement.type === 'Saída' ? 'text-danger' : ''}">${movement.type === 'Saída' ? '−' : '+'}${money(movement.amount)}</b></td><td>${escapeHtml(userById(movement.userId)?.name || '—')}</td></tr>`).join('') : emptyRow(5, 'Ainda não existem movimentos neste turno.');
  renderCashMovementApprovals();
}
function cashOpenModal() {
  if (sessionLocked) return accountModal();
  if (currentCashForAll()) return notify('Já existe um caixa aberto neste local. Feche o turno anterior antes de abrir outro.');
  openModal(`${modalHeader('Abrir caixa', `Registe o fundo inicial para ${locationName(currentLocationId())}.`)}<form id="cashOpenForm"><div class="modal-form"><label>Operador<input value="${escapeHtml(currentUser.name)}" disabled /></label><label>Local<input value="${escapeHtml(locationName(currentLocationId()))}" disabled /></label><label>Fundo inicial (Kz)<input name="openingAmount" type="number" min="0" step="0.01" required value="0" /></label><label class="full">Observação<input name="note" placeholder="Ex.: fundo entregue pelo gerente" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Abrir turno</button></div></form>`);
  $('#cashOpenForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const openingAmount = Number(values.openingAmount); if (!Number.isFinite(openingAmount) || openingAmount < 0) return notify('Introduza um fundo inicial válido.'); const snapshot = captureDataSnapshot(); const session = { id: uid('cash'), userId: currentUser.id, locationId: currentLocationId(), openedAt: new Date().toISOString(), openingAmount: roundMoney(openingAmount), note: values.note.trim(), status: 'Aberto' }; data.cashSessions.push(session); audit('Abertura de caixa', `${locationName(session.locationId)} · fundo inicial: ${money(session.openingAmount)}`); if (!persistOrRollback(snapshot, false)) return; closeModal(); notify('Caixa aberto com sucesso.'); renderCash(); });
}
function cashMovementModal() {
  const session = currentCashSession(); if (!session) return notify('Abra o seu caixa antes de solicitar um movimento.');
  if (!isSeller() && !canManage()) return notify('Não tem autorização para movimentos manuais de caixa.');
  const sellerRequest = isSeller();
  openModal(`${modalHeader(sellerRequest ? 'Solicitar movimento de caixa' : 'Movimento de caixa', sellerRequest ? 'O pedido ficará pendente até ser aprovado pelo administrador.' : 'Use entradas e saídas apenas para movimentos físicos de dinheiro.')}<form id="cashMovementForm"><div class="modal-form"><label>Tipo<select name="type"><option>Entrada</option><option>Saída</option></select></label><label>Valor (Kz)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Classificação<select name="classification"><option value="Ajuste de caixa">Ajuste de caixa</option><option value="Retirada pessoal">Retirada pessoal</option><option value="Pagamento de dívida antiga">Pagamento de dívida antiga</option><option value="Entrada de capital">Entrada de capital</option></select></label><label class="full" id="debtTargetField" hidden>Dívida a liquidar<select name="debtTarget"><option value="">Seleccione uma dívida pendente</option>${data.purchases.filter(item => Number(item.balanceDue || 0) > 0).map(item => `<option value="purchase:${item.id}">Fornecedor · ${escapeHtml(item.reference)} · ${money(item.balanceDue)}</option>`).join('')}${data.expenses.filter(item => Number(item.balanceDue || 0) > 0).map(item => `<option value="expense:${item.id}">Despesa · ${escapeHtml(item.description)} · ${money(item.balanceDue)}</option>`).join('')}</select></label><label class="full">Motivo<input name="note" required placeholder="Ex.: retirada do proprietário, liquidação de dívida antiga" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${sellerRequest ? 'Enviar para aprovação' : 'Guardar movimento'}</button></div></form>`);
  $('#cashMovementForm').elements.classification.addEventListener('change', event => { const field = $('#debtTargetField'); field.hidden = event.target.value !== 'Pagamento de dívida antiga'; $('#cashMovementForm').elements.type.value = event.target.value === 'Pagamento de dívida antiga' || event.target.value === 'Retirada pessoal' ? 'Saída' : $('#cashMovementForm').elements.type.value; });
  $('#cashMovementForm').addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !values.note.trim()) return notify('Introduza um valor e um motivo válidos.');
    const snapshot = captureDataSnapshot();
    if (sellerRequest) {
      data.cashMovementRequests ||= [];
      data.cashMovementRequests.push({ id: uid('cashreq'), sessionId: session.id, locationId: session.locationId, userId: currentUser.id, requestedAt: new Date().toISOString(), type: values.type, amount: roundMoney(amount), note: values.note.trim(), status: 'Pendente', decidedBy: '', decidedAt: '', decisionNote: '' });
      audit('Pedido de movimento de caixa', `${values.type} · ${money(amount)} · ${values.note.trim()}`);
    } else {
      const classification = values.classification || 'Ajuste de caixa';
      if (classification === 'Pagamento de dívida antiga') {
        if (values.type !== 'Saída') return notify('O pagamento de uma dívida deve ser registado como saída.');
        const [debtType, debtId] = String(values.debtTarget || '').split(':');
        const debt = debtType === 'purchase' ? data.purchases.find(item => item.id === debtId) : debtType === 'expense' ? data.expenses.find(item => item.id === debtId) : null;
        if (!debt || amount > Number(debt.balanceDue || 0) + 0.001) return notify('Seleccione uma dívida pendente e indique um valor que não ultrapasse o saldo.');
        const paymentId = uid(debtType === 'purchase' ? 'suppay' : 'exppay');
        debt.amountPaid = roundMoney(Number(debt.amountPaid || 0) + amount); debt.balanceDue = roundMoney(Math.max(0, Number(debt.balanceDue || 0) - amount)); debt.paymentStatus = debt.balanceDue === 0 ? 'Pago' : 'Parcial';
        if (debtType === 'purchase') { data.supplierPayments.push({ id: paymentId, purchaseId: debt.id, supplierId: debt.supplierId, userId: currentUser.id, cashSessionId: session.id, date: new Date().toISOString(), amount: roundMoney(amount), payment: 'Dinheiro', note: values.note.trim() }); postFinancialEntry({ idempotencyKey: `supplier-payment:${paymentId}`, sourceType: 'supplier-payment', sourceId: paymentId, eventType: 'Pagamento de dívida', category: 'Liquidação de fornecedor', description: values.note.trim(), amount, locationId: debt.locationId, cashImpact: -amount, liabilityImpact: -amount, payment: 'Dinheiro' }); }
        else { data.expensePayments.push({ id: paymentId, expenseId: debt.id, userId: currentUser.id, cashSessionId: session.id, date: new Date().toISOString(), amount: roundMoney(amount), payment: 'Dinheiro', note: values.note.trim() }); postFinancialEntry({ idempotencyKey: `expense-payment:${paymentId}`, sourceType: 'expense-payment', sourceId: paymentId, eventType: 'Liquidação de despesa', category: 'Pagamento de despesa', description: values.note.trim(), amount, locationId: debt.locationId, cashImpact: -amount, liabilityImpact: -amount, payment: 'Dinheiro' }); }
        const debtMovement = { id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: 'Saída', amount: roundMoney(amount), note: values.note.trim() }; data.cashMovements.push(debtMovement);
      } else {
        const movement = { id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: values.type, amount: roundMoney(amount), note: values.note.trim() };
        data.cashMovements.push(movement); const sign = movement.type === 'Saída' ? -1 : 1; postFinancialEntry({ idempotencyKey: `cash-movement:${movement.id}`, sourceType: 'cash-movement', sourceId: movement.id, eventType: movement.type === 'Saída' ? classification : 'Entrada manual', category: classification, description: movement.note, amount: movement.amount, locationId: session.locationId, cashImpact: sign * movement.amount, profitImpact: 0 });
      }
      audit(`Movimento de caixa: ${values.type}`, `${values.note.trim()} — ${money(amount)}`);
    }
    if (!persistOrRollback(snapshot, false)) return;
    closeModal(); notify(sellerRequest ? 'Pedido enviado. Aguarde a aprovação do administrador.' : 'Movimento de caixa registado.'); renderCash();
  });
}
function renderCashMovementApprovals() {
  const panel = $('#cashApprovalPanel'); if (!panel) return;
  const visible = currentUser?.role === 'Administrador';
  panel.hidden = !visible;
  if (visible) {
    const requests = (data.cashMovementRequests || []).filter(item => item.status === 'Pendente').sort((a,b) => new Date(a.requestedAt) - new Date(b.requestedAt));
    $('#cashApprovalCount').textContent = `${requests.length} pendente${requests.length === 1 ? '' : 's'}`;
    $('#cashApprovalTable').innerHTML = requests.length ? requests.map(item => `<tr><td>${fullDate(item.requestedAt)}</td><td>${escapeHtml(userById(item.userId)?.name || 'Vendedor')}</td><td><span class="status ${item.type === 'Saída' ? 'danger' : 'completed'}">${item.type}</span></td><td class="money"><b>${money(item.amount)}</b></td><td>${escapeHtml(item.note)}</td><td>${escapeHtml(data.cashSessions.find(s => s.id === item.sessionId)?.status === 'Aberto' ? 'Aberto' : 'Fechado')}</td><td><button class="action-btn" data-cash-request="approve" data-id="${item.id}">Aprovar</button> <button class="action-btn text-danger" data-cash-request="reject" data-id="${item.id}">Rejeitar</button></td></tr>`).join('') : emptyRow(7, 'Não existem pedidos pendentes.');
  }
  const minePanel = $('#cashMyRequestsPanel');
  if (minePanel) {
    const mine = (data.cashMovementRequests || []).filter(item => item.userId === currentUser.id).sort((a,b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    minePanel.hidden = !isSeller();
    if (isSeller()) $('#cashMyRequestsTable').innerHTML = mine.length ? mine.map(item => `<tr><td>${fullDate(item.requestedAt)}</td><td>${escapeHtml(item.type)}</td><td class="money">${money(item.amount)}</td><td>${escapeHtml(item.note)}</td><td><span class="status ${item.status === 'Aprovado' ? 'completed' : item.status === 'Rejeitado' ? 'danger' : 'pending'}">${escapeHtml(item.status)}</span></td></tr>`).join('') : emptyRow(5, 'Ainda não enviou pedidos.');
  }
}
function decideCashMovementRequest(id, decision) {
  if (currentUser?.role !== 'Administrador') return notify('Só o administrador pode decidir estes pedidos.');
  const request = (data.cashMovementRequests || []).find(item => item.id === id && item.status === 'Pendente');
  if (!request) return notify('Este pedido já foi decidido ou não existe.');
  const session = data.cashSessions.find(item => item.id === request.sessionId);
  if (decision === 'approve' && (!session || session.status !== 'Aberto')) return notify('Não é possível aprovar: o turno original já está fechado.');
  const snapshot = captureDataSnapshot();
  request.status = decision === 'approve' ? 'Aprovado' : 'Rejeitado'; request.decidedBy = currentUser.id; request.decidedAt = new Date().toISOString();
  if (decision === 'approve') {
    const approvedMovement = { id: uid('cashmov'), sessionId: request.sessionId, userId: request.userId, date: new Date().toISOString(), type: request.type, amount: request.amount, note: request.note, approvedBy: currentUser.id, requestId: request.id }; data.cashMovements.push(approvedMovement); postFinancialEntry({ idempotencyKey: `cash-request:${request.id}:approved`, sourceType: 'cash-request', sourceId: request.id, eventType: request.type === 'Saída' ? 'Saída manual aprovada' : 'Entrada manual aprovada', category: 'Ajuste de caixa', description: request.note, amount: request.amount, locationId: session.locationId, cashImpact: request.type === 'Saída' ? -request.amount : request.amount });
    audit('Pedido de movimento aprovado', `${request.type} · ${money(request.amount)} · solicitado por ${userById(request.userId)?.name || request.userId}`);
  } else audit('Pedido de movimento rejeitado', `${request.type} · ${money(request.amount)} · ${request.note}`);
  if (!persistOrRollback(snapshot, false)) return;
  notify(decision === 'approve' ? 'Pedido aprovado e movimento lançado no caixa.' : 'Pedido rejeitado.'); renderCash();
}

function cashCloseModal() {
  if (sessionLocked) return accountModal();
  const session = currentCashSession(); if (!session) return cashOpenModal(); const values = cashSessionAmounts(session);
  openModal(`${modalHeader('Fechar caixa', 'Conte o dinheiro físico antes de confirmar o fecho.')}<div class="sale-summary"><div><span>Fundo inicial</span><strong>${money(values.opening)}</strong></div><div><span>Vendas em dinheiro</span><strong>${money(values.sales)}</strong></div><div><span>Movimentos líquidos</span><strong>${money(values.in - values.out)}</strong></div><div><span>Valor esperado</span><strong>${money(values.expected)}</strong></div></div><form id="cashCloseForm"><div class="modal-form"><label>Valor contado (Kz)<input name="countedAmount" type="number" min="0" step="0.01" required value="${values.expected.toFixed(2)}" /></label><label>Diferença<input id="cashDifference" value="0,00 Kz" disabled /></label><label class="full">Observação de fecho<input name="closingNote" placeholder="Explique qualquer diferença encontrada" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar fecho</button></div></form>`);
  const form = $('#cashCloseForm'); const refreshDifference = () => { $('#cashDifference').value = money(Number(form.elements.countedAmount.value || 0) - values.expected); }; form.elements.countedAmount.addEventListener('input', refreshDifference);
  form.addEventListener('submit', event => { event.preventDefault(); const formValues = Object.fromEntries(new FormData(form).entries()); const counted = Number(formValues.countedAmount); if (!Number.isFinite(counted) || counted < 0) return notify('Introduza um valor contado válido.'); const difference = roundMoney(counted - values.expected); if (difference !== 0 && !formValues.closingNote.trim()) return notify('Explique a diferença de caixa antes de fechar.'); const snapshot = captureDataSnapshot(); Object.assign(session, { status: 'Fechado', closedAt: new Date().toISOString(), countedAmount: roundMoney(counted), expectedAmount: roundMoney(values.expected), difference, closingNote: formValues.closingNote.trim() }); audit('Fecho de caixa', `Esperado: ${money(values.expected)} · Contado: ${money(counted)} · Diferença: ${money(difference)}`); if (!persistOrRollback(snapshot, false)) return; closeModal(); notify('Caixa fechado e registado.'); renderCash(); });
}
function renderDocuments() { filterDocuments(); }
function filterDocuments() {
  const search = $('.filter-input[data-table="documents"]').value.trim().toLowerCase(); const status = $('#documentStatusFilter').value;
  const sales = data.sales.filter(sale => { const customer = saleCustomer(sale); const owner = !isSeller() || sale.operatorId === currentUser.id; return owner && (!status || sale.status === status) && (!search || `${sale.reference} ${customer.name} ${customer.nif}`.toLowerCase().includes(search)); });
  $('#documentsTable').innerHTML = sales.length ? [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => { const customer = saleCustomer(sale); const canReturn = canManage() && sale.status !== 'Devolvida'; return `<tr><td>${shortDate(sale.date)}</td><td><b>${escapeHtml(sale.reference)}</b><br><small class="muted">${escapeHtml(sale.documentType || 'Documento')}</small></td><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.nif || '—')}</td><td>${escapeHtml(sale.payment)}</td><td class="money"><b>${money(sale.total)}</b></td><td><span class="status ${sale.status === 'Devolvida' ? 'danger' : (saleBalanceDue(sale) ? 'pending' : 'completed')}">${sale.status === 'Devolvida' ? 'Devolvida' : (saleBalanceDue(sale) ? 'Em dívida' : 'Concluída')}</span></td><td><button class="action-btn" data-document-action="print" data-id="${sale.id}">Imprimir</button>${canManage() && sale.status !== 'Devolvida' ? `<button class="action-btn" data-document-action="fiscal-register" data-id="${sale.id}">Preparar registo fiscal</button>` : ''}${canReturn ? `<button class="action-btn text-danger" data-document-action="return" data-id="${sale.id}">Devolver</button>` : ''}</td></tr>`; }).join('') : emptyRow(8, isSeller() ? 'Ainda não realizou vendas nesta sessão.' : 'Nenhum documento encontrado.');
}
function canAccessDocument(sale) { return Boolean(sale && (!isSeller() || sale.operatorId === currentUser.id)); }
function returnSaleModal(sale) {
  if (!canManage()) return notify('Apenas gerentes e administradores podem processar devoluções.');
  if (!sale || sale.status === 'Devolvida') return notify('Este documento já foi devolvido.');
  const refundable = Math.max(0, Number(sale.amountPaid || 0));
  openModal(`${modalHeader('Processar devolução', `Documento ${sale.reference} · ${money(sale.total)}`)}<p class="modal-note">A devolução cria uma nota de crédito interna, repõe todo o stock e anula o saldo pendente. Valor já pago a devolver: <b>${money(refundable)}</b>.</p><form id="returnForm"><div class="modal-form">${refundable ? `<label>Meio de reembolso<select name="refundPayment"><option ${sale.payment === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option><option ${sale.payment === 'Transferência' ? 'selected' : ''}>Transferência</option><option ${sale.payment === 'Multicaixa' ? 'selected' : ''}>Multicaixa</option><option>Crédito em conta</option></select></label><label>Valor a reembolsar (Kz)<input name="refundAmount" type="number" min="0" max="${refundable}" step="0.01" required value="${refundable.toFixed(2)}" /></label>` : '<div class="full payment-feedback">Não existe valor pago a reembolsar; será anulada apenas a dívida do documento.</div>'}<label class="full">Motivo da devolução<textarea name="reason" required rows="3" placeholder="Ex.: artigo danificado, troca autorizada"></textarea></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar devolução</button></div></form>`);
  $('#returnForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const reason = values.reason.trim(); const refundAmount = refundable ? Number(values.refundAmount) : 0; const receivableBeforeReturn = saleBalanceDue(sale); const costBeforeReturn = sum(sale.items, item => Number(item.cost || 0) * Number(item.quantity || 0)); if (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > refundable || Math.abs(refundAmount - refundable) > 0.01) return notify('A devolução total exige o reembolso integral do valor já recebido. Para uma compensação parcial, não processe a devolução total.'); const saleLocationId = sale.locationId || currentLocationId(); const snapshot = captureDataSnapshot(); const session = values.refundPayment === 'Dinheiro' && refundAmount > 0 ? data.cashSessions.find(item => item.status === 'Aberto' && item.userId === currentUser.id && item.locationId === saleLocationId) : null; if (values.refundPayment === 'Dinheiro' && refundAmount > 0 && !session) return notify('Abra o seu caixa na loja da venda antes de efectuar um reembolso em dinheiro.'); sale.status = 'Devolvida'; sale.paymentStatus = 'Anulada'; sale.balanceDue = 0; sale.items.forEach(item => { const product = productById(item.productId); if (product) { const returnedQty = Number(item.quantity); const stockBefore = totalStock(product); const historicalCost = Number(item.cost || 0); const weightedCost = window.VendaMaisFinance.weightedAverageCost(stockBefore, Number(product.cost || 0), returnedQty, historicalCost); changeStock(product, saleLocationId, returnedQty); product.cost = roundMoney(weightedCost); data.movements.push({ id: uid('mov'), date: new Date().toISOString(), locationId: saleLocationId, productId: product.id, productName: product.name, type: 'Entrada', quantity: Number(item.quantity), note: `Devolução ${sale.reference}` }); } }); if (session) data.cashMovements.push({ id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: 'Saída', amount: refundAmount, note: `Reembolso ${sale.reference}` }); const creditReference = nextReference('NC', data.returns); const returnRecord = { id: uid('return'), saleId: sale.id, reference: creditReference, date: new Date().toISOString(), reason, amount: sale.total, refundAmount, refundPayment: values.refundPayment || '', userId: currentUser.id }; data.returns.push(returnRecord); postFinancialEntry({ idempotencyKey: `return:${returnRecord.id}`, sourceType: 'return', sourceId: returnRecord.id, eventType: 'Devolução de venda', category: 'Nota de crédito', description: `Devolução ${sale.reference}`, amount: sale.total, date: returnRecord.date, locationId: saleLocationId, cashImpact: -refundAmount, profitImpact: -roundMoney(Number(sale.total || 0) - Number(sale.tax || 0) - costBeforeReturn), inventoryImpact: costBeforeReturn, receivableImpact: -receivableBeforeReturn, payment: values.refundPayment || '' }); audit('Devolução / nota de crédito', `${sale.reference} · ${creditReference} · ${locationName(saleLocationId)} · reembolso ${money(refundAmount)} · ${reason}`); if (!persistOrRollback(snapshot)) return; window.VendaMaisCloud?.updateSale(sale).then(result => { if (result?.queued) notify('Devolução guardada localmente; sincronização online pendente.'); }); closeModal(); notify('Devolução registada e stock reposto.'); renderAll(); });
}

function expenseModal() {
  if (!canManage()) return notify('Apenas a área de gestão pode registar despesas.');
  openModal(`${modalHeader('Registar despesa', 'Classifique o custo e, se for recorrente, o sistema considera-o automaticamente em cada mês.')}<form id="expenseForm"><div class="modal-form"><label class="full">Descrição<input name="description" required maxlength="120" placeholder="Ex.: renda, energia, internet" /></label><label>Categoria<select name="category"><option>Renda</option><option>Salários</option><option>Energia</option><option>Água</option><option>Internet</option><option>Segurança</option><option>Transporte</option><option>Comunicações</option><option>Manutenção</option><option>Material de escritório</option><option>Impostos e taxas</option><option>Outras despesas</option></select></label><label>Tipo de custo<select name="costType"><option value="Fixo">Fixo</option><option value="Variável">Variável</option></select></label><label>Valor (Kz)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Data de início<input name="date" type="date" required value="${dateISO()}" /></label><label>Periodicidade<select name="recurrence"><option value="Única">Uma vez</option><option value="Mensal">Mensal (recorrente)</option></select></label><label>Loja<select name="locationId">${activeLocations().map(location => `<option value="${location.id}" ${location.id === currentLocationId() ? 'selected' : ''}>${escapeHtml(location.name)}</option>`).join('')}</select></label><label>Meio de pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option><option>Crédito</option></select></label><label class="full">Observação<input name="note" maxlength="240" placeholder="Referência ou informação adicional" /></label><label class="full"><span><input name="coversConfiguredCost" type="checkbox" /> Esta despesa corresponde a um custo fixo já configurado nesta loja</span></label></div><div class="modal-note">Uma despesa mensal recorrente é projectada nos relatórios de cada mês. Marque a opção apenas quando esta despesa substituir o mesmo custo fixo configurado, para evitar duplicação.</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar despesa</button></div></form>`);
  $('#expenseForm').addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) return notify('Introduza um valor de despesa válido.');
    if (values.payment === 'Crédito' && values.recurrence === 'Mensal') return notify('Registe cada despesa a crédito como uma ocorrência única, para controlar correctamente cada factura e pagamento.');
    const fixedCategories = ['Renda', 'Salários', 'Energia', 'Água', 'Internet', 'Segurança'];
    const variableCategories = ['Transporte', 'Manutenção', 'Material de escritório', 'Impostos e taxas'];
    const classificationMismatch = (fixedCategories.includes(values.category) && values.costType !== 'Fixo') || (variableCategories.includes(values.category) && values.costType !== 'Variável');
    if (classificationMismatch && !confirm('A categoria e o tipo de custo parecem não corresponder. Deseja guardar mesmo assim?')) return;
    const locationId = values.locationId || currentLocationId();
    const cashSession = values.payment === 'Dinheiro' ? data.cashSessions.find(item => item.status === 'Aberto' && item.userId === currentUser.id && item.locationId === locationId) : null;
    if (values.payment === 'Dinheiro' && !cashSession) return notify('Abra o seu caixa nesta loja antes de registar uma despesa paga em dinheiro.');
    const snapshot = captureDataSnapshot();
    const expense = { id: uid('expense'), date: values.date, description: values.description.trim(), category: values.category, costType: values.costType, recurrence: values.recurrence, amount: roundMoney(amount), payment: values.payment, amountPaid: values.payment === 'Crédito' ? 0 : roundMoney(amount), balanceDue: values.payment === 'Crédito' ? roundMoney(amount) : 0, paymentStatus: values.payment === 'Crédito' ? 'Pendente' : 'Pago', note: values.note.trim(), coversConfiguredCost: values.coversConfiguredCost === 'on', locationId, userId: currentUser.id, cashSessionId: cashSession?.id || '', createdAt: new Date().toISOString() };
    data.expenses.push(expense);
    if (cashSession) data.cashMovements.push({ id: uid('cashmov'), sessionId: cashSession.id, userId: currentUser.id, date: `${values.date}T12:00:00`, type: 'Saída', amount: expense.amount, note: `Despesa: ${expense.description}` });
    postFinancialEntry({ idempotencyKey: `expense:${expense.id}:created`, sourceType: 'expense', sourceId: expense.id, eventType: 'Despesa', category: expense.costType === 'Fixo' ? 'Despesa fixa' : 'Despesa variável', description: expense.description, amount: expense.amount, date: `${values.date}T12:00:00`, locationId, cashImpact: -Number(expense.amountPaid || 0), profitImpact: -expense.amount, liabilityImpact: Number(expense.balanceDue || 0), payment: values.payment });
    audit('Despesa registada', `${expense.description} · ${money(amount)} · ${expense.costType} · ${locationName(expense.locationId)} · ${expense.recurrence}`);
    if (!persistOrRollback(snapshot, false)) return;
    closeModal(); renderReports(); notify('Despesa registada com sucesso.');
  });
}

function expenseOccurrences(start, end) {
  const rows = [];
  data.expenses.forEach(expense => {
    if (expense.recurrence !== 'Mensal') {
      if (expense.date >= start && expense.date <= end) rows.push({ ...expense, occurrenceDate: expense.date });
      return;
    }
    const first = new Date(`${expense.date}T12:00:00`); const cursor = new Date(`${start.slice(0, 7)}-01T12:00:00`); cursor.setDate(1);
    while (cursor <= new Date(`${end}T12:00:00`)) {
      const year = cursor.getFullYear(), month = cursor.getMonth(); const day = Math.min(first.getDate(), new Date(year, month + 1, 0).getDate());
      const occurrenceDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (occurrenceDate >= expense.date && occurrenceDate >= start && occurrenceDate <= end) rows.push({ ...expense, occurrenceDate });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  });
  return rows;
}
function weekOfMonth(dateValue) { return Math.floor((Number(dateValue.slice(8, 10)) - 1) / 7) + 1; }
function dateFromISO(value) { return new Date(`${String(value).slice(0, 10)}T12:00:00`); }
function isoFromDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function daysInMonth(year, monthIndex) { return new Date(year, monthIndex + 1, 0).getDate(); }
function inclusiveDays(start, end) { return Math.max(0, Math.round((dateFromISO(end) - dateFromISO(start)) / 86400000) + 1); }
function monthKeysBetween(start, end) {
  const keys = []; const cursor = new Date(`${start.slice(0, 7)}-01T12:00:00`); const final = new Date(`${end.slice(0, 7)}-01T12:00:00`);
  while (cursor <= final) { keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`); cursor.setMonth(cursor.getMonth() + 1); }
  return keys;
}
function shortMonth(value) { return new Intl.DateTimeFormat('pt-PT', { month: 'short', year: 'numeric' }).format(dateFromISO(`${value.slice(0, 7)}-01`)); }
function allocatedMonthlyCost(monthlyValue, start, end) {
  return monthKeysBetween(start, end).reduce((total, monthKey) => {
    const [year, month] = monthKey.split('-').map(Number); const monthStartValue = `${monthKey}-01`; const monthEndValue = `${monthKey}-${String(daysInMonth(year, month - 1)).padStart(2, '0')}`;
    const includedStart = start > monthStartValue ? start : monthStartValue; const includedEnd = end < monthEndValue ? end : monthEndValue;
    return total + window.VendaMaisFinance.prorateMonthlyCost(monthlyValue, inclusiveDays(includedStart, includedEnd), daysInMonth(year, month - 1));
  }, 0);
}
function saleOperatorName(sale) { return sale.operatorName || userById(sale.operatorId)?.name || 'Sem vendedor atribuído'; }
function sellerKey(sale) { return sale.operatorId || (sale.operatorName ? `legacy:${sale.operatorName}` : 'unassigned'); }
function paymentMethods(sales) { return [...new Set(['Dinheiro', 'Multicaixa', 'Transferência', 'Crédito', 'Outro', ...sales.map(sale => sale.payment).filter(Boolean)])]; }
function reportStores(locationFilter = 'all') { return data.locations.filter(location => location.type === 'Loja' && location.active && (locationFilter === 'all' || location.id === locationFilter)); }
function fixedExpenseCategories(label) {
  const map = { Renda: ['Renda'], Energia: ['Energia e água'], Água: ['Energia e água'], Internet: ['Comunicações'], Salários: ['Salários'], Segurança: ['Outras despesas'], Outros: ['Outras despesas'] };
  return map[label] || [label];
}
function configuredFixedCostRows(stores, start, end, expenses = []) {
  return stores.flatMap(location => FIXED_COST_LABELS.map(label => {
    const monthly = Number(location.fixedCosts?.[label] || 0);
    if (monthly <= 0) return null;
    const categories = fixedExpenseCategories(label);
    const months = monthKeysBetween(start, end);
    let allocated = 0;
    let coveredByActual = false;
    months.forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthStart = `${monthKey}-01`;
      const monthEnd = `${monthKey}-${String(daysInMonth(year, month - 1)).padStart(2, '0')}`;
      const includedStart = start > monthStart ? start : monthStart;
      const includedEnd = end < monthEnd ? end : monthEnd;
      const hasActualExpense = window.VendaMaisFinance.hasActualFixedExpense(expenses, location.id, categories, monthKey);
      if (hasActualExpense) coveredByActual = true;
      else allocated += window.VendaMaisFinance.prorateMonthlyCost(monthly, inclusiveDays(includedStart, includedEnd), daysInMonth(year, month - 1));
    });
    return { location, label, monthly, allocated: roundMoney(allocated), coveredByActual };
  }).filter(Boolean));
}
function calculateReport(start, end, locationFilter = 'all') {
  const inLocation = item => locationFilter === 'all' || item.locationId === locationFilter;
  const sales = salesBetween(start, end).filter(inLocation); const expenses = expenseOccurrences(start, end).filter(inLocation); const receipts = data.receipts.filter(receipt => { const sale = data.sales.find(item => item.id === receipt.saleId); const date = String(receipt.date || '').slice(0, 10); return date >= start && date <= end && sale && inLocation(sale) && sale.status !== 'Devolvida'; }); const stores = reportStores(locationFilter);
  const configuredFixed = configuredFixedCostRows(stores, start, end, expenses); const configuredFixedTotal = roundMoney(sum(configuredFixed, row => row.allocated));
  const registeredFixed = roundMoney(sum(expenses.filter(item => item.costType === 'Fixo'), item => item.amount)); const variableTotal = roundMoney(sum(expenses.filter(item => item.costType !== 'Fixo'), item => item.amount));
  const revenue = roundMoney(sum(sales, sale => sale.total)); const tax = roundMoney(sum(sales, sale => sale.tax)); const netRevenue = roundMoney(revenue - tax); const cogs = roundMoney(sum(sales, saleCost)); const grossProfit = roundMoney(netRevenue - cogs);
  const salesIssues = sales.reduce((count, sale) => {
    const items = Array.isArray(sale.items) ? sale.items : [];
    const missingCosts = items.filter(item => { const cost = Number(item.cost); return item.cost === undefined || item.cost === null || !Number.isFinite(cost) || cost <= 0; }).length;
    const subtotal = Number(sale.subtotal), discountValue = Number(sale.discountValue || 0), taxValue = Number(sale.tax), total = Number(sale.total);
    const lineSubtotal = roundMoney(sum(items, item => Number(item.price) * Number(item.quantity)));
    const totalsInvalid = ![subtotal, discountValue, taxValue, total].every(Number.isFinite) || subtotal < 0 || discountValue < 0 || taxValue < 0 || total < 0 || Math.abs(roundMoney(subtotal - discountValue + taxValue) - total) > 0.02 || Math.abs(lineSubtotal - subtotal) > 0.02;
    const settlementInvalid = sale.settlementIntegrityWarning === true || !window.VendaMaisFinance.validateSettlement(total, sale.amountPaid, sale.balanceDue).valid;
    return count + missingCosts + Number(totalsInvalid) + Number(settlementInvalid);
  }, 0);
  const purchaseIssues = data.purchases.filter(inLocation).reduce((count, purchase) => {
    const items = Array.isArray(purchase.items) ? purchase.items : [];
    const lineTotal = roundMoney(sum(items, item => Number(item.unitCost) * Number(item.quantity)));
    const total = Number(purchase.total);
    const totalsInvalid = !Number.isFinite(total) || total < 0 || Math.abs(lineTotal - total) > 0.02;
    const settlementInvalid = purchase.settlementIntegrityWarning === true || !window.VendaMaisFinance.validateSettlement(total, purchase.amountPaid, purchase.balanceDue).valid;
    return count + Number(totalsInvalid) + Number(settlementInvalid);
  }, 0);
  const costIssues = salesIssues + purchaseIssues;
  const fixedTotal = roundMoney(configuredFixedTotal + registeredFixed); const operatingCosts = roundMoney(fixedTotal + variableTotal); const profit = roundMoney(grossProfit - operatingCosts);
  const receivable = roundMoney(sum(sales, saleBalanceDue)); const payable = roundMoney(sum(data.purchases.filter(purchase => Number(purchase.balanceDue || 0) > 0 && inLocation(purchase)), purchase => purchase.balanceDue) + sum(data.expenses.filter(expense => Number(expense.balanceDue || 0) > 0 && inLocation(expense)), expense => expense.balanceDue));
  const stockValue = roundMoney(sum(data.products, product => sum(Object.entries(product.stockByLocation || {}).filter(([id]) => locationFilter === 'all' || id === locationFilter), ([id, qty]) => Number(qty || 0) * Number(product.cost || 0))));
  return { start, end, locationFilter, sales, receipts, expenses, stores, configuredFixed, configuredFixedTotal, registeredFixed, fixedTotal, variableTotal, operatingCosts, revenue, tax, netRevenue, cogs, grossProfit, profit, receivable, payable, stockValue, costIssues, profitReliable: costIssues === 0 };
}
function previousPeriod(start, end) {
  const days = inclusiveDays(start, end); const previousEnd = dateFromISO(start); previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate() - days + 1);
  return { start: isoFromDate(previousStart), end: isoFromDate(previousEnd) };
}
function reportTrendHtml(report) {
  const days = inclusiveDays(report.start, report.end); const buckets = new Map();
  if (days <= 31) {
    for (let i = 0; i < days; i++) { const date = dateFromISO(report.start); date.setDate(date.getDate() + i); const key = isoFromDate(date); buckets.set(key, { label: key.slice(8, 10) + '/' + key.slice(5, 7), sales: 0, expenses: 0 }); }
    report.sales.forEach(sale => { const row = buckets.get(sale.date.slice(0, 10)); if (row) row.sales += Number(sale.total || 0); });
    report.expenses.forEach(expense => { const row = buckets.get(expense.occurrenceDate); if (row) row.expenses += Number(expense.amount || 0); });
  } else {
    monthKeysBetween(report.start, report.end).forEach(month => buckets.set(month, { label: shortMonth(month), sales: 0, expenses: 0 }));
    report.sales.forEach(sale => { const row = buckets.get(sale.date.slice(0, 7)); if (row) row.sales += Number(sale.total || 0); });
    report.expenses.forEach(expense => { const row = buckets.get(expense.occurrenceDate.slice(0, 7)); if (row) row.expenses += Number(expense.amount || 0); });
  }
  const rows = [...buckets.values()]; const max = Math.max(1, ...rows.flatMap(row => [row.sales, row.expenses]));
  return rows.length ? `<div class="trend-legend"><span><i class="sales-dot"></i>Faturação</span><span><i class="expense-dot"></i>Despesas registadas</span></div><div class="trend-bars">${rows.map(row => `<div class="trend-column" title="${escapeHtml(row.label)} · Faturação ${money(row.sales)} · Despesas ${money(row.expenses)}"><div class="trend-pair"><i class="trend-bar sales-bar" style="height:${Math.max(2, row.sales / max * 100)}%"></i><i class="trend-bar expense-bar" style="height:${Math.max(2, row.expenses / max * 100)}%"></i></div><small>${escapeHtml(row.label)}</small></div>`).join('')}</div>` : '<div class="empty-state">Sem dados para o período seleccionado.</div>';
}
function statementHtml(report) {
  const resultText = report.costIssues ? 'Por apurar · dados financeiros por validar' : money(report.profit);
  return `<div class="statement-row"><span>Faturação (com IVA)</span><strong>${money(report.revenue)}</strong></div><div class="statement-row"><span>IVA incluído</span><strong>− ${money(report.tax)}</strong></div><div class="statement-row subtotal"><span>Vendas líquidas (sem IVA)</span><strong>${money(report.netRevenue)}</strong></div><div class="statement-row"><span>Custo dos produtos vendidos</span><strong>− ${money(report.cogs)}</strong></div><div class="statement-row subtotal"><span>Resultado bruto</span><strong>${money(report.grossProfit)}</strong></div><div class="statement-row"><span>Custos fixos configurados (pro rata)</span><strong>− ${money(report.configuredFixedTotal)}</strong></div><div class="statement-row"><span>Despesas fixas registadas</span><strong>− ${money(report.registeredFixed)}</strong></div><div class="statement-row subtotal"><span>Total de custos fixos</span><strong>− ${money(report.fixedTotal)}</strong></div><div class="statement-row"><span>Custos variáveis</span><strong>− ${money(report.variableTotal)}</strong></div><div class="statement-row emphasis ${report.profit < 0 || report.costIssues ? 'loss' : ''}"><span>Resultado líquido estimado</span><strong>${resultText}</strong></div><div class="statement-row information"><span>Contas a receber do período</span><strong>${money(report.receivable)}</strong></div><div class="statement-row information"><span>Contas a pagar (saldo actual)</span><strong>${money(report.payable)}</strong></div>`;
}
function productPerformance(sales) {
  const products = {};
  sales.forEach(sale => sale.items.forEach(item => {
    const key = item.productId || item.code || item.name; const gross = Number(item.quantity || 0) * Number(item.price || 0); const saleGlobalDiscount = Number(sale.subtotal || 0) > 0 ? Number(sale.discountValue || 0) - sum(sale.items || [], line => Number(line.discountValue || 0)) : 0; const discountFactor = Number(sale.subtotal || 0) > 0 ? Math.max(0, (Number(sale.subtotal) - sum(sale.items || [], line => Number(line.discountValue || 0)) - saleGlobalDiscount) / Math.max(0.01, Number(sale.subtotal) - sum(sale.items || [], line => Number(line.discountValue || 0)))) : 1;
    if (!products[key]) products[key] = { code: item.code || '—', name: item.name || 'Produto sem nome', quantity: 0, gross: 0, net: 0, cost: 0 };
    products[key].quantity += Number(item.quantity || 0); products[key].gross += gross; products[key].net += Math.max(0, gross - Number(item.discountValue || 0)) * discountFactor; products[key].cost += Number(item.cost || 0) * Number(item.quantity || 0);
  }));
  return Object.values(products).map(product => ({ ...product, margin: product.net - product.cost })).sort((a, b) => b.net - a.net);
}
function sellerOptions(sales) {
  const options = new Map(data.users.filter(user => user.role === 'Vendedor').map(user => [user.id, user.name]));
  sales.forEach(sale => options.set(sellerKey(sale), saleOperatorName(sale)));
  return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}
function sellerRollup(sales, selectedSeller = 'all') {
  const filtered = selectedSeller === 'all' ? sales : sales.filter(sale => sellerKey(sale) === selectedSeller);
  const summary = new Map(); const daily = new Map(); const monthly = new Map();
  filtered.forEach(sale => {
    const key = sellerKey(sale); const name = saleOperatorName(sale); const add = (map, mapKey, extra = {}) => { const row = map.get(mapKey) || { sellerKey: key, seller: name, count: 0, total: 0, receivable: 0, ...extra }; row.count += 1; row.total += Number(sale.total || 0); row.receivable += saleBalanceDue(sale); map.set(mapKey, row); };
    add(summary, key); add(daily, `${sale.date.slice(0, 10)}|${key}`, { date: sale.date.slice(0, 10) }); add(monthly, `${sale.date.slice(0, 7)}|${key}`, { month: sale.date.slice(0, 7) });
  });
  const values = map => [...map.values()].map(row => ({ ...row, average: row.count ? row.total / row.count : 0 }));
  return { sales: filtered, summary: values(summary).sort((a, b) => b.total - a.total), daily: values(daily).sort((a, b) => b.date.localeCompare(a.date) || a.seller.localeCompare(b.seller)), monthly: values(monthly).sort((a, b) => b.month.localeCompare(a.month) || a.seller.localeCompare(b.seller)) };
}
function renderReports() {
  const startInput = $('#reportStart'), endInput = $('#reportEnd'); if (!startInput.value) startInput.value = monthStart(); if (!endInput.value) endInput.value = dateISO();
  const locationSelect = $('#reportLocationFilter'); if (locationSelect) { const previous = locationSelect.value || 'all'; locationSelect.innerHTML = '<option value="all">Todas as lojas</option>' + activeLocations().filter(location => location.type === 'Loja').map(location => `<option value="${location.id}">${escapeHtml(location.name)}</option>`).join(''); locationSelect.value = [...locationSelect.options].some(option => option.value === previous) ? previous : 'all'; }
  const start = startInput.value, end = endInput.value, locationFilter = locationSelect?.value || 'all';
  if (!start || !end || end < start) { notify('A data final do relatório deve ser igual ou posterior à data inicial.'); return; }
  const report = calculateReport(start, end, locationFilter); const periodLabel = $('#reportPeriodLabel'); if (periodLabel) periodLabel.textContent = `Período analisado: ${reportPeriod(start, end)} · ${locationFilter === 'all' ? 'todas as lojas' : locationName(locationFilter)}`;
  const profitLabel = report.costIssues ? 'Por apurar' : money(report.profit);
  const profitHint = report.costIssues ? `${report.costIssues} inconsistência(s) de custo, IVA, total ou liquidação` : (report.revenue ? `${number(report.profit / report.revenue * 100)}% da faturação · após custos` : 'Sem vendas no período');
  $('#reportMetrics').innerHTML = [['Faturação c/ IVA', money(report.revenue), `${report.sales.length} vendas concluídas`, '↗', 'positive'], ['Vendas s/ IVA', money(report.netRevenue), 'Faturação menos IVA incluído', '◈', ''], ['Resultado líquido estimado', profitLabel, profitHint, '◇', report.costIssues ? 'warning' : (report.profit >= 0 ? 'positive' : 'warning')], ['Por receber', money(report.receivable), 'Crédito de clientes ainda em aberto', '◷', report.receivable ? 'warning' : 'positive'], ['Por pagar', money(report.payable), 'Compras e despesas a crédito', '↘', report.payable ? 'warning' : 'positive'], ['Custos operacionais', money(report.operatingCosts), 'Custos fixos + variáveis', '⌂', ''], ['Valor do stock actual', money(report.stockValue), 'Stock disponível × custo unitário registado', '▦', ''], ['Ticket médio', money(report.sales.length ? report.revenue / report.sales.length : 0), 'Faturação ÷ número de vendas', '◎', '']].map(([label, value, hint, icon, kind]) => `<article class="metric-card" title="${escapeHtml(label)}"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#incomeStatement').innerHTML = statementHtml(report); if ($('#incomeStatementDetail')) $('#incomeStatementDetail').innerHTML = statementHtml(report);
  const quality = $('#reportQuality'); if (quality) { quality.hidden = report.costIssues === 0; quality.innerHTML = `<strong>Resultado ainda não pode ser confirmado.</strong><span>Existem ${report.costIssues} inconsistência(s) em custos, IVA, total ou liquidação. Confira os artigos vendidos e comprados, os cálculos, o IVA e os pagamentos antes de usar o resultado.</span>`; }
  const trend = $('#reportTrend'); if (trend) trend.innerHTML = reportTrendHtml(report);
  const prior = previousPeriod(start, end); const previous = calculateReport(prior.start, prior.end, locationFilter); const delta = previous.revenue ? ((report.revenue - previous.revenue) / previous.revenue) * 100 : (report.revenue ? null : 0);
  const comparison = $('#reportComparison'); if (comparison) comparison.innerHTML = `<div class="comparison-line"><span>Período actual</span><strong>${money(report.revenue)}</strong></div><div class="comparison-line"><span>Período anterior (${reportPeriod(prior.start, prior.end)})</span><strong>${money(previous.revenue)}</strong></div><div class="comparison-result ${delta !== null && delta < 0 ? 'negative' : 'positive'}"><b>${delta === null ? 'Sem base anterior para comparar' : `${delta >= 0 ? '+' : ''}${number(delta)}%`}</b><span>${delta === null ? 'Ainda não existem vendas no período anterior.' : 'Variação do faturamento face ao período anterior.'}</span></div>`;
  const guide = $('#calculationGuide'); if (guide) guide.innerHTML = `<div><b>Faturação</b><span>Soma das vendas concluídas no período, incluindo IVA.</span></div><div><b>Vendas líquidas</b><span>Faturação com IVA − IVA incluído.</span></div><div><b>Resultado bruto</b><span>Vendas líquidas − custo histórico dos produtos vendidos.</span></div><div><b>Custos fixos</b><span>Custos mensais configurados, proporcionais aos dias do período, + despesas fixas registadas. Evite lançar o mesmo custo duas vezes.</span></div><div><b>Resultado líquido estimado</b><span>Resultado bruto − custos fixos − custos variáveis. Se faltar custo de algum artigo vendido, o sistema apresenta “Por apurar”.</span></div><div><b>Caixa e crédito</b><span>Caixa é dinheiro efectivamente esperado nos turnos abertos. Contas a receber e a pagar são saldos, não lucro.</span></div><div><b>Ticket médio</b><span>Faturação total ÷ quantidade de vendas concluídas.</span></div><div><b>Valor do stock</b><span>Quantidade disponível × custo unitário registado de cada produto.</span></div>`;
  const paymentRows = paymentMethods(report.sales).map(method => {
    const directSales = report.sales.filter(sale => sale.payment === method && sale.payment !== 'Crédito');
    const directTotal = sum(directSales, sale => sale.amountPaid ?? sale.total);
    const receivedRows = report.receipts.filter(receipt => receipt.payment === method);
    const receivedTotal = sum(receivedRows, receipt => receipt.amount);
    const total = roundMoney(directTotal + receivedTotal);
    const count = directSales.length + receivedRows.length;
    return total > 0 ? `<div class="summary-row"><span>${escapeHtml(method)} <small class="muted">(${count})</small></span><strong>${money(total)}</strong></div>` : '';
  }).filter(Boolean); $('#paymentSummary').innerHTML = paymentRows.length ? paymentRows.join('') : '<div class="empty-state">Ainda não existem recebimentos neste período.</div>';
  $('#reportExpensesTable').innerHTML = report.expenses.length ? [...report.expenses].sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate)).map(expense => `<tr><td>${shortDate(expense.occurrenceDate)}</td><td><b>${escapeHtml(expense.description)}</b>${expense.note ? `<br><small class="muted">${escapeHtml(expense.note)}</small>` : ''}</td><td>${escapeHtml(locationName(expense.locationId))}</td><td>${escapeHtml(expense.category)}</td><td>${escapeHtml(expense.costType || 'Variável')} · ${expense.recurrence === 'Mensal' ? 'Mensal' : 'Única'}</td><td>${escapeHtml(expense.payment)}${Number(expense.balanceDue || 0) > 0 ? `<br><small class="text-danger">Pendente ${money(expense.balanceDue)}</small>` : ''}</td><td class="money"><b>${money(expense.amount)}</b></td><td>${Number(expense.balanceDue || 0) > 0 ? `<button class="action-btn" data-expense-action="pay" data-id="${expense.id}">Liquidar</button>` : '—'}</td></tr>`).join('') : emptyRow(8, 'Sem despesas registadas neste período.');
  $('#reportSalesTable').innerHTML = report.sales.length ? [...report.sales].sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => `<tr><td>${shortDate(sale.date)}</td><td><b>${escapeHtml(sale.reference)}</b><br><small class="muted">${escapeHtml(sale.documentType || 'Venda')}</small></td><td>${escapeHtml(saleCustomerName(sale))}</td><td>${escapeHtml(saleOperatorName(sale))}</td><td>${escapeHtml(sale.payment)}${saleBalanceDue(sale) ? '<br><small class="text-danger">Em dívida</small>' : ''}</td><td class="money"><b>${money(sale.total)}</b></td></tr>`).join('') : emptyRow(6, 'Não existem vendas neste período.');
  const productRows = productPerformance(report.sales); const productTable = $('#productPerformanceTable'); if (productTable) productTable.innerHTML = productRows.length ? productRows.map(product => `<tr><td><b>${escapeHtml(product.name)}</b><br><small class="muted">${escapeHtml(product.code)}</small></td><td>${number(product.quantity)}</td><td class="money">${money(product.gross)}</td><td class="money">${money(product.net)}</td><td class="money">− ${money(product.cost)}</td><td class="money"><b class="${product.margin < 0 ? 'text-danger' : ''}">${money(product.margin)}</b></td></tr>`).join('') : emptyRow(6, 'Sem vendas de produtos no período.');
  const stores = report.stores.map(location => ({ location, result: calculateReport(start, end, location.id) })).sort((a, b) => b.result.profit - a.result.profit); const storeTable = $('#storePerformanceTable'); if (storeTable) storeTable.innerHTML = stores.length ? stores.map(({ location, result }) => `<tr><td><b>${escapeHtml(location.name)}</b></td><td class="money">${money(result.revenue)}</td><td class="money">${money(result.netRevenue)}</td><td class="money">− ${money(result.cogs)}</td><td class="money">− ${money(result.fixedTotal)}</td><td class="money">− ${money(result.variableTotal)}</td><td class="money"><b class="${result.profit < 0 || result.costIssues ? 'text-danger' : ''}">${result.costIssues ? 'Por apurar' : money(result.profit)}</b></td><td>${result.sales.length}</td></tr>`).join('') : emptyRow(8, 'Sem lojas activas para este filtro.');
  const fixedBreakdown = $('#storeFixedBreakdownTable'); if (fixedBreakdown) fixedBreakdown.innerHTML = report.configuredFixed.length ? report.configuredFixed.map(row => `<tr><td><b>${escapeHtml(row.location.name)}</b></td><td>${row.label}</td><td class="money">${money(row.monthly)}</td><td class="money"><b>${money(row.allocated)}</b>${row.coveredByActual ? '<br><small class="muted">Parcialmente coberto por despesa real</small>' : ''}</td></tr>`).join('') : emptyRow(4, 'Configure os custos fixos em Definições → Lojas & armazéns.');
  const weekly = new Map(); report.sales.forEach(sale => { const month = sale.date.slice(0, 7); const week = weekOfMonth(sale.date.slice(0, 10)); const key = `${month}|${week}`; const row = weekly.get(key) || { month, week, count: 0, total: 0 }; row.count += 1; row.total += Number(sale.total || 0); weekly.set(key, row); }); const weeklyRows = monthKeysBetween(start, end).flatMap(month => Array.from({ length: 5 }, (_, index) => weekly.get(`${month}|${index + 1}`) || { month, week: index + 1, count: 0, total: 0 })); const weeklyTable = $('#weeklySalesTable'); if (weeklyTable) weeklyTable.innerHTML = weeklyRows.map(row => `<tr><td>${shortMonth(row.month)}</td><td><b>Semana ${row.week}</b></td><td>${row.count}</td><td class="money"><b>${money(row.total)}</b></td></tr>`).join('');
  const sellerSelect = $('#sellerReportFilter'); const previousSeller = sellerSelect?.value || 'all'; if (sellerSelect) { sellerSelect.innerHTML = '<option value="all">Todos os vendedores</option>' + sellerOptions(report.sales).map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join(''); sellerSelect.value = [...sellerSelect.options].some(option => option.value === previousSeller) ? previousSeller : 'all'; }
  const sellerData = sellerRollup(report.sales, sellerSelect?.value || 'all'); const sellerSales = sellerData.sales; const sellerMetricTarget = $('#sellerMetrics'); if (sellerMetricTarget) sellerMetricTarget.innerHTML = [['Faturação', money(sum(sellerSales, sale => sale.total)), `${sellerSales.length} vendas concluídas`, '↗', 'positive'], ['Média por venda', money(sellerSales.length ? sum(sellerSales, sale => sale.total) / sellerSales.length : 0), 'No período seleccionado', '◈', ''], ['Por receber', money(sum(sellerSales, saleBalanceDue)), 'Crédito ainda em aberto', '◷', sum(sellerSales, saleBalanceDue) ? 'warning' : 'positive'], ['Vendedores activos', sellerData.summary.length, 'Com vendas no período', '♙', '']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  const sellerSummary = $('#sellerPerformanceTable'); if (sellerSummary) sellerSummary.innerHTML = sellerData.summary.length ? sellerData.summary.map(row => `<tr><td><b>${escapeHtml(row.seller)}</b></td><td>${row.count}</td><td class="money"><b>${money(row.total)}</b></td><td class="money">${money(row.average)}</td><td class="money">${money(row.receivable)}</td></tr>`).join('') : emptyRow(5, 'Sem vendas de vendedores neste período.');
  const sellerDaily = $('#sellerDailyTable'); if (sellerDaily) sellerDaily.innerHTML = sellerData.daily.length ? sellerData.daily.map(row => `<tr><td>${shortDate(row.date)}</td><td>${escapeHtml(row.seller)}</td><td>${row.count}</td><td class="money"><b>${money(row.total)}</b></td><td class="money">${money(row.average)}</td></tr>`).join('') : emptyRow(5, 'Sem vendas diárias no período.');
  const sellerMonthly = $('#sellerMonthlyTable'); if (sellerMonthly) sellerMonthly.innerHTML = sellerData.monthly.length ? sellerData.monthly.map(row => `<tr><td>${shortMonth(row.month)}</td><td>${escapeHtml(row.seller)}</td><td>${row.count}</td><td class="money"><b>${money(row.total)}</b></td><td class="money">${money(row.average)}</td></tr>`).join('') : emptyRow(5, 'Sem vendas mensais no período.');
  const journal = (data.journalEntries || []).filter(entry => String(entry.date || '').slice(0, 10) >= start && String(entry.date || '').slice(0, 10) <= end && (locationFilter === 'all' || entry.locationId === locationFilter)).sort((a, b) => String(b.date).localeCompare(String(a.date))); const journalTotals = window.VendaMaisFinance.summarizeJournal(journal); const journalSummary = $('#journalSummary'); if (journalSummary) journalSummary.innerHTML = summaryRows([['Lançamentos únicos', String(journalTotals.count)], ['Impacto no caixa', money(journalTotals.cash)], ['Impacto no lucro', money(journalTotals.profit)], ['Variação de estoque', money(journalTotals.inventory)], ['A receber', money(journalTotals.receivable)], ['A pagar', money(journalTotals.payable)]]); const journalTable = $('#financialJournalTable'); if (journalTable) journalTable.innerHTML = journal.length ? journal.map(entry => `<tr><td>${fullDate(entry.date)}</td><td><b>${escapeHtml(entry.eventType)}</b></td><td>${escapeHtml(entry.category)}</td><td>${escapeHtml(entry.description)}</td><td class="money">${money(entry.amount)}</td><td class="money ${entry.cashImpact < 0 ? 'text-danger' : ''}">${entry.cashImpact < 0 ? '− ' : '+ '}${money(Math.abs(entry.cashImpact))}</td><td class="money ${entry.profitImpact < 0 ? 'text-danger' : ''}">${entry.profitImpact < 0 ? '− ' : '+ '}${money(Math.abs(entry.profitImpact))}</td><td class="money">${entry.receivableImpact < 0 ? '− ' : '+ '}${money(Math.abs(entry.receivableImpact))}</td><td class="money">${entry.liabilityImpact < 0 ? '− ' : '+ '}${money(Math.abs(entry.liabilityImpact))}</td></tr>`).join('') : emptyRow(9, 'Não existem lançamentos neste período.');
  const fiscalReport = window.VendaMaisFiscalReport?.summarize(report.sales);
  if (fiscalReport) {
    const fiscalMetrics = $('#fiscalReportMetrics');
    if (fiscalMetrics) fiscalMetrics.innerHTML = [
      ['Linhas analisadas', String(fiscalReport.lineCount), `${fiscalReport.salesCount} vendas no período`],
      ['Linhas por validar', String(fiscalReport.unresolvedCount), 'Sem cálculo estimado por falta de classificação validada'],
      ['Base estimada calculável', money(fiscalReport.estimatedBase), 'Apenas linhas com taxa interna configurada'],
      ['Imposto estimado', money(fiscalReport.estimatedTax), 'Simulação interna, não IVA oficial']
    ].map(([label, value, hint]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span></div><div class="value">${value}</div><div class="hint">${hint}</div></article>`).join('');
    const fiscalTable = $('#fiscalReportTable');
    if (fiscalTable) fiscalTable.innerHTML = fiscalReport.rows.length ? fiscalReport.rows.map(row => `<tr><td><b>${escapeHtml(row.label)}</b></td><td>${row.rate === null ? '—' : number(row.rate)}</td><td>${row.lines}</td><td>${number(row.quantity)}</td><td class="money">${money(row.base)}</td><td class="money">${row.unresolved ? 'Por apurar' : money(row.estimatedTax)}</td><td><span class="status ${row.unresolved ? 'pending' : 'completed'}">${row.unresolved ? 'Revisão necessária' : 'Taxa interna pendente de validação'}</span></td></tr>`).join('') : emptyRow(7, 'Não existem linhas de venda no período.');
    const fiscalDisclaimer = $('#fiscalReportDisclaimer');
    if (fiscalDisclaimer) fiscalDisclaimer.textContent = fiscalReport.disclaimer;
  }
  renderSaftPreparation(start, end, locationFilter);
}
function buildSaftDiagnostic(start, end, locationFilter = 'all') {
  const postings = window.VendaMaisAccounting?.buildLedger(data, { start, end, locationId: locationFilter }) || [];
  const settings = data.settings || {};
  const accountMappings = window.VendaMaisPgcaMapping?.analyze(window.VendaMaisAccounting?.ACCOUNTS || []) || null;
  return window.VendaMaisSaftPreparation?.analyze({ company: settings.company, nif: settings.nif, address: settings.address, phone: settings.phone, start, end, postings, accountMappings }) || null;
}
function renderSaftPreparation(start, end, locationFilter) {
  const result = buildSaftDiagnostic(start, end, locationFilter);
  const metrics = $('#saftDiagnosticMetrics'), checks = $('#saftDiagnosticChecks');
  if (!result || !metrics || !checks) return;
  metrics.innerHTML = [
    ['Movimentos analisados', String(result.totals.postings), 'Lançamentos derivados do diário financeiro'],
    ['Débitos', money(result.totals.debit), 'Total calculado no período'],
    ['Créditos', money(result.totals.credit), 'Total calculado no período'],
    ['Pendências impeditivas', String(result.totals.blockers), 'Ainda não pronto para exportação oficial']
  ].map(([label, value, hint]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span></div><div class="value">${value}</div><div class="hint">${hint}</div></article>`).join('');
  checks.innerHTML = result.checks.map(item => `<div class="summary-row"><span><b>${escapeHtml(item.label)}</b><small class="muted" style="display:block;margin-top:3px">${escapeHtml(item.detail)}</small></span><strong class="status ${item.ok ? 'completed' : (item.severity === 'warning' ? 'pending' : 'danger')}">${item.ok ? 'Verificado' : (item.severity === 'warning' ? 'Atenção' : 'Pendente')}</strong></div>`).join('');
  renderPgcaMapping();
  renderSaftXmlBlueprint();
  renderSaftAccountingExportSummary();
}
function renderSaftXmlBlueprint() {
  const engine = window.VendaMaisSaftXmlBlueprint;
  const preview = $('#saftXmlBlueprintPreview'), checks = $('#saftXmlBlueprintChecks');
  if (!engine || !preview || !checks) return;
  const settings = data.settings || {};
  const start = $('#reportStart')?.value || monthStart(), end = $('#reportEnd')?.value || dateISO();
  const result = engine.buildTemplate({ company: settings.company, nif: settings.nif, address: settings.address, phone: settings.phone, email: settings.email, start, end });
  preview.textContent = result.xml;
  checks.innerHTML = `<div class="summary-row"><span><b>Campos e integrações ainda necessários</b><small class="muted" style="display:block;margin-top:3px">${result.missing.map(escapeHtml).join(' · ')}</small></span><strong class="status danger">${result.missing.length} pendências</strong></div>`;
}
function renderPgcaMapping() {
  const engine = window.VendaMaisPgcaMapping, accounts = window.VendaMaisAccounting?.ACCOUNTS || [];
  const table = $('#pgcaMappingTable'), metrics = $('#pgcaMappingMetrics');
  if (!engine || !table || !metrics) return;
  const result = engine.analyze(accounts);
  metrics.innerHTML = [
    ['Contas internas', String(result.total), 'Contas usadas pelo motor contabilístico'],
    ['Com código PGCA', String(result.mapped), 'Código preenchido e com formato válido'],
    ['Revistas', String(result.reviewed), 'Marcadas como confirmadas pelo contabilista'],
    ['Por mapear', String(result.missing), 'Ainda sem código PGCA']
  ].map(([label, value, hint]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span></div><div class="value">${value}</div><div class="hint">${hint}</div></article>`).join('');
  table.innerHTML = result.rows.map(row => `<tr><td><b>${escapeHtml(row.internalCode)}</b><br><small>${escapeHtml(row.internalName)}</small></td><td><input class="pgca-map-code" data-internal-code="${escapeHtml(row.internalCode)}" value="${escapeHtml(row.officialCode)}" placeholder="Código PGCA" aria-label="Código PGCA para ${escapeHtml(row.internalCode)}"></td><td><input class="pgca-map-parent" data-internal-code="${escapeHtml(row.internalCode)}" value="${escapeHtml(row.parentCode)}" placeholder="Conta agregadora" aria-label="Conta agregadora para ${escapeHtml(row.internalCode)}"></td><td><label><input type="checkbox" class="pgca-map-reviewed" data-internal-code="${escapeHtml(row.internalCode)}" ${row.reviewed ? 'checked' : ''}> Confirmada</label></td></tr>`).join('');
}
function savePgcaMapping() {
  const engine = window.VendaMaisPgcaMapping;
  if (!engine) return notify('Módulo de mapeamento PGCA indisponível.');
  const mapping = {};
  $$('#pgcaMappingTable [data-internal-code]').forEach(field => {
    const code = field.dataset.internalCode;
    mapping[code] ||= {};
    if (field.classList.contains('pgca-map-code')) mapping[code].officialCode = field.value.trim();
    if (field.classList.contains('pgca-map-parent')) mapping[code].parentCode = field.value.trim();
    if (field.classList.contains('pgca-map-reviewed')) mapping[code].reviewed = field.checked;
  });
  try { engine.save(mapping); renderReports(); notify('Mapeamento PGCA guardado neste navegador.'); }
  catch (error) { notify(`Não foi possível guardar o mapeamento: ${error.message || 'erro local'}`); }
}
function exportSaftDiagnostic() {
  const start = $('#reportStart')?.value || monthStart(), end = $('#reportEnd')?.value || dateISO(), locationFilter = $('#reportLocationFilter')?.value || 'all';
  if (end < start) return notify('A data final deve ser igual ou posterior à data inicial.');
  const result = buildSaftDiagnostic(start, end, locationFilter);
  if (!result) return notify('Não foi possível preparar o diagnóstico SAF-T.');
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json;charset=utf-8' });
  download(`vendamais-diagnostico-saft-ao-${start}-${end}.json`, blob);
  notify('Diagnóstico interno exportado. Este ficheiro JSON não é SAF-T (AO) nem pode ser submetido à AGT.');
}

function buildSaftAccountingExport() {
  const engine = window.VendaMaisSaftAccountingExport;
  if (!engine || !window.VendaMaisAccounting) return null;
  const start = $('#reportStart')?.value || monthStart(), end = $('#reportEnd')?.value || dateISO(), locationId = $('#reportLocationFilter')?.value || 'all';
  const settings = data.settings || {};
  const postings = window.VendaMaisAccounting.buildLedger(data, { start, end, locationId });
  const mapping = window.VendaMaisPgcaMapping?.analyze(window.VendaMaisAccounting.ACCOUNTS) || null;
  return engine.prepare({ company: settings.company, nif: settings.nif, start, end, locationId, postings, accountMappings: mapping });
}
function renderSaftAccountingExportSummary() {
  const target = $('#saftAccountingExportSummary');
  if (!target) return;
  const report = buildSaftAccountingExport();
  if (!report) return;
  target.innerHTML = `<div class="summary-row"><span><b>${report.totals.entries} lançamentos · ${report.totals.lines} linhas</b><small class="muted" style="display:block;margin-top:3px">Débito ${money(report.totals.debit)} · Crédito ${money(report.totals.credit)} · Diferença ${money(Math.abs(report.totals.difference))}</small></span><strong class="status ${report.controls.balanced ? 'completed' : 'danger'}">${report.controls.balanced ? 'Equilibrado' : 'Verificar'}</strong></div><div class="summary-row"><span><b>${report.controls.suspenseLines} linhas por classificar · ${report.controls.negativeLines} linhas negativas</b><small class="muted" style="display:block;margin-top:3px">${report.warnings.length ? report.warnings.map(escapeHtml).join(' · ') : 'Sem avisos detectados nos controlos automáticos.'}</small></span><strong class="status ${report.warnings.length ? 'pending' : 'completed'}">${report.warnings.length} avisos</strong></div>`;
}
function exportSaftAccounting(format) {
  const engine = window.VendaMaisSaftAccountingExport;
  const report = buildSaftAccountingExport();
  if (!engine || !report) return notify('Exportador contabilístico indisponível.');
  if (format === 'csv') {
    download(`vendamais-diario-contabilistico-${report.period.start}-${report.period.end}.csv`, new Blob([engine.toCsv(report)], { type: 'text/csv;charset=utf-8' }));
  } else {
    download(`vendamais-diario-contabilistico-${report.period.start}-${report.period.end}.json`, new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }));
  }
  notify(`Exportação auxiliar preparada com ${report.totals.entries} lançamentos e ${report.warnings.length} aviso(s). Não é SAF-T oficial.`);
}

function exportSaftXmlBlueprint() {
  const engine = window.VendaMaisSaftXmlBlueprint;
  if (!engine) return notify('Módulo de modelo XML indisponível.');
  const settings = data.settings || {};
  const start = $('#reportStart')?.value || monthStart(), end = $('#reportEnd')?.value || dateISO();
  const result = engine.buildTemplate({ company: settings.company, nif: settings.nif, address: settings.address, phone: settings.phone, email: settings.email, start, end });
  const blob = new Blob([result.xml], { type: 'application/xml;charset=utf-8' });
  download(`vendamais-modelo-xml-saft-ao-${start}-${end}.xml`, blob);
  notify('Modelo XML de estudo exportado. Contém campos pendentes e não pode ser submetido à AGT.');
}

function renderAccounting() {
  const start = $('#accountingStart'), end = $('#accountingEnd'), location = $('#accountingLocation');
  if (!start || !end || !location || !window.VendaMaisAccounting) return;
  if (!start.value) start.value = monthStart(); if (!end.value) end.value = dateISO();
  const previous = location.value || 'all';
  location.innerHTML = '<option value="all">Todas as lojas</option>' + activeLocations().filter(item => item.type === 'Loja').map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
  location.value = [...location.options].some(option => option.value === previous) ? previous : 'all';
  if (end.value < start.value) { notify('A data final deve ser igual ou posterior à data inicial.'); return; }
  const engine = window.VendaMaisAccounting;
  const postings = engine.buildLedger(data, { start: start.value, end: end.value, locationId: location.value });
  const summary = engine.summarize(postings), balances = summary.balances, income = engine.incomeStatement(postings), trial = engine.trialBalance(postings);
  const cash = engine.cashFlow(postings);
  const positionPostings = engine.buildLedger(data, { start: '0000-01-01', end: end.value, locationId: location.value });
  const positionBalances = engine.accountBalances(positionPostings);
  const positionIncome = engine.incomeStatement(positionPostings);
  const fmt = value => money(value);
  const rows = (items, colspan=5) => items.length ? items.map(a => `<tr><td>${escapeHtml(a.code)}</td><td><b>${escapeHtml(a.name)}</b></td><td class="money">${fmt(a.debit)}</td><td class="money">${fmt(a.credit)}</td><td class="money"><b>${fmt(Math.abs(a.balance))} ${a.side==='Devedor'?'D':a.side==='Credor'?'C':''}</b></td></tr>`).join('') : emptyRow(colspan,'Sem movimentos contabilísticos neste período.');
  const host=$('#accountingMetrics');
  host.innerHTML=[['Documentos contabilizados',String(summary.postings),'Eventos únicos do diário operacional'],['Total de débitos',fmt(summary.debit),'Movimentos a débito'],['Total de créditos',fmt(summary.credit),'Movimentos a crédito'],['Resultado do período',fmt(income.result),'Rendimentos menos gastos'],['Entradas de caixa',fmt(cash.reduce((s,r)=>s+r.inflow,0)),'Caixa e bancos'],['Saídas de caixa',fmt(cash.reduce((s,r)=>s+r.outflow,0)),'Pagamentos efectivos']].map(([label,value,hint])=>`<article class="metric-card"><div class="metric-top"><span>${label}</span></div><div class="value">${value}</div><div class="hint">${hint}</div></article>`).join('');
  const overview=$('#accountingOverviewTable'); if(overview) overview.innerHTML=rows(balances);
  const journal=$('#accountingJournalLines'); if(journal) journal.innerHTML=postings.length?postings.slice().reverse().flatMap(p=>p.lines.map((l,i)=>`<tr><td>${fullDate(p.date)}</td><td><b>${escapeHtml(p.reference)}</b><br><small>${escapeHtml(p.description)}</small></td><td>${escapeHtml(l.accountCode)} · ${escapeHtml(l.accountName)}</td><td>${i===0?escapeHtml(p.description):'—'}</td><td class="money">${l.debit?fmt(l.debit):'—'}</td><td class="money">${l.credit?fmt(l.credit):'—'}</td></tr>`)).join(''):emptyRow(6,'Sem lançamentos no período.');
  const ledger=$('#accountingLedgerTable'); if(ledger){const lines=postings.flatMap(p=>p.lines.map(l=>({date:p.date,reference:p.reference,description:p.description,...l}))).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const running=new Map();ledger.innerHTML=lines.length?lines.map(l=>{const prior=running.get(l.accountCode)||0;const next=roundMoney(prior+l.debit-l.credit);running.set(l.accountCode,next);return `<tr><td>${fullDate(l.date)}</td><td><b>${escapeHtml(l.accountCode)} · ${escapeHtml(l.accountName)}</b></td><td>${escapeHtml(l.reference)}</td><td>${escapeHtml(l.description)}</td><td class="money">${l.debit?fmt(l.debit):'—'}</td><td class="money">${l.credit?fmt(l.credit):'—'}</td><td class="money"><b>${fmt(Math.abs(next))} ${next>0?'D':next<0?'C':''}</b></td></tr>`;}).join(''):emptyRow(7,'Sem movimentos no período.');}
  const trialBody=$('#accountingTrialTable'); if(trialBody) trialBody.innerHTML=trial.length?trial.map(a=>`<tr><td>${escapeHtml(a.code)}</td><td><b>${escapeHtml(a.name)}</b></td><td class="money">${fmt(a.debit)}</td><td class="money">${fmt(a.credit)}</td><td class="money">${fmt(a.trialDebit)}</td><td class="money">${fmt(a.trialCredit)}</td></tr>`).join(''):emptyRow(6,'Sem movimentos no período.');
  const trialTotals=$('#accountingTrialTotals'); if(trialTotals) trialTotals.innerHTML=`Total dos movimentos: <b>${fmt(summary.debit)}</b> débito · <b>${fmt(summary.credit)}</b> crédito. ${summary.balanced?'Lançamentos equilibrados.':'Existem diferenças a verificar.'}`;
  const assets=positionBalances.filter(a=>['11','12','22','31.1','41.1','42.1'].includes(a.code)).map(a=>({...a,value:Math.max(0,a.balance)}));
  const liabilities=positionBalances.filter(a=>['32.1','34.1','51.1'].includes(a.code)).map(a=>({...a,value:Math.max(0,-a.balance)}));
  const assetsTotal=roundMoney(assets.reduce((s,a)=>s+a.value,0)); const liabilitiesTotal=roundMoney(liabilities.reduce((s,a)=>s+a.value,0));
  const assetHost=$('#accountingAssets'); if(assetHost) assetHost.innerHTML=assets.length?assets.map(a=>`<div class="accounting-statement-row"><span>${escapeHtml(a.code)} · ${escapeHtml(a.name)}</span><b>${fmt(a.value)}</b></div>`).join(''):'<p class="muted">Sem saldos de activo.</p>';
  const liabilityHost=$('#accountingLiabilities'); if(liabilityHost) liabilityHost.innerHTML=(liabilities.length?liabilities.map(a=>`<div class="accounting-statement-row"><span>${escapeHtml(a.code)} · ${escapeHtml(a.name)}</span><b>${fmt(a.value)}</b></div>`).join(''):'<p class="muted">Sem saldos de passivo/capital.</p>')+`<div class="accounting-statement-row"><span>Resultado acumulado até ${shortDate(end.value)}</span><b>${fmt(positionIncome.result)}</b></div>`;
  const balanceRight=roundMoney(liabilitiesTotal+positionIncome.result); const balanceCheck=$('#accountingBalanceCheck'); if(balanceCheck) balanceCheck.innerHTML=`Posição em ${shortDate(end.value)} — Activo: <b>${fmt(assetsTotal)}</b> · Passivo + capital + resultado: <b>${fmt(balanceRight)}</b> · Diferença por apurar: <b>${fmt(assetsTotal-balanceRight)}</b>. Não inclui saldos de abertura nem contas ainda não integradas.`;
  const incomeHost=$('#accountingIncomeStatement'); if(incomeHost) incomeHost.innerHTML=`<div class="accounting-statement-row"><span>Vendas, proveitos e ganhos</span><b>${fmt(income.revenue)}</b></div><div class="accounting-statement-row"><span>Custos e perdas reconhecidos</span><b>− ${fmt(income.expenses)}</b></div><div class="accounting-statement-row accounting-statement-total"><span>Resultado contabilístico preliminar</span><b>${fmt(income.result)}</b></div>`;
  const cashHost=$('#accountingCashFlowTable'); if(cashHost) cashHost.innerHTML=cash.length?cash.slice().reverse().map(r=>`<tr><td>${fullDate(r.date)}</td><td>${escapeHtml(r.description)}</td><td>${escapeHtml(r.account)}</td><td class="money">${r.inflow?fmt(r.inflow):'—'}</td><td class="money">${r.outflow?fmt(r.outflow):'—'}</td></tr>`).join(''):emptyRow(5,'Sem movimentos de caixa/banco.');
  const accountsHost=$('#accountingAccountsTable'); if(accountsHost) accountsHost.innerHTML=engine.ACCOUNTS.map(a=>`<tr><td><b>${escapeHtml(a.code)}</b></td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.type)}</td></tr>`).join('');
  const equation=$('#accountingEquation'); if(equation) equation.innerHTML=`<strong>Activo = Passivo + Capital Próprio</strong><p>${fmt(assetsTotal)} = ${fmt(liabilitiesTotal)} + ${fmt(positionIncome.result)} de resultado acumulado</p>`;
  const integrity=$('#accountingIntegrity'); if(integrity) integrity.innerHTML=`<p><b>${summary.balanced?'Todos os documentos equilibram':'Verificar diferenças'}</b></p><p>${summary.postings} documentos contabilísticos derivados do diário operacional.</p><p>Conta transitória por classificar: ${fmt(summary.suspense)}.</p><p class="muted">Movimentos manuais sem natureza contabilística identificada ficam em valores por classificar; não são tratados automaticamente como lucro ou despesa.</p>`;
}

function renderSettings() {
  const form = $('#settingsForm');
  Object.entries(data.settings).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
  const picker = $('#companyThemePicker');
  if (picker) picker.innerHTML = themePickerHtml('themeId', data.settings.themeId, 'Identidade visual da empresa', 'Escolha entre combinações de cores. Esta imagem aparece em todas as lojas desta empresa.');
}

function openModal(content) {
  previouslyFocused = document.activeElement;
  $('#modal').classList.remove('account-login-modal');
  $('#modalBackdrop').classList.remove('is-fullscreen-login');
  $('#modal').innerHTML = content;
  $('#modalBackdrop').classList.add('open');
  $('#modalBackdrop').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => ($('#modal input, #modal select, #modal textarea') || $('#modal')).focus(), 20);
}
function closeModal() {
  if (sessionLocked || pinChangeRequired) return;

  const backdrop = $('#modalBackdrop');
  const modal = $('#modal');

  // A autenticação online usa estilos de ecrã inteiro. Remover apenas
  // "open" não chega: o selector CSS :has() continua activo enquanto
  // account-login-modal permanecer no elemento #modal.
  backdrop.classList.remove('open', 'is-fullscreen-login');
  modal.classList.remove('account-login-modal');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  previouslyFocused?.focus?.();
  previouslyFocused = null;
}
function modalHeader(title, subtitle = '', closable = true) { return `<div class="modal-head"><div><h2 id="modalTitle">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${closable ? '<button class="close-modal" data-close-modal aria-label="Fechar">×</button>' : ''}</div>`; }
function options(items, selected, label = item => item.name) { return items.map(item => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(label(item))}</option>`).join(''); }

function productModal(product) {
  if (!canManage()) return notify('Apenas administradores e gerentes podem alterar produtos.');
  const locationId = currentLocationId(); const isEdit = Boolean(product); const p = normaliseProduct(product || { code: '', name: '', category: '', barcode: '', unit: 'un.', warehouse: locationName(locationId), lot: '', expiryDate: '', price: '', cost: '', stock: 0, minStock: data.settings.stockLimit }, locationId); const localStock = isEdit ? stockAt(product, locationId) : 0;
  openModal(`${modalHeader(isEdit ? 'Editar produto' : 'Novo produto', `${isEdit ? 'Actualize' : 'Adicione'} o catálogo e o stock em ${locationName(locationId)}.`)}<form id="productForm"><div class="modal-form"><label>Nome do produto<input name="name" required value="${escapeHtml(p.name)}" /></label><label>Código / referência<input name="code" required value="${escapeHtml(p.code)}" /></label><label>Código de barras<input name="barcode" value="${escapeHtml(p.barcode)}" placeholder="EAN / UPC (opcional)" /></label><label>Unidade<select name="unit"><option ${p.unit === 'un.' ? 'selected' : ''}>un.</option><option ${p.unit === 'kg' ? 'selected' : ''}>kg</option><option ${p.unit === 'cx' ? 'selected' : ''}>cx</option><option ${p.unit === 'lt' ? 'selected' : ''}>lt</option></select></label><label>Categoria<input name="category" list="categories" required value="${escapeHtml(p.category)}" /><datalist id="categories">${categoryList().map(category => `<option value="${escapeHtml(category)}">`).join('')}</datalist></label><label>Local de stock<input value="${escapeHtml(locationName(locationId))}" disabled /></label><label>Preço de venda (Kz)<input name="price" type="number" min="0" step="0.01" required value="${p.price}" /></label><label>Custo unitário (Kz)<input name="cost" type="number" min="0" step="0.01" required value="${p.cost}" /></label><label>Stock neste local<input name="stock" type="number" min="0" step="0.001" required value="${localStock}" /></label><label>Limite mínimo<input name="minStock" type="number" min="0" step="0.001" required value="${p.minStock}" /></label><label class="full">Enquadramento fiscal interno<select name="fiscalTreatment"><option value="UNCLASSIFIED_INTERNAL" ${p.fiscalTreatment === 'UNCLASSIFIED_INTERNAL' ? 'selected' : ''}>Por classificar</option><option value="RATE_CONFIGURED_PENDING_REVIEW" ${p.fiscalTreatment === 'RATE_CONFIGURED_PENDING_REVIEW' ? 'selected' : ''}>Taxa configurada — por validar</option><option value="EXEMPT_PENDING_REVIEW" ${p.fiscalTreatment === 'EXEMPT_PENDING_REVIEW' ? 'selected' : ''}>Possível isenção — por validar</option><option value="NOT_SUBJECT_PENDING_REVIEW" ${p.fiscalTreatment === 'NOT_SUBJECT_PENDING_REVIEW' ? 'selected' : ''}>Possível não sujeição — por validar</option></select></label><label>Taxa interna (%)<input name="fiscalRate" type="number" min="0" max="100" step="0.01" value="${p.fiscalRate}" placeholder="Opcional" /></label><label class="full">Fundamento / observação fiscal interna<input name="fiscalReason" maxlength="240" value="${escapeHtml(p.fiscalReason)}" placeholder="Indique a referência a confirmar com contabilista" /></label><p class="modal-note full">Estes campos são apenas de preparação interna. Não determinam o IVA da venda, não são códigos oficiais da AGT e não substituem a validação por contabilista.</p><label>Lote<input name="lot" value="${escapeHtml(p.lot)}" /></label><label>Validade<input name="expiryDate" type="date" value="${escapeHtml(p.expiryDate)}" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${isEdit ? 'Guardar alterações' : 'Criar produto'}</button></div></form>`);
  $('#productForm').addEventListener('submit', event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget).entries()); ['price', 'cost', 'stock', 'minStock'].forEach(key => payload[key] = Number(payload[key])); payload.fiscalRate = payload.fiscalRate === '' ? '' : Number(payload.fiscalRate); payload.warehouse = locationName(locationId); if (payload.barcode && data.products.some(item => item.barcode === payload.barcode && item.id !== product?.id)) return notify('Já existe um produto com este código de barras.'); if (isEdit) { const oldStock = stockAt(product, locationId); Object.assign(product, normaliseProduct({ ...product, ...payload, stockByLocation: product.stockByLocation }, locationId)); setStockAt(product, locationId, payload.stock); if (payload.stock !== oldStock) data.movements.push({ id: uid('mov'), date: new Date().toISOString(), locationId, productId: product.id, productName: product.name, type: payload.stock > oldStock ? 'Entrada' : 'Saída', quantity: Math.abs(payload.stock - oldStock), note: 'Correcção no produto' }); audit('Produto actualizado', `${product.name} · ${locationName(locationId)}`); notify('Produto actualizado.'); } else { const created = { id: uid('prod'), ...normaliseProduct({ ...payload, stockByLocation: { [locationId]: payload.stock } }, locationId) }; data.products.push(created); if (payload.stock > 0) data.movements.push({ id: uid('mov'), date: new Date().toISOString(), locationId, productId: created.id, productName: created.name, type: 'Entrada', quantity: payload.stock, note: 'Stock inicial do produto' }); audit('Produto criado', `${created.name} · ${locationName(locationId)}`); notify('Produto criado com sucesso.'); } saveData(); closeModal(); renderAll(); });
}
function adjustmentModal() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem ajustar stock.');
  const locationId = currentLocationId(); openModal(`${modalHeader('Ajustar stock', `Registe um movimento em ${locationName(locationId)}.`)}<form id="adjustmentForm"><div class="modal-form"><label class="full">Produto<select name="productId" required><option value="">Seleccione o produto</option>${options([...data.products].sort((a,b) => a.name.localeCompare(b.name)), '', item => `${item.name} — ${number(stockAt(item, locationId))} un.`)}</select></label><label>Movimento<select name="type"><option>Entrada</option><option>Saída</option></select></label><label>Quantidade<input name="quantity" type="number" min="0.001" step="0.001" required /></label><label class="full">Motivo / nota<input name="note" required placeholder="Ex.: contagem física, mercadoria danificada" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar movimento</button></div></form>`);
  $('#adjustmentForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const product = productById(values.productId); const quantity = Number(values.quantity); if (!product) return notify('Seleccione um produto.'); if (values.type === 'Saída' && quantity > stockAt(product, locationId)) return notify('A saída não pode ser superior ao stock deste local.'); changeStock(product, locationId, values.type === 'Entrada' ? quantity : -quantity); data.movements.push({ id: uid('mov'), date: new Date().toISOString(), locationId, productId: product.id, productName: product.name, type: values.type, quantity, note: values.note }); audit('Ajuste de stock', `${product.name} · ${values.type} ${number(quantity)} · ${locationName(locationId)}`); saveData(); closeModal(); notify('Movimento de stock registado.'); renderAll(); });
}
function transferLine(productId = '') {
  return `<div class="purchase-line transfer-line"><div><span class="line-label">Produto</span><select name="productId" required><option value="">Seleccione</option>${options([...data.products].sort((a, b) => a.name.localeCompare(b.name)), productId, product => `${product.name} (${number(stockAt(product))} disponível)`)}</select></div><div><span class="line-label">Quantidade</span><input name="quantity" type="number" min="0.001" step="0.001" required value="1" /></div><button class="remove-line" type="button" title="Remover linha">×</button></div>`;
}
function transferModal() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem transferir stock.');
  const originId = currentLocationId(); const destinations = activeLocations().filter(location => location.id !== originId);
  if (!destinations.length) return notify('Crie ou active pelo menos outro local antes de transferir stock.');
  openModal(`${modalHeader('Transferir stock', 'A transferência baixa o stock da origem e dá entrada no destino com um único registo rastreável.')}<form id="transferForm"><div class="modal-form"><label>Origem<select name="fromLocationId">${options(activeLocations(), originId, location => `${location.name} · ${location.type}`)}</select></label><label>Destino<select name="toLocationId">${options(activeLocations(), destinations[0].id, location => `${location.name} · ${location.type}`)}</select></label><label>Data<input name="date" type="date" required value="${dateISO()}" /></label><label>Observação<input name="note" placeholder="Ex.: reposição de loja" /></label><div class="full"><div class="transfer-meta" id="transferAvailability">O stock disponível mostrado é o da origem seleccionada.</div><span class="line-label">Artigos a transferir</span><div id="transferLines" class="purchase-lines">${transferLine()}</div><button class="add-line" type="button" id="addTransferLine">＋ Adicionar artigo</button></div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar transferência</button></div></form>`);
  const form = $('#transferForm'); const refresh = () => { const fromId = form.elements.fromLocationId.value; const destination = form.elements.toLocationId; [...destination.options].forEach(option => { option.disabled = option.value === fromId; }); if (destination.value === fromId) destination.value = [...destination.options].find(option => !option.disabled)?.value || ''; $('#transferAvailability').textContent = `Origem: ${locationName(fromId)}. As quantidades serão validadas antes de confirmar.`; $$('.transfer-line select[name="productId"]', form).forEach(select => { const selected = select.value; select.innerHTML = '<option value="">Seleccione</option>' + options([...data.products].sort((a, b) => a.name.localeCompare(b.name)), selected, product => `${product.name} (${number(stockAt(product, fromId))} disponível)`); }); };
  refresh(); form.elements.fromLocationId.addEventListener('change', refresh); form.elements.toLocationId.addEventListener('change', refresh); $('#addTransferLine').addEventListener('click', () => { $('#transferLines').insertAdjacentHTML('beforeend', transferLine()); refresh(); }); $('#transferLines').addEventListener('click', event => { if (event.target.classList.contains('remove-line')) { const lines = $$('.transfer-line', $('#transferLines')); if (lines.length === 1) return notify('A transferência deve ter pelo menos um artigo.'); event.target.closest('.transfer-line').remove(); } });
  form.addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); if (values.fromLocationId === values.toLocationId) return notify('A origem e o destino devem ser diferentes.'); const lines = $$('.transfer-line', form).map(line => ({ productId: $('[name="productId"]', line).value, quantity: Number($('[name="quantity"]', line).value) })); if (lines.some(line => !line.productId || line.quantity <= 0)) return notify('Preencha todos os artigos da transferência.'); const quantities = lines.reduce((map, line) => ({ ...map, [line.productId]: Number(map[line.productId] || 0) + line.quantity }), {}); const insufficient = Object.entries(quantities).find(([productId, quantity]) => stockAt(productById(productId), values.fromLocationId) < quantity); if (insufficient) return notify(`Stock insuficiente em ${locationName(values.fromLocationId)} para ${productById(insufficient[0])?.name || 'este produto'}.`); const items = Object.entries(quantities).map(([productId, quantity]) => { const product = productById(productId); return { productId, name: product.name, code: product.code, quantity }; }); const reference = nextReference('TR', data.transfers); const transfer = { id: uid('transfer'), reference, date: `${values.date}T12:00:00`, fromLocationId: values.fromLocationId, toLocationId: values.toLocationId, items, note: values.note.trim(), operatorId: currentUser.id, operatorName: currentUser.name }; items.forEach(item => { const product = productById(item.productId); changeStock(product, transfer.fromLocationId, -item.quantity); changeStock(product, transfer.toLocationId, item.quantity); data.movements.push({ id: uid('mov'), date: transfer.date, locationId: transfer.fromLocationId, productId: product.id, productName: product.name, type: 'Saída transferência', quantity: item.quantity, note: `${reference} → ${locationName(transfer.toLocationId)}` }, { id: uid('mov'), date: transfer.date, locationId: transfer.toLocationId, productId: product.id, productName: product.name, type: 'Entrada transferência', quantity: item.quantity, note: `${reference} ← ${locationName(transfer.fromLocationId)}` }); }); data.transfers.push(transfer); audit('Transferência de stock', `${reference} · ${locationName(transfer.fromLocationId)} → ${locationName(transfer.toLocationId)} · ${number(sum(items, item => item.quantity))} un.`); saveData(); closeModal(); notify(`Transferência ${reference} registada.`); renderAll(); });
}
function updateCustomerForm(form) {
  const isCompany = form.elements.type.value === 'Empresa';
  $('#customerNameLabel', form).firstChild.textContent = isCompany ? 'Razão social' : 'Nome completo';
  const nif = form.elements.nif;
  nif.required = isCompany;
  nif.placeholder = isCompany ? 'Obrigatório para empresa' : 'Opcional para particular';
  $('#customerNifHint', form).textContent = isCompany ? 'obrigatório' : 'opcional';
}
function expensePaymentModal(expense) {
  if (!canManage()) return notify('Apenas administradores e gerentes podem liquidar despesas.');
  if (!expense || Number(expense.balanceDue || 0) <= 0) return notify('Esta despesa não tem saldo pendente.');
  openModal(`${modalHeader('Liquidar despesa', `${escapeHtml(expense.description)} · saldo ${money(expense.balanceDue)}`)}<form id="expensePaymentForm"><div class="modal-form"><label>Valor pago (Kz)<input name="amount" type="number" min="0.01" step="0.01" max="${Number(expense.balanceDue).toFixed(2)}" required value="${Number(expense.balanceDue).toFixed(2)}" /></label><label>Meio de pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option></select></label><label class="full">Data do pagamento<input name="date" type="date" required value="${dateISO()}" /></label><label class="full">Observação<input name="note" maxlength="240" placeholder="Referência ou comprovativo" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar pagamento</button></div></form>`);
  $('#expensePaymentForm').addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const amount = roundMoney(Number(values.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(expense.balanceDue) + 0.001) return notify('O valor deve ser positivo e não pode ultrapassar o saldo da despesa.');
    const session = values.payment === 'Dinheiro' ? data.cashSessions.find(item => item.status === 'Aberto' && item.userId === currentUser.id && item.locationId === expense.locationId) : null;
    if (values.payment === 'Dinheiro' && !session) return notify('Abra o seu caixa nesta loja antes de liquidar a despesa em dinheiro.');
    const snapshot = captureDataSnapshot();
    expense.amountPaid = roundMoney(Number(expense.amountPaid || 0) + amount); expense.balanceDue = roundMoney(Math.max(0, Number(expense.balanceDue || 0) - amount)); expense.paymentStatus = expense.balanceDue === 0 ? 'Pago' : 'Parcial';
    data.expensePayments.push({ id: uid('exppay'), expenseId: expense.id, userId: currentUser.id, cashSessionId: session?.id || '', date: `${values.date}T12:00:00`, amount, payment: values.payment, note: values.note.trim() });
    if (session) data.cashMovements.push({ id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: `${values.date}T12:00:00`, type: 'Saída', amount, note: `Liquidação de despesa: ${expense.description}` });
    postFinancialEntry({ idempotencyKey: `expense-payment:${data.expensePayments.at(-1).id}`, sourceType: 'expense-payment', sourceId: data.expensePayments.at(-1).id, eventType: 'Liquidação de despesa', category: 'Pagamento de despesa', description: expense.description, amount, date: `${values.date}T12:00:00`, locationId: expense.locationId, cashImpact: -amount, liabilityImpact: -amount, payment: values.payment });
    audit('Liquidação de despesa', `${expense.description} · ${money(amount)} · ${values.payment}`);
    if (!persistOrRollback(snapshot, false)) return;
    closeModal(); renderReports(); renderCash(); notify('Pagamento da despesa registado.');
  });
}

function contactModal(kind, entity, afterSave = null) {
  if (kind === 'supplier' && !canManage()) return notify('Apenas administradores e gerentes podem gerir fornecedores.');
  if (kind === 'customer' && !canManage() && (entity || !afterSave)) return notify('O vendedor pode apenas cadastrar um novo cliente durante a venda.');
  const isCustomer = kind === 'customer'; const title = isCustomer ? 'cliente' : 'fornecedor';
  const item = isCustomer ? normaliseCustomer(entity || { type: 'Particular', name: '', phone: '', email: '', nif: '', address: '', creditLimit: 0 }) : (entity || { name: '', phone: '', email: '', nif: '', address: '' });
  const customerFields = isCustomer ? `<label class="full">Tipo de cliente<select name="type" id="customerType"><option value="Particular" ${item.type !== 'Empresa' ? 'selected' : ''}>Particular</option><option value="Empresa" ${item.type === 'Empresa' ? 'selected' : ''}>Empresa</option></select></label><label id="customerNameLabel">Nome completo<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Telefone<input name="phone" required value="${escapeHtml(item.phone)}" placeholder="Ex.: +244 9XX XXX XXX" /></label><label>E-mail<input name="email" type="email" value="${escapeHtml(item.email)}" /></label><label>NIF <small id="customerNifHint"></small><input name="nif" value="${escapeHtml(item.nif)}" /></label>${isSeller() ? '' : `<label>Limite de crédito (Kz)<input name="creditLimit" type="number" min="0" step="0.01" value="${item.creditLimit}" /></label>`}<label class="full">Morada de facturação<input name="address" value="${escapeHtml(item.address)}" /></label>` : `<label>Nome / empresa<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Telefone<input name="phone" value="${escapeHtml(item.phone)}" /></label><label>E-mail<input name="email" type="email" value="${escapeHtml(item.email)}" /></label><label>NIF<input name="nif" value="${escapeHtml(item.nif)}" /></label><label class="full">Morada<input name="address" value="${escapeHtml(item.address)}" /></label>`;
  openModal(`${modalHeader(entity ? `Editar ${title}` : `Novo ${title}`, isCustomer ? 'Os dados guardados serão usados em facturas, recibos e vendas a crédito.' : 'Guarde os contactos dos seus parceiros de compra.')}<form id="contactForm"><div class="modal-form">${customerFields}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${entity ? 'Guardar alterações' : `Criar ${title}`}</button></div></form>`);
  const form = $('#contactForm');
  if (isCustomer) { updateCustomerForm(form); form.elements.type.addEventListener('change', () => updateCustomerForm(form)); }
  form.addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const list = isCustomer ? data.customers : data.suppliers;
    values.name = values.name.trim(); values.phone = values.phone.trim(); values.email = values.email.trim(); values.nif = values.nif.trim().toUpperCase(); values.address = values.address.trim();
    if (isCustomer) {
      values.creditLimit = isSeller() ? 0 : Math.max(0, Number(values.creditLimit || 0));
      if (values.type === 'Empresa' && !values.nif) return notify('O NIF é obrigatório para clientes empresariais.');
      if (values.nif && data.customers.some(customer => customer.nif === values.nif && customer.id !== entity?.id)) return notify('Já existe um cliente com este NIF.');
    }
    let saved = entity;
    if (entity) Object.assign(entity, values); else { saved = { id: uid(isCustomer ? 'customer' : 'supplier'), ...values }; list.push(saved); }
    saveData(); closeModal(); notify(`${isCustomer ? 'Cliente' : 'Fornecedor'} guardado com sucesso.`);
    if (afterSave) afterSave(saved); else renderAll();
  });
}
function purchaseLine(productId = '', quantity = 1) { const product = productById(productId); const locationId = currentLocationId(); return `<div class="purchase-line"><div><span class="line-label">Produto</span><select name="productId" required><option value="">Seleccione</option>${options([...data.products].sort((a,b) => a.name.localeCompare(b.name)), productId, productItem => `${productItem.name} (${number(stockAt(productItem, locationId))} ${productItem.unit || 'un.'})`)}</select></div><div><span class="line-label">Quantidade</span><input name="quantity" type="number" min="0.001" step="0.001" required value="${quantity}" /></div><div><span class="line-label">Custo (Kz)</span><input name="unitCost" type="number" min="0" step="0.01" required value="${product ? product.cost : ''}" /></div><button class="remove-line" type="button" title="Remover linha">×</button></div>`; }
function purchaseModal(suggested = []) {
  if (!canManage()) return notify('Apenas administradores e gerentes podem registar compras.');
  const suggestedLines = suggested.length ? suggested.map(product => purchaseLine(product.id, Math.max(1, Number(product.minStock) * 2 - stockAt(product)))).join('') : purchaseLine();
  const subtitle = suggested.length ? 'Sugestão baseada nos limites mínimos de stock. Confirme o fornecedor e as quantidades.' : 'O stock será actualizado assim que guardar o documento.';
  openModal(`${modalHeader('Registar compra', subtitle)}<form id="purchaseForm"><div class="modal-form"><label>Fornecedor<select name="supplierId" required><option value="">Seleccione o fornecedor</option>${options([...data.suppliers].sort((a,b) => a.name.localeCompare(b.name)), '')}</select></label><label>Local de entrada<select name="locationId">${options(activeLocations(), currentLocationId(), location => `${location.name} · ${location.type}`)}</select></label><label>Data<input name="date" type="date" required value="${dateISO()}" /></label><label>Pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option><option>Crédito</option></select></label><label class="full">Referência (opcional)<input name="reference" placeholder="Ex.: FT 1234" /></label><div class="full"><span class="line-label">Artigos comprados</span><div id="purchaseLines" class="purchase-lines">${suggestedLines}</div><button class="add-line" type="button" id="addPurchaseLine">＋ Adicionar artigo</button></div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar compra</button></div></form>`);
  $('#addPurchaseLine').addEventListener('click', () => { $('#purchaseLines').insertAdjacentHTML('beforeend', purchaseLine()); });
  $('#purchaseLines').addEventListener('click', event => { if (event.target.classList.contains('remove-line')) { const lines = $$('.purchase-line', $('#purchaseLines')); if (lines.length === 1) return notify('A compra deve ter pelo menos um artigo.'); event.target.closest('.purchase-line').remove(); } });
  $('#purchaseForm').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries());
    const lines = $$('.purchase-line', form).map(line => ({ productId: $('[name="productId"]', line).value, quantity: Number($('[name="quantity"]', line).value), unitCost: Number($('[name="unitCost"]', line).value) }));
    if (lines.some(line => !line.productId || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitCost) || line.unitCost < 0 || !productById(line.productId))) return notify('Preencha todos os artigos da compra com quantidades e custos válidos.');
    const items = lines.map(line => ({ ...line, unitCost: roundMoney(line.unitCost), name: productById(line.productId).name }));
    const total = roundMoney(sum(items, item => item.quantity * item.unitCost)); const credit = values.payment === 'Crédito';
    const locationId = values.locationId || currentLocationId();
    const cashSession = values.payment === 'Dinheiro' ? data.cashSessions.find(item => item.status === 'Aberto' && item.userId === currentUser.id && item.locationId === locationId) : null;
    if (values.payment === 'Dinheiro' && !cashSession) return notify('Abra o seu caixa nesta loja antes de registar uma compra paga em dinheiro.');
    const reference = values.reference.trim().toUpperCase() || nextReference('CP', data.purchases); if (data.purchases.some(purchase => purchase.reference === reference)) return notify('Já existe uma compra com esta referência.');
    const snapshot = captureDataSnapshot();
    const purchase = { id: uid('buy'), reference, date: values.date, locationId, supplierId: values.supplierId, payment: values.payment, paymentStatus: credit ? 'Pendente' : 'Pago', amountPaid: credit ? 0 : total, balanceDue: credit ? total : 0, total, items };
    data.purchases.push(purchase);
    items.forEach(item => { const product = productById(item.productId); const stockBefore = totalStock(product); const weightedCost = window.VendaMaisFinance.weightedAverageCost(stockBefore, Number(product.cost || 0), item.quantity, item.unitCost); changeStock(product, purchase.locationId, item.quantity); product.cost = roundMoney(weightedCost); data.movements.push({ id: uid('mov'), date: `${values.date}T12:00:00`, locationId: purchase.locationId, productId: product.id, productName: product.name, type: 'Entrada', quantity: item.quantity, note: `Compra ${purchase.reference}` }); });
    if (!credit) {
      data.supplierPayments.push({ id: uid('suppay'), purchaseId: purchase.id, supplierId: purchase.supplierId, userId: currentUser.id, cashSessionId: cashSession?.id || '', date: `${values.date}T12:00:00`, amount: total, payment: values.payment, note: `Pagamento inicial da compra ${purchase.reference}` });
      if (cashSession) data.cashMovements.push({ id: uid('cashmov'), sessionId: cashSession.id, userId: currentUser.id, date: `${values.date}T12:00:00`, type: 'Saída', amount: total, note: `Compra ${purchase.reference}` });
    }
    postFinancialEntry({ idempotencyKey: `purchase:${purchase.id}:created`, sourceType: 'purchase', sourceId: purchase.id, eventType: 'Compra de mercadoria', category: 'Estoque', description: `Compra ${purchase.reference}`, amount: total, date: `${values.date}T12:00:00`, locationId, cashImpact: 0, inventoryImpact: total, liabilityImpact: total, payment: values.payment });
    if (!credit) { const initialPayment = data.supplierPayments.find(item => item.purchaseId === purchase.id); if (initialPayment) postFinancialEntry({ idempotencyKey: `supplier-payment:${initialPayment.id}`, sourceType: 'supplier-payment', sourceId: initialPayment.id, eventType: 'Pagamento de fornecedor', category: 'Liquidação de fornecedor', description: `Pagamento inicial da compra ${purchase.reference}`, amount: total, date: `${values.date}T12:00:00`, locationId, cashImpact: -total, liabilityImpact: -total, payment: values.payment }); }
    audit('Compra registada', `${purchase.reference} · ${locationName(purchase.locationId)} · ${money(total)} · ${values.payment}`);
    if (!persistOrRollback(snapshot, false)) return;
    closeModal(); notify('Compra registada e stock actualizado.'); renderAll();
  });
}
function supplierPaymentModal(purchase) {
  if (!canManage()) return notify('Apenas administradores e gerentes podem registar pagamentos a fornecedores.');
  if (!purchase || Number(purchase.balanceDue || 0) <= 0) return notify('Esta compra não tem saldo pendente.'); const supplier = supplierById(purchase.supplierId);
  openModal(`${modalHeader('Registar pagamento ao fornecedor', `${escapeHtml(purchase.reference)} · ${escapeHtml(supplier?.name || 'Fornecedor')} · saldo ${money(purchase.balanceDue)}`)}<form id="supplierPaymentForm"><div class="modal-form"><label>Valor pago (Kz)<input name="amount" type="number" min="0.01" step="0.01" required value="${Number(purchase.balanceDue).toFixed(2)}" /></label><label>Meio de pagamento<select name="payment"><option>Transferência</option><option>Multicaixa</option><option>Dinheiro</option></select></label><label class="full">Observação<input name="note" placeholder="Ex.: referência bancária" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar pagamento</button></div></form>`);
  $('#supplierPaymentForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const amount = roundMoney(Number(values.amount)); if (!Number.isFinite(amount) || amount <= 0 || amount > Number(purchase.balanceDue) + 0.001) return notify('O valor deve ser maior que zero e não pode ultrapassar o saldo pendente.'); const session = values.payment === 'Dinheiro' ? data.cashSessions.find(item => item.status === 'Aberto' && item.userId === currentUser.id && item.locationId === purchase.locationId) : null; if (values.payment === 'Dinheiro' && !session) return notify('Abra o seu caixa na loja da compra antes de pagar em dinheiro.'); const snapshot = captureDataSnapshot(); purchase.amountPaid = roundMoney(Number(purchase.amountPaid || 0) + amount); purchase.balanceDue = roundMoney(Math.max(0, Number(purchase.balanceDue) - amount)); purchase.paymentStatus = purchase.balanceDue === 0 ? 'Pago' : 'Parcial'; purchase.settlementIntegrityWarning = false; data.supplierPayments.push({ id: uid('suppay'), purchaseId: purchase.id, supplierId: purchase.supplierId, userId: currentUser.id, cashSessionId: session?.id || '', date: new Date().toISOString(), amount, payment: values.payment, note: values.note.trim() }); if (session) data.cashMovements.push({ id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: 'Saída', amount, note: `Pagamento fornecedor ${purchase.reference}` }); postFinancialEntry({ idempotencyKey: `supplier-payment:${data.supplierPayments.at(-1).id}`, sourceType: 'supplier-payment', sourceId: data.supplierPayments.at(-1).id, eventType: 'Pagamento de dívida', category: 'Liquidação de fornecedor', description: `Pagamento fornecedor ${purchase.reference}`, amount, locationId: purchase.locationId, cashImpact: -amount, liabilityImpact: -amount, payment: values.payment }); audit('Pagamento a fornecedor', `${purchase.reference} · ${money(amount)} · ${values.payment}`); if (!persistOrRollback(snapshot, false)) return; closeModal(); notify('Pagamento ao fornecedor registado.'); renderPurchases(); });
}
function updateCheckoutFields(form, total) {
  const credit = form.elements.settlement.value === 'credit';
  const payment = form.elements.payment.value;
  form.elements.documentType.disabled = credit;
  if (credit) form.elements.documentType.value = 'Factura';
  $('#salePaymentMethodField', form).hidden = credit;
  $('#saleDueDateField', form).hidden = !credit;
  $('#saleCashReceivedField', form).hidden = credit || payment !== 'Dinheiro';
  const feedback = $('#salePaymentFeedback', form);
  if (credit) { feedback.textContent = 'A venda ficará em dívida até ao pagamento registado na ficha do cliente.'; return; }
  if (payment === 'Dinheiro') {
    const received = Number(form.elements.amountReceived.value || 0); const change = Math.max(0, received - total);
    feedback.textContent = received < total ? `Faltam ${money(total - received)} para concluir.` : `Troco: ${money(change)}`;
  } else feedback.textContent = 'Pagamento integral a confirmar.';
}
async function requestProductDiscountModal() {
  if (!isSeller()) return notify('Apenas vendedores precisam de solicitar autorização.');
  if (!window.VendaMaisCloud?.connected?.()) return notify('A aprovação remota exige ligação online activa.');
  if (!cart.length) return notify('Adicione primeiro o produto à venda.');
  const options = cart.map(item => `<option value="${escapeHtml(item.productId)}">${escapeHtml(item.name)} · ${money(item.price)} · qtd. ${number(item.quantity)}</option>`).join('');
  openModal(`${modalHeader('Solicitar desconto de produto', 'O administrador receberá o pedido no seu próprio computador. O seu caixa e esta venda permanecem abertos.')}<form id="discountRequestForm"><div class="modal-form"><label class="full">Produto<select name="productId" required>${options}</select></label><label>Desconto solicitado (%)<input name="discountPercent" type="number" min="0.01" max="100" step="0.01" required placeholder="Ex.: 10" /></label><label class="full">Motivo<textarea name="reason" rows="3" maxlength="240" required placeholder="Ex.: desconto negociado com o cliente"></textarea></label></div><p class="modal-note">O desconto só será aplicado depois da aprovação. O administrador não precisa abrir caixa nem registar uma venda.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Enviar pedido</button></div></form>`);
  $('#discountRequestForm').addEventListener('submit', async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const item = cart.find(row => row.productId === values.productId); const pct = Number(values.discountPercent);
    if (!item || !Number.isFinite(pct) || pct <= 0 || pct > 100) return notify('Indique um desconto válido para o produto seleccionado.');
    if (item.discountRequestStatus === 'Pendente' || Number(item.discountPct || 0) > 0) return notify('Este produto já tem um pedido pendente ou um desconto aprovado.');
    try {
      const result = await window.VendaMaisCloud.requestDiscount({ product_id: item.productId, product_name: item.name, quantity: item.quantity, unit_price: item.price, discount_percent: pct, reason: String(values.reason || '').trim(), location_id: currentLocationId(), cash_session_id: currentCashSession()?.id || '' });
      item.discountRequestId = result.id; item.discountRequestStatus = 'Pendente'; renderCart(); closeModal(); notify('Pedido enviado. Aguarde a aprovação do administrador.');
    } catch (error) { notify(error.message || 'Não foi possível enviar o pedido de desconto.'); }
  });
}
function renderDiscountRequestCards(requests) {
  return requests.length ? requests.map(request => `<article class="discount-request-card"><div class="panel-head"><div><b>${escapeHtml(request.product_name)}</b><p>${escapeHtml(request.requester_name || 'Vendedor')} · ${fullDate(request.created_at)}</p></div><span class="badge">Pendente</span></div><div class="discount-request-values"><span>Preço: <b>${money(request.unit_price)}</b></span><span>Desconto: <b>${number(request.discount_percent)}%</b></span><span>Quantidade: <b>${number(request.quantity)}</b></span><span>Redução: <b>${money(request.discount_value)}</b></span></div><p class="muted">${escapeHtml(request.reason)}</p><p class="muted">Local: ${escapeHtml(locationName(request.location_id))} · ${request.cash_session_id ? 'Turno do vendedor vinculado' : 'Sem turno de caixa associado'}</p><div class="inline-actions"><button class="btn primary" data-discount-review="approve" data-id="${request.id}">Aprovar</button><button class="btn secondary" data-discount-review="reject" data-id="${request.id}">Rejeitar</button></div></article>`).join('') : '<div class="empty-state">Não existem pedidos de desconto pendentes.</div>';
}
async function discountApprovalModal() {
  if (!isAdministrator()) return notify('Apenas o administrador pode aprovar descontos.');
  if (!window.VendaMaisCloud?.connected?.()) return notify('Inicie sessão online para receber pedidos de desconto.');
  let requests = [];
  const draw = () => {
    const host = $('#discountRequestsList'); if (!host) return;
    host.innerHTML = renderDiscountRequestCards(requests);
    $('#discountInboxCount').textContent = String(requests.length);
  };
  openModal(`${modalHeader('Central de aprovação de descontos', 'Aprove sem abrir caixa. A venda e o turno continuam pertencendo ao vendedor.')}<div id="discountRequestsList"><div class="empty-state">A carregar pedidos…</div></div>`);
  const load = async () => { try { requests = await window.VendaMaisCloud.discountRequests(); draw(); } catch (error) { const host = $('#discountRequestsList'); if (host) host.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; } };
  await load();
}
function handleDiscountRequestUpdate(request) {
  if (!request?.id) return;
  if (isAdministrator()) { if (request.status === 'Pendente') notify(`Novo pedido de desconto: ${request.product_name || 'produto'}.`); window.VendaMaisCloud.discountRequests().then(rows => { const badge = $('#discountInboxCount'); if (badge) badge.textContent = String(rows.length); }).catch(() => {}); }
  if (isSeller() && request.requester_id === (currentUser?.cloudUserId || currentUser?.id)) {
    const item = cart.find(row => row.productId === request.product_id && row.discountRequestId === request.id);
    if (item && (request.status === 'Aprovado' || request.status === 'Rejeitado')) {
      item.discountRequestStatus = request.status;
      if (request.status === 'Aprovado') { item.discountPct = Number(request.discount_percent); item.discountValue = roundMoney(Number(item.price) * Number(item.quantity) * item.discountPct / 100); item.discountApprovalId = request.id; item.discountApprovedBy = request.decided_by; item.discountApprovedAt = request.decided_at; notify(`Desconto aprovado: ${item.name}. Pode continuar a venda.`); }
      else { item.discountRequestId = ''; notify(`Pedido de desconto rejeitado: ${item.name}. O preço original foi mantido.`); }
      renderCart();
    }
  }
  if (isAdministrator() && $('#discountRequestsList')) window.VendaMaisCloud.discountRequests().then(rows => { const host = $('#discountRequestsList'); if (host) host.innerHTML = renderDiscountRequestCards(rows); const count = $('#discountInboxCount'); if (count) count.textContent = String(rows.length); }).catch(() => {});
}
function saleModal() {
  if (sessionLocked) return accountModal();
  if (!cart.length) return notify('Adicione pelo menos um produto à venda.'); const locationId = currentLocationId(); const totals = cartNumbers(); const customer = customerById($('#saleCustomer').value); const customerText = customer ? `${customer.name}${customer.nif ? ` · NIF ${customer.nif}` : ''}` : 'Consumidor final'; const seller = isSeller();
  openModal(`${modalHeader('Finalizar venda', seller ? 'Venda imediata. Descontos e crédito requerem autorização de gerente ou administrador.' : 'Confirme os dados comerciais e o pagamento antes de concluir.')}<div class="sale-summary"><div><span>Local</span><strong>${escapeHtml(locationName(locationId))}</strong></div><div><span>Cliente</span><strong>${escapeHtml(customerText)}</strong></div><div><span>Artigos</span><strong>${sum(cart, item => item.quantity)}</strong></div><div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>${totals.discountValue ? `<div><span>Desconto total</span><strong>− ${money(totals.discountValue)}</strong></div>` : ''}<div><span>IVA (${number(data.settings.taxRate)}%)</span><strong>${money(totals.tax)}</strong></div><div><span>Total a pagar</span><strong>${money(totals.total)}</strong></div></div><form id="saleForm"><div class="modal-form"><label class="full">Documento<select name="documentType"><option value="Factura-Recibo">Factura-recibo</option><option value="Factura">Factura</option><option value="Venda a dinheiro">Venda a dinheiro</option></select></label><label class="full" ${seller ? 'hidden' : ''}>Condição de pagamento<select name="settlement" id="saleSettlement"><option value="paid">Pagamento imediato</option><option value="credit">Venda a crédito</option></select></label><input name="settlement" type="hidden" value="paid" ${seller ? '' : 'disabled'} /><label id="salePaymentMethodField">Meio de pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option></select></label><label id="saleCashReceivedField">Valor recebido (Kz)<input name="amountReceived" type="number" min="0" step="0.01" value="${totals.total.toFixed(2)}" /></label><label id="saleDueDateField" class="full" hidden>Data de vencimento<input name="dueDate" type="date" value="${dateISO(30)}" /></label><div id="salePaymentFeedback" class="payment-feedback full"></div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Voltar</button><button class="btn primary" type="submit">Confirmar venda</button></div></form>`);
  const form = $('#saleForm'); updateCheckoutFields(form, totals.total);
  form.addEventListener('input', () => updateCheckoutFields(form, totals.total));
  form.addEventListener('change', () => updateCheckoutFields(form, totals.total));
  form.addEventListener('submit', async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const credit = values.settlement === 'credit'; const payment = credit ? 'Crédito' : values.payment; const received = Number(values.amountReceived || 0);
    if (isSeller() && credit) return notify('Vendas a crédito requerem autorização de gerente ou administrador.');
    if (cart.some(item => item.discountRequestStatus === 'Pendente')) return notify('Existe um pedido de desconto pendente. Aguarde a decisão do administrador antes de finalizar a venda.');
    if (credit && !customer) return notify('Seleccione ou cadastre um cliente para fazer uma venda a crédito.');
    if (credit && customer.creditLimit > 0 && customerStats(customer.id).balance + totals.total > customer.creditLimit) return notify('Esta venda ultrapassa o limite de crédito definido para o cliente.');
    if (!credit && payment === 'Dinheiro' && received < totals.total) return notify('O valor recebido é inferior ao total da venda.');
    const operatorCashSession = currentCashSession(); const cashSession = payment === 'Dinheiro' ? operatorCashSession : null;
    if (payment === 'Dinheiro' && !cashSession) return notify('Abra o caixa antes de concluir uma venda em dinheiro.');
    for (const item of cart) { const product = productById(item.productId); if (!product || stockAt(product, locationId) < item.quantity) return notify(`${item.name} já não tem stock suficiente neste local.`); }
    const balanceDue = credit ? totals.total : 0;
    let sale = { id: uid('sale'), reference: nextReference('VD', data.sales), date: new Date().toISOString(), locationId, customerId: customer?.id || '', customer: customerSnapshot(customer), operatorId: currentUser.id, operatorName: currentUser.name, cashSessionId: operatorCashSession?.id || '', documentType: credit ? 'Factura' : values.documentType, payment, paymentStatus: credit ? 'Pendente' : 'Pago', amountPaid: credit ? 0 : totals.total, balanceDue, dueDate: credit ? values.dueDate : '', amountReceived: !credit && payment === 'Dinheiro' ? received : totals.total, taxRate: Number(data.settings.taxRate), change: !credit && payment === 'Dinheiro' ? Math.max(0, received - totals.total) : 0, items: cart.map(item => ({ ...item, discountValue: roundMoney(Number(item.price) * Number(item.quantity) * Number(item.discountPct || 0) / 100), fiscalTreatment: item.fiscalTreatment || 'UNCLASSIFIED_INTERNAL', fiscalRate: item.fiscalRate ?? '', fiscalReason: item.fiscalReason || '' })), subtotal: totals.subtotal, discount: totals.discount, discountValue: totals.discountValue, tax: totals.tax, total: totals.total, status: 'Concluída', syncStatus: 'Local' };
    if (window.VendaMaisCloud?.configured?.() && !window.VendaMaisCloud.connected()) return notify('Inicie a sessão em Dados online antes de confirmar vendas desta empresa.');
    if (window.VendaMaisCloud?.connected?.()) {
      const recorded = await window.VendaMaisCloud.recordSale(sale);
      if (!recorded?.ok) return notify(recorded?.error || 'A venda não foi concluída porque não foi possível registá-la na base central.');
      sale = recorded.sale || sale;
      if (recorded.queued) notify('Sem internet: a venda foi guardada neste equipamento e será sincronizada automaticamente.');
    }
    // A venda e os movimentos de stock devem ser persistidos como uma única operação local.
    // Se o armazenamento falhar, repomos o estado anterior e não anunciamos sucesso.
    const previousData = JSON.stringify(data);
    cart.forEach(item => changeStock(productById(item.productId), locationId, -item.quantity));
    const existingSaleIndex = data.sales.findIndex(item => item.id === sale.id);
    if (existingSaleIndex >= 0) data.sales[existingSaleIndex] = sale; else data.sales.push(sale);
    const saleCost = sum(sale.items, item => Number(item.cost || 0) * Number(item.quantity || 0)); postFinancialEntry({ idempotencyKey: `sale:${sale.id}:created`, sourceType: 'sale', sourceId: sale.id, eventType: 'Venda', category: 'Receita de vendas', description: `Venda ${sale.reference}`, amount: sale.total, date: sale.date, locationId, cashImpact: Number(sale.amountPaid || 0), profitImpact: roundMoney(Number(sale.total || 0) - Number(sale.tax || 0) - saleCost), receivableImpact: Number(sale.balanceDue || 0), payment: sale.payment });
    audit('Venda concluída', `${sale.reference} · ${locationName(locationId)} · ${money(sale.total)} · ${sale.payment}`);
    if (!saveData({ skipCloudSync: Boolean(window.VendaMaisCloud?.connected?.()) })) {
      data = normaliseData(JSON.parse(previousData));
      currentUser = getSessionUser();
      renderAll();
      return;
    }
    closeModal(); cart = []; renderPos(); notify(`Venda ${sale.reference} concluída com sucesso.`); printReceipt(sale);
  });
}
function receivePaymentModal(customer) {
  if (!canManage()) return notify('Apenas administradores e gerentes podem registar recebimentos.');
  const dueSales = data.sales.filter(sale => sale.customerId === customer.id && saleBalanceDue(sale) > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!dueSales.length) return notify('Este cliente não tem valores pendentes.');
  openModal(`${modalHeader('Registar recebimento', `Cliente: ${escapeHtml(customer.name)}`)}<form id="receiptForm"><div class="modal-form"><label class="full">Documento em dívida<select name="saleId">${dueSales.map(sale => `<option value="${sale.id}">${sale.reference} · vence ${shortDate(sale.dueDate || sale.date)} · saldo ${money(saleBalanceDue(sale))}</option>`).join('')}</select></label><label>Valor recebido (Kz)<input name="amount" type="number" min="0.01" step="0.01" required value="${saleBalanceDue(dueSales[0]).toFixed(2)}" /></label><label>Meio de pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option></select></label><label class="full">Data do recebimento<input name="date" type="date" required value="${dateISO()}" /></label><label class="full">Observação<input name="note" placeholder="Ex.: pagamento parcial, referência bancária" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar recebimento</button></div></form>`);
  const form = $('#receiptForm');
  form.elements.saleId.addEventListener('change', () => { const sale = data.sales.find(item => item.id === form.elements.saleId.value); form.elements.amount.value = saleBalanceDue(sale).toFixed(2); });
  form.addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const sale = data.sales.find(item => item.id === values.saleId); const amount = roundMoney(Number(values.amount)); if (!sale || !Number.isFinite(amount) || amount <= 0) return notify('Introduza um valor válido.'); if (amount > saleBalanceDue(sale) + 0.001) return notify('O valor é superior ao saldo deste documento.'); const cashSession = values.payment === 'Dinheiro' ? data.cashSessions.find(item => item.status === 'Aberto' && item.userId === currentUser.id && item.locationId === sale.locationId) : null; if (values.payment === 'Dinheiro' && !cashSession) return notify('Abra o seu caixa na loja desta venda antes de receber em dinheiro.'); const snapshot = captureDataSnapshot(); sale.amountPaid = roundMoney(Number(sale.amountPaid || 0) + amount); sale.balanceDue = roundMoney(Math.max(0, saleBalanceDue(sale) - amount)); sale.paymentStatus = sale.balanceDue === 0 ? 'Pago' : 'Parcial'; sale.settlementIntegrityWarning = false; const receipt = { id: uid('receipt'), saleId: sale.id, customerId: customer.id, userId: currentUser.id, cashSessionId: cashSession?.id || '', date: `${values.date}T12:00:00`, amount, payment: values.payment, note: values.note.trim() }; data.receipts.push(receipt); postFinancialEntry({ idempotencyKey: `receipt:${receipt.id}`, sourceType: 'receipt', sourceId: receipt.id, eventType: 'Recebimento de cliente', category: 'Liquidação de cliente', description: receipt.note || `Recebimento ${sale.reference}`, amount, date: receipt.date, locationId: sale.locationId, cashImpact: amount, receivableImpact: -amount, payment: values.payment }); audit('Recebimento registado', `${sale.reference} · ${money(amount)} · ${values.payment}`); if (!persistOrRollback(snapshot, false)) return; window.VendaMaisCloud?.updateSale(sale).then(result => { if (result?.queued) notify('Recebimento guardado localmente; sincronização online pendente.'); }); closeModal(); notify(`Recebimento de ${money(amount)} registado.`); renderAll(); });
}
function amountInWordsPt(value) {
  const units = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const underThousand = number => {
    if (number === 0) return '';
    if (number === 100) return 'cem';
    const parts = [];
    const h = Math.floor(number / 100), rest = number % 100;
    if (h) parts.push(hundreds[h]);
    if (rest >= 10 && rest < 20) parts.push(teens[rest - 10]);
    else {
      const t = Math.floor(rest / 10), u = rest % 10;
      if (t) parts.push(tens[t]);
      if (u) parts.push(units[u]);
    }
    return parts.join(' e ');
  };
  const integerWords = number => {
    if (!Number.isFinite(number) || number < 0 || number > 999999999) return String(number);
    if (number === 0) return 'zero';
    const millions = Math.floor(number / 1000000);
    const thousands = Math.floor((number % 1000000) / 1000);
    const remainder = number % 1000;
    const parts = [];
    if (millions) parts.push(`${millions === 1 ? 'um milhão' : `${underThousand(millions)} milhões`}`);
    if (thousands) parts.push(`${thousands === 1 ? 'mil' : `${underThousand(thousands)} mil`}`);
    if (remainder) parts.push(underThousand(remainder));
    return parts.join(' e ');
  };
  const centsValue = Math.round((Number(value) || 0) * 100);
  const kwanzas = Math.floor(centsValue / 100);
  const cents = centsValue % 100;
  const whole = `${integerWords(kwanzas)} ${kwanzas === 1 ? 'kwanza' : 'kwanzas'}`;
  return cents ? `${whole} e ${integerWords(cents)} ${cents === 1 ? 'cêntimo' : 'cêntimos'}` : whole;
}

function printReceipt(sale) {
  const customer = saleCustomer(sale);
  const location = data.locations.find(item => item.id === sale.locationId);
  const date = new Date(sale.date);
  const dateTime = Number.isNaN(date.getTime()) ? fullDate(sale.date) : `${date.toLocaleDateString('pt-AO')} ${date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}`;
  const clientDetails = `${escapeHtml(customer.name)}${customer.nif ? `<br><small>NIF: ${escapeHtml(customer.nif)}</small>` : ''}${customer.address ? `<br><small>${escapeHtml(customer.address)}</small>` : ''}`;
  const taxRate = Number(sale.taxRate ?? data.settings.taxRate ?? 0);
  const taxDescription = Number(sale.tax || 0) > 0
    ? `IVA (${number(taxRate)}%)`
    : `IVA (${number(taxRate)}%)`;
  const taxReason = Number(sale.tax || 0) === 0
    ? '<div class="fiscal-missing"><b>Motivo de não liquidação do IVA:</b> NÃO CONFIGURADO. Indicar o fundamento legal aplicável antes de qualquer emissão fiscal.</div>'
    : '';
  const items = (sale.items || []).map(item => `<tr><td>${escapeHtml(item.name)}<br><small>${number(item.quantity)} × ${money(item.price)}</small></td><td class="right">${money(item.quantity * item.price)}</td></tr>`).join('');
  const win = window.open('', '_blank', 'width=480,height=760');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pré-visualização ${escapeHtml(sale.reference)}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#222;font-size:13px;max-width:720px;margin:auto}
    .warning{border:2px solid #a33;color:#922;text-align:center;font-weight:bold;padding:10px;margin-bottom:16px}
    .head{text-align:center;border-bottom:1px dashed #999;padding-bottom:13px}.head h2{margin:0 0 6px}
    .meta{line-height:1.55}table{width:100%;border-collapse:collapse;margin:17px 0}td{padding:6px 0;border-bottom:1px solid #eee;vertical-align:top}
    .right{text-align:right;white-space:nowrap}.total{font-size:17px;font-weight:bold;border-top:2px solid #222;padding-top:9px;margin-top:8px}
    .words{margin-top:9px;font-size:12px}.fiscal-missing{margin-top:9px;padding:8px;border:1px solid #b88;background:#fff8e8}
    .foot{text-align:center;color:#666;margin-top:22px;font-size:11px}
    button{margin-top:14px}@media print{button{display:none}body{padding:8mm}.warning{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="warning">DOCUMENTO NÃO VALIDADO PELA AGT — SEM VALIDADE FISCAL</div>
    <div class="head"><h2>${escapeHtml(data.settings.company || 'Empresa')}</h2>
      <div>NIF: ${escapeHtml(data.settings.nif || 'NÃO CONFIGURADO')}</div>
      <div>${escapeHtml(data.settings.address || 'Morada não configurada')}</div>
      ${data.settings.phone ? `<div>Telefone: ${escapeHtml(data.settings.phone)}</div>` : ''}
      ${data.settings.email ? `<div>${escapeHtml(data.settings.email)}</div>` : ''}
    </div>
    <p class="meta"><b>Pré-visualização de ${escapeHtml(sale.documentType || 'documento')}</b><br>
      <b>Referência interna:</b> ${escapeHtml(sale.reference || '—')}<br>
      <b>Data e hora:</b> ${escapeHtml(dateTime)}<br>
      <b>Local da operação:</b> ${escapeHtml(location?.address || location?.name || 'NÃO CONFIGURADO')}<br>
      <b>Cliente:</b><br>${clientDetails}
    </p>
    <table><tbody>${items}</tbody></table>
    <div>Subtotal <span class="right" style="float:right">${money(sale.subtotal)}</span></div>
    ${sale.discountValue ? `<div>Desconto <span class="right" style="float:right">− ${money(sale.discountValue)}</span></div>` : ''}
    <div>${taxDescription} <span class="right" style="float:right">${money(sale.tax)}</span></div>
    ${taxReason}
    <div class="total">TOTAL <span class="right" style="float:right">${money(sale.total)}</span></div>
    <div class="words"><b>Total por extenso:</b> ${escapeHtml(amountInWordsPt(sale.total))}</div>
    <p>Pagamento: <b>${escapeHtml(sale.payment || '—')}</b><br>
      Estado: <b>${escapeHtml(sale.paymentStatus || 'Pago')}</b>
      ${saleBalanceDue(sale) ? `<br>Saldo por pagar: <b>${money(saleBalanceDue(sale))}</b>${sale.dueDate ? `<br>Vencimento: ${shortDate(sale.dueDate)}` : ''}` : ''}
      ${sale.change ? `<br>Troco: <b>${money(sale.change)}</b>` : ''}
    </p>
    <div class="foot">Documento interno de demonstração/gestão emitido pelo VendaMais. Não substitui factura fiscal emitida por software validado pela AGT.<br>Não contém série fiscal autorizada, assinatura digital nem código hash fiscal.</div>
    <button onclick="window.print()">Imprimir pré-visualização</button>
  </body></html>`);
  win.document.close();
}

function xmlEscape(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]); }
function excelColumn(index) { let column = ''; for (let current = index + 1; current; current = Math.floor((current - 1) / 26)) column = String.fromCharCode(65 + (current - 1) % 26) + column; return column; }
function excelDate(value) { const date = value instanceof Date ? value : new Date(value); return Math.round(((date.getTime() - Date.UTC(1899, 11, 30)) / 86400000) * 100000) / 100000; }
function byte16(value) { return Uint8Array.of(value & 255, (value >>> 8) & 255); }
function byte32(value) { return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255); }
function combineBytes(parts) { const size = parts.reduce((total, part) => total + part.length, 0); const result = new Uint8Array(size); let offset = 0; parts.forEach(part => { result.set(part, offset); offset += part.length; }); return result; }
function crc32(bytes) { let crc = -1; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0); } return (crc ^ -1) >>> 0; }
function zipStore(entries) {
  const encoder = new TextEncoder(); const local = []; const central = []; let offset = 0;
  entries.forEach(([name, content]) => {
    const nameBytes = encoder.encode(name); const contentBytes = typeof content === 'string' ? encoder.encode(content) : content; const crc = crc32(contentBytes); const flag = 0x0800;
    const localHeader = combineBytes([byte32(0x04034b50), byte16(20), byte16(flag), byte16(0), byte16(0), byte16(0), byte32(crc), byte32(contentBytes.length), byte32(contentBytes.length), byte16(nameBytes.length), byte16(0), nameBytes]);
    local.push(localHeader, contentBytes);
    central.push(combineBytes([byte32(0x02014b50), byte16(20), byte16(20), byte16(flag), byte16(0), byte16(0), byte16(0), byte32(crc), byte32(contentBytes.length), byte32(contentBytes.length), byte16(nameBytes.length), byte16(0), byte16(0), byte16(0), byte16(0), byte32(0), byte32(offset), nameBytes]));
    offset += localHeader.length + contentBytes.length;
  });
  const centralBytes = combineBytes(central); const end = combineBytes([byte32(0x06054b50), byte16(0), byte16(0), byte16(entries.length), byte16(entries.length), byte32(centralBytes.length), byte32(offset), byte16(0)]);
  return combineBytes([...local, centralBytes, end]);
}
function xlsxCell(reference, cell = {}) {
  const value = cell && typeof cell === 'object' && !Array.isArray(cell) ? cell.value : cell; const style = cell && typeof cell === 'object' && !Array.isArray(cell) ? cell.style || 0 : 0; const type = cell && typeof cell === 'object' && !Array.isArray(cell) ? cell.type : '';
  if (type === 'number' || typeof value === 'number') return `<c r="${reference}" s="${style}"><v>${Number.isFinite(Number(value)) ? Number(value) : 0}</v></c>`;
  if (type === 'date') return `<c r="${reference}" s="${style || 4}"><v>${excelDate(value)}</v></c>`;
  if (type === 'formula') return `<c r="${reference}" s="${style}"><f>${xmlEscape(value)}</f></c>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value ?? '')}</t></is></c>`;
}
function xlsxSheet(rows, widths = [], freezeRows = 1) {
  const rowCount = Math.max(1, rows.length); const columnCount = Math.max(1, ...rows.map(row => row.length)); const endReference = `${excelColumn(columnCount - 1)}${rowCount}`;
  const columns = widths.length ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>` : '';
  const data = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => xlsxCell(`${excelColumn(columnIndex)}${rowIndex + 1}`, cell)).join('')}</row>`).join('');
  const pane = freezeRows ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${freezeRows + 1}" sqref="A${freezeRows + 1}"/></sheetView></sheetViews>` : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const filter = rowCount > freezeRows ? `<autoFilter ref="A${freezeRows}:${excelColumn(columnCount - 1)}${rowCount}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${columns}<sheetData>${data}</sheetData>${filter}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}
function xlsxStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00 &quot;Kz&quot;"/></numFmts><fonts count="3"><font><sz val="10"/><color rgb="FF1D2B27"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F6B54"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5F3ED"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD2DED9"/></left><right style="thin"><color rgb="FFD2DED9"/></right><top style="thin"><color rgb="FFD2DED9"/></top><bottom style="thin"><color rgb="FFD2DED9"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="14" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0"/></cellXfs></styleSheet>`;
}
function createExcelWorkbook(sheets) {
  const sheetXml = sheets.map(sheet => xlsxSheet(sheet.rows, sheet.widths, sheet.freezeRows)); const overrides = sheetXml.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`;
  const rootRelationships = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const files = [['[Content_Types].xml', contentTypes], ['_rels/.rels', rootRelationships], ['xl/workbook.xml', workbook], ['xl/_rels/workbook.xml.rels', relationships], ['xl/styles.xml', xlsxStyles()], ...sheetXml.map((xml, index) => [`xl/worksheets/sheet${index + 1}.xml`, xml])];
  return new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function excelText(value, style = 0) { return { value, style }; }
function excelNumber(value, style = 5) { return { value: Number(value || 0), style, type: 'number' }; }
function excelDateCell(value) { return { value, style: 4, type: 'date' }; }
function reportPeriod(start, end) { return `${start ? shortDate(start) : 'Início'} até ${end ? shortDate(end) : 'Hoje'}`; }
function reportSalesRows(sales) { return sales.map(sale => { const customer = saleCustomer(sale); return [excelDateCell(sale.date), excelText(sale.reference), excelText(sale.documentType || 'Venda'), excelText(locationName(sale.locationId)), excelText(saleOperatorName(sale)), excelText(customer.name), excelText(customer.type), excelText(customer.nif || '—'), excelText(sale.payment), excelText(sale.paymentStatus || 'Pago'), excelNumber(saleBalanceDue(sale), 6), excelNumber(sale.subtotal, 6), excelNumber(sale.discountValue, 6), excelNumber(sale.tax, 6), excelNumber(sale.total, 6)]; }); }
function reportProductRows(sales) { return productPerformance(sales).map(product => [excelText(product.code), excelText(product.name), excelNumber(product.quantity), excelNumber(product.gross, 6), excelNumber(product.net, 6), excelNumber(product.cost, 6), excelNumber(product.margin, 6)]); }
function exportReportExcel() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem exportar relatórios.');
  const start = $('#reportStart').value || monthStart(); const end = $('#reportEnd').value || dateISO(); const locationFilter = $('#reportLocationFilter')?.value || 'all'; if (end < start) return notify('A data final do relatório deve ser igual ou posterior à data inicial.');
  const report = calculateReport(start, end, locationFilter); const payments = paymentMethods(report.sales).map(payment => { const direct = report.sales.filter(sale => sale.payment === payment && sale.payment !== 'Crédito'); const receipts = report.receipts.filter(receipt => receipt.payment === payment); return [excelText(payment), excelNumber(direct.length + receipts.length), excelNumber(roundMoney(sum(direct, sale => sale.amountPaid ?? sale.total) + sum(receipts, receipt => receipt.amount)), 6)]; }).filter(row => row[2].value > 0);
  const summaryRows = [[excelText('Relatório de gestão VendaMais', 1)], [excelText(`Empresa: ${data.settings.company}`, 8)], [excelText(`Período: ${reportPeriod(start, end)}`, 8)], [excelText(`Loja: ${locationFilter === 'all' ? 'Todas as lojas' : locationName(locationFilter)}`, 8)], [excelText(`Gerado em: ${fullDate(new Date().toISOString())}`, 8)], [], [excelText('Resumo financeiro', 3), excelText('Valor', 3)], [excelText('Faturação (com IVA)'), excelNumber(report.revenue, 7)], [excelText('IVA incluído'), excelNumber(report.tax, 6)], [excelText('Vendas líquidas (sem IVA)'), excelNumber(report.netRevenue, 7)], [excelText('Custo dos produtos vendidos'), excelNumber(report.cogs, 6)], [excelText('Resultado bruto'), excelNumber(report.grossProfit, 7)], [excelText('Custos fixos configurados (pro rata)'), excelNumber(report.configuredFixedTotal, 6)], [excelText('Despesas fixas registadas'), excelNumber(report.registeredFixed, 6)], [excelText('Custos fixos totais'), excelNumber(report.fixedTotal, 6)], [excelText('Custos variáveis'), excelNumber(report.variableTotal, 6)], [excelText(report.costIssues ? 'Resultado líquido estimado (POR APURAR: inconsistências financeiras)' : 'Resultado líquido estimado'), report.costIssues ? excelText('POR APURAR') : excelNumber(report.profit, 7)], [excelText('Contas a receber do período'), excelNumber(report.receivable, 7)], [excelText('Contas a pagar (saldo actual)'), excelNumber(report.payable, 7)], [excelText('Vendas concluídas'), excelNumber(report.sales.length)], [], [excelText('Faturação por meio de pagamento', 3), excelText('Nº de vendas', 3), excelText('Total', 3)], ...payments];
  const saleHeaders = ['Data', 'Referência', 'Documento', 'Local', 'Vendedor', 'Cliente', 'Tipo de cliente', 'NIF', 'Pagamento', 'Estado', 'Saldo em dívida', 'Subtotal', 'Desconto', 'IVA', 'Total'].map(label => excelText(label, 3));
  const salesRows = reportSalesRows(report.sales); const saleTotals = [excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText('Total do período', 2), excelNumber(report.receivable, 7), excelNumber(sum(report.sales, sale => sale.subtotal), 7), excelNumber(sum(report.sales, sale => sale.discountValue), 7), excelNumber(report.tax, 7), excelNumber(report.revenue, 7)];
  const productHeaders = ['Código', 'Produto', 'Quantidade vendida', 'Vendas brutas', 'Vendas líquidas s/ IVA', 'Custo vendido', 'Margem bruta'].map(label => excelText(label, 3));
  const stockHeaders = ['Código', 'Produto', 'Categoria', 'Unidade', 'Preço de venda', 'Custo', 'Stock total', 'Stock mínimo', 'Estado'].map(label => excelText(label, 3));
  const stockRows = [...data.products].sort((a, b) => a.name.localeCompare(b.name)).map(product => [excelText(product.code), excelText(product.name), excelText(product.category), excelText(product.unit || 'un.'), excelNumber(product.price, 6), excelNumber(product.cost, 6), excelNumber(totalStock(product)), excelNumber(product.minStock), excelText(totalStock(product) <= 0 ? 'Sem stock' : totalStock(product) <= product.minStock ? 'Repor' : 'Disponível')]);
  const locationStockHeaders = ['Local', 'Tipo', 'Código', 'Produto', 'Categoria', 'Unidade', 'Stock no local', 'Stock mínimo', 'Estado'].map(label => excelText(label, 3));
  const locationStockRows = data.locations.flatMap(location => [...data.products].sort((a, b) => a.name.localeCompare(b.name)).map(product => { const localStock = stockAt(product, location.id); return [excelText(location.name), excelText(location.type), excelText(product.code), excelText(product.name), excelText(product.category), excelText(product.unit || 'un.'), excelNumber(localStock), excelNumber(product.minStock), excelText(localStock <= 0 ? 'Sem stock' : localStock <= product.minStock ? 'Repor' : 'Disponível')]; }));
  const customerHeaders = ['Nome', 'Tipo', 'NIF', 'Telefone', 'E-mail', 'Morada', 'Limite de crédito'].map(label => excelText(label, 3));
  const customerRows = [...data.customers].sort((a, b) => a.name.localeCompare(b.name)).map(customer => [excelText(customer.name), excelText(customer.type), excelText(customer.nif || '—'), excelText(customer.phone || '—'), excelText(customer.email || '—'), excelText(customer.address || '—'), excelNumber(customer.creditLimit, 6)]);
  const supplierHeaders = ['Fornecedor', 'NIF', 'Telefone', 'E-mail', 'Morada'].map(label => excelText(label, 3));
  const supplierRows = [...data.suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(supplier => [excelText(supplier.name), excelText(supplier.nif || '—'), excelText(supplier.phone || '—'), excelText(supplier.email || '—'), excelText(supplier.address || '—')]);
  const expenseHeaders = ['Data considerada', 'Descrição', 'Categoria', 'Tipo de custo', 'Periodicidade', 'Loja', 'Pagamento', 'Valor', 'Saldo pendente', 'Estado', 'Observação'].map(label => excelText(label, 3));
  const expenseRows = report.expenses.map(item => [excelDateCell(item.occurrenceDate), excelText(item.description), excelText(item.category), excelText(item.costType || 'Variável'), excelText(item.recurrence || 'Única'), excelText(locationName(item.locationId)), excelText(item.payment), excelNumber(item.amount, 6), excelNumber(item.balanceDue, 6), excelText(item.paymentStatus || 'Pago'), excelText(item.note || '—')]);
  const storeRows = report.stores.map(location => { const local = calculateReport(start, end, location.id); return [excelText(location.name), excelNumber(local.revenue, 6), excelNumber(local.netRevenue, 6), excelNumber(local.cogs, 6), excelNumber(local.fixedTotal, 6), excelNumber(local.variableTotal, 6), excelNumber(local.profit, 6), excelNumber(local.sales.length)]; });
  const sellerData = sellerRollup(report.sales); const sellerRows = sellerData.summary.map(row => [excelText(row.seller), excelNumber(row.count), excelNumber(row.total, 6), excelNumber(row.average, 6), excelNumber(row.receivable, 6)]); const sellerDailyRows = sellerData.daily.map(row => [excelDateCell(row.date), excelText(row.seller), excelNumber(row.count), excelNumber(row.total, 6), excelNumber(row.average, 6)]); const sellerMonthlyRows = sellerData.monthly.map(row => [excelText(shortMonth(row.month)), excelText(row.seller), excelNumber(row.count), excelNumber(row.total, 6), excelNumber(row.average, 6)]); const fixedRows = report.configuredFixed.map(row => [excelText(row.location.name), excelText(row.label), excelNumber(row.monthly, 6), excelNumber(row.allocated, 6)]);
  const file = createExcelWorkbook([{ name: 'Resumo', rows: summaryRows, widths: [42, 20, 18], freezeRows: 7 }, { name: 'Vendas', rows: [saleHeaders, ...salesRows, saleTotals], widths: [14, 14, 18, 24, 24, 25, 15, 18, 16, 14, 16, 15, 15, 15, 16] }, { name: 'Artigos vendidos', rows: [productHeaders, ...reportProductRows(report.sales)], widths: [16, 32, 18, 18, 22, 18, 18] }, { name: 'Stock actual', rows: [stockHeaders, ...stockRows], widths: [16, 32, 18, 12, 18, 16, 14, 14, 16] }, { name: 'Stock por local', rows: [locationStockHeaders, ...locationStockRows], widths: [24, 14, 16, 32, 18, 12, 16, 14, 16] }, { name: 'Clientes', rows: [customerHeaders, ...customerRows], widths: [28, 14, 18, 18, 28, 32, 18] }, { name: 'Fornecedores', rows: [supplierHeaders, ...supplierRows], widths: [30, 18, 18, 28, 32] }, { name: 'Despesas', rows: [expenseHeaders, ...expenseRows], widths: [16, 32, 22, 18, 18, 24, 18, 16, 18, 16, 32] }, { name: 'Lojas', rows: [['Loja', 'Faturação c/ IVA', 'Vendas s/ IVA', 'Custo produtos', 'Custos fixos', 'Custos variáveis', 'Resultado estimado', 'Nº vendas'].map(label => excelText(label, 3)), ...storeRows], widths: [24, 18, 18, 18, 18, 18, 20, 14] }, { name: 'Custos fixos', rows: [['Loja', 'Tipo de custo', 'Valor mensal', 'No período'].map(label => excelText(label, 3)), ...fixedRows], widths: [24, 22, 18, 18] }, { name: 'Vendedores', rows: [['Vendedor', 'Nº vendas', 'Faturação', 'Média por venda', 'Por receber'].map(label => excelText(label, 3)), ...sellerRows], widths: [28, 14, 18, 20, 18] }, { name: 'Vendas diárias', rows: [['Data', 'Vendedor', 'Nº vendas', 'Faturação', 'Média'].map(label => excelText(label, 3)), ...sellerDailyRows], widths: [16, 28, 14, 18, 18] }, { name: 'Vendas mensais', rows: [['Mês', 'Vendedor', 'Nº vendas', 'Faturação', 'Média'].map(label => excelText(label, 3)), ...sellerMonthlyRows], widths: [18, 28, 14, 18, 18] }]);
  download(`relatorio-vendamais-${start}-${end}.xlsx`, file); notify('Relatório Excel preparado com 13 folhas organizadas.');
}
function exportDocuments() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem exportar documentos.');
  const headers = ['Data', 'Referência', 'Tipo', 'Cliente', 'NIF', 'Pagamento', 'Total', 'Estado', 'Operador'].map(label => excelText(label, 3)); const rows = [...data.sales].sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => { const customer = saleCustomer(sale); return [excelDateCell(sale.date), excelText(sale.reference), excelText(sale.documentType || 'Documento'), excelText(customer.name), excelText(customer.nif || '—'), excelText(sale.payment), excelNumber(sale.total, 6), excelText(sale.status), excelText(saleOperatorName(sale))]; });
  download(`documentos-vendamais-${dateISO()}.xlsx`, createExcelWorkbook([{ name: 'Documentos', rows: [headers, ...rows], widths: [14, 15, 20, 28, 18, 16, 16, 16, 22] }])); notify('Documentos exportados em formato Excel.');
}
function download(filename, blob) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function backup() { if (!isAdministrator()) return notify('Apenas administradores podem guardar cópias completas.'); const copy = JSON.parse(JSON.stringify(data)); copy.users = copy.users.map(({ pin, ...user }) => ({ ...user, pinMustChange: true })); download(`vendamais-copia-${dateISO()}.json`, new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' })); notify('Cópia de segurança preparada. Por segurança, os PINs não foram incluídos.'); }
function restore(file) { if (!isAdministrator()) return notify('Apenas administradores podem restaurar cópias.'); if (!file) return; const reader = new FileReader(); reader.onload = event => { try { const restored = JSON.parse(event.target.result); if (!restored.settings || !Array.isArray(restored.products)) throw new Error(); data = normaliseData(restored); currentUser = getSessionUser(); saveData(); cart = []; $('#companyName').textContent = data.settings.company; renderAccountButton(); applyRoleInterface(); renderAll(); notify('Cópia restaurada com sucesso.'); } catch { notify('Este ficheiro não parece ser uma cópia válida do VendaMais.'); } }; reader.readAsText(file); }
function clearBusinessDataModal() {
  if (!isAdministrator()) return notify('Apenas administradores podem limpar os dados comerciais.');
  openModal(`${modalHeader('Começar com dados próprios', 'Esta operação remove os dados comerciais actuais, incluindo os de demonstração.')}<p class="modal-note">Antes de continuar, guarde uma cópia de segurança. Serão removidos produtos, clientes, fornecedores, vendas, compras, stock, caixa e movimentos. Os dados da empresa e os utilizadores serão mantidos.</p><form id="clearBusinessDataForm"><div class="modal-form"><label class="full">Escreva <b>LIMPAR</b> para confirmar<input name="confirmation" required autocomplete="off" placeholder="LIMPAR" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Começar sem dados</button></div></form>`);
  $('#clearBusinessDataForm').addEventListener('submit', async event => {
    event.preventDefault();
    const confirmation = String(new FormData(event.currentTarget).get('confirmation') || '').trim().toUpperCase();
    if (confirmation !== 'LIMPAR') return notify('Escreva LIMPAR para confirmar esta operação.');
    const cleaned = emptyBusinessData(data);
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true; submit.textContent = 'A limpar…';
    try {
      if (window.VendaMaisCloud?.configured?.() && !window.VendaMaisCloud?.connected?.()) {
        throw new Error('A base online está configurada mas não está ligada. Inicie sessão e tente novamente para limpar também o Supabase.');
      } else if (window.VendaMaisCloud?.connected?.()) {
        await window.VendaMaisCloud.clearBusinessData();
      } else {
        data = cleaned; currentUser = getSessionUser(); cart = [];
        saveData({ skipCloudSync: true });
      }
      currentUser = getSessionUser(); cart = [];
      localStorage.removeItem('vendamais_pending_sales_v1');
      closeModal(); $('#companyName').textContent = data.settings.company;
      renderAccountButton(); renderAll();
      notify('Dados comerciais eliminados. A limpeza foi guardada e não será revertida ao atualizar.');
    } catch (error) {
      submit.disabled = false; submit.textContent = 'Começar sem dados';
      notify(error.message || 'Não foi possível limpar os dados online.');
    }
  });
}
function renderAccountButton() { const button = $('#accountButton'); if (!button || !currentUser) return; button.textContent = currentUser.initials || currentUser.name.split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase(); button.title = `${currentUser.name} · ${currentUser.role}`; }
function accountModal() {
  if (window.VendaMaisCloud?.configured?.()) return cloudModal();
  const locked = sessionLocked;
  const users = data.users.filter(user => user.active);
  const loginTitle = locked ? 'Bem-vindo ao VendaMais' : 'Trocar utilizador';
  const loginDescription = locked ? 'Entre com as suas credenciais para continuar.' : 'Confirme o PIN pessoal para mudar de utilizador.';
  openModal(`<div class="account-login-layout"><section class="account-login-brand"><div class="account-login-logo"><span class="brand-mark">V</span><span>Venda<strong>Mais</strong></span></div><span class="account-login-kicker">GESTÃO EMPRESARIAL INTELIGENTE</span><h2>O seu negócio, sob controlo.</h2><p>Vendas, stock, caixa e gestão num só lugar.</p><div class="account-login-decoration" aria-hidden="true"><i></i><i></i><i></i></div><small>VendaMais ERP · ${new Date().getFullYear()}</small></section><section class="account-login-panel">${modalHeader(loginTitle, loginDescription, !locked)}<form id="accountForm"><div class="modal-form"><label class="full">Utilizador<select name="userId" required>${users.map(user => `<option value="${user.id}" ${user.id === currentUser?.id ? 'selected' : ''}>${escapeHtml(user.name)} · ${escapeHtml(user.role)}</option>`).join('')}</select></label><label class="full">PIN pessoal<input class="pin-input" name="pin" type="password" inputmode="numeric" autocomplete="current-password" minlength="4" maxlength="8" pattern="[0-9]{4,8}" required placeholder="Introduza o seu PIN" /></label></div><p class="modal-note">Cada colaborador deve utilizar o seu próprio PIN. Nunca partilhe este código.</p><div class="modal-footer">${locked ? '' : '<button class="btn secondary" id="changeOwnPin" type="button">Alterar PIN</button><button class="btn secondary" type="button" data-close-modal>Cancelar</button>'}<button class="btn primary" type="submit">${locked ? 'Entrar na conta' : 'Confirmar'}</button></div></form><p class="account-login-help">Acesso protegido · Os seus dados permanecem associados à empresa.</p></section></div>`);
  $('#modal').classList.add('account-login-modal');
  $('#accountForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const next = userById(values.userId); if (!next || !next.active || next.pin !== values.pin) return notify('Utilizador ou PIN inválido.'); const mustChangePin = next.pinMustChange; currentUser = next; sessionLocked = false; pinChangeRequired = false; localStorage.setItem(USER_SESSION, next.id); audit('Sessão iniciada', `${next.name} · ${next.role}`); saveData(); if (!mustChangePin) closeModal(); renderAccountButton(); applyRoleInterface(); showView(canAccessView('modules') ? 'modules' : (canAccessView('dashboard') ? 'dashboard' : 'pos')); if (mustChangePin) return changePinModal(next, true); notify(`Sessão activa: ${next.name}.`); });
}
function lockSession() {
  if (cart.length && !confirm('A venda actual será limpa ao bloquear a sessão. Continuar?')) return;
  cart = []; sessionLocked = true; $('#sidebar').classList.remove('open'); notify('Sessão bloqueada.');
  if (window.VendaMaisCloud?.connected?.()) { window.VendaMaisCloud.signOut().finally(() => cloudModal()); return; }
  accountModal();
}
function changePinModal(user = currentUser, mandatory = false) {
  if (!user || (user.id !== currentUser?.id && !isAdministrator())) return notify('Não tem permissão para alterar este PIN.');
  pinChangeRequired = mandatory;
  openModal(`${modalHeader('Definir PIN pessoal', mandatory ? 'Por segurança, defina agora um novo PIN de 4 a 8 dígitos.' : 'Escolha um PIN de 4 a 8 dígitos para este utilizador.', !mandatory)}<form id="pinForm"><div class="modal-form"><label class="full">Novo PIN<input class="pin-input" name="pin" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="8" pattern="[0-9]{4,8}" required placeholder="••••" /></label><label class="full">Confirmar PIN<input class="pin-input" name="confirmation" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="8" pattern="[0-9]{4,8}" required placeholder="••••" /></label></div><div class="modal-footer">${mandatory ? '' : '<button class="btn secondary" type="button" data-close-modal>Cancelar</button>'}<button class="btn primary" type="submit">Guardar PIN</button></div></form>`);
  $('#pinForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); if (!/^\d{4,8}$/.test(values.pin)) return notify('O PIN deve ter apenas 4 a 8 dígitos.'); if (values.pin !== values.confirmation) return notify('Os dois PINs não coincidem.'); user.pin = values.pin; user.pinMustChange = false; audit('PIN actualizado', `Utilizador: ${user.name}`); saveData(); pinChangeRequired = false; closeModal(); notify('PIN guardado com sucesso.'); });
}
function locationsModal() {
  if (!canManage()) return notify('Apenas a área de gestão pode gerir lojas e armazéns.');
  const rows = data.locations.map(location => { const units = sum(data.products, product => stockAt(product, location.id)); const value = sum(data.products, product => stockAt(product, location.id) * product.cost); const users = data.users.filter(user => user.locationId === location.id && user.active).length; const fixed = sum(FIXED_COST_LABELS, label => location.fixedCosts?.[label]); const colour = brandTheme(location.colorId); return `<div class="location-card" style="--location-card-color:${colour.primary};--location-card-soft:${colour.soft}"><span class="mini-icon">${location.type === 'Armazém' ? '▦' : '⌂'}</span><div class="item-main"><strong>${escapeHtml(location.name)}</strong><span><i class="location-color-dot" aria-hidden="true"></i>${escapeHtml(colour.name)} · ${escapeHtml(location.type)}${location.address ? ` · ${escapeHtml(location.address)}` : ''} · ${location.active ? 'Activo' : 'Inactivo'}</span></div><div class="location-summary"><b>${number(units)} un.</b><span>${money(value)} · ${users} operador${users === 1 ? '' : 'es'}${location.type === 'Loja' ? ` · fixos/mês ${money(fixed)}` : ''}</span></div><button class="action-btn" data-edit-location="${location.id}" type="button">Editar</button></div>`; }).join('');
  openModal(`${modalHeader('Lojas e armazéns', 'Cada local possui stock próprio. Vendedores ficam limitados ao local atribuído.')}<div class="locations-list">${rows}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button><button class="btn primary" id="newLocation" type="button">＋ Novo local</button></div>`);
}
function locationModal(location = null) {
  if (!canManage()) return notify('Apenas a área de gestão pode gerir lojas e armazéns.');
  const item = normaliseLocation(location || { name: '', type: 'Loja', address: '', active: true, colorId: 'oceano' }); const fixedFields = FIXED_COST_LABELS.map(label => `<label>${label} (Kz/mês)<input name="fixedCost_${label}" type="number" min="0" step="0.01" value="${Number(item.fixedCosts?.[label] || 0)}" /></label>`).join('');
  openModal(`${modalHeader(location ? 'Editar local' : 'Novo local', 'Os locais activos podem receber stock, compras, vendas e caixas próprios.')}<form id="locationForm"><div class="modal-form"><label>Nome do local<input name="name" required value="${escapeHtml(item.name)}" placeholder="Ex.: Loja Kilamba" /></label><label>Tipo<select name="type"><option ${item.type === 'Loja' ? 'selected' : ''}>Loja</option><option ${item.type === 'Armazém' ? 'selected' : ''}>Armazém</option></select></label><label class="full">Morada / referência<input name="address" value="${escapeHtml(item.address || '')}" /></label><label>Estado<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Activo</option><option value="false" ${item.active === false ? 'selected' : ''}>Inactivo</option></select></label></div><section class="fixed-cost-editor"><h3>Custos fixos mensais</h3><p>Estes valores são imputados proporcionalmente aos dias incluídos no relatório. Deixe a zero o que não se aplica.</p><div class="modal-form">${fixedFields}</div><div class="fixed-cost-total"><span>Total mensal configurado</span><strong id="fixedCostPreview">${money(sum(FIXED_COST_LABELS, label => item.fixedCosts?.[label]))}</strong></div></section><p class="modal-note">Um local com stock ou operadores atribuídos não pode ser desactivado até ser regularizado. Não duplique aqui despesas que já regista mensalmente na aba Despesas.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${location ? 'Guardar alterações' : 'Criar local'}</button></div></form>`);
  const form = $('#locationForm');
  $('.modal-form', form).insertAdjacentHTML('beforeend', `<label>Meta diária (Kz)<input name="dailyTarget" type="number" min="0" step="0.01" value="${Number(item.dailyTarget || 0)}" /></label><label>Meta mensal (Kz)<input name="monthlyTarget" type="number" min="0" step="0.01" value="${Number(item.monthlyTarget || 0)}" /></label><div class="full">${themePickerHtml('colorId', item.colorId, 'Cor desta loja', 'A cor identifica a loja nos cartões e no selector de local. Pode ser diferente da empresa.')}</div>`);
  const refreshFixedTotal = () => { $('#fixedCostPreview').textContent = money(sum(FIXED_COST_LABELS, label => form.elements[`fixedCost_${label}`].value)); }; FIXED_COST_LABELS.forEach(label => form.elements[`fixedCost_${label}`].addEventListener('input', refreshFixedTotal));
  form.addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const fixedCosts = Object.fromEntries(FIXED_COST_LABELS.map(label => [label, Math.max(0, Number(values[`fixedCost_${label}`] || 0))])); FIXED_COST_LABELS.forEach(label => delete values[`fixedCost_${label}`]); values.dailyTarget = Math.max(0, Number(values.dailyTarget || 0)); values.monthlyTarget = Math.max(0, Number(values.monthlyTarget || 0)); values.name = values.name.trim(); values.address = values.address.trim(); values.active = values.active === 'true'; values.fixedCosts = fixedCosts; if (!values.name) return notify('Indique o nome do local.'); const duplicate = data.locations.find(existing => existing.name.toLowerCase() === values.name.toLowerCase() && existing.id !== location?.id); if (duplicate) return notify('Já existe um local com este nome.'); if (location && !values.active) { const units = sum(data.products, product => stockAt(product, location.id)); const assigned = data.users.some(user => user.locationId === location.id && user.active); if (units > 0 || assigned) return notify('Transfira o stock e atribua os operadores a outro local antes de desactivar.'); if (location.id === currentLocationId()) return notify('Seleccione outro local activo antes de desactivar este.'); } if (location) { Object.assign(location, normaliseLocation({ ...location, ...values })); } else data.locations.push(normaliseLocation({ id: uid('loc'), ...values })); audit(location ? 'Local actualizado' : 'Local criado', values.name); saveData(); closeModal(); applyRoleInterface(); renderAll(); notify('Local guardado.'); locationsModal(); });
}
function changeActiveLocation(locationId) {
  if (isSeller()) return notify('O vendedor trabalha apenas no local que lhe foi atribuído.');
  if (!locationById(locationId)?.active) return notify('Seleccione um local activo.');
  if (locationId === currentLocationId()) return;
  if (cart.length && !confirm('A venda actual será limpa ao trocar de local. Continuar?')) { applyRoleInterface(); return; }
  cart = []; data.settings.activeLocationId = locationId; applyLocationAccent(locationId); audit('Local de operação alterado', locationName(locationId)); saveData(); applyRoleInterface(); renderAll(); notify(`Local de operação: ${locationName(locationId)}.`);
}
function userModal(user = null) {
  if (!canManage()) return notify('Apenas a área de gestão pode criar ou alterar utilizadores.');
  if (!isAdministrator() && user?.role === 'Administrador') return notify('Apenas um administrador pode alterar outro administrador.');
  const item = user || { name: '', initials: '', role: 'Vendedor', locationId: currentLocationId(), active: true, pin: '' };
  const roleOptions = isAdministrator() ? ['Vendedor', 'Gerente', 'Administrador'] : ['Vendedor', 'Gerente'];
  const allowedViews = ROLE_VIEWS[item.role] || ROLE_VIEWS.Vendedor;
  const permissionControls = roleOptions.length && item.role !== 'Administrador' ? `<fieldset class="permission-editor full"><legend>Autorizações individuais (apenas restringem o perfil)</legend><div class="permission-grid">${allowedViews.filter(view => !['modules', 'admin', 'settings'].includes(view)).map(view => `<label><input type="checkbox" name="viewPermission" value="${view}" ${item.viewPermissions?.[view] === false ? '' : 'checked'} />${({dashboard:'Painel operacional',pos:'Ponto de venda',cash:'Caixa',documents:'Documentos',products:'Produtos e stock',inventory:'Inventário',customers:'Clientes',suppliers:'Fornecedores',purchases:'Compras',reports:'Relatórios',restaurant:'Restaurante'}[view] || view)}</label>`).join('')}</div><small>As autorizações individuais não concedem acesso a funções acima do perfil. A área administrativa e as definições permanecem exclusivas do administrador.</small></fieldset>` : '';
  openModal(`${modalHeader(user ? 'Editar utilizador' : 'Novo utilizador', 'Escolha a loja, a função e as autorizações individuais.')}<form id="userForm"><div class="modal-form"><label>Nome completo<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Iniciais<input name="initials" maxlength="3" required value="${escapeHtml(item.initials || '')}" placeholder="Ex.: JM" /></label><label>Função<select name="role">${roleOptions.map(role => `<option ${item.role === role ? 'selected' : ''}>${role}</option>`).join('')}</select></label><label>Loja atribuída<select name="locationId">${options(activeLocations(), item.locationId || currentLocationId(), location => `${location.name} · ${location.type}`)}</select></label><label>Estado<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Activo</option><option value="false" ${item.active === false ? 'selected' : ''}>Inactivo</option></select></label><label class="full">${user ? 'Novo PIN (deixe vazio para manter)' : 'PIN temporário'}<input class="pin-input" name="pin" type="password" inputmode="numeric" minlength="4" maxlength="8" pattern="[0-9]{4,8}" ${user ? '' : 'required'} placeholder="4 a 8 dígitos" /></label>${permissionControls}</div><p class="role-note"><b>Segurança:</b> o administrador controla as autorizações. O gerente não pode criar ou promover administradores. O vendedor fica associado à loja atribuída.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${user ? 'Guardar alterações' : 'Criar utilizador'}</button></div></form>`);
  if (window.VendaMaisCloud?.connected?.()) $('#userForm').insertAdjacentHTML('afterbegin', '<p class="modal-note">Para o acesso em outro computador, use <b>Dados online → Gerir acessos → Convidar colaborador</b>. O convite já leva a loja e a função escolhidas.</p>');
  $('#userForm').addEventListener('submit', event => { event.preventDefault(); const formData = new FormData(event.currentTarget); const values = Object.fromEntries(formData.entries()); const selectedViews = formData.getAll('viewPermission'); delete values.viewPermission; values.viewPermissions = {}; (ROLE_VIEWS[values.role] || []).forEach(view => { if (!['modules', 'admin', 'settings'].includes(view)) values.viewPermissions[view] = selectedViews.includes(view); }); values.name = values.name.trim(); values.initials = values.initials.trim().toUpperCase(); values.active = values.active === 'true'; const pin = String(values.pin || '').trim(); delete values.pin; if (!isAdministrator() && values.role === 'Administrador') return notify('Apenas um administrador pode atribuir o perfil Administrador.'); if (pin && !/^\d{4,8}$/.test(pin)) return notify('O PIN deve ter apenas 4 a 8 dígitos.'); if (!user && !pin) return notify('Defina um PIN temporário para o utilizador.'); const activeAdmins = data.users.filter(existing => existing.role === 'Administrador' && existing.active && existing.id !== user?.id); if (user?.id === currentUser.id && !values.active) return notify('Não pode desactivar o utilizador que está em sessão.'); if (user?.role === 'Administrador' && user.active && (values.role !== 'Administrador' || !values.active) && activeAdmins.length === 0) return notify('O sistema deve manter pelo menos um administrador activo.'); const userId = user?.id || uid('user');
    if (user) { Object.assign(user, values); if (pin) Object.assign(user, { pin, pinMustChange: true }); }
    else data.users.push(normaliseUser({ id: userId, ...values, pin, pinMustChange: true }));
    audit(user ? 'Utilizador actualizado' : 'Utilizador criado', `${values.name} · ${values.role}`); saveData(); closeModal(); if (user?.id === currentUser.id) { renderAccountButton(); applyRoleInterface(); const activeView = $('.view.active')?.id.replace('View', ''); if (!canAccessView(activeView)) showView(canAccessView('dashboard') ? 'dashboard' : 'pos'); } notify('Utilizador guardado.'); if (isAdministrator()) usersModal(); else renderAll(); });
}
function usersModal() {
  if (!canManage()) return notify('Apenas a área de gestão pode gerir utilizadores.');
  openModal(`${modalHeader('Utilizadores e permissões', 'Cada utilizador entra na sua própria área. O perfil escolhido define os ecrãs, operações e dados a que pode aceder.')}<div class="users-list">${data.users.map(user => `<div class="user-row"><div class="user-initials">${escapeHtml(user.initials || '—')}</div><div class="item-main"><b>${escapeHtml(user.name)}</b><span>${escapeHtml(user.role)} · ${escapeHtml(locationName(user.locationId))} · ${user.active ? 'Activo' : 'Inactivo'}${user.pinMustChange ? ' · PIN pendente' : ''}</span></div><button class="action-btn" type="button" data-edit-user="${user.id}">Editar</button></div>`).join('')}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button><button class="btn primary" id="newUser" type="button">＋ Novo utilizador</button></div>`);
}
function auditModal() {
  if (!canManage()) return notify('Apenas gerentes e administradores podem consultar a auditoria.');
  const entries = data.auditLog.slice(0, 100);
  const renderEntries = (items, online = false) => items.length ? items.map(entry => `<div class="audit-row"><div><b>${escapeHtml(entry.action)}</b><span>${escapeHtml(entry.detail || '')}</span></div><small>${fullDate(entry.created_at || entry.date)}${online ? ' · central' : ` · ${escapeHtml(entry.userName || userById(entry.userId)?.name || '—')}`}</small></div>`).join('') : '<div class="empty-state">Ainda não existem acções no registo.</div>';
  openModal(`${modalHeader('Registo de auditoria', window.VendaMaisCloud?.connected?.() ? 'Histórico central imutável das últimas 100 acções.' : 'Últimas 100 acções relevantes deste equipamento.')}<div class="audit-list" id="auditEntries">${renderEntries(entries)}</div><div class="modal-footer"><button class="btn primary" type="button" data-close-modal>Fechar</button></div>`);
  if (window.VendaMaisCloud?.connected?.()) window.VendaMaisCloud.auditEvents().then(events => { const target = $('#auditEntries'); if (target) target.innerHTML = renderEntries(events, true); }).catch(() => {});
}
function integrationsModal() {
  if (!canManage()) return notify('Apenas a área de gestão pode gerir integrações.');
  const items = [['thermalPrinter', 'Impressora térmica', 'Permite imprimir documentos através da janela de impressão do navegador.'], ['barcodeScanner', 'Leitor de código de barras', 'Aceita pesquisa por código de barras no ponto de venda.'], ['multicaixa', 'Integração Multicaixa', 'Requer contrato, credenciais e integração homologada do fornecedor.'], ['accountingExport', 'Exportação contabilística', 'Prepara exportações para integração com o software de contabilidade.']];
  openModal(`${modalHeader('Integrações e equipamentos', 'Active apenas funcionalidades já configuradas pela empresa.')}<form id="integrationsForm"><div class="integration-list">${items.map(([key, title, description]) => `<label class="integration-row"><input type="checkbox" name="${key}" ${data.integrations[key] ? 'checked' : ''} /><span><b>${title}</b><small>${description}</small></span></label>`).join('')}</div><p class="modal-note">A activação no sistema não cria uma ligação bancária real. Pagamentos Multicaixa exigem fornecedor autorizado, credenciais e testes oficiais.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar preferências</button></div></form>`);
  $('#integrationsForm').addEventListener('submit', event => { event.preventDefault(); const values = new FormData(event.currentTarget); Object.keys(data.integrations).forEach(key => { data.integrations[key] = values.has(key); }); audit('Integrações actualizadas', 'Preferências operacionais alteradas'); saveData(); closeModal(); notify('Preferências de integração guardadas.'); });
}

function cloudInitials(name = '') { return String(name).split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 3).toUpperCase() || 'VM'; }
function updateCloudUi(status = window.VendaMaisCloud?.status?.()) {
  const clearExpensesButton = $('#clearFalseExpenses'); if (clearExpensesButton) clearExpensesButton.hidden = !(isAdministrator() && window.VendaMaisCloud?.connected?.());
  if (!status) return;
  const indicator = $('#cloudStatus'); const text = $('#cloudStatusText'); const hint = $('#cloudSettingsHint');
  if (indicator) { indicator.className = `cloud-status ${status.kind}`; indicator.title = status.message; }
  if (text) text.textContent = status.kind === 'online' ? 'Online' : status.kind === 'syncing' ? 'A sincronizar' : status.kind === 'pending' ? 'Vendas pendentes' : status.kind === 'error' ? 'Falha de sincronização' : status.kind === 'configured' ? 'Ligar base online' : 'Só neste dispositivo';
  if (hint) hint.textContent = status.kind === 'online' ? 'A empresa está ligada: as vendas entram no livro central e os relatórios são partilhados pelas lojas.' : status.kind === 'pending' ? `${status.message}. Não apague os dados deste navegador até a nuvem indicar Online.` : status.kind === 'syncing' ? 'A actualizar os dados partilhados…' : status.kind === 'error' ? `${status.message} Os dados locais foram mantidos; reveja a ligação antes de continuar a vender.` : 'Ligue uma base de dados segura para que todas as lojas trabalhem sobre os mesmos dados.';
}
function cloudUserForProfile(profile, authUser) {
  const cloudUserId = profile?.id || authUser?.id || currentUser?.cloudUserId;
  if (!cloudUserId) return currentUser;
  let user = data.users.find(item => item.cloudUserId === cloudUserId);
  if (!user && profile) user = data.users.find(item => item.name === profile.full_name && item.role === profile.role && (!profile.location_id || item.locationId === profile.location_id));
  if (!user && profile) user = data.users.find(item => item.role === profile.role && (!profile.location_id || item.locationId === profile.location_id));
  if (!user && profile) {
    user = normaliseUser({ id: `cloud_${cloudUserId}`, name: profile.full_name, initials: cloudInitials(profile.full_name), role: profile.role, locationId: profile.location_id || currentLocationId(), active: true, pin: '0000', pinMustChange: false }, currentLocationId());
    data.users.push(user);
  }
  if (user && profile) Object.assign(user, { cloudUserId, name: profile.full_name || user.name, initials: user.initials || cloudInitials(profile.full_name), role: normaliseRole(profile.role), locationId: profile.location_id || user.locationId, active: profile.active !== false, pinMustChange: false });
  return user || currentUser;
}
function replaceDataFromCloud(remote, profile, authUser) {
  const cloudUserId = profile?.id || authUser?.id || currentUser?.cloudUserId;
  const preferredLocationId = data?.settings?.activeLocationId;
  if (preferredLocationId && remote?.settings && Array.isArray(remote.locations) && remote.locations.some(location => location.id === preferredLocationId && location.active)) remote.settings.activeLocationId = preferredLocationId;
  data = normaliseData(remote);
  currentUser = cloudUserForProfile(profile, authUser);
  if (!profile && cloudUserId) currentUser = data.users.find(user => user.cloudUserId === cloudUserId) || currentUser || getSessionUser();
  if (currentUser) { localStorage.setItem(USER_SESSION, currentUser.id); sessionLocked = false; pinChangeRequired = false; }
  localStorage.setItem(STORE, JSON.stringify(data));
  applyBrandTheme();
  $('#companyName').textContent = data.settings.company;
  renderAccountButton(); applyRoleInterface();
  if (currentUser && canAccessView('modules')) showView('modules'); else renderAll();
  if (isAdministrator() && window.VendaMaisCloud?.connected?.()) window.VendaMaisCloud.discountRequests().then(rows => { const badge = $('#discountInboxCount'); if (badge) badge.textContent = String(rows.length); }).catch(() => {});
}
function mergeCloudSale(sale) {
  if (!sale?.id) return;
  const index = data.sales.findIndex(item => item.id === sale.id);
  if (index >= 0) data.sales[index] = normaliseSale(sale, data.customers); else data.sales.push(normaliseSale(sale, data.customers));
  localStorage.setItem(STORE, JSON.stringify(data));
  renderAll();
}
function cloudBootstrapModal() {
  openModal(`${modalHeader('Criar empresa online', 'Defina o nome e a identidade visual antes de ligar lojas, produtos e vendas à base central.')}<form id="cloudBootstrapForm"><div class="modal-form"><label class="full">Nome da empresa<input name="company" required value="${escapeHtml(data.settings.company || '')}" /></label><label class="full">NIF<input name="nif" value="${escapeHtml(data.settings.nif || '')}" /></label><div class="full">${themePickerHtml('themeId', data.settings.themeId, 'Cores da sua empresa', 'Escolha uma combinação profissional. Poderá alterá-la mais tarde nas Definições.')}</div></div><p class="modal-note">Depois desta etapa, cada venda confirmada será registada no livro central. Os PINs locais não são enviados: o acesso online usa a conta de e-mail e palavra-passe.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Criar e sincronizar</button></div></form>`);
  $('#cloudBootstrapForm').addEventListener('submit', async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const previousData = data;
    const clean = blankData();
    clean.settings.company = String(values.company || '').trim();
    clean.settings.nif = String(values.nif || '').trim();
    clean.settings.themeId = brandTheme(values.themeId).id;
    data = normaliseData(clean); currentUser = getSessionUser(); cart = [];
    applyBrandTheme();
    try {
      await window.VendaMaisCloud.bootstrap(values.company, values.nif);
      saveData({ skipCloudSync: true }); $('#companyName').textContent = data.settings.company;
      closeModal(); renderAll(); notify('Empresa criada vazia. Introduza os seus próprios dados para começar.');
    } catch (error) {
      data = previousData; currentUser = getSessionUser(); applyBrandTheme();
      notify(error.message || 'Não foi possível criar a empresa online.');
    }
  });
}
function cloudNoProfileModal() {
  openModal(`${modalHeader('Conta sem empresa atribuída', 'Os vendedores não criam lojas nem escolhem empresas.')}<p class="modal-note">Peça ao administrador para criar um convite para <b>este mesmo e-mail</b>, já com a loja e função correctas. Depois entre novamente e o sistema abre automaticamente os produtos e a loja preparados para si.</p><p class="modal-note">Só quem é realmente proprietário de um novo negócio deve usar a opção de registar empresa abaixo. Uma empresa criada por engano permanece isolada e não mistura dados com outra empresa.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button><button class="btn primary" id="createCloudCompany" type="button">Sou proprietário: registar empresa</button></div>`);
  $('#createCloudCompany').addEventListener('click', cloudBootstrapModal);
}
function cloudAccessRequestModal() {
  const defaultName = currentUser?.name && currentUser.name !== 'Administrador' ? currentUser.name : '';
  openModal(`${modalHeader('Pedir acesso à empresa', 'Crie a conta com o seu e-mail, indique a empresa e aguarde a aprovação do administrador.')}<form id="cloudAccessRequestForm"><div class="modal-form"><label class="full">Nome completo<input name="fullName" required value="${escapeHtml(defaultName)}" /></label><label class="full">NIF da empresa<input name="companyNif" required placeholder="Ex.: 5000048151" /></label></div><p class="modal-note">O administrador recebe o pedido, escolhe a sua loja e define se será vendedor, gerente ou administrador.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Enviar pedido</button></div></form>`);
  $('#cloudAccessRequestForm').addEventListener('submit', async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await window.VendaMaisCloud.requestAccess(values.companyNif, values.fullName); closeModal(); notify('Pedido enviado. Aguarde a aprovação do administrador.'); }
    catch (error) { notify(error.message || 'Não foi possível enviar o pedido.'); }
  });
}
async function cloudAccessManagementModal() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem aprovar acessos.');
  try {
    const [requests, invitations] = await Promise.all([window.VendaMaisCloud.accessRequests(), window.VendaMaisCloud.invitations()]); const locations = activeLocations();
    const rows = requests.length ? requests.map(request => `<form class="access-request-row" data-request-id="${request.id}"><div><b>${escapeHtml(request.full_name)}</b><span>Pedido em ${fullDate(request.requested_at)}</span></div><select name="role"><option>Vendedor</option><option>Gerente</option><option>Administrador</option></select><select name="locationId">${options(locations, currentLocationId(), location => location.name)}</select><div class="access-request-actions"><button class="action-btn" type="submit" name="decision" value="reject">Recusar</button><button class="btn primary" type="submit" name="decision" value="approve">Aprovar</button></div></form>`).join('') : '<div class="empty-state">Não há pedidos de acesso pendentes.</div>';
    const invitationRows = invitations.length ? invitations.map(invitation => `<div class="access-request-row"><div><b>${escapeHtml(invitation.full_name)}</b><span>${escapeHtml(invitation.email)} · ${escapeHtml(invitation.role)} · ${escapeHtml(locationName(invitation.location_id))}</span></div><div><b>${escapeHtml(invitation.status)}</b><span>${invitation.status === 'Pendente' ? `Expira ${fullDate(invitation.expires_at)}` : `Criado ${fullDate(invitation.created_at)}`}</span></div></div>`).join('') : '<div class="empty-state">Ainda não foram enviados convites.</div>';
    openModal(`${modalHeader('Acessos online', 'Crie o convite antes: o vendedor só encontra a loja e os produtos que lhe atribuir.')}<section class="access-section"><div class="panel-head"><div><h3>Convites criados por si</h3><p>O e-mail convidado cria a própria palavra-passe e entra directamente na loja indicada.</p></div><button class="btn primary" id="cloudInviteStaff" type="button">＋ Convidar colaborador</button></div><div class="access-request-list">${invitationRows}</div></section><section class="access-section"><div class="panel-head"><div><h3>Pedidos antigos</h3><p>Use apenas para contas criadas antes desta actualização.</p></div></div><div class="access-request-list">${rows}</div></section><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button></div>`);
    $('#cloudInviteStaff')?.addEventListener('click', cloudInviteStaffModal);
    $$('.access-request-row').forEach(form => form.addEventListener('submit', async event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const approve = event.submitter?.value === 'approve';
      try { await window.VendaMaisCloud.reviewAccess(form.dataset.requestId, values.role, values.locationId, approve); notify(approve ? 'Acesso aprovado.' : 'Pedido recusado.'); cloudAccessManagementModal(); }
      catch (error) { notify(error.message || 'Não foi possível actualizar o acesso.'); }
    }));
  } catch (error) { notify(error.message || 'Não foi possível carregar os pedidos de acesso.'); }
}
function cloudInviteStaffModal() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem convidar colaboradores.');
  const locations = activeLocations();
  if (!locations.length) return notify('Crie primeiro uma loja activa para atribuir ao vendedor.');
  openModal(`${modalHeader('Convidar colaborador', 'Defina a loja agora. O vendedor apenas cria a palavra-passe no e-mail que indicar.')}<form id="cloudInviteStaffForm"><div class="modal-form"><label class="full">Nome completo<input name="fullName" required placeholder="Ex.: Maria João" /></label><label class="full">E-mail do colaborador<input name="email" type="email" required autocomplete="email" placeholder="maria@exemplo.com" /></label><label>Função<select name="role"><option>Vendedor</option><option>Gerente</option>${isAdministrator() ? '<option>Administrador</option>' : ''}</select></label><label>Loja atribuída<select name="locationId">${options(locations, currentLocationId(), location => `${location.name} · ${location.type}`)}</select></label></div><p class="modal-note">Diga ao colaborador para abrir este mesmo VendaMais e criar a conta usando exactamente este e-mail. Após confirmar o e-mail e entrar, a loja e os produtos surgem automaticamente.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Criar convite</button></div></form>`);
  $('#cloudInviteStaffForm').addEventListener('submit', async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await window.VendaMaisCloud.inviteStaff(values.email, values.fullName, values.role, values.locationId); closeModal(); notify('Convite criado. O colaborador já pode criar a conta com este e-mail.'); cloudAccessManagementModal(); }
    catch (error) { notify(error.message || 'Não foi possível criar o convite.'); }
  });
}
async function cloudBackupModal() {
  try {
    const backups = await window.VendaMaisCloud.backups();
    openModal(`${modalHeader('Cópias automáticas online', 'A primeira alteração de cada dia cria uma cópia central para recuperação.')}<div class="audit-list">${backups.length ? backups.map(item => `<div class="audit-row"><div><b>Cópia central</b><span>Estado completo da empresa guardado automaticamente.</span></div><small>${fullDate(item.created_at)}</small></div>`).join('') : '<div class="empty-state">Ainda não há cópias online. A primeira venda ou alteração sincronizada cria uma.</div>'}</div><div class="modal-footer"><button class="btn primary" type="button" data-close-modal>Fechar</button></div>`);
  } catch (error) { notify(error.message || 'Não foi possível carregar as cópias online.'); }
}
function cloudModal() {
  const cloud = window.VendaMaisCloud; const config = cloud.config?.(); const connected = cloud.connected?.();
  const setup = !config ? `<form id="cloudConfigForm"><div class="modal-form"><label class="full">Endereço do projecto Supabase<input name="url" type="url" required placeholder="https://seu-projecto.supabase.co" /></label><label class="full">Chave pública anon<input name="anonKey" required autocomplete="off" placeholder="sb_publishable_… ou eyJ…" /></label></div><p class="modal-note">Crie primeiro o projecto Supabase e execute o ficheiro <b>supabase/schema.sql</b>. A chave anon é pública por desenho; nunca cole aqui a chave service_role.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar ligação</button></div></form>` : '';
  const login = config && !connected ? `<form id="cloudLoginForm"><div class="modal-form"><label class="full">E-mail<input name="email" type="email" required autocomplete="email" /></label><label class="full">Palavra-passe<input name="password" type="password" required autocomplete="current-password" minlength="8" /></label></div><p class="modal-note">Use o seu e-mail próprio. Se o administrador já lhe criou um convite, a sua loja, função e produtos aparecem automaticamente depois de confirmar o e-mail e entrar.</p><div class="modal-footer"><button class="btn secondary" id="clearCloudConfig" type="button">Alterar ligação</button><button class="btn secondary" name="mode" value="signup" type="submit">Criar conta</button><button class="btn primary" name="mode" value="signin" type="submit">Entrar</button></div></form>` : '';
  const online = connected ? `<p class="modal-note">${escapeHtml(cloud.status().message)}. Esta conta pode consultar os dados partilhados da empresa.</p><div class="modal-footer">${canManage() ? '<button class="btn secondary" id="cloudBackups" type="button">Cópias online</button><button class="btn secondary" id="cloudAccessManagement" type="button">Gerir acessos</button>' : ''}<button class="btn secondary" id="cloudSignOut" type="button">Terminar sessão online</button><button class="btn primary" type="button" data-close-modal>Fechar</button></div>` : '';
  const cloudModalContent = connected
    ? `${modalHeader('Dados online', 'Empresa ligada à base central.')} ${online}`
    : `<div class="account-login-layout"><section class="account-login-brand"><div class="account-login-logo"><span class="brand-mark">V</span><span>Venda<strong>Mais</strong></span></div><span class="account-login-kicker">GESTÃO EMPRESARIAL INTELIGENTE</span><h2>O seu negócio, sob controlo.</h2><p>Entre na sua empresa e mantenha lojas, equipas e operações ligadas.</p><div class="account-login-decoration" aria-hidden="true"><i></i><i></i><i></i></div><small>VendaMais ERP · ${new Date().getFullYear()}</small></section><section class="account-login-panel">${modalHeader(config ? 'Aceder à sua empresa' : 'Ligar o VendaMais', config ? 'Entre com o e-mail e a palavra-passe da sua conta.' : 'Configure a ligação segura à base de dados da empresa.', false)} ${setup || login}</section></div>`;
  openModal(cloudModalContent);
  if (!connected) { $('#modal').classList.add('account-login-modal'); $('#modalBackdrop').classList.add('is-fullscreen-login'); }
  const configForm = $('#cloudConfigForm');
  if (configForm) configForm.addEventListener('submit', async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(configForm).entries()); try { await cloud.configure(values.url, values.anonKey); cloudModal(); } catch (error) { notify(error.message || 'Não foi possível guardar a ligação.'); } });
  const loginForm = $('#cloudLoginForm');
  if (loginForm) {
    loginForm.insertAdjacentHTML('beforeend', '<button class="text-btn" id="forgotCloudPassword" type="button">Esqueci a palavra-passe</button>');
    loginForm.addEventListener('submit', async event => { event.preventDefault(); const button = event.submitter; const values = Object.fromEntries(new FormData(loginForm).entries()); try { const result = await cloud.signIn(values.email, values.password, button?.value === 'signup'); if (result.emailConfirmationRequired) return notify('Confirme o e-mail e depois entre.'); if (result.needsBootstrap) return cloudNoProfileModal(); closeModal(); notify(result.invitationAccepted ? 'Convite aceite. A sua loja está pronta para vender.' : 'Sessão online iniciada.'); } catch (error) { notify(error.message || 'Não foi possível iniciar sessão.'); } });
    $('#forgotCloudPassword').addEventListener('click', async () => { const email = loginForm.elements.email.value.trim(); if (!email) return notify('Indique primeiro o seu e-mail.'); try { await cloud.resetPassword(email); notify('Enviámos a ligação para redefinir a palavra-passe.'); } catch (error) { notify(error.message || 'Não foi possível iniciar a recuperação.'); } });
  }
  $('#clearCloudConfig')?.addEventListener('click', () => { if (confirm('Remover a ligação deste navegador? A base online não será apagada.')) { cloud.clearConfig(); cloudModal(); } });
  $('#cloudSignOut')?.addEventListener('click', async () => { await cloud.signOut(); sessionLocked = true; cloudModal(); });
  $('#cloudAccessManagement')?.addEventListener('click', cloudAccessManagementModal);
  $('#cloudBackups')?.addEventListener('click', cloudBackupModal);
}

window.VendaMaisCloud?.setHooks({ getData: () => data, replaceData: replaceDataFromCloud, mergeSale: mergeCloudSale, onDiscountRequest: handleDiscountRequestUpdate, onStatus: updateCloudUi });
window.addEventListener('online', () => { window.VendaMaisCloud?.flushPendingSales?.(); notify('Ligação restaurada. A sincronização foi retomada.'); });
window.addEventListener('offline', () => { if (window.VendaMaisCloud?.connected?.()) notify('Sem internet. As próximas vendas ficam pendentes neste equipamento até a ligação voltar.'); });

document.addEventListener('click', event => {
  const clearExpensesButton = event.target.closest('#clearFalseExpenses'); if (clearExpensesButton) { if (!isAdministrator() || !window.VendaMaisCloud?.connected?.()) return notify('Esta operação exige sessão online de administrador.'); if (!confirm('Confirma reiniciar o Diário Financeiro? Serão apagadas as vendas e despesas de teste, os respectivos lançamentos e recibos. Produtos, quantidades actuais do stock, movimentos de inventário, compras, clientes e fornecedores serão preservados. Esta operação não pode ser desfeita.')) return; clearExpensesButton.disabled = true; window.VendaMaisCloud.resetFinancialDiary().then(result => { notify(`Diário reiniciado: ${result?.removed_sales ?? 0} vendas e ${result?.removed_expenses ?? 0} despesas removidas. Produtos e stock preservados.`); renderAll(); }).catch(error => notify(error.message || 'Não foi possível limpar as despesas.')).finally(() => { clearExpensesButton.disabled = false; }); return; }
  if (event.target.closest('#requestProductDiscount')) return requestProductDiscountModal();
  if (event.target.closest('#discountInboxButton')) return discountApprovalModal();
  const discountReview = event.target.closest('[data-discount-review]'); if (discountReview) { const id = discountReview.dataset.id; const approve = discountReview.dataset.discountReview === 'approve'; const rejectionNote = approve ? '' : prompt('Indique o motivo da rejeição:'); if (!approve && rejectionNote === null) return; const note = approve ? '' : (rejectionNote.trim() || 'Pedido rejeitado pelo administrador'); window.VendaMaisCloud.reviewDiscountRequest(id, approve, note).then(() => { notify(approve ? 'Desconto aprovado. O vendedor foi notificado.' : 'Pedido rejeitado. O vendedor foi notificado.'); return window.VendaMaisCloud.discountRequests(); }).then(rows => { const host = $('#discountRequestsList'); if (host) { host.innerHTML = rows.length ? rows.map(request => `<article class="discount-request-card"><b>${escapeHtml(request.product_name)}</b><p>${escapeHtml(request.requester_name || 'Vendedor')} · ${number(request.discount_percent)}% · ${money(request.discount_value)}</p><p>${escapeHtml(request.reason)}</p><div class="inline-actions"><button class="btn primary" data-discount-review="approve" data-id="${request.id}">Aprovar</button><button class="btn secondary" data-discount-review="reject" data-id="${request.id}">Rejeitar</button></div></article>`).join('') : '<div class="empty-state">Não existem pedidos de desconto pendentes.</div>'; } const count = $('#discountInboxCount'); if (count) count.textContent = String(rows.length); }).catch(error => notify(error.message || 'Não foi possível processar o pedido.')); return; }
  const accountTab=event.target.closest('[data-account-tab]'); if(accountTab){const key=accountTab.dataset.accountTab;$$('[data-account-tab]').forEach(button=>button.classList.toggle('active',button===accountTab));$$('[data-account-panel]').forEach(panel=>{const active=panel.dataset.accountPanel===key;panel.classList.toggle('active',active);});return;}
  const reportTab=event.target.closest('[data-report-tab]'); if(reportTab){const key=reportTab.dataset.reportTab;$$('[data-report-tab]').forEach(button=>button.classList.toggle('active',button===reportTab));$$('[data-report-pane]').forEach(pane=>{const active=pane.dataset.reportPane===key;pane.hidden=!active;pane.classList.toggle('active',active);});return;}
  const moduleToggle = event.target.closest('[data-module-toggle]'); if (moduleToggle) return toggleCompanyModule(moduleToggle.dataset.moduleToggle);
  const moduleButton = event.target.closest('[data-module-open]'); if (moduleButton) return openModule(moduleButton.dataset.moduleOpen);
  if (event.target.closest('#newRestaurantTable')) return restaurantTableModal();
  const restaurantOrderButton = event.target.closest('[data-restaurant-order]'); if (restaurantOrderButton) return restaurantOrderModal(restaurantOrderButton.dataset.restaurantOrder);
  const restaurantTableStatus = event.target.closest('[data-table-status]'); if (restaurantTableStatus) return toggleRestaurantTableStatus(restaurantTableStatus.dataset.tableStatus);
  const orderStateButton = event.target.closest('[data-order-state]'); if (orderStateButton) return updateRestaurantOrder(orderStateButton.dataset.orderId, orderStateButton.dataset.orderState);
  const nav = event.target.closest('.nav-link'); if (nav) return showView(nav.dataset.view);
  const go = event.target.closest('[data-go]'); if (go) return showView(go.dataset.go);
  if (event.target.closest('#menuToggle')) return $('#sidebar').classList.toggle('open');
  if (event.target.closest('#quickSale')) return showView('pos');
  if (event.target.closest('#cloudStatus')) return cloudModal();
  if (event.target.closest('#accountButton')) return accountModal();
  if (event.target.closest('#lockSession')) return lockSession();
  if (event.target.closest('[data-close-modal]') || event.target === $('#modalBackdrop')) return closeModal();
  const add = event.target.closest('[data-add-product]'); if (add) return addToCart(add.dataset.addProduct);
  const cartChange = event.target.closest('[data-cart-change]'); if (cartChange) return changeCart(cartChange.dataset.cartChange, Number(cartChange.dataset.change));
  if (event.target.closest('#clearCart')) { if (cart.length) { cart = []; renderCart(); notify('Venda actual limpa.'); } return; }
  if (event.target.closest('#newProduct')) return productModal();
  const productAction = event.target.closest('[data-product-action]'); if (productAction) return productModal(productById(productAction.dataset.id));
  if (event.target.closest('#newAdjustment')) return adjustmentModal();
  if (event.target.closest('#newTransfer')) return transferModal();
  if (event.target.closest('#newCustomer')) return contactModal('customer');
  if (event.target.closest('#quickNewCustomer')) return contactModal('customer', null, customer => { renderPos(); $('#saleCustomer').value = customer.id; renderSaleCustomerInfo(); });
  if (event.target.closest('#editSaleCustomer')) { const customer = customerById($('#saleCustomer').value); if (customer) return contactModal('customer', customer, saved => { renderPos(); $('#saleCustomer').value = saved.id; renderSaleCustomerInfo(); }); }
  const customerAction = event.target.closest('[data-customer-action]'); if (customerAction) { const customer = customerById(customerAction.dataset.id); return customerAction.dataset.customerAction === 'receive' ? receivePaymentModal(customer) : contactModal('customer', customer); }
  if (event.target.closest('#newSupplier')) return contactModal('supplier');
  const supplierAction = event.target.closest('[data-supplier-action]'); if (supplierAction) return contactModal('supplier', supplierById(supplierAction.dataset.id));
  if (event.target.closest('#newPurchase')) return purchaseModal();
  if (event.target.closest('#suggestPurchase')) { const low = data.products.filter(product => stockAt(product) <= product.minStock); return low.length ? purchaseModal(low) : notify('Nenhum produto está abaixo do limite de reposição neste local.'); }
  const purchaseAction = event.target.closest('[data-purchase-action]'); if (purchaseAction) return supplierPaymentModal(data.purchases.find(purchase => purchase.id === purchaseAction.dataset.id));
  const expenseAction = event.target.closest('[data-expense-action]'); if (expenseAction) return expensePaymentModal(data.expenses.find(expense => expense.id === expenseAction.dataset.id));
  if (event.target.closest('#cashPrimaryAction')) return currentCashSession() ? cashCloseModal() : cashOpenModal();
  if (event.target.closest('#cashMovement')) return cashMovementModal();
  const cashRequestAction = event.target.closest('[data-cash-request]'); if (cashRequestAction) return decideCashMovementRequest(cashRequestAction.dataset.id, cashRequestAction.dataset.cashRequest);
  if (event.target.closest('#productsScrollUp')) return scrollProducts(-1);
  if (event.target.closest('#productsScrollDown')) return scrollProducts(1);
  const documentAction = event.target.closest('[data-document-action]'); if (documentAction) { const sale = data.sales.find(item => item.id === documentAction.dataset.id); if (!canAccessDocument(sale)) return notify('Não tem permissão para consultar este documento.'); if (documentAction.dataset.documentAction === 'return') return returnSaleModal(sale); if (documentAction.dataset.documentAction === 'fiscal-register') { if (!canManage()) return notify('Apenas Administrador/Gerente pode preparar este registo.'); if (!window.VendaMaisCloud?.connected?.()) return notify('A preparação fiscal exige ligação online activa e as migrações das Etapas 2 e 3 aplicadas.'); documentAction.disabled = true; window.VendaMaisCloud.createFiscalRecord(sale, { company: data.settings.company, nif: data.settings.nif, phone: data.settings.phone, email: data.settings.email, address: data.settings.address }, { id: sale.locationId || '', name: locationName(sale.locationId) }).then(record => notify(`${record.existing ? 'O registo interno já existia' : 'Registo interno criado'} para ${record.internal_reference}. Estado: preparação interna; sem validade fiscal AGT.`)).catch(error => notify(`Não foi possível criar o registo: ${error.message || 'erro de comunicação'}`)).finally(() => { documentAction.disabled = false; }); return; } return printReceipt(sale); }
  if (event.target.closest('#exportDocuments')) return exportDocuments();
  if (event.target.closest('#manageLocations')) return locationsModal();
  if (event.target.closest('#newLocation')) return locationModal();
  const editLocation = event.target.closest('[data-edit-location]'); if (editLocation) return locationModal(locationById(editLocation.dataset.editLocation));
  if (event.target.closest('#manageUsers')) return usersModal();
  if (event.target.closest('#viewAudit')) return auditModal();
  if (event.target.closest('#manageCloud')) return cloudModal();
  if (event.target.closest('#manageIntegrations')) return integrationsModal();
  if (event.target.closest('#newUser')) return userModal();
  if (event.target.closest('#changeOwnPin')) return changePinModal(currentUser);
  const editUser = event.target.closest('[data-edit-user]'); if (editUser) return userModal(userById(editUser.dataset.editUser));
  if (event.target.closest('#finishSale')) return saleModal();
  if (event.target.closest('#newExpense')) return expenseModal();
  if (event.target.closest('#applyReport')) return renderReports();
  if (event.target.closest('#applyAccounting')) return renderAccounting();
  if (event.target.closest('#exportReport')) return exportReportExcel();
  if (event.target.closest('#exportSaftDiagnostic')) return exportSaftDiagnostic();
  if (event.target.closest('#exportSaftXmlBlueprint')) return exportSaftXmlBlueprint();
  if (event.target.closest('#exportSaftAccountingJson')) return exportSaftAccounting('json');
  if (event.target.closest('#exportSaftAccountingCsv')) return exportSaftAccounting('csv');
  if (event.target.closest('#savePgcaMapping')) return savePgcaMapping();
  if (event.target.closest('#backupData')) return backup();
  if (event.target.closest('#clearBusinessData')) return clearBusinessDataModal();
  if (event.target.closest('#resetDemo')) { if (!isAdministrator()) return notify('Apenas administradores podem repor dados de demonstração.'); if (confirm('Isto substitui todos os dados actuais pelos dados de demonstração. Continuar?')) { data = demoData(); currentUser = getSessionUser(); cart = []; sessionLocked = true; saveData(); $('#companyName').textContent = data.settings.company; renderAccountButton(); applyRoleInterface(); renderAll(); notify('Dados de demonstração repostos.'); accountModal(); } return; }
});
document.addEventListener('input', event => { if (event.target.id === 'productSearch') renderPosProducts(); if (event.target.id === 'saleDiscount') renderCart(); const table = event.target.dataset?.table; if (table === 'products') filterProducts(); if (table === 'customers') filterCustomers(); if (table === 'suppliers') filterSuppliers(); if (table === 'documents') filterDocuments(); });
document.addEventListener('change', event => { if (event.target.id === 'posCategory') renderPosProducts(); if (event.target.id === 'productCategoryFilter') filterProducts(); if (event.target.id === 'saleCustomer') renderSaleCustomerInfo(); if (event.target.id === 'documentStatusFilter') filterDocuments(); if (event.target.id === 'activeLocationSelect') changeActiveLocation(event.target.value); if (event.target.id === 'reportLocationFilter' || event.target.id === 'sellerReportFilter') renderReports(); if (event.target.id === 'restoreData') restore(event.target.files[0]); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal(); });
window.addEventListener('resize', updateProductScrollControls);
$('#settingsForm').addEventListener('submit', event => { event.preventDefault(); if (!isAdministrator()) return notify('Apenas administradores podem alterar definições.'); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.taxRate = Number(values.taxRate); values.stockLimit = Number(values.stockLimit); values.themeId = brandTheme(values.themeId).id; data.settings = { ...data.settings, ...values }; applyBrandTheme(); saveData(); $('#companyName').textContent = data.settings.company; notify('Definições e identidade visual guardadas.'); renderAll(); });

function initialize() {
  $('#topDate').textContent = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  applyBrandTheme(); $('#companyName').textContent = data.settings.company; renderAccountButton(); applyRoleInterface(); if (currentUser) showView(canAccessView('modules') ? 'modules' : (canAccessView('dashboard') ? 'dashboard' : 'pos')); updateCloudUi();
  if (window.VendaMaisCloud?.configured?.()) {
    window.VendaMaisCloud.prepare().then(result => { if (result?.needsBootstrap) return cloudNoProfileModal(); if (!result?.connected) cloudModal(); }).catch(() => cloudModal());
  } else accountModal();
}
initialize();
