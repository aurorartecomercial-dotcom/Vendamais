/* VendaMais — aplicação local de gestão comercial */
const STORE = 'vendamais_local_v1';
const STORAGE_VERSION = 6;
const USER_SESSION = 'vendamais_user_session_v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icons = ['◈', '◇', '◉', '◆', '✦', '⬡'];
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
function number(value) { return Number(value || 0).toLocaleString('pt-PT', { maximumFractionDigits: 2 }); }
function shortDate(value) { return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }
function fullDate(value) { return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: value.length > 10 ? 'short' : undefined }).format(new Date(value.length > 10 ? value : `${value}T12:00:00`)); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function emptyRow(columns, label = 'Ainda não existem registos.') { return `<tr><td colspan="${columns}"><div class="empty-state">${label}</div></td></tr>`; }

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
  const makeSale = (id, offset, customerId, payment, items, discount = 0) => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountValue = subtotal * discount / 100;
    const tax = (subtotal - discountValue) * .14;
    return { id, reference: `VD-${id.slice(-4).toUpperCase()}`, date: dateTime(offset, 9 + Math.abs(offset) % 7), customerId, payment, items, subtotal, discount, discountValue, tax, total: subtotal - discountValue + tax, status: 'Concluída' };
  };
  const sales = [
    makeSale('sale_1001', -6, 'c_ana', 'Multicaixa', [line('p_agua', 2), line('p_arroz', 1)]),
    makeSale('sale_1002', -5, '', 'Dinheiro', [line('p_sumol', 3), line('p_caneta', 2)]),
    makeSale('sale_1003', -4, 'c_lucas', 'Transferência', [line('p_sabao', 1), line('p_oleo', 2)], 3),
    makeSale('sale_1004', -3, '', 'Multicaixa', [line('p_leite', 4), line('p_caderno', 3)]),
    makeSale('sale_1005', -2, 'c_ana', 'Multicaixa', [line('p_arroz', 2), line('p_agua', 4)]),
    makeSale('sale_1006', -1, '', 'Dinheiro', [line('p_sumol', 2), line('p_caneta', 5)]),
    makeSale('sale_1007', 0, 'c_lucas', 'Multicaixa', [line('p_leite', 2), line('p_sabao', 1)])
  ];
  return {
    meta: { schemaVersion: STORAGE_VERSION, lastUpdated: new Date().toISOString() },
    settings: { company: 'Comercial Horizonte, Lda.', nif: '5412345678', phone: '+244 923 000 000', email: 'geral@comercialhorizonte.ao', address: 'Luanda, Angola', taxRate: 14, stockLimit: 5, defaultWarehouse: 'Armazém principal', activeLocationId: 'loc_main' },
    locations: [
      { id: 'loc_main', name: 'Loja principal', type: 'Loja', address: 'Luanda, Angola', active: true },
      { id: 'loc_central', name: 'Armazém central', type: 'Armazém', address: 'Luanda, Angola', active: true }
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
    returns: [],
    transfers: [],
    auditLog: [],
    integrations: { thermalPrinter: false, barcodeScanner: true, multicaixa: false, accountingExport: false },
    purchases: [
      { id: 'buy_201', reference: 'CP-0201', date: dateISO(-7), supplierId: 's_kimb', payment: 'Transferência', total: 148500, items: [{ productId: 'p_agua', name: 'Água mineral 1,5L', quantity: 100, unitCost: 210 }, { productId: 'p_sumol', name: 'Sumo tropical 33cl', quantity: 100, unitCost: 310 }] },
      { id: 'buy_202', reference: 'CP-0202', date: dateISO(-3), supplierId: 's_alim', payment: 'Crédito', total: 172800, items: [{ productId: 'p_oleo', name: 'Óleo alimentar 1L', quantity: 60, unitCost: 1450 }, { productId: 'p_leite', name: 'Leite UHT 1L', quantity: 80, unitCost: 570 }] }
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
  const base = demoData();
  return normaliseData({
    meta: { schemaVersion: STORAGE_VERSION, lastUpdated: new Date().toISOString() },
    settings: { ...base.settings, ...(previous.settings || {}) },
    locations: Array.isArray(previous.locations) && previous.locations.length ? previous.locations : base.locations,
    products: [], customers: [], suppliers: [], sales: [], purchases: [], movements: [], receipts: [], supplierPayments: [], transfers: [],
    cashSessions: [], cashMovements: [], returns: [], auditLog: [],
    users: Array.isArray(previous.users) && previous.users.length ? previous.users : base.users,
    integrations: { ...base.integrations, ...(previous.integrations || {}) }
  });
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
  return { ...user, name: String(user.name || 'Utilizador').trim(), initials: String(user.initials || '').trim().toUpperCase().slice(0, 3), role: normaliseRole(user.role), locationId: String(user.locationId || fallbackLocationId), active: user.active !== false, pin: hasValidPin ? pin : '0000', pinMustChange: hasValidPin ? Boolean(user.pinMustChange) : true };
}
function normaliseLocation(location = {}) {
  return { ...location, id: String(location.id || uid('loc')), name: String(location.name || 'Local sem nome').trim(), type: location.type === 'Armazém' ? 'Armazém' : 'Loja', address: String(location.address || '').trim(), active: location.active !== false };
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
  return { ...product, stockByLocation, stock: totalStock({ stockByLocation }), unit: product.unit || 'un.', barcode: String(product.barcode || '').trim(), warehouse: product.warehouse || 'Armazém principal', expiryDate: product.expiryDate || '', lot: String(product.lot || '').trim() };
}
function normaliseSale(sale = {}, customers = []) {
  const total = Number(sale.total || 0);
  const credit = sale.payment === 'Crédito' || sale.paymentStatus === 'Pendente' || Number(sale.balanceDue || 0) > 0;
  const balanceDue = Math.min(total, Math.max(0, Number(sale.balanceDue ?? (credit ? total : 0))));
  const customer = sale.customer?.name ? sale.customer : customerSnapshot(customers.find(item => item.id === sale.customerId));
  return { ...sale, locationId: sale.locationId || '', customer, documentType: sale.documentType || (credit ? 'Factura' : 'Factura-Recibo'), paymentStatus: balanceDue <= 0 ? 'Pago' : (balanceDue < total ? 'Parcial' : 'Pendente'), amountPaid: Math.max(0, Number(sale.amountPaid ?? (total - balanceDue))), balanceDue, dueDate: sale.dueDate || '' };
}
function normalisePurchase(purchase = {}) {
  const total = Number(purchase.total || 0); const credit = purchase.payment === 'Crédito' || purchase.paymentStatus === 'Pendente' || Number(purchase.balanceDue || 0) > 0; const balanceDue = Math.min(total, Math.max(0, Number(purchase.balanceDue ?? (credit ? total : 0))));
  return { ...purchase, paymentStatus: balanceDue <= 0 ? 'Pago' : (balanceDue < total ? 'Parcial' : 'Pendente'), amountPaid: Math.max(0, Number(purchase.amountPaid ?? (total - balanceDue))), balanceDue };
}
function normaliseData(candidate) {
  const base = demoData();
  const source = candidate && typeof candidate === 'object' && candidate.settings ? candidate : base;
  const collections = ['suppliers', 'movements', 'receipts', 'supplierPayments', 'cashSessions', 'cashMovements', 'returns', 'auditLog', 'transfers'];
  const restored = { ...base, ...source, settings: { ...base.settings, ...source.settings }, meta: { ...base.meta, ...source.meta, schemaVersion: STORAGE_VERSION } };
  collections.forEach(key => { restored[key] = Array.isArray(source[key]) ? source[key] : (Array.isArray(base[key]) ? base[key] : []); });
  restored.locations = (Array.isArray(source.locations) && source.locations.length ? source.locations : base.locations).map(normaliseLocation);
  const fallbackLocationId = restored.locations.find(location => location.id === restored.settings.activeLocationId && location.active)?.id || restored.locations.find(location => location.active)?.id || restored.locations[0].id;
  restored.settings.activeLocationId = fallbackLocationId;
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
  return restored;
}
function loadData() { try { return normaliseData(JSON.parse(localStorage.getItem(STORE))); } catch { return normaliseData(null); } }
let data = loadData();
function getSessionUser() { const id = localStorage.getItem(USER_SESSION); return data.users.find(user => user.id === id && user.active) || data.users.find(user => user.role === 'Administrador' && user.active) || data.users.find(user => user.active) || data.users[0]; }
let currentUser = getSessionUser();
let sessionLocked = true;
let pinChangeRequired = false;
function saveData() {
  data.meta = { ...data.meta, schemaVersion: STORAGE_VERSION, lastUpdated: new Date().toISOString() };
  try { localStorage.setItem(STORE, JSON.stringify(data)); return true; }
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
const ROLE_VIEWS = { Administrador: ['dashboard', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'cash', 'documents', 'reports', 'settings'], Gerente: ['dashboard', 'pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'cash', 'documents', 'reports'], Vendedor: ['pos', 'cash', 'documents'] };
function canManage() { return currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente'; }
function isAdministrator() { return currentUser?.role === 'Administrador'; }
function isSeller() { return currentUser?.role === 'Vendedor'; }
function audit(action, detail) { data.auditLog.unshift({ id: uid('audit'), date: new Date().toISOString(), userId: currentUser?.id || '', userName: currentUser?.name || 'Sistema', action, detail }); data.auditLog = data.auditLog.slice(0, 500); }
function nextReference(prefix, items) { const expression = new RegExp(`^${prefix}-(\\d+)$`); const highest = items.reduce((max, item) => { const match = String(item.reference || '').match(expression); return match ? Math.max(max, Number(match[1])) : max; }, 0); return `${prefix}-${String(highest + 1).padStart(4, '0')}`; }
function saleCustomer(sale) { return sale.customer?.name ? sale.customer : customerSnapshot(customerById(sale.customerId)); }
function saleCustomerName(sale) { return saleCustomer(sale).name || 'Consumidor final'; }
function saleBalanceDue(sale) { return Math.max(0, Number(sale.balanceDue || 0)); }
function categoryList() { return [...new Set(data.products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function saleCost(sale) { return sale.items.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0); }
function sum(array, fn) { return array.reduce((total, item) => total + Number(fn(item) || 0), 0); }
function dayStart(value) { return value ? new Date(`${value}T00:00:00`).getTime() : -Infinity; }
function dayEnd(value) { return value ? new Date(`${value}T23:59:59`).getTime() : Infinity; }
function salesBetween(start, end) { return data.sales.filter(sale => { const time = new Date(sale.date).getTime(); return sale.status !== 'Devolvida' && time >= dayStart(start) && time <= dayEnd(end); }); }
function monthStart() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`; }

function setTitle(view) {
  const titles = { dashboard: 'Visão geral', pos: 'Nova venda', products: 'Produtos & stock', inventory: 'Inventário', customers: 'Clientes', suppliers: 'Fornecedores', purchases: 'Compras', cash: 'Caixa & turnos', documents: 'Documentos comerciais', reports: 'Balanço & relatórios', settings: 'Definições' };
  $('#viewTitle').textContent = titles[view];
}
function canAccessView(view) {
  return Boolean(ROLE_VIEWS[currentUser?.role]?.includes(view));
}
function applyRoleInterface() {
  const shell = $('.app-shell');
  const workspace = $('#workspaceContext');
  const workspaceConfig = {
    Administrador: { key: 'admin', title: 'Área do administrador', description: 'Gestão total, utilizadores e configurações.' },
    Gerente: { key: 'manager', title: 'Área do gerente', description: 'Operação, stock, caixa e relatórios.' },
    Vendedor: { key: 'seller', title: 'Área do vendedor', description: 'Vendas, caixa próprio e documentos pessoais.' }
  };
  const activeWorkspace = workspaceConfig[currentUser?.role] || workspaceConfig.Vendedor;
  if (shell) shell.dataset.workspace = activeWorkspace.key;
  if (workspace) workspace.innerHTML = `<strong>${activeWorkspace.title}</strong><span>${activeWorkspace.description}</span>`;
  $$('.nav-link').forEach(item => { item.hidden = !canAccessView(item.dataset.view); });
  const management = ['products', 'inventory', 'customers', 'suppliers', 'purchases', 'cash', 'documents']; const analysis = ['reports', 'settings'];
  const managementLabel = $('.nav-label[data-nav-group="management"]'); const analysisLabel = $('.nav-label[data-nav-group="analysis"]');
  if (managementLabel) managementLabel.hidden = !management.some(canAccessView);
  if (analysisLabel) analysisLabel.hidden = !analysis.some(canAccessView);
  const role = $('#sessionRole'); if (role && currentUser) role.textContent = currentUser.role;
  const locationSelect = $('#activeLocationSelect');
  if (locationSelect) {
    const locations = activeLocations();
    locationSelect.innerHTML = locations.map(location => `<option value="${location.id}">${escapeHtml(location.name)} · ${escapeHtml(location.type)}</option>`).join('');
    locationSelect.value = currentLocationId();
    locationSelect.disabled = isSeller();
    locationSelect.title = isSeller() ? `O vendedor trabalha no local atribuído: ${locationName(currentLocationId())}.` : 'Seleccione o local de operação.';
  }
  const quickSale = $('#quickSale'); if (quickSale) quickSale.hidden = !canAccessView('pos');
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
  if (view === 'settings') renderSettings();
}
function renderAll() { renderView($('.view.active').id.replace('View', '')); }

function renderDashboard() {
  const today = dateISO(); const start = monthStart();
  const todaySales = salesBetween(today, today); const monthly = salesBetween(start, today);
  const locationId = currentLocationId(); const low = data.products.filter(product => stockAt(product, locationId) <= product.minStock);
  const totalStock = sum(data.products, product => stockAt(product, locationId) * product.cost);
  const income = sum(monthly, sale => sale.total);
  $('#metrics').innerHTML = [
    ['Vendas de hoje', money(sum(todaySales, sale => sale.total)), `${todaySales.length} transação${todaySales.length === 1 ? '' : 'ões'}`, '◷', 'positive'],
    ['Faturação do mês', money(income), `${monthly.length} vendas registadas`, '↗', 'positive'],
    ['Valor do stock', money(totalStock), `${number(sum(data.products, product => stockAt(product, locationId)))} un. em ${locationName(locationId)}`, '◈', ''],
    ['Stock reduzido', low.length, low.length ? 'Requer reposição' : 'Todos os níveis estão bons', '⚠', low.length ? 'warning' : 'positive']
  ].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  const dayData = Array.from({ length: 7 }, (_, index) => { const offset = index - 6; const date = dateISO(offset); return { date, value: sum(salesBetween(date, date), sale => sale.total), label: new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '') }; });
  const max = Math.max(...dayData.map(item => item.value), 1);
  $('#weekTotal').textContent = money(sum(dayData, item => item.value));
  $('#salesChart').innerHTML = dayData.map((item, index) => `<div class="bar-col"><span class="bar-value">${item.value ? number(item.value / 1000) + ' mil' : '—'}</span><div class="bar ${index === 6 ? 'today' : ''}" style="height:${Math.max(4, item.value / max * 100)}%"></div><span class="bar-label">${item.label}</span></div>`).join('');
  $('#lowStockList').innerHTML = low.length ? low.sort((a,b) => stockAt(a, locationId) - stockAt(b, locationId)).slice(0, 5).map((product, index) => `<div class="compact-item"><span class="mini-icon">${icons[index % icons.length]}</span><div class="item-main"><b>${escapeHtml(product.name)}</b><span>Limite: ${number(product.minStock)} un.</span></div><span class="stock-pill">${number(stockAt(product, locationId))} un.</span></div>`).join('') : '<div class="empty-state">O stock deste local está dentro dos níveis definidos.</div>';
  const recent = [...data.sales].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  $('#recentSales').innerHTML = recent.length ? recent.map(sale => `<tr><td><b>${sale.reference}</b><br><small class="muted">${shortDate(sale.date)}</small></td><td>${escapeHtml(saleCustomerName(sale))}</td><td class="money"><b>${money(sale.total)}</b></td><td><span class="status ${saleBalanceDue(sale) ? 'pending' : 'completed'}">${saleBalanceDue(sale) ? 'Em dívida' : 'Pago'}</span></td></tr>`).join('') : emptyRow(4);
  const costs = sum(monthly, saleCost); const purchaseTotal = sum(data.purchases.filter(p => p.date >= start), purchase => purchase.total);
  const receivable = sum(monthly, saleBalanceDue);
  $('#financialSummary').innerHTML = summaryRows([['Faturação de vendas', money(income)], ['Valores por receber', money(receivable)], ['Custo dos produtos vendidos', `− ${money(costs)}`], ['Margem bruta', money(income - costs), true]]);
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
}
function cartNumbers() {
  const subtotal = sum(cart, item => item.price * item.quantity); const discount = isSeller() ? 0 : Math.min(100, Math.max(0, Number($('#saleDiscount')?.value || 0))); const discountValue = subtotal * discount / 100; const taxable = subtotal - discountValue; const tax = taxable * (Number(data.settings.taxRate) / 100); return { subtotal, discount, discountValue, tax, total: taxable + tax };
}
function renderCart() {
  const count = sum(cart, item => item.quantity); $('#cartCount').textContent = `${count} artigo${count === 1 ? '' : 's'}`;
  $('#cartItems').innerHTML = cart.length ? cart.map(item => `<div class="cart-item"><div><b>${escapeHtml(item.name)}</b><small>${money(item.price)} cada</small></div><div class="cart-item-right"><strong>${money(item.price * item.quantity)}</strong><div class="quantity"><button data-cart-change="${item.productId}" data-change="-1">−</button><span>${number(item.quantity)}</span><button data-cart-change="${item.productId}" data-change="1">+</button></div></div></div>`).join('') : '<div class="empty-cart">O carrinho está vazio.<br><small>Escolha produtos ao lado.</small></div>';
  const totals = cartNumbers(); $('#cartSubtotal').textContent = money(totals.subtotal); $('#cartTax').textContent = money(totals.tax); $('#cartTotal').textContent = money(totals.total); $('#taxRateLabel').textContent = `${number(data.settings.taxRate)}%`; const discountInput = $('#saleDiscount'); if (discountInput) { if (isSeller()) discountInput.value = '0'; discountInput.disabled = isSeller(); discountInput.title = isSeller() ? 'Descontos requerem autorização de gerente ou administrador.' : ''; }
}
function addToCart(id) { const product = productById(id); const available = stockAt(product); if (!product || available <= 0) return notify('Este produto não tem stock disponível neste local.'); const entry = cart.find(item => item.productId === id); if (entry) { if (entry.quantity >= available) return notify('A quantidade máxima disponível já está no carrinho.'); entry.quantity += 1; } else { cart.push({ productId: product.id, name: product.name, code: product.code, price: product.price, cost: product.cost, quantity: 1 }); } renderCart(); }
function changeCart(id, change) { const entry = cart.find(item => item.productId === id); if (!entry) return; const product = productById(id); const next = entry.quantity + change; if (next <= 0) cart = cart.filter(item => item.productId !== id); else if (next > stockAt(product)) return notify('Não há mais unidades em stock neste local.'); else entry.quantity = next; renderCart(); }

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
}
function cashOpenModal() {
  if (sessionLocked) return accountModal();
  if (currentCashForAll()) return notify('Já existe um caixa aberto neste local. Feche o turno anterior antes de abrir outro.');
  openModal(`${modalHeader('Abrir caixa', `Registe o fundo inicial para ${locationName(currentLocationId())}.`)}<form id="cashOpenForm"><div class="modal-form"><label>Operador<input value="${escapeHtml(currentUser.name)}" disabled /></label><label>Local<input value="${escapeHtml(locationName(currentLocationId()))}" disabled /></label><label>Fundo inicial (Kz)<input name="openingAmount" type="number" min="0" step="0.01" required value="0" /></label><label class="full">Observação<input name="note" placeholder="Ex.: fundo entregue pelo gerente" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Abrir turno</button></div></form>`);
  $('#cashOpenForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const session = { id: uid('cash'), userId: currentUser.id, locationId: currentLocationId(), openedAt: new Date().toISOString(), openingAmount: Math.max(0, Number(values.openingAmount)), note: values.note.trim(), status: 'Aberto' }; data.cashSessions.push(session); audit('Abertura de caixa', `${locationName(session.locationId)} · fundo inicial: ${money(session.openingAmount)}`); saveData(); closeModal(); notify('Caixa aberto com sucesso.'); renderCash(); });
}
function cashMovementModal() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem registar movimentos manuais de caixa.');
  const session = currentCashSession(); if (!session) return notify('Abra o caixa antes de registar movimentos.');
  openModal(`${modalHeader('Movimento de caixa', 'Use entradas e saídas apenas para movimentos físicos de dinheiro.')}<form id="cashMovementForm"><div class="modal-form"><label>Tipo<select name="type"><option>Entrada</option><option>Saída</option></select></label><label>Valor (Kz)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label class="full">Motivo<input name="note" required placeholder="Ex.: troco adicional, pagamento de transporte" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar movimento</button></div></form>`);
  $('#cashMovementForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const movement = { id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: values.type, amount: Number(values.amount), note: values.note.trim() }; data.cashMovements.push(movement); audit(`Movimento de caixa: ${movement.type}`, `${movement.note} — ${money(movement.amount)}`); saveData(); closeModal(); notify('Movimento de caixa registado.'); renderCash(); });
}
function cashCloseModal() {
  if (sessionLocked) return accountModal();
  const session = currentCashSession(); if (!session) return cashOpenModal(); const values = cashSessionAmounts(session);
  openModal(`${modalHeader('Fechar caixa', 'Conte o dinheiro físico antes de confirmar o fecho.')}<div class="sale-summary"><div><span>Fundo inicial</span><strong>${money(values.opening)}</strong></div><div><span>Vendas em dinheiro</span><strong>${money(values.sales)}</strong></div><div><span>Movimentos líquidos</span><strong>${money(values.in - values.out)}</strong></div><div><span>Valor esperado</span><strong>${money(values.expected)}</strong></div></div><form id="cashCloseForm"><div class="modal-form"><label>Valor contado (Kz)<input name="countedAmount" type="number" min="0" step="0.01" required value="${values.expected.toFixed(2)}" /></label><label>Diferença<input id="cashDifference" value="0,00 Kz" disabled /></label><label class="full">Observação de fecho<input name="closingNote" placeholder="Explique qualquer diferença encontrada" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar fecho</button></div></form>`);
  const form = $('#cashCloseForm'); const refreshDifference = () => { $('#cashDifference').value = money(Number(form.elements.countedAmount.value || 0) - values.expected); }; form.elements.countedAmount.addEventListener('input', refreshDifference);
  form.addEventListener('submit', event => { event.preventDefault(); const formValues = Object.fromEntries(new FormData(form).entries()); const counted = Number(formValues.countedAmount); const difference = counted - values.expected; if (difference !== 0 && !formValues.closingNote.trim()) return notify('Explique a diferença de caixa antes de fechar.'); Object.assign(session, { status: 'Fechado', closedAt: new Date().toISOString(), countedAmount: counted, expectedAmount: values.expected, difference, closingNote: formValues.closingNote.trim() }); audit('Fecho de caixa', `Esperado: ${money(values.expected)} · Contado: ${money(counted)} · Diferença: ${money(difference)}`); saveData(); closeModal(); notify('Caixa fechado e registado.'); renderCash(); });
}
function renderDocuments() { filterDocuments(); }
function filterDocuments() {
  const search = $('.filter-input[data-table="documents"]').value.trim().toLowerCase(); const status = $('#documentStatusFilter').value;
  const sales = data.sales.filter(sale => { const customer = saleCustomer(sale); const owner = !isSeller() || sale.operatorId === currentUser.id; return owner && (!status || sale.status === status) && (!search || `${sale.reference} ${customer.name} ${customer.nif}`.toLowerCase().includes(search)); });
  $('#documentsTable').innerHTML = sales.length ? [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => { const customer = saleCustomer(sale); const canReturn = canManage() && sale.status !== 'Devolvida'; return `<tr><td>${shortDate(sale.date)}</td><td><b>${escapeHtml(sale.reference)}</b><br><small class="muted">${escapeHtml(sale.documentType || 'Documento')}</small></td><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.nif || '—')}</td><td>${escapeHtml(sale.payment)}</td><td class="money"><b>${money(sale.total)}</b></td><td><span class="status ${sale.status === 'Devolvida' ? 'danger' : (saleBalanceDue(sale) ? 'pending' : 'completed')}">${sale.status === 'Devolvida' ? 'Devolvida' : (saleBalanceDue(sale) ? 'Em dívida' : 'Concluída')}</span></td><td><button class="action-btn" data-document-action="print" data-id="${sale.id}">Imprimir</button>${canReturn ? `<button class="action-btn text-danger" data-document-action="return" data-id="${sale.id}">Devolver</button>` : ''}</td></tr>`; }).join('') : emptyRow(8, isSeller() ? 'Ainda não realizou vendas nesta sessão.' : 'Nenhum documento encontrado.');
}
function canAccessDocument(sale) { return Boolean(sale && (!isSeller() || sale.operatorId === currentUser.id)); }
function returnSaleModal(sale) {
  if (!canManage()) return notify('Apenas gerentes e administradores podem processar devoluções.');
  if (!sale || sale.status === 'Devolvida') return notify('Este documento já foi devolvido.');
  const refundable = Math.max(0, Number(sale.amountPaid || 0));
  openModal(`${modalHeader('Processar devolução', `Documento ${sale.reference} · ${money(sale.total)}`)}<p class="modal-note">A devolução cria uma nota de crédito interna, repõe todo o stock e anula o saldo pendente. Valor já pago a devolver: <b>${money(refundable)}</b>.</p><form id="returnForm"><div class="modal-form">${refundable ? `<label>Meio de reembolso<select name="refundPayment"><option ${sale.payment === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option><option ${sale.payment === 'Transferência' ? 'selected' : ''}>Transferência</option><option ${sale.payment === 'Multicaixa' ? 'selected' : ''}>Multicaixa</option><option>Crédito em conta</option></select></label><label>Valor a reembolsar (Kz)<input name="refundAmount" type="number" min="0" max="${refundable}" step="0.01" required value="${refundable.toFixed(2)}" /></label>` : '<div class="full payment-feedback">Não existe valor pago a reembolsar; será anulada apenas a dívida do documento.</div>'}<label class="full">Motivo da devolução<textarea name="reason" required rows="3" placeholder="Ex.: artigo danificado, troca autorizada"></textarea></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar devolução</button></div></form>`);
  $('#returnForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const reason = values.reason.trim(); const refundAmount = refundable ? Number(values.refundAmount) : 0; if (refundAmount < 0 || refundAmount > refundable) return notify('O reembolso não pode ultrapassar o valor já pago.'); const saleLocationId = sale.locationId || currentLocationId(); const session = values.refundPayment === 'Dinheiro' && refundAmount > 0 ? currentCashSession() : null; if (values.refundPayment === 'Dinheiro' && refundAmount > 0 && !session) return notify('Abra o caixa do local actual antes de efectuar um reembolso em dinheiro.'); sale.status = 'Devolvida'; sale.paymentStatus = 'Anulada'; sale.balanceDue = 0; sale.items.forEach(item => { const product = productById(item.productId); if (product) { changeStock(product, saleLocationId, Number(item.quantity)); data.movements.push({ id: uid('mov'), date: new Date().toISOString(), locationId: saleLocationId, productId: product.id, productName: product.name, type: 'Entrada', quantity: Number(item.quantity), note: `Devolução ${sale.reference}` }); } }); if (session) data.cashMovements.push({ id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: 'Saída', amount: refundAmount, note: `Reembolso ${sale.reference}` }); const creditReference = nextReference('NC', data.returns); data.returns.push({ id: uid('return'), saleId: sale.id, reference: creditReference, date: new Date().toISOString(), reason, amount: sale.total, refundAmount, refundPayment: values.refundPayment || '', userId: currentUser.id }); audit('Devolução / nota de crédito', `${sale.reference} · ${creditReference} · ${locationName(saleLocationId)} · reembolso ${money(refundAmount)} · ${reason}`); saveData(); closeModal(); notify('Devolução registada e stock reposto.'); renderAll(); });
}

function renderReports() {
  const startInput = $('#reportStart'); const endInput = $('#reportEnd'); if (!startInput.value) startInput.value = monthStart(); if (!endInput.value) endInput.value = dateISO();
  const sales = salesBetween(startInput.value, endInput.value); const revenue = sum(sales, sale => sale.total); const net = sum(sales, sale => sale.subtotal - sale.discountValue); const tax = sum(sales, sale => sale.tax); const cogs = sum(sales, saleCost); const profit = revenue - tax - cogs; const receivable = sum(sales, saleBalanceDue);
  $('#reportMetrics').innerHTML = [['Faturação', money(revenue), `${sales.length} vendas concluídas`, '↗', 'positive'], ['Por receber', money(receivable), receivable ? 'Vendas a crédito em aberto' : 'Sem valores em dívida', '◷', receivable ? 'warning' : 'positive'], ['IVA liquidado', money(tax), 'Incluído na faturação', '◒', ''], ['Margem bruta', money(profit), revenue ? `${number(profit / revenue * 100)}% da faturação` : 'Sem vendas no período', '◈', profit >= 0 ? 'positive' : 'warning']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#incomeStatement').innerHTML = `<div class="statement-row"><span>Faturação total</span><strong>${money(revenue)}</strong></div><div class="statement-row"><span>IVA incluído</span><strong>− ${money(tax)}</strong></div><div class="statement-row"><span>Vendas sem IVA</span><strong>${money(revenue - tax)}</strong></div><div class="statement-row"><span>Custo dos produtos vendidos</span><strong>− ${money(cogs)}</strong></div><div class="statement-row emphasis ${profit < 0 ? 'loss' : ''}"><span>Resultado bruto</span><strong>${money(profit)}</strong></div>`;
  const payments = ['Dinheiro', 'Multicaixa', 'Transferência', 'Outro']; $('#paymentSummary').innerHTML = payments.map(payment => { const amount = sum(sales.filter(sale => sale.payment === payment), sale => sale.total); const count = sales.filter(sale => sale.payment === payment).length; return `<div class="summary-row"><span>${payment} <small class="muted">(${count})</small></span><strong>${money(amount)}</strong></div>`; }).join('');
  $('#reportSalesTable').innerHTML = sales.length ? [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => `<tr><td>${shortDate(sale.date)}</td><td><b>${sale.reference}</b><br><small class="muted">${escapeHtml(sale.documentType || 'Venda')}</small></td><td>${escapeHtml(saleCustomerName(sale))}</td><td>${escapeHtml(sale.payment)}${saleBalanceDue(sale) ? '<br><small class="text-danger">Em dívida</small>' : ''}</td><td class="money"><b>${money(sale.total)}</b></td></tr>`).join('') : emptyRow(5, 'Não existem vendas neste período.');
  const products = {}; sales.forEach(sale => sale.items.forEach(item => { if (!products[item.productId]) products[item.productId] = { name: item.name, qty: 0, total: 0 }; products[item.productId].qty += item.quantity; products[item.productId].total += item.quantity * item.price; })); const ranked = Object.values(products).sort((a,b) => b.qty - a.qty).slice(0, 5);
  $('#topProducts').innerHTML = ranked.length ? ranked.map((item, index) => `<div class="compact-item"><span class="mini-icon">${index + 1}</span><div class="item-main"><b>${escapeHtml(item.name)}</b><span>${number(item.qty)} unidades vendidas</span></div><strong>${money(item.total)}</strong></div>`).join('') : '<div class="empty-state">Sem vendas neste período.</div>';
}

function renderSettings() { const form = $('#settingsForm'); Object.entries(data.settings).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; }); }

function openModal(content) {
  previouslyFocused = document.activeElement;
  $('#modal').innerHTML = content;
  $('#modalBackdrop').classList.add('open');
  $('#modalBackdrop').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => ($('#modal input, #modal select, #modal textarea') || $('#modal')).focus(), 20);
}
function closeModal() {
  if (sessionLocked || pinChangeRequired) return;
  $('#modalBackdrop').classList.remove('open');
  $('#modalBackdrop').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  previouslyFocused?.focus?.();
  previouslyFocused = null;
}
function modalHeader(title, subtitle = '', closable = true) { return `<div class="modal-head"><div><h2 id="modalTitle">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${closable ? '<button class="close-modal" data-close-modal aria-label="Fechar">×</button>' : ''}</div>`; }
function options(items, selected, label = item => item.name) { return items.map(item => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(label(item))}</option>`).join(''); }

function productModal(product) {
  if (!canManage()) return notify('Apenas administradores e gerentes podem alterar produtos.');
  const locationId = currentLocationId(); const isEdit = Boolean(product); const p = normaliseProduct(product || { code: '', name: '', category: '', barcode: '', unit: 'un.', warehouse: locationName(locationId), lot: '', expiryDate: '', price: '', cost: '', stock: 0, minStock: data.settings.stockLimit }, locationId); const localStock = isEdit ? stockAt(product, locationId) : 0;
  openModal(`${modalHeader(isEdit ? 'Editar produto' : 'Novo produto', `${isEdit ? 'Actualize' : 'Adicione'} o catálogo e o stock em ${locationName(locationId)}.`)}<form id="productForm"><div class="modal-form"><label>Nome do produto<input name="name" required value="${escapeHtml(p.name)}" /></label><label>Código / referência<input name="code" required value="${escapeHtml(p.code)}" /></label><label>Código de barras<input name="barcode" value="${escapeHtml(p.barcode)}" placeholder="EAN / UPC (opcional)" /></label><label>Unidade<select name="unit"><option ${p.unit === 'un.' ? 'selected' : ''}>un.</option><option ${p.unit === 'kg' ? 'selected' : ''}>kg</option><option ${p.unit === 'cx' ? 'selected' : ''}>cx</option><option ${p.unit === 'lt' ? 'selected' : ''}>lt</option></select></label><label>Categoria<input name="category" list="categories" required value="${escapeHtml(p.category)}" /><datalist id="categories">${categoryList().map(category => `<option value="${escapeHtml(category)}">`).join('')}</datalist></label><label>Local de stock<input value="${escapeHtml(locationName(locationId))}" disabled /></label><label>Preço de venda (Kz)<input name="price" type="number" min="0" step="0.01" required value="${p.price}" /></label><label>Custo unitário (Kz)<input name="cost" type="number" min="0" step="0.01" required value="${p.cost}" /></label><label>Stock neste local<input name="stock" type="number" min="0" step="0.001" required value="${localStock}" /></label><label>Limite mínimo<input name="minStock" type="number" min="0" step="0.001" required value="${p.minStock}" /></label><label>Lote<input name="lot" value="${escapeHtml(p.lot)}" /></label><label>Validade<input name="expiryDate" type="date" value="${escapeHtml(p.expiryDate)}" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${isEdit ? 'Guardar alterações' : 'Criar produto'}</button></div></form>`);
  $('#productForm').addEventListener('submit', event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget).entries()); ['price', 'cost', 'stock', 'minStock'].forEach(key => payload[key] = Number(payload[key])); payload.warehouse = locationName(locationId); if (payload.barcode && data.products.some(item => item.barcode === payload.barcode && item.id !== product?.id)) return notify('Já existe um produto com este código de barras.'); if (isEdit) { const oldStock = stockAt(product, locationId); Object.assign(product, normaliseProduct({ ...product, ...payload, stockByLocation: product.stockByLocation }, locationId)); setStockAt(product, locationId, payload.stock); if (payload.stock !== oldStock) data.movements.push({ id: uid('mov'), date: new Date().toISOString(), locationId, productId: product.id, productName: product.name, type: payload.stock > oldStock ? 'Entrada' : 'Saída', quantity: Math.abs(payload.stock - oldStock), note: 'Correcção no produto' }); audit('Produto actualizado', `${product.name} · ${locationName(locationId)}`); notify('Produto actualizado.'); } else { const created = { id: uid('prod'), ...normaliseProduct({ ...payload, stockByLocation: { [locationId]: payload.stock } }, locationId) }; data.products.push(created); if (payload.stock > 0) data.movements.push({ id: uid('mov'), date: new Date().toISOString(), locationId, productId: created.id, productName: created.name, type: 'Entrada', quantity: payload.stock, note: 'Stock inicial do produto' }); audit('Produto criado', `${created.name} · ${locationName(locationId)}`); notify('Produto criado com sucesso.'); } saveData(); closeModal(); renderAll(); });
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
  $('#purchaseForm').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); const lines = $$('.purchase-line', form).map(line => ({ productId: $('[name="productId"]', line).value, quantity: Number($('[name="quantity"]', line).value), unitCost: Number($('[name="unitCost"]', line).value) })); if (lines.some(line => !line.productId || line.quantity <= 0 || line.unitCost < 0)) return notify('Preencha todos os artigos da compra.'); const items = lines.map(line => ({ ...line, name: productById(line.productId).name })); const total = sum(items, item => item.quantity * item.unitCost); const credit = values.payment === 'Crédito'; const reference = values.reference.trim().toUpperCase() || nextReference('CP', data.purchases); if (data.purchases.some(purchase => purchase.reference === reference)) return notify('Já existe uma compra com esta referência.'); const purchase = { id: uid('buy'), reference, date: values.date, locationId: values.locationId, supplierId: values.supplierId, payment: values.payment, paymentStatus: credit ? 'Pendente' : 'Pago', amountPaid: credit ? 0 : total, balanceDue: credit ? total : 0, total, items }; data.purchases.push(purchase); items.forEach(item => { const product = productById(item.productId); changeStock(product, purchase.locationId, item.quantity); product.cost = item.unitCost; data.movements.push({ id: uid('mov'), date: `${values.date}T12:00:00`, locationId: purchase.locationId, productId: product.id, productName: product.name, type: 'Entrada', quantity: item.quantity, note: `Compra ${purchase.reference}` }); }); audit('Compra registada', `${purchase.reference} · ${locationName(purchase.locationId)} · ${money(total)} · ${values.payment}`); saveData(); closeModal(); notify('Compra registada e stock actualizado.'); renderAll(); });
}
function supplierPaymentModal(purchase) {
  if (!canManage()) return notify('Apenas administradores e gerentes podem registar pagamentos a fornecedores.');
  if (!purchase || Number(purchase.balanceDue || 0) <= 0) return notify('Esta compra não tem saldo pendente.'); const supplier = supplierById(purchase.supplierId);
  openModal(`${modalHeader('Registar pagamento ao fornecedor', `${escapeHtml(purchase.reference)} · ${escapeHtml(supplier?.name || 'Fornecedor')} · saldo ${money(purchase.balanceDue)}`)}<form id="supplierPaymentForm"><div class="modal-form"><label>Valor pago (Kz)<input name="amount" type="number" min="0.01" step="0.01" required value="${Number(purchase.balanceDue).toFixed(2)}" /></label><label>Meio de pagamento<select name="payment"><option>Transferência</option><option>Multicaixa</option><option>Dinheiro</option></select></label><label class="full">Observação<input name="note" placeholder="Ex.: referência bancária" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar pagamento</button></div></form>`);
  $('#supplierPaymentForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const amount = Number(values.amount); if (amount <= 0 || amount > Number(purchase.balanceDue)) return notify('O valor deve ser maior que zero e não pode ultrapassar o saldo pendente.'); const session = values.payment === 'Dinheiro' ? currentCashSession() : null; if (values.payment === 'Dinheiro' && !session) return notify('Abra o caixa antes de pagar em dinheiro.'); purchase.amountPaid = Number(purchase.amountPaid || 0) + amount; purchase.balanceDue = Math.max(0, Number(purchase.balanceDue) - amount); purchase.paymentStatus = purchase.balanceDue === 0 ? 'Pago' : 'Parcial'; data.supplierPayments.push({ id: uid('suppay'), purchaseId: purchase.id, supplierId: purchase.supplierId, userId: currentUser.id, cashSessionId: session?.id || '', date: new Date().toISOString(), amount, payment: values.payment, note: values.note.trim() }); if (session) data.cashMovements.push({ id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: 'Saída', amount, note: `Pagamento fornecedor ${purchase.reference}` }); audit('Pagamento a fornecedor', `${purchase.reference} · ${money(amount)} · ${values.payment}`); saveData(); closeModal(); notify('Pagamento ao fornecedor registado.'); renderPurchases(); });
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
function saleModal() {
  if (sessionLocked) return accountModal();
  if (!cart.length) return notify('Adicione pelo menos um produto à venda.'); const locationId = currentLocationId(); const totals = cartNumbers(); const customer = customerById($('#saleCustomer').value); const customerText = customer ? `${customer.name}${customer.nif ? ` · NIF ${customer.nif}` : ''}` : 'Consumidor final'; const seller = isSeller();
  openModal(`${modalHeader('Finalizar venda', seller ? 'Venda imediata. Descontos e crédito requerem autorização de gerente ou administrador.' : 'Confirme os dados comerciais e o pagamento antes de concluir.')}<div class="sale-summary"><div><span>Local</span><strong>${escapeHtml(locationName(locationId))}</strong></div><div><span>Cliente</span><strong>${escapeHtml(customerText)}</strong></div><div><span>Artigos</span><strong>${sum(cart, item => item.quantity)}</strong></div><div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div><div><span>IVA (${number(data.settings.taxRate)}%)</span><strong>${money(totals.tax)}</strong></div><div><span>Total a pagar</span><strong>${money(totals.total)}</strong></div></div><form id="saleForm"><div class="modal-form"><label class="full">Documento<select name="documentType"><option value="Factura-Recibo">Factura-recibo</option><option value="Factura">Factura</option><option value="Venda a dinheiro">Venda a dinheiro</option></select></label><label class="full" ${seller ? 'hidden' : ''}>Condição de pagamento<select name="settlement" id="saleSettlement"><option value="paid">Pagamento imediato</option><option value="credit">Venda a crédito</option></select></label><input name="settlement" type="hidden" value="paid" ${seller ? '' : 'disabled'} /><label id="salePaymentMethodField">Meio de pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option></select></label><label id="saleCashReceivedField">Valor recebido (Kz)<input name="amountReceived" type="number" min="0" step="0.01" value="${totals.total.toFixed(2)}" /></label><label id="saleDueDateField" class="full" hidden>Data de vencimento<input name="dueDate" type="date" value="${dateISO(30)}" /></label><div id="salePaymentFeedback" class="payment-feedback full"></div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Voltar</button><button class="btn primary" type="submit">Confirmar venda</button></div></form>`);
  const form = $('#saleForm'); updateCheckoutFields(form, totals.total);
  form.addEventListener('input', () => updateCheckoutFields(form, totals.total));
  form.addEventListener('change', () => updateCheckoutFields(form, totals.total));
  form.addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const credit = values.settlement === 'credit'; const payment = credit ? 'Crédito' : values.payment; const received = Number(values.amountReceived || 0);
    if (isSeller() && credit) return notify('Vendas a crédito requerem autorização de gerente ou administrador.');
    if (credit && !customer) return notify('Seleccione ou cadastre um cliente para fazer uma venda a crédito.');
    if (credit && customer.creditLimit > 0 && customerStats(customer.id).balance + totals.total > customer.creditLimit) return notify('Esta venda ultrapassa o limite de crédito definido para o cliente.');
    if (!credit && payment === 'Dinheiro' && received < totals.total) return notify('O valor recebido é inferior ao total da venda.');
    const cashSession = payment === 'Dinheiro' ? currentCashSession() : null;
    if (payment === 'Dinheiro' && !cashSession) return notify('Abra o caixa antes de concluir uma venda em dinheiro.');
    for (const item of cart) { const product = productById(item.productId); if (!product || stockAt(product, locationId) < item.quantity) return notify(`${item.name} já não tem stock suficiente neste local.`); }
    const balanceDue = credit ? totals.total : 0;
    const sale = { id: uid('sale'), reference: nextReference('VD', data.sales), date: new Date().toISOString(), locationId, customerId: customer?.id || '', customer: customerSnapshot(customer), operatorId: currentUser.id, operatorName: currentUser.name, cashSessionId: cashSession?.id || '', documentType: credit ? 'Factura' : values.documentType, payment, paymentStatus: credit ? 'Pendente' : 'Pago', amountPaid: credit ? 0 : totals.total, balanceDue, dueDate: credit ? values.dueDate : '', amountReceived: !credit && payment === 'Dinheiro' ? received : totals.total, change: !credit && payment === 'Dinheiro' ? Math.max(0, received - totals.total) : 0, items: cart.map(item => ({ ...item })), subtotal: totals.subtotal, discount: totals.discount, discountValue: totals.discountValue, tax: totals.tax, total: totals.total, status: 'Concluída' };
    // A venda e os movimentos de stock devem ser persistidos como uma única operação local.
    // Se o armazenamento falhar, repomos o estado anterior e não anunciamos sucesso.
    const previousData = JSON.stringify(data);
    cart.forEach(item => changeStock(productById(item.productId), locationId, -item.quantity));
    data.sales.push(sale);
    audit('Venda concluída', `${sale.reference} · ${locationName(locationId)} · ${money(sale.total)} · ${sale.payment}`);
    if (!saveData()) {
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
  form.addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const sale = data.sales.find(item => item.id === values.saleId); const amount = Number(values.amount); if (!sale || amount <= 0) return notify('Introduza um valor válido.'); if (amount > saleBalanceDue(sale)) return notify('O valor é superior ao saldo deste documento.'); const cashSession = values.payment === 'Dinheiro' ? currentCashSession() : null; if (values.payment === 'Dinheiro' && !cashSession) return notify('Abra o caixa antes de receber em dinheiro.'); sale.amountPaid = Number(sale.amountPaid || 0) + amount; sale.balanceDue = Math.max(0, saleBalanceDue(sale) - amount); sale.paymentStatus = sale.balanceDue === 0 ? 'Pago' : 'Parcial'; data.receipts.push({ id: uid('receipt'), saleId: sale.id, customerId: customer.id, userId: currentUser.id, cashSessionId: cashSession?.id || '', date: `${values.date}T12:00:00`, amount, payment: values.payment, note: values.note.trim() }); audit('Recebimento registado', `${sale.reference} · ${money(amount)} · ${values.payment}`); saveData(); closeModal(); notify(`Recebimento de ${money(amount)} registado.`); renderAll(); });
}
function printReceipt(sale) {
  const customer = saleCustomer(sale); const clientDetails = `${escapeHtml(customer.name)}${customer.type && customer.type !== 'Consumidor final' ? `<br><small>${escapeHtml(customer.type)}${customer.nif ? ` · NIF: ${escapeHtml(customer.nif)}` : ''}</small>` : ''}${customer.address ? `<br><small>${escapeHtml(customer.address)}</small>` : ''}`; const win = window.open('', '_blank', 'width=420,height=700'); if (!win) return; win.document.write(`<!doctype html><html><head><title>${escapeHtml(sale.documentType || 'Recibo')} ${sale.reference}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#222;font-size:13px}.head{text-align:center;border-bottom:1px dashed #999;padding-bottom:13px}.head h2{margin:0 0 6px}table{width:100%;border-collapse:collapse;margin:17px 0}td{padding:6px 0;border-bottom:1px solid #eee}.right{text-align:right}.total{font-size:17px;font-weight:bold;border-top:2px solid #222;padding-top:9px;margin-top:8px}.foot{text-align:center;color:#666;margin-top:26px;font-size:11px}@media print{button{display:none}}</style></head><body><div class="head"><h2>${escapeHtml(data.settings.company)}</h2><div>NIF: ${escapeHtml(data.settings.nif || '—')}</div><div>${escapeHtml(data.settings.address || '')}</div></div><p><b>${escapeHtml(sale.documentType || 'Recibo')}:</b> ${escapeHtml(sale.reference)}<br><b>Data:</b> ${fullDate(sale.date)}<br><b>Cliente:</b><br>${clientDetails}</p><table>${sale.items.map(item => `<tr><td>${escapeHtml(item.name)}<br><small>${number(item.quantity)} × ${money(item.price)}</small></td><td class="right">${money(item.quantity * item.price)}</td></tr>`).join('')}</table><div>Subtotal <span style="float:right">${money(sale.subtotal)}</span></div>${sale.discountValue ? `<div>Desconto <span style="float:right">− ${money(sale.discountValue)}</span></div>` : ''}<div>IVA <span style="float:right">${money(sale.tax)}</span></div><div class="total">TOTAL <span style="float:right">${money(sale.total)}</span></div><p>Pagamento: <b>${escapeHtml(sale.payment)}</b><br>Estado: <b>${escapeHtml(sale.paymentStatus || 'Pago')}</b>${saleBalanceDue(sale) ? `<br>Saldo por pagar: <b>${money(saleBalanceDue(sale))}</b>${sale.dueDate ? `<br>Vencimento: ${shortDate(sale.dueDate)}` : ''}` : ''}${sale.change ? `<br>Troco: <b>${money(sale.change)}</b>` : ''}</p><div class="foot">Documento gerado pelo VendaMais. Confirme os requisitos fiscais aplicáveis antes da emissão oficial.<br>Obrigado pela sua preferência.</div><button onclick="window.print()">Imprimir documento</button></body></html>`); win.document.close(); }

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
function reportSalesRows(sales) { return sales.map(sale => { const customer = saleCustomer(sale); return [excelDateCell(sale.date), excelText(sale.reference), excelText(sale.documentType || 'Venda'), excelText(locationName(sale.locationId)), excelText(customer.name), excelText(customer.type), excelText(customer.nif || '—'), excelText(sale.payment), excelText(sale.paymentStatus || 'Pago'), excelNumber(saleBalanceDue(sale), 6), excelNumber(sale.subtotal, 6), excelNumber(sale.discountValue, 6), excelNumber(sale.tax, 6), excelNumber(sale.total, 6)]; }); }
function reportProductRows(sales) { const products = {}; sales.forEach(sale => sale.items.forEach(item => { const key = item.productId || item.code || item.name; if (!products[key]) products[key] = { code: item.code || '—', name: item.name, quantity: 0, total: 0 }; products[key].quantity += Number(item.quantity || 0); products[key].total += Number(item.quantity || 0) * Number(item.price || 0); })); return Object.values(products).sort((a, b) => b.total - a.total).map(item => [excelText(item.code), excelText(item.name), excelNumber(item.quantity), excelNumber(item.total, 6)]); }
function exportReportExcel() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem exportar relatórios.');
  const start = $('#reportStart').value; const end = $('#reportEnd').value; const sales = salesBetween(start, end); const revenue = sum(sales, sale => sale.total); const tax = sum(sales, sale => sale.tax); const cost = sum(sales, saleCost); const receivable = sum(sales, saleBalanceDue); const profit = revenue - tax - cost;
  const payments = ['Dinheiro', 'Multicaixa', 'Transferência', 'Outro'].map(payment => [excelText(payment), excelNumber(sales.filter(sale => sale.payment === payment).length), excelNumber(sum(sales.filter(sale => sale.payment === payment), sale => sale.total), 6)]);
  const summaryRows = [[excelText('Relatório de gestão VendaMais', 1)], [excelText(`Empresa: ${data.settings.company}`, 8)], [excelText(`Período: ${reportPeriod(start, end)}`, 8)], [excelText(`Gerado em: ${fullDate(new Date().toISOString())}`, 8)], [], [excelText('Resumo financeiro', 3), excelText('Valor', 3)], [excelText('Faturação total'), excelNumber(revenue, 7)], [excelText('IVA incluído'), excelNumber(tax, 6)], [excelText('Custo dos produtos vendidos'), excelNumber(cost, 6)], [excelText('Resultado bruto'), excelNumber(profit, 7)], [excelText('Saldo por receber'), excelNumber(receivable, 7)], [excelText('Vendas concluídas'), excelNumber(sales.length)], [], [excelText('Meios de pagamento', 3), excelText('Nº de vendas', 3), excelText('Total', 3)], ...payments];
  const saleHeaders = ['Data', 'Referência', 'Documento', 'Local', 'Cliente', 'Tipo de cliente', 'NIF', 'Pagamento', 'Estado', 'Saldo em dívida', 'Subtotal', 'Desconto', 'IVA', 'Total'].map(label => excelText(label, 3));
  const salesRows = reportSalesRows(sales); const saleTotals = [excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText(''), excelText('Total do período', 2), excelNumber(receivable, 7), excelNumber(sum(sales, sale => sale.subtotal), 7), excelNumber(sum(sales, sale => sale.discountValue), 7), excelNumber(tax, 7), excelNumber(revenue, 7)];
  const productHeaders = ['Código', 'Produto', 'Quantidade vendida', 'Faturação'].map(label => excelText(label, 3));
  const stockHeaders = ['Código', 'Produto', 'Categoria', 'Unidade', 'Preço de venda', 'Custo', 'Stock total', 'Stock mínimo', 'Estado'].map(label => excelText(label, 3));
  const stockRows = [...data.products].sort((a, b) => a.name.localeCompare(b.name)).map(product => [excelText(product.code), excelText(product.name), excelText(product.category), excelText(product.unit || 'un.'), excelNumber(product.price, 6), excelNumber(product.cost, 6), excelNumber(totalStock(product)), excelNumber(product.minStock), excelText(totalStock(product) <= 0 ? 'Sem stock' : totalStock(product) <= product.minStock ? 'Repor' : 'Disponível')]);
  const locationStockHeaders = ['Local', 'Tipo', 'Código', 'Produto', 'Categoria', 'Unidade', 'Stock no local', 'Stock mínimo', 'Estado'].map(label => excelText(label, 3));
  const locationStockRows = data.locations.flatMap(location => [...data.products].sort((a, b) => a.name.localeCompare(b.name)).map(product => { const localStock = stockAt(product, location.id); return [excelText(location.name), excelText(location.type), excelText(product.code), excelText(product.name), excelText(product.category), excelText(product.unit || 'un.'), excelNumber(localStock), excelNumber(product.minStock), excelText(localStock <= 0 ? 'Sem stock' : localStock <= product.minStock ? 'Repor' : 'Disponível')]; }));
  const customerHeaders = ['Nome', 'Tipo', 'NIF', 'Telefone', 'E-mail', 'Morada', 'Limite de crédito'].map(label => excelText(label, 3));
  const customerRows = [...data.customers].sort((a, b) => a.name.localeCompare(b.name)).map(customer => [excelText(customer.name), excelText(customer.type), excelText(customer.nif || '—'), excelText(customer.phone || '—'), excelText(customer.email || '—'), excelText(customer.address || '—'), excelNumber(customer.creditLimit, 6)]);
  const supplierHeaders = ['Fornecedor', 'NIF', 'Telefone', 'E-mail', 'Morada'].map(label => excelText(label, 3));
  const supplierRows = [...data.suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(supplier => [excelText(supplier.name), excelText(supplier.nif || '—'), excelText(supplier.phone || '—'), excelText(supplier.email || '—'), excelText(supplier.address || '—')]);
  const file = createExcelWorkbook([{ name: 'Resumo', rows: summaryRows, widths: [34, 18, 18], freezeRows: 6 }, { name: 'Vendas', rows: [saleHeaders, ...salesRows, saleTotals], widths: [14, 14, 18, 24, 25, 15, 18, 16, 14, 16, 15, 15, 15, 16] }, { name: 'Artigos vendidos', rows: [productHeaders, ...reportProductRows(sales)], widths: [16, 32, 20, 18] }, { name: 'Stock actual', rows: [stockHeaders, ...stockRows], widths: [16, 32, 18, 12, 18, 16, 14, 14, 16] }, { name: 'Stock por local', rows: [locationStockHeaders, ...locationStockRows], widths: [24, 14, 16, 32, 18, 12, 16, 14, 16] }, { name: 'Clientes', rows: [customerHeaders, ...customerRows], widths: [28, 14, 18, 18, 28, 32, 18] }, { name: 'Fornecedores', rows: [supplierHeaders, ...supplierRows], widths: [30, 18, 18, 28, 32] }]);
  download(`relatorio-vendamais-${start || 'inicio'}-${end || 'hoje'}.xlsx`, file); notify('Relatório Excel preparado com 7 folhas organizadas.');
}
function exportDocuments() {
  if (!canManage()) return notify('Apenas administradores e gerentes podem exportar documentos.');
  const headers = ['Data', 'Referência', 'Tipo', 'Cliente', 'NIF', 'Pagamento', 'Total', 'Estado', 'Operador'].map(label => excelText(label, 3)); const rows = [...data.sales].sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => { const customer = saleCustomer(sale); return [excelDateCell(sale.date), excelText(sale.reference), excelText(sale.documentType || 'Documento'), excelText(customer.name), excelText(customer.nif || '—'), excelText(sale.payment), excelNumber(sale.total, 6), excelText(sale.status), excelText(sale.operatorName || userById(sale.operatorId)?.name || '—')]; });
  download(`documentos-vendamais-${dateISO()}.xlsx`, createExcelWorkbook([{ name: 'Documentos', rows: [headers, ...rows], widths: [14, 15, 20, 28, 18, 16, 16, 16, 22] }])); notify('Documentos exportados em formato Excel.');
}
function download(filename, blob) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function backup() { if (!isAdministrator()) return notify('Apenas administradores podem guardar cópias completas.'); const copy = JSON.parse(JSON.stringify(data)); copy.users = copy.users.map(({ pin, ...user }) => ({ ...user, pinMustChange: true })); download(`vendamais-copia-${dateISO()}.json`, new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' })); notify('Cópia de segurança preparada. Por segurança, os PINs não foram incluídos.'); }
function restore(file) { if (!isAdministrator()) return notify('Apenas administradores podem restaurar cópias.'); if (!file) return; const reader = new FileReader(); reader.onload = event => { try { const restored = JSON.parse(event.target.result); if (!restored.settings || !Array.isArray(restored.products)) throw new Error(); data = normaliseData(restored); currentUser = getSessionUser(); saveData(); cart = []; $('#companyName').textContent = data.settings.company; renderAccountButton(); applyRoleInterface(); renderAll(); notify('Cópia restaurada com sucesso.'); } catch { notify('Este ficheiro não parece ser uma cópia válida do VendaMais.'); } }; reader.readAsText(file); }
function clearBusinessDataModal() {
  if (!isAdministrator()) return notify('Apenas administradores podem limpar os dados comerciais.');
  openModal(`${modalHeader('Começar com dados próprios', 'Esta operação remove os dados comerciais actuais, incluindo os de demonstração.')}<p class="modal-note">Antes de continuar, guarde uma cópia de segurança. Serão removidos produtos, clientes, fornecedores, vendas, compras, stock, caixa e movimentos. Os dados da empresa e os utilizadores serão mantidos.</p><form id="clearBusinessDataForm"><div class="modal-form"><label class="full">Escreva <b>LIMPAR</b> para confirmar<input name="confirmation" required autocomplete="off" placeholder="LIMPAR" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Começar sem dados</button></div></form>`);
  $('#clearBusinessDataForm').addEventListener('submit', event => { event.preventDefault(); const confirmation = new FormData(event.currentTarget).get('confirmation').trim().toUpperCase(); if (confirmation !== 'LIMPAR') return notify('Escreva LIMPAR para confirmar esta operação.'); data = emptyBusinessData(data); currentUser = getSessionUser(); cart = []; audit('Dados comerciais limpos', 'Sistema preparado para introdução de dados próprios.'); saveData(); closeModal(); $('#companyName').textContent = data.settings.company; renderAccountButton(); renderAll(); notify('Sistema limpo. Pode agora criar os seus produtos, fornecedores e clientes.'); });
}
function renderAccountButton() { const button = $('#accountButton'); if (!button || !currentUser) return; button.textContent = currentUser.initials || currentUser.name.split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase(); button.title = `${currentUser.name} · ${currentUser.role}`; }
function accountModal() {
  const locked = sessionLocked;
  openModal(`${modalHeader(locked ? 'Aceder ao VendaMais' : 'Trocar utilizador', locked ? 'Seleccione o seu utilizador e introduza o PIN pessoal.' : 'Confirme o PIN do utilizador antes de trocar de área.', !locked)}<form id="accountForm"><div class="modal-form"><label class="full">Utilizador<select name="userId">${data.users.filter(user => user.active).map(user => `<option value="${user.id}" ${user.id === currentUser?.id ? 'selected' : ''}>${escapeHtml(user.name)} · ${escapeHtml(user.role)}</option>`).join('')}</select></label><label class="full">PIN pessoal<input class="pin-input" name="pin" type="password" inputmode="numeric" autocomplete="current-password" minlength="4" maxlength="8" pattern="[0-9]{4,8}" required placeholder="••••" /></label></div><p class="modal-note">Cada vendedor deve usar o seu próprio PIN. Nunca partilhe este código.</p><div class="modal-footer">${locked ? '' : '<button class="btn secondary" id="changeOwnPin" type="button">Alterar o meu PIN</button><button class="btn secondary" type="button" data-close-modal>Cancelar</button>'}<button class="btn primary" type="submit">${locked ? 'Entrar' : 'Confirmar utilizador'}</button></div></form>`);
  $('#accountForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const next = userById(values.userId); if (!next || !next.active || next.pin !== values.pin) return notify('Utilizador ou PIN inválido.'); const mustChangePin = next.pinMustChange; currentUser = next; sessionLocked = false; pinChangeRequired = false; localStorage.setItem(USER_SESSION, next.id); audit('Sessão iniciada', `${next.name} · ${next.role}`); saveData(); if (!mustChangePin) closeModal(); renderAccountButton(); applyRoleInterface(); const activeView = $('.view.active')?.id.replace('View', ''); showView(canAccessView(activeView) ? activeView : (canAccessView('dashboard') ? 'dashboard' : 'pos')); if (mustChangePin) return changePinModal(next, true); notify(`Sessão activa: ${next.name}.`); });
}
function lockSession() {
  if (cart.length && !confirm('A venda actual será limpa ao bloquear a sessão. Continuar?')) return;
  cart = []; sessionLocked = true; $('#sidebar').classList.remove('open'); notify('Sessão bloqueada.'); accountModal();
}
function changePinModal(user = currentUser, mandatory = false) {
  if (!user || (user.id !== currentUser?.id && !isAdministrator())) return notify('Não tem permissão para alterar este PIN.');
  pinChangeRequired = mandatory;
  openModal(`${modalHeader('Definir PIN pessoal', mandatory ? 'Por segurança, defina agora um novo PIN de 4 a 8 dígitos.' : 'Escolha um PIN de 4 a 8 dígitos para este utilizador.', !mandatory)}<form id="pinForm"><div class="modal-form"><label class="full">Novo PIN<input class="pin-input" name="pin" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="8" pattern="[0-9]{4,8}" required placeholder="••••" /></label><label class="full">Confirmar PIN<input class="pin-input" name="confirmation" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="8" pattern="[0-9]{4,8}" required placeholder="••••" /></label></div><div class="modal-footer">${mandatory ? '' : '<button class="btn secondary" type="button" data-close-modal>Cancelar</button>'}<button class="btn primary" type="submit">Guardar PIN</button></div></form>`);
  $('#pinForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); if (!/^\d{4,8}$/.test(values.pin)) return notify('O PIN deve ter apenas 4 a 8 dígitos.'); if (values.pin !== values.confirmation) return notify('Os dois PINs não coincidem.'); user.pin = values.pin; user.pinMustChange = false; audit('PIN actualizado', `Utilizador: ${user.name}`); saveData(); pinChangeRequired = false; closeModal(); notify('PIN guardado com sucesso.'); });
}
function locationsModal() {
  if (!isAdministrator()) return notify('Apenas administradores podem gerir lojas e armazéns.');
  const rows = data.locations.map(location => { const units = sum(data.products, product => stockAt(product, location.id)); const value = sum(data.products, product => stockAt(product, location.id) * product.cost); const users = data.users.filter(user => user.locationId === location.id && user.active).length; return `<div class="location-card"><span class="mini-icon">${location.type === 'Armazém' ? '▦' : '⌂'}</span><div class="item-main"><strong>${escapeHtml(location.name)}</strong><span>${escapeHtml(location.type)}${location.address ? ` · ${escapeHtml(location.address)}` : ''} · ${location.active ? 'Activo' : 'Inactivo'}</span></div><div class="location-summary"><b>${number(units)} un.</b><span>${money(value)} · ${users} operador${users === 1 ? '' : 'es'}</span></div><button class="action-btn" data-edit-location="${location.id}" type="button">Editar</button></div>`; }).join('');
  openModal(`${modalHeader('Lojas e armazéns', 'Cada local possui stock próprio. Vendedores ficam limitados ao local atribuído.')}<div class="locations-list">${rows}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button><button class="btn primary" id="newLocation" type="button">＋ Novo local</button></div>`);
}
function locationModal(location = null) {
  if (!isAdministrator()) return notify('Apenas administradores podem gerir lojas e armazéns.');
  const item = location || { name: '', type: 'Loja', address: '', active: true };
  openModal(`${modalHeader(location ? 'Editar local' : 'Novo local', 'Os locais activos podem receber stock, compras, vendas e caixas próprios.')}<form id="locationForm"><div class="modal-form"><label>Nome do local<input name="name" required value="${escapeHtml(item.name)}" placeholder="Ex.: Loja Kilamba" /></label><label>Tipo<select name="type"><option ${item.type === 'Loja' ? 'selected' : ''}>Loja</option><option ${item.type === 'Armazém' ? 'selected' : ''}>Armazém</option></select></label><label class="full">Morada / referência<input name="address" value="${escapeHtml(item.address || '')}" /></label><label>Estado<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Activo</option><option value="false" ${item.active === false ? 'selected' : ''}>Inactivo</option></select></label></div><p class="modal-note">Um local com stock ou operadores atribuídos não pode ser desactivado até ser regularizado.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${location ? 'Guardar alterações' : 'Criar local'}</button></div></form>`);
  $('#locationForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.name = values.name.trim(); values.address = values.address.trim(); values.active = values.active === 'true'; if (!values.name) return notify('Indique o nome do local.'); const duplicate = data.locations.find(existing => existing.name.toLowerCase() === values.name.toLowerCase() && existing.id !== location?.id); if (duplicate) return notify('Já existe um local com este nome.'); if (location && !values.active) { const units = sum(data.products, product => stockAt(product, location.id)); const assigned = data.users.some(user => user.locationId === location.id && user.active); if (units > 0 || assigned) return notify('Transfira o stock e atribua os operadores a outro local antes de desactivar.'); if (location.id === currentLocationId()) return notify('Seleccione outro local activo antes de desactivar este.'); } if (location) { Object.assign(location, values); } else data.locations.push(normaliseLocation({ id: uid('loc'), ...values })); audit(location ? 'Local actualizado' : 'Local criado', values.name); saveData(); closeModal(); applyRoleInterface(); renderAll(); notify('Local guardado.'); locationsModal(); });
}
function changeActiveLocation(locationId) {
  if (isSeller()) return notify('O vendedor trabalha apenas no local que lhe foi atribuído.');
  if (!locationById(locationId)?.active) return notify('Seleccione um local activo.');
  if (locationId === currentLocationId()) return;
  if (cart.length && !confirm('A venda actual será limpa ao trocar de local. Continuar?')) { applyRoleInterface(); return; }
  cart = []; data.settings.activeLocationId = locationId; audit('Local de operação alterado', locationName(locationId)); saveData(); applyRoleInterface(); renderAll(); notify(`Local de operação: ${locationName(locationId)}.`);
}
function userModal(user = null) {
  if (!isAdministrator()) return notify('Apenas administradores podem criar ou alterar utilizadores.');
  const item = user || { name: '', initials: '', role: 'Vendedor', locationId: currentLocationId(), active: true, pin: '' };
  openModal(`${modalHeader(user ? 'Editar utilizador' : 'Novo utilizador', 'Escolha a área de trabalho e as autorizações deste utilizador. As opções são aplicadas ao iniciar sessão.')}<form id="userForm"><div class="modal-form"><label>Nome completo<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Iniciais<input name="initials" maxlength="3" required value="${escapeHtml(item.initials || '')}" placeholder="Ex.: JM" /></label><label>Função<select name="role"><option ${item.role === 'Vendedor' ? 'selected' : ''}>Vendedor</option><option ${item.role === 'Gerente' ? 'selected' : ''}>Gerente</option><option ${item.role === 'Administrador' ? 'selected' : ''}>Administrador</option></select></label><label>Local atribuído<select name="locationId">${options(activeLocations(), item.locationId || currentLocationId(), location => `${location.name} · ${location.type}`)}</select></label><label>Estado<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Activo</option><option value="false" ${item.active === false ? 'selected' : ''}>Inactivo</option></select></label><label class="full">${user ? 'Novo PIN (deixe vazio para manter)' : 'PIN temporário'}<input class="pin-input" name="pin" type="password" inputmode="numeric" minlength="4" maxlength="8" pattern="[0-9]{4,8}" ${user ? '' : 'required'} placeholder="4 a 8 dígitos" /></label></div><p class="role-note"><b>Autorizações por perfil:</b> Administrador — todas as áreas e gestão de utilizadores; Gerente — operação, stock, compras, caixa e relatórios; Vendedor — nova venda, caixa próprio e documentos das próprias vendas. O vendedor fica limitado ao local atribuído. O utilizador escolhe o próprio PIN no primeiro acesso.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${user ? 'Guardar alterações' : 'Criar utilizador'}</button></div></form>`);
  $('#userForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.name = values.name.trim(); values.initials = values.initials.trim().toUpperCase(); values.active = values.active === 'true'; const pin = String(values.pin || '').trim(); delete values.pin; if (pin && !/^\d{4,8}$/.test(pin)) return notify('O PIN deve ter apenas 4 a 8 dígitos.'); if (!user && !pin) return notify('Defina um PIN temporário para o utilizador.'); const activeAdmins = data.users.filter(existing => existing.role === 'Administrador' && existing.active && existing.id !== user?.id); if (user?.id === currentUser.id && !values.active) return notify('Não pode desactivar o utilizador que está em sessão.'); if (user?.role === 'Administrador' && user.active && (values.role !== 'Administrador' || !values.active) && activeAdmins.length === 0) return notify('O sistema deve manter pelo menos um administrador activo.'); if (user) { Object.assign(user, values); if (pin) Object.assign(user, { pin, pinMustChange: true }); } else data.users.push(normaliseUser({ id: uid('user'), ...values, pin, pinMustChange: true })); audit(user ? 'Utilizador actualizado' : 'Utilizador criado', `${values.name} · ${values.role}`); saveData(); closeModal(); if (user?.id === currentUser.id) { renderAccountButton(); applyRoleInterface(); const activeView = $('.view.active')?.id.replace('View', ''); if (!canAccessView(activeView)) showView(canAccessView('dashboard') ? 'dashboard' : 'pos'); } notify('Utilizador guardado.'); if (isAdministrator()) usersModal(); else renderAll(); });
}
function usersModal() {
  if (!isAdministrator()) return notify('Apenas administradores podem gerir utilizadores.');
  openModal(`${modalHeader('Utilizadores e permissões', 'Cada utilizador entra na sua própria área. O perfil escolhido define os ecrãs, operações e dados a que pode aceder.')}<div class="users-list">${data.users.map(user => `<div class="user-row"><div class="user-initials">${escapeHtml(user.initials || '—')}</div><div class="item-main"><b>${escapeHtml(user.name)}</b><span>${escapeHtml(user.role)} · ${escapeHtml(locationName(user.locationId))} · ${user.active ? 'Activo' : 'Inactivo'}${user.pinMustChange ? ' · PIN pendente' : ''}</span></div><button class="action-btn" type="button" data-edit-user="${user.id}">Editar</button></div>`).join('')}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button><button class="btn primary" id="newUser" type="button">＋ Novo utilizador</button></div>`);
}
function auditModal() {
  if (!canManage()) return notify('Apenas gerentes e administradores podem consultar a auditoria.');
  const entries = data.auditLog.slice(0, 100);
  openModal(`${modalHeader('Registo de auditoria', 'Últimas 100 acções relevantes registadas localmente.')}<div class="audit-list">${entries.length ? entries.map(entry => `<div class="audit-row"><div><b>${escapeHtml(entry.action)}</b><span>${escapeHtml(entry.detail || '')}</span></div><small>${fullDate(entry.date)} · ${escapeHtml(entry.userName || userById(entry.userId)?.name || '—')}</small></div>`).join('') : '<div class="empty-state">Ainda não existem acções no registo.</div>'}</div><div class="modal-footer"><button class="btn primary" type="button" data-close-modal>Fechar</button></div>`);
}
function integrationsModal() {
  if (!isAdministrator()) return notify('Apenas administradores podem gerir integrações.');
  const items = [['thermalPrinter', 'Impressora térmica', 'Permite imprimir documentos através da janela de impressão do navegador.'], ['barcodeScanner', 'Leitor de código de barras', 'Aceita pesquisa por código de barras no ponto de venda.'], ['multicaixa', 'Integração Multicaixa', 'Requer contrato, credenciais e integração homologada do fornecedor.'], ['accountingExport', 'Exportação contabilística', 'Prepara exportações para integração com o software de contabilidade.']];
  openModal(`${modalHeader('Integrações e equipamentos', 'Active apenas funcionalidades já configuradas pela empresa.')}<form id="integrationsForm"><div class="integration-list">${items.map(([key, title, description]) => `<label class="integration-row"><input type="checkbox" name="${key}" ${data.integrations[key] ? 'checked' : ''} /><span><b>${title}</b><small>${description}</small></span></label>`).join('')}</div><p class="modal-note">A activação no sistema não cria uma ligação bancária real. Pagamentos Multicaixa exigem fornecedor autorizado, credenciais e testes oficiais.</p><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar preferências</button></div></form>`);
  $('#integrationsForm').addEventListener('submit', event => { event.preventDefault(); const values = new FormData(event.currentTarget); Object.keys(data.integrations).forEach(key => { data.integrations[key] = values.has(key); }); audit('Integrações actualizadas', 'Preferências operacionais alteradas'); saveData(); closeModal(); notify('Preferências de integração guardadas.'); });
}

document.addEventListener('click', event => {
  const nav = event.target.closest('.nav-link'); if (nav) return showView(nav.dataset.view);
  const go = event.target.closest('[data-go]'); if (go) return showView(go.dataset.go);
  if (event.target.closest('#menuToggle')) return $('#sidebar').classList.toggle('open');
  if (event.target.closest('#quickSale')) return showView('pos');
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
  if (event.target.closest('#cashPrimaryAction')) return currentCashSession() ? cashCloseModal() : cashOpenModal();
  if (event.target.closest('#cashMovement')) return cashMovementModal();
  const documentAction = event.target.closest('[data-document-action]'); if (documentAction) { const sale = data.sales.find(item => item.id === documentAction.dataset.id); if (!canAccessDocument(sale)) return notify('Não tem permissão para consultar este documento.'); return documentAction.dataset.documentAction === 'return' ? returnSaleModal(sale) : printReceipt(sale); }
  if (event.target.closest('#exportDocuments')) return exportDocuments();
  if (event.target.closest('#manageLocations')) return locationsModal();
  if (event.target.closest('#newLocation')) return locationModal();
  const editLocation = event.target.closest('[data-edit-location]'); if (editLocation) return locationModal(locationById(editLocation.dataset.editLocation));
  if (event.target.closest('#manageUsers')) return usersModal();
  if (event.target.closest('#viewAudit')) return auditModal();
  if (event.target.closest('#manageIntegrations')) return integrationsModal();
  if (event.target.closest('#newUser')) return userModal();
  if (event.target.closest('#changeOwnPin')) return changePinModal(currentUser);
  const editUser = event.target.closest('[data-edit-user]'); if (editUser) return userModal(userById(editUser.dataset.editUser));
  if (event.target.closest('#finishSale')) return saleModal();
  if (event.target.closest('#applyReport')) return renderReports();
  if (event.target.closest('#exportReport')) return exportReportExcel();
  if (event.target.closest('#backupData')) return backup();
  if (event.target.closest('#clearBusinessData')) return clearBusinessDataModal();
  if (event.target.closest('#resetDemo')) { if (!isAdministrator()) return notify('Apenas administradores podem repor dados de demonstração.'); if (confirm('Isto substitui todos os dados actuais pelos dados de demonstração. Continuar?')) { data = demoData(); currentUser = getSessionUser(); cart = []; sessionLocked = true; saveData(); $('#companyName').textContent = data.settings.company; renderAccountButton(); applyRoleInterface(); renderAll(); notify('Dados de demonstração repostos.'); accountModal(); } return; }
});
document.addEventListener('input', event => { if (event.target.id === 'productSearch') renderPosProducts(); if (event.target.id === 'saleDiscount') renderCart(); const table = event.target.dataset?.table; if (table === 'products') filterProducts(); if (table === 'customers') filterCustomers(); if (table === 'suppliers') filterSuppliers(); if (table === 'documents') filterDocuments(); });
document.addEventListener('change', event => { if (event.target.id === 'posCategory') renderPosProducts(); if (event.target.id === 'productCategoryFilter') filterProducts(); if (event.target.id === 'saleCustomer') renderSaleCustomerInfo(); if (event.target.id === 'documentStatusFilter') filterDocuments(); if (event.target.id === 'activeLocationSelect') changeActiveLocation(event.target.value); if (event.target.id === 'restoreData') restore(event.target.files[0]); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal(); });
$('#settingsForm').addEventListener('submit', event => { event.preventDefault(); if (!isAdministrator()) return notify('Apenas administradores podem alterar definições.'); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.taxRate = Number(values.taxRate); values.stockLimit = Number(values.stockLimit); data.settings = { ...data.settings, ...values }; saveData(); $('#companyName').textContent = data.settings.company; notify('Definições guardadas.'); renderAll(); });

function initialize() { $('#topDate').textContent = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); $('#companyName').textContent = data.settings.company; renderAccountButton(); applyRoleInterface(); renderDashboard(); accountModal(); }
initialize();
