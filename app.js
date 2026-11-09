/* VendaMais — aplicação local de gestão comercial */
const STORE = 'vendamais_local_v1';
const STORAGE_VERSION = 3;
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
    settings: { company: 'Comercial Horizonte, Lda.', nif: '5412345678', phone: '+244 923 000 000', email: 'geral@comercialhorizonte.ao', address: 'Luanda, Angola', taxRate: 14, stockLimit: 5, defaultWarehouse: 'Armazém principal' },
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
      { id: 'u_admin', name: 'Administrador', initials: 'AD', role: 'Administrador', active: true },
      { id: 'u_caixa', name: 'Caixa principal', initials: 'CP', role: 'Caixa', active: true },
      { id: 'u_gerente', name: 'Gestor da loja', initials: 'GL', role: 'Gerente', active: true }
    ],
    cashSessions: [],
    cashMovements: [],
    returns: [],
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

function customerSnapshot(customer) {
  if (!customer) return { id: '', type: 'Consumidor final', name: 'Consumidor final', nif: '', phone: '', email: '', address: '' };
  return { id: customer.id || '', type: customer.type === 'Empresa' ? 'Empresa' : 'Particular', name: customer.name || 'Cliente sem nome', nif: customer.nif || '', phone: customer.phone || '', email: customer.email || '', address: customer.address || '' };
}
function normaliseCustomer(customer = {}) {
  return { ...customer, type: customer.type === 'Empresa' ? 'Empresa' : 'Particular', name: String(customer.name || '').trim(), phone: String(customer.phone || '').trim(), email: String(customer.email || '').trim(), nif: String(customer.nif || '').trim().toUpperCase(), address: String(customer.address || '').trim(), creditLimit: Math.max(0, Number(customer.creditLimit || 0)) };
}
function normaliseProduct(product = {}) {
  return { ...product, unit: product.unit || 'un.', barcode: String(product.barcode || '').trim(), warehouse: product.warehouse || 'Armazém principal', expiryDate: product.expiryDate || '', lot: String(product.lot || '').trim() };
}
function normaliseSale(sale = {}, customers = []) {
  const total = Number(sale.total || 0);
  const credit = sale.payment === 'Crédito' || sale.paymentStatus === 'Pendente' || Number(sale.balanceDue || 0) > 0;
  const balanceDue = Math.min(total, Math.max(0, Number(sale.balanceDue ?? (credit ? total : 0))));
  const customer = sale.customer?.name ? sale.customer : customerSnapshot(customers.find(item => item.id === sale.customerId));
  return { ...sale, customer, documentType: sale.documentType || (credit ? 'Factura' : 'Factura-Recibo'), paymentStatus: balanceDue <= 0 ? 'Pago' : (balanceDue < total ? 'Parcial' : 'Pendente'), amountPaid: Math.max(0, Number(sale.amountPaid ?? (total - balanceDue))), balanceDue, dueDate: sale.dueDate || '' };
}
function normalisePurchase(purchase = {}) {
  const total = Number(purchase.total || 0); const credit = purchase.payment === 'Crédito' || purchase.paymentStatus === 'Pendente' || Number(purchase.balanceDue || 0) > 0; const balanceDue = Math.min(total, Math.max(0, Number(purchase.balanceDue ?? (credit ? total : 0))));
  return { ...purchase, paymentStatus: balanceDue <= 0 ? 'Pago' : (balanceDue < total ? 'Parcial' : 'Pendente'), amountPaid: Math.max(0, Number(purchase.amountPaid ?? (total - balanceDue))), balanceDue };
}
function normaliseData(candidate) {
  const base = demoData();
  const source = candidate && typeof candidate === 'object' && candidate.settings ? candidate : base;
  const collections = ['suppliers', 'movements', 'receipts', 'supplierPayments', 'users', 'cashSessions', 'cashMovements', 'returns', 'auditLog'];
  const restored = { ...base, ...source, settings: { ...base.settings, ...source.settings }, meta: { ...base.meta, ...source.meta, schemaVersion: STORAGE_VERSION } };
  collections.forEach(key => { restored[key] = Array.isArray(source[key]) ? source[key] : (Array.isArray(base[key]) ? base[key] : []); });
  restored.products = (Array.isArray(source.products) ? source.products : []).map(normaliseProduct);
  restored.purchases = (Array.isArray(source.purchases) ? source.purchases : []).map(normalisePurchase);
  restored.customers = (Array.isArray(source.customers) ? source.customers : []).map(normaliseCustomer);
  restored.sales = (Array.isArray(source.sales) ? source.sales : []).map(sale => normaliseSale(sale, restored.customers));
  restored.integrations = { ...base.integrations, ...(source.integrations || {}) };
  return restored;
}
function loadData() { try { return normaliseData(JSON.parse(localStorage.getItem(STORE))); } catch { return normaliseData(null); } }
let data = loadData();
function getSessionUser() { const id = localStorage.getItem(USER_SESSION); return data.users.find(user => user.id === id && user.active) || data.users.find(user => user.role === 'Administrador') || data.users[0]; }
let currentUser = getSessionUser();
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
function currentCashSession() { return data.cashSessions.find(session => session.status === 'Aberto' && session.userId === currentUser?.id); }
function currentCashForAll() { return data.cashSessions.find(session => session.status === 'Aberto'); }
function canManage() { return currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente'; }
function isAdministrator() { return currentUser?.role === 'Administrador'; }
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
  if (currentUser?.role !== 'Caixa') return true;
  return ['dashboard', 'pos', 'customers', 'cash', 'documents'].includes(view);
}
function showView(view) {
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
  const low = data.products.filter(product => product.stock <= product.minStock);
  const totalStock = sum(data.products, product => product.stock * product.cost);
  const income = sum(monthly, sale => sale.total);
  $('#metrics').innerHTML = [
    ['Vendas de hoje', money(sum(todaySales, sale => sale.total)), `${todaySales.length} transação${todaySales.length === 1 ? '' : 'ões'}`, '◷', 'positive'],
    ['Faturação do mês', money(income), `${monthly.length} vendas registadas`, '↗', 'positive'],
    ['Valor do stock', money(totalStock), `${sum(data.products, product => product.stock)} unidades`, '◈', ''],
    ['Stock reduzido', low.length, low.length ? 'Requer reposição' : 'Todos os níveis estão bons', '⚠', low.length ? 'warning' : 'positive']
  ].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  const dayData = Array.from({ length: 7 }, (_, index) => { const offset = index - 6; const date = dateISO(offset); return { date, value: sum(salesBetween(date, date), sale => sale.total), label: new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '') }; });
  const max = Math.max(...dayData.map(item => item.value), 1);
  $('#weekTotal').textContent = money(sum(dayData, item => item.value));
  $('#salesChart').innerHTML = dayData.map((item, index) => `<div class="bar-col"><span class="bar-value">${item.value ? number(item.value / 1000) + ' mil' : '—'}</span><div class="bar ${index === 6 ? 'today' : ''}" style="height:${Math.max(4, item.value / max * 100)}%"></div><span class="bar-label">${item.label}</span></div>`).join('');
  $('#lowStockList').innerHTML = low.length ? low.sort((a,b) => a.stock - b.stock).slice(0, 5).map((product, index) => `<div class="compact-item"><span class="mini-icon">${icons[index % icons.length]}</span><div class="item-main"><b>${escapeHtml(product.name)}</b><span>Limite: ${number(product.minStock)} un.</span></div><span class="stock-pill">${number(product.stock)} un.</span></div>`).join('') : '<div class="empty-state">O stock está dentro dos níveis definidos.</div>';
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
  const products = data.products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.code} ${product.barcode || ''}`.toLowerCase().includes(search)));
  $('#posProducts').innerHTML = products.length ? products.map((product, index) => `<button class="product-card ${product.stock <= 0 ? 'sold-out' : ''}" data-add-product="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}><span class="product-image">${icons[index % icons.length]}</span><b>${escapeHtml(product.name)}</b><span class="code">${escapeHtml(product.code)}${product.barcode ? ` · ${escapeHtml(product.barcode)}` : ''}</span><footer><strong>${money(product.price)}</strong><small>${number(product.stock)} ${escapeHtml(product.unit || 'un.')}</small></footer></button>`).join('') : '<div class="empty-state">Nenhum produto encontrado.</div>';
}
function cartNumbers() {
  const subtotal = sum(cart, item => item.price * item.quantity); const discount = Math.min(100, Math.max(0, Number($('#saleDiscount')?.value || 0))); const discountValue = subtotal * discount / 100; const taxable = subtotal - discountValue; const tax = taxable * (Number(data.settings.taxRate) / 100); return { subtotal, discount, discountValue, tax, total: taxable + tax };
}
function renderCart() {
  const count = sum(cart, item => item.quantity); $('#cartCount').textContent = `${count} artigo${count === 1 ? '' : 's'}`;
  $('#cartItems').innerHTML = cart.length ? cart.map(item => `<div class="cart-item"><div><b>${escapeHtml(item.name)}</b><small>${money(item.price)} cada</small></div><div class="cart-item-right"><strong>${money(item.price * item.quantity)}</strong><div class="quantity"><button data-cart-change="${item.productId}" data-change="-1">−</button><span>${number(item.quantity)}</span><button data-cart-change="${item.productId}" data-change="1">+</button></div></div></div>`).join('') : '<div class="empty-cart">O carrinho está vazio.<br><small>Escolha produtos ao lado.</small></div>';
  const totals = cartNumbers(); $('#cartSubtotal').textContent = money(totals.subtotal); $('#cartTax').textContent = money(totals.tax); $('#cartTotal').textContent = money(totals.total); $('#taxRateLabel').textContent = `${number(data.settings.taxRate)}%`;
}
function addToCart(id) { const product = productById(id); if (!product || product.stock <= 0) return notify('Este produto não tem stock disponível.'); const entry = cart.find(item => item.productId === id); if (entry) { if (entry.quantity >= product.stock) return notify('A quantidade máxima disponível já está no carrinho.'); entry.quantity += 1; } else { cart.push({ productId: product.id, name: product.name, code: product.code, price: product.price, cost: product.cost, quantity: 1 }); } renderCart(); }
function changeCart(id, change) { const entry = cart.find(item => item.productId === id); if (!entry) return; const product = productById(id); const next = entry.quantity + change; if (next <= 0) cart = cart.filter(item => item.productId !== id); else if (next > product.stock) return notify('Não há mais unidades em stock.'); else entry.quantity = next; renderCart(); }

function renderProducts() {
  const categoryFilter = $('#productCategoryFilter'); const previous = categoryFilter.value;
  categoryFilter.innerHTML = '<option value="">Todas as categorias</option>' + categoryList().map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join(''); categoryFilter.value = previous;
  filterProducts();
}
function filterProducts() {
  const search = $('.filter-input[data-table="products"]').value.trim().toLowerCase(); const category = $('#productCategoryFilter').value;
  const products = data.products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.code} ${product.barcode || ''}`.toLowerCase().includes(search)));
  $('#productsCount').textContent = `${products.length} produto${products.length === 1 ? '' : 's'}`;
  $('#productsTable').innerHTML = products.length ? products.map((product, index) => { const low = product.stock <= product.minStock; const expiry = product.expiryDate && product.expiryDate <= dateISO(30); return `<tr><td><div class="product-name"><span class="mini-icon">${icons[index % icons.length]}</span><div><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.code)}${product.barcode ? ` · ${escapeHtml(product.barcode)}` : ''}</small></div></div></td><td>${escapeHtml(product.category || '—')}</td><td class="money">${money(product.price)}</td><td class="money">${money(product.cost)}</td><td><b>${number(product.stock)}</b> ${escapeHtml(product.unit || 'un.')}</td><td><span class="status ${low || expiry ? 'pending' : 'completed'}">${expiry ? 'Validade próxima' : (low ? 'Stock reduzido' : 'Em stock')}</span></td><td><button class="action-btn" data-product-action="edit" data-id="${product.id}">Editar</button></td></tr>`; }).join('') : emptyRow(7, 'Nenhum produto corresponde à pesquisa.');
}

function renderInventory() {
  const totalUnits = sum(data.products, product => product.stock); const costValue = sum(data.products, product => product.stock * product.cost); const salesValue = sum(data.products, product => product.stock * product.price); const low = data.products.filter(product => product.stock <= product.minStock).length; const expiring = data.products.filter(product => product.expiryDate && product.expiryDate <= dateISO(30)).length;
  $('#inventoryMetrics').innerHTML = [['Unidades em stock', number(totalUnits), `${data.products.length} referências`, '◈', ''], ['Valor ao custo', money(costValue), 'Capital em mercadoria', '◒', ''], ['Valor de venda', money(salesValue), 'Potencial de faturação', '↗', 'positive'], ['Alertas', low + expiring, `${low} stock reduzido · ${expiring} validade próxima`, '⚠', low + expiring ? 'warning' : 'positive']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#inventoryStatus').innerHTML = summaryRows([['Produtos registados', `${data.products.length} referências`], ['Em nível normal', `${data.products.length - low} produtos`], ['Abaixo do limite', `${low} produtos`], ['Validade próxima', `${expiring} produtos`], ['Valor total ao custo', money(costValue), true]]);
  const movements = [...data.movements, ...data.sales.flatMap(sale => sale.items.map(item => ({ id: `sale-${sale.id}-${item.productId}`, date: sale.date, productId: item.productId, productName: item.name, type: 'Saída', quantity: item.quantity, note: sale.reference })))].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 18);
  $('#movementsTable').innerHTML = movements.length ? movements.map(movement => `<tr><td>${fullDate(movement.date)}</td><td><b>${escapeHtml(movement.productName)}</b></td><td><span class="status ${movement.type === 'Saída' ? 'danger' : 'completed'}">${movement.type}</span></td><td><b class="${movement.type === 'Saída' ? 'text-danger' : ''}">${movement.type === 'Saída' ? '−' : '+'}${number(movement.quantity)}</b></td><td class="muted">${escapeHtml(movement.note || '—')}</td></tr>`).join('') : emptyRow(5);
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
  const allToday = data.cashSessions.filter(item => item.openedAt?.slice(0, 10) === dateISO()); const closedToday = allToday.filter(item => item.status === 'Fechado').length;
  $('#cashMetrics').innerHTML = [['Estado do caixa', session ? 'Aberto' : (otherSession ? 'Ocupado' : 'Fechado'), session ? `Operador: ${currentUser.name}` : (otherSession ? `Operador: ${userById(otherSession.userId)?.name || 'outro'}` : 'Sem turno em curso'), '▤', session ? 'positive' : 'warning'], ['Fundo inicial', money(values.opening), session ? 'Valor de abertura' : 'Abra o seu turno', '◉', ''], ['Dinheiro esperado', money(values.expected), session ? 'Vendas e movimentos do turno' : 'Sem caixa activo', '↗', session ? 'positive' : ''], ['Turnos fechados hoje', closedToday, `${allToday.length} turno${allToday.length === 1 ? '' : 's'} iniciado${allToday.length === 1 ? '' : 's'}`, '✓', '']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#cashPrimaryAction').textContent = session ? 'Fechar caixa' : 'Abrir caixa';
  $('#cashMovement').disabled = !session; $('#cashMovement').title = session ? '' : 'Abra o caixa para registar movimentos';
  $('#cashSessionTitle').textContent = session ? `Caixa aberto por ${currentUser.name}` : (otherSession ? 'Caixa em uso por outro operador' : 'Nenhum caixa aberto');
  $('#cashSessionInfo').textContent = session ? `Aberto em ${fullDate(session.openedAt)} · Fundo inicial: ${money(values.opening)}` : 'Abra um turno antes de efectuar vendas em dinheiro.';
  $('#cashSummary').innerHTML = session ? summaryRows([['Fundo inicial', money(values.opening)], ['Vendas em dinheiro', money(values.directSales)], ['Recebimentos em dinheiro', money(values.receipts)], ['Entradas avulsas', money(values.in)], ['Saídas avulsas', `− ${money(values.out)}`], ['Dinheiro esperado', money(values.expected), true]]) : '<div class="empty-state">Sem movimentos de caixa para mostrar.</div>';
  const movements = session ? data.cashMovements.filter(movement => movement.sessionId === session.id) : [];
  $('#cashMovementsTable').innerHTML = movements.length ? [...movements].sort((a,b) => new Date(b.date) - new Date(a.date)).map(movement => `<tr><td>${fullDate(movement.date)}</td><td><span class="status ${movement.type === 'Saída' ? 'danger' : 'completed'}">${movement.type}</span></td><td>${escapeHtml(movement.note)}</td><td class="money"><b class="${movement.type === 'Saída' ? 'text-danger' : ''}">${movement.type === 'Saída' ? '−' : '+'}${money(movement.amount)}</b></td><td>${escapeHtml(userById(movement.userId)?.name || '—')}</td></tr>`).join('') : emptyRow(5, 'Ainda não existem movimentos neste turno.');
}
function cashOpenModal() {
  if (currentCashForAll()) return notify('Já existe um caixa aberto. Feche o turno anterior antes de abrir outro.');
  openModal(`${modalHeader('Abrir caixa', 'Registe o fundo inicial entregue ao operador.')}<form id="cashOpenForm"><div class="modal-form"><label>Operador<input value="${escapeHtml(currentUser.name)}" disabled /></label><label>Fundo inicial (Kz)<input name="openingAmount" type="number" min="0" step="0.01" required value="0" /></label><label class="full">Observação<input name="note" placeholder="Ex.: fundo entregue pelo gerente" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Abrir turno</button></div></form>`);
  $('#cashOpenForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const session = { id: uid('cash'), userId: currentUser.id, openedAt: new Date().toISOString(), openingAmount: Math.max(0, Number(values.openingAmount)), note: values.note.trim(), status: 'Aberto' }; data.cashSessions.push(session); audit('Abertura de caixa', `Fundo inicial: ${money(session.openingAmount)}`); saveData(); closeModal(); notify('Caixa aberto com sucesso.'); renderCash(); });
}
function cashMovementModal() {
  const session = currentCashSession(); if (!session) return notify('Abra o caixa antes de registar movimentos.');
  openModal(`${modalHeader('Movimento de caixa', 'Use entradas e saídas apenas para movimentos físicos de dinheiro.')}<form id="cashMovementForm"><div class="modal-form"><label>Tipo<select name="type"><option>Entrada</option><option>Saída</option></select></label><label>Valor (Kz)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label class="full">Motivo<input name="note" required placeholder="Ex.: troco adicional, pagamento de transporte" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar movimento</button></div></form>`);
  $('#cashMovementForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const movement = { id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: values.type, amount: Number(values.amount), note: values.note.trim() }; data.cashMovements.push(movement); audit(`Movimento de caixa: ${movement.type}`, `${movement.note} — ${money(movement.amount)}`); saveData(); closeModal(); notify('Movimento de caixa registado.'); renderCash(); });
}
function cashCloseModal() {
  const session = currentCashSession(); if (!session) return cashOpenModal(); const values = cashSessionAmounts(session);
  openModal(`${modalHeader('Fechar caixa', 'Conte o dinheiro físico antes de confirmar o fecho.')}<div class="sale-summary"><div><span>Fundo inicial</span><strong>${money(values.opening)}</strong></div><div><span>Vendas em dinheiro</span><strong>${money(values.sales)}</strong></div><div><span>Movimentos líquidos</span><strong>${money(values.in - values.out)}</strong></div><div><span>Valor esperado</span><strong>${money(values.expected)}</strong></div></div><form id="cashCloseForm"><div class="modal-form"><label>Valor contado (Kz)<input name="countedAmount" type="number" min="0" step="0.01" required value="${values.expected.toFixed(2)}" /></label><label>Diferença<input id="cashDifference" value="0,00 Kz" disabled /></label><label class="full">Observação de fecho<input name="closingNote" placeholder="Explique qualquer diferença encontrada" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar fecho</button></div></form>`);
  const form = $('#cashCloseForm'); const refreshDifference = () => { $('#cashDifference').value = money(Number(form.elements.countedAmount.value || 0) - values.expected); }; form.elements.countedAmount.addEventListener('input', refreshDifference);
  form.addEventListener('submit', event => { event.preventDefault(); const formValues = Object.fromEntries(new FormData(form).entries()); const counted = Number(formValues.countedAmount); const difference = counted - values.expected; if (difference !== 0 && !formValues.closingNote.trim()) return notify('Explique a diferença de caixa antes de fechar.'); Object.assign(session, { status: 'Fechado', closedAt: new Date().toISOString(), countedAmount: counted, expectedAmount: values.expected, difference, closingNote: formValues.closingNote.trim() }); audit('Fecho de caixa', `Esperado: ${money(values.expected)} · Contado: ${money(counted)} · Diferença: ${money(difference)}`); saveData(); closeModal(); notify('Caixa fechado e registado.'); renderCash(); });
}
function renderDocuments() { filterDocuments(); }
function filterDocuments() {
  const search = $('.filter-input[data-table="documents"]').value.trim().toLowerCase(); const status = $('#documentStatusFilter').value;
  const sales = data.sales.filter(sale => { const customer = saleCustomer(sale); return (!status || sale.status === status) && (!search || `${sale.reference} ${customer.name} ${customer.nif}`.toLowerCase().includes(search)); });
  $('#documentsTable').innerHTML = sales.length ? [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => { const customer = saleCustomer(sale); const canReturn = sale.status !== 'Devolvida'; return `<tr><td>${shortDate(sale.date)}</td><td><b>${escapeHtml(sale.reference)}</b><br><small class="muted">${escapeHtml(sale.documentType || 'Documento')}</small></td><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.nif || '—')}</td><td>${escapeHtml(sale.payment)}</td><td class="money"><b>${money(sale.total)}</b></td><td><span class="status ${sale.status === 'Devolvida' ? 'danger' : (saleBalanceDue(sale) ? 'pending' : 'completed')}">${sale.status === 'Devolvida' ? 'Devolvida' : (saleBalanceDue(sale) ? 'Em dívida' : 'Concluída')}</span></td><td><button class="action-btn" data-document-action="print" data-id="${sale.id}">Imprimir</button>${canReturn ? `<button class="action-btn text-danger" data-document-action="return" data-id="${sale.id}">Devolver</button>` : ''}</td></tr>`; }).join('') : emptyRow(8, 'Nenhum documento encontrado.');
}
function returnSaleModal(sale) {
  if (!canManage()) return notify('Apenas gerentes e administradores podem processar devoluções.');
  if (!sale || sale.status === 'Devolvida') return notify('Este documento já foi devolvido.');
  const refundable = Math.max(0, Number(sale.amountPaid || 0));
  openModal(`${modalHeader('Processar devolução', `Documento ${sale.reference} · ${money(sale.total)}`)}<p class="modal-note">A devolução cria uma nota de crédito interna, repõe todo o stock e anula o saldo pendente. Valor já pago a devolver: <b>${money(refundable)}</b>.</p><form id="returnForm"><div class="modal-form">${refundable ? `<label>Meio de reembolso<select name="refundPayment"><option ${sale.payment === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option><option ${sale.payment === 'Transferência' ? 'selected' : ''}>Transferência</option><option ${sale.payment === 'Multicaixa' ? 'selected' : ''}>Multicaixa</option><option>Crédito em conta</option></select></label><label>Valor a reembolsar (Kz)<input name="refundAmount" type="number" min="0" max="${refundable}" step="0.01" required value="${refundable.toFixed(2)}" /></label>` : '<div class="full payment-feedback">Não existe valor pago a reembolsar; será anulada apenas a dívida do documento.</div>'}<label class="full">Motivo da devolução<textarea name="reason" required rows="3" placeholder="Ex.: artigo danificado, troca autorizada"></textarea></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Confirmar devolução</button></div></form>`);
  $('#returnForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const reason = values.reason.trim(); const refundAmount = refundable ? Number(values.refundAmount) : 0; if (refundAmount < 0 || refundAmount > refundable) return notify('O reembolso não pode ultrapassar o valor já pago.'); const session = values.refundPayment === 'Dinheiro' && refundAmount > 0 ? currentCashSession() : null; if (values.refundPayment === 'Dinheiro' && refundAmount > 0 && !session) return notify('Abra o caixa antes de efectuar um reembolso em dinheiro.'); sale.status = 'Devolvida'; sale.paymentStatus = 'Anulada'; sale.balanceDue = 0; sale.items.forEach(item => { const product = productById(item.productId); if (product) { product.stock += Number(item.quantity); data.movements.push({ id: uid('mov'), date: new Date().toISOString(), productId: product.id, productName: product.name, type: 'Entrada', quantity: Number(item.quantity), note: `Devolução ${sale.reference}` }); } }); if (session) data.cashMovements.push({ id: uid('cashmov'), sessionId: session.id, userId: currentUser.id, date: new Date().toISOString(), type: 'Saída', amount: refundAmount, note: `Reembolso ${sale.reference}` }); const creditReference = nextReference('NC', data.returns); data.returns.push({ id: uid('return'), saleId: sale.id, reference: creditReference, date: new Date().toISOString(), reason, amount: sale.total, refundAmount, refundPayment: values.refundPayment || '', userId: currentUser.id }); audit('Devolução / nota de crédito', `${sale.reference} · ${creditReference} · reembolso ${money(refundAmount)} · ${reason}`); saveData(); closeModal(); notify('Devolução registada e stock reposto.'); renderAll(); });
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
  $('#modalBackdrop').classList.remove('open');
  $('#modalBackdrop').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  previouslyFocused?.focus?.();
  previouslyFocused = null;
}
function modalHeader(title, subtitle = '') { return `<div class="modal-head"><div><h2 id="modalTitle">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="close-modal" data-close-modal aria-label="Fechar">×</button></div>`; }
function options(items, selected, label = item => item.name) { return items.map(item => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(label(item))}</option>`).join(''); }

function productModal(product) {
  const isEdit = Boolean(product); const p = normaliseProduct(product || { code: '', name: '', category: '', barcode: '', unit: 'un.', warehouse: data.settings.defaultWarehouse, lot: '', expiryDate: '', price: '', cost: '', stock: 0, minStock: data.settings.stockLimit });
  openModal(`${modalHeader(isEdit ? 'Editar produto' : 'Novo produto', isEdit ? 'Actualize catálogo, identificação e controlo de stock.' : 'Adicione um artigo ao catálogo e ao stock.')}<form id="productForm"><div class="modal-form"><label>Nome do produto<input name="name" required value="${escapeHtml(p.name)}" /></label><label>Código / referência<input name="code" required value="${escapeHtml(p.code)}" /></label><label>Código de barras<input name="barcode" value="${escapeHtml(p.barcode)}" placeholder="EAN / UPC (opcional)" /></label><label>Unidade<select name="unit"><option ${p.unit === 'un.' ? 'selected' : ''}>un.</option><option ${p.unit === 'kg' ? 'selected' : ''}>kg</option><option ${p.unit === 'cx' ? 'selected' : ''}>cx</option><option ${p.unit === 'lt' ? 'selected' : ''}>lt</option></select></label><label>Categoria<input name="category" list="categories" required value="${escapeHtml(p.category)}" /><datalist id="categories">${categoryList().map(category => `<option value="${escapeHtml(category)}">`).join('')}</datalist></label><label>Armazém<input name="warehouse" required value="${escapeHtml(p.warehouse)}" /></label><label>Preço de venda (Kz)<input name="price" type="number" min="0" step="0.01" required value="${p.price}" /></label><label>Custo unitário (Kz)<input name="cost" type="number" min="0" step="0.01" required value="${p.cost}" /></label><label>Stock actual<input name="stock" type="number" min="0" step="0.001" required value="${p.stock}" /></label><label>Limite mínimo<input name="minStock" type="number" min="0" step="0.001" required value="${p.minStock}" /></label><label>Lote<input name="lot" value="${escapeHtml(p.lot)}" /></label><label>Validade<input name="expiryDate" type="date" value="${escapeHtml(p.expiryDate)}" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${isEdit ? 'Guardar alterações' : 'Criar produto'}</button></div></form>`);
  $('#productForm').addEventListener('submit', event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget).entries()); ['price', 'cost', 'stock', 'minStock'].forEach(key => payload[key] = Number(payload[key])); if (payload.barcode && data.products.some(item => item.barcode === payload.barcode && item.id !== product?.id)) return notify('Já existe um produto com este código de barras.'); if (isEdit) { const oldStock = product.stock; Object.assign(product, normaliseProduct(payload)); if (payload.stock !== oldStock) data.movements.push({ id: uid('mov'), date: new Date().toISOString(), productId: product.id, productName: product.name, type: payload.stock > oldStock ? 'Entrada' : 'Saída', quantity: Math.abs(payload.stock - oldStock), note: 'Correcção no produto' }); audit('Produto actualizado', product.name); notify('Produto actualizado.'); } else { const created = { id: uid('prod'), ...normaliseProduct(payload) }; data.products.push(created); audit('Produto criado', created.name); notify('Produto criado com sucesso.'); } saveData(); closeModal(); renderAll(); });
}
function adjustmentModal() {
  openModal(`${modalHeader('Ajustar stock', 'Registe uma entrada, saída ou correcção de inventário.')}<form id="adjustmentForm"><div class="modal-form"><label class="full">Produto<select name="productId" required><option value="">Seleccione o produto</option>${options(data.products.sort((a,b) => a.name.localeCompare(b.name)), '', item => `${item.name} — ${number(item.stock)} un.`)}</select></label><label>Movimento<select name="type"><option>Entrada</option><option>Saída</option></select></label><label>Quantidade<input name="quantity" type="number" min="1" step="1" required /></label><label class="full">Motivo / nota<input name="note" required placeholder="Ex.: contagem física, mercadoria danificada" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar movimento</button></div></form>`);
  $('#adjustmentForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const product = productById(values.productId); const quantity = Number(values.quantity); if (!product) return notify('Seleccione um produto.'); if (values.type === 'Saída' && quantity > product.stock) return notify('A saída não pode ser superior ao stock actual.'); product.stock += values.type === 'Entrada' ? quantity : -quantity; data.movements.push({ id: uid('mov'), date: new Date().toISOString(), productId: product.id, productName: product.name, type: values.type, quantity, note: values.note }); saveData(); closeModal(); notify('Movimento de stock registado.'); renderAll(); });
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
  const isCustomer = kind === 'customer'; const title = isCustomer ? 'cliente' : 'fornecedor';
  const item = isCustomer ? normaliseCustomer(entity || { type: 'Particular', name: '', phone: '', email: '', nif: '', address: '', creditLimit: 0 }) : (entity || { name: '', phone: '', email: '', nif: '', address: '' });
  const customerFields = isCustomer ? `<label class="full">Tipo de cliente<select name="type" id="customerType"><option value="Particular" ${item.type !== 'Empresa' ? 'selected' : ''}>Particular</option><option value="Empresa" ${item.type === 'Empresa' ? 'selected' : ''}>Empresa</option></select></label><label id="customerNameLabel">Nome completo<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Telefone<input name="phone" required value="${escapeHtml(item.phone)}" placeholder="Ex.: +244 9XX XXX XXX" /></label><label>E-mail<input name="email" type="email" value="${escapeHtml(item.email)}" /></label><label>NIF <small id="customerNifHint"></small><input name="nif" value="${escapeHtml(item.nif)}" /></label><label>Limite de crédito (Kz)<input name="creditLimit" type="number" min="0" step="0.01" value="${item.creditLimit}" /></label><label class="full">Morada de facturação<input name="address" value="${escapeHtml(item.address)}" /></label>` : `<label>Nome / empresa<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Telefone<input name="phone" value="${escapeHtml(item.phone)}" /></label><label>E-mail<input name="email" type="email" value="${escapeHtml(item.email)}" /></label><label>NIF<input name="nif" value="${escapeHtml(item.nif)}" /></label><label class="full">Morada<input name="address" value="${escapeHtml(item.address)}" /></label>`;
  openModal(`${modalHeader(entity ? `Editar ${title}` : `Novo ${title}`, isCustomer ? 'Os dados guardados serão usados em facturas, recibos e vendas a crédito.' : 'Guarde os contactos dos seus parceiros de compra.')}<form id="contactForm"><div class="modal-form">${customerFields}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${entity ? 'Guardar alterações' : `Criar ${title}`}</button></div></form>`);
  const form = $('#contactForm');
  if (isCustomer) { updateCustomerForm(form); form.elements.type.addEventListener('change', () => updateCustomerForm(form)); }
  form.addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const list = isCustomer ? data.customers : data.suppliers;
    values.name = values.name.trim(); values.phone = values.phone.trim(); values.email = values.email.trim(); values.nif = values.nif.trim().toUpperCase(); values.address = values.address.trim();
    if (isCustomer) {
      values.creditLimit = Math.max(0, Number(values.creditLimit || 0));
      if (values.type === 'Empresa' && !values.nif) return notify('O NIF é obrigatório para clientes empresariais.');
      if (values.nif && data.customers.some(customer => customer.nif === values.nif && customer.id !== entity?.id)) return notify('Já existe um cliente com este NIF.');
    }
    let saved = entity;
    if (entity) Object.assign(entity, values); else { saved = { id: uid(isCustomer ? 'customer' : 'supplier'), ...values }; list.push(saved); }
    saveData(); closeModal(); notify(`${isCustomer ? 'Cliente' : 'Fornecedor'} guardado com sucesso.`);
    if (afterSave) afterSave(saved); else renderAll();
  });
}
function purchaseLine(productId = '', quantity = 1) { const product = productById(productId); return `<div class="purchase-line"><div><span class="line-label">Produto</span><select name="productId" required><option value="">Seleccione</option>${options([...data.products].sort((a,b) => a.name.localeCompare(b.name)), productId, productItem => `${productItem.name} (${number(productItem.stock)} ${productItem.unit || 'un.'})`)}</select></div><div><span class="line-label">Quantidade</span><input name="quantity" type="number" min="1" step="1" required value="${quantity}" /></div><div><span class="line-label">Custo (Kz)</span><input name="unitCost" type="number" min="0" step="0.01" required value="${product ? product.cost : ''}" /></div><button class="remove-line" type="button" title="Remover linha">×</button></div>`; }
function purchaseModal(suggested = []) {
  const suggestedLines = suggested.length ? suggested.map(product => purchaseLine(product.id, Math.max(1, Number(product.minStock) * 2 - Number(product.stock)))).join('') : purchaseLine();
  const subtitle = suggested.length ? 'Sugestão baseada nos limites mínimos de stock. Confirme o fornecedor e as quantidades.' : 'O stock será actualizado assim que guardar o documento.';
  openModal(`${modalHeader('Registar compra', subtitle)}<form id="purchaseForm"><div class="modal-form"><label>Fornecedor<select name="supplierId" required><option value="">Seleccione o fornecedor</option>${options([...data.suppliers].sort((a,b) => a.name.localeCompare(b.name)), '')}</select></label><label>Data<input name="date" type="date" required value="${dateISO()}" /></label><label>Pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option><option>Crédito</option></select></label><label>Referência (opcional)<input name="reference" placeholder="Ex.: FT 1234" /></label><div class="full"><span class="line-label">Artigos comprados</span><div id="purchaseLines" class="purchase-lines">${suggestedLines}</div><button class="add-line" type="button" id="addPurchaseLine">＋ Adicionar artigo</button></div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar compra</button></div></form>`);
  $('#addPurchaseLine').addEventListener('click', () => { $('#purchaseLines').insertAdjacentHTML('beforeend', purchaseLine()); });
  $('#purchaseLines').addEventListener('click', event => { if (event.target.classList.contains('remove-line')) { const lines = $$('.purchase-line', $('#purchaseLines')); if (lines.length === 1) return notify('A compra deve ter pelo menos um artigo.'); event.target.closest('.purchase-line').remove(); } });
  $('#purchaseForm').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); const lines = $$('.purchase-line', form).map(line => ({ productId: $('[name="productId"]', line).value, quantity: Number($('[name="quantity"]', line).value), unitCost: Number($('[name="unitCost"]', line).value) })); if (lines.some(line => !line.productId || line.quantity <= 0 || line.unitCost < 0)) return notify('Preencha todos os artigos da compra.'); const items = lines.map(line => ({ ...line, name: productById(line.productId).name })); const total = sum(items, item => item.quantity * item.unitCost); const credit = values.payment === 'Crédito'; const reference = values.reference.trim().toUpperCase() || nextReference('CP', data.purchases); if (data.purchases.some(purchase => purchase.reference === reference)) return notify('Já existe uma compra com esta referência.'); const purchase = { id: uid('buy'), reference, date: values.date, supplierId: values.supplierId, payment: values.payment, paymentStatus: credit ? 'Pendente' : 'Pago', amountPaid: credit ? 0 : total, balanceDue: credit ? total : 0, total, items }; data.purchases.push(purchase); items.forEach(item => { const product = productById(item.productId); product.stock += item.quantity; product.cost = item.unitCost; data.movements.push({ id: uid('mov'), date: `${values.date}T12:00:00`, productId: product.id, productName: product.name, type: 'Entrada', quantity: item.quantity, note: `Compra ${purchase.reference}` }); }); audit('Compra registada', `${purchase.reference} · ${money(total)} · ${values.payment}`); saveData(); closeModal(); notify('Compra registada e stock actualizado.'); renderAll(); });
}
function supplierPaymentModal(purchase) {
  if (!purchase || Number(purchase.balanceDue || 0) <= 0) return notify('Esta compra não tem saldo pendente.'); const supplier = supplierById(purchase.supplierId);
  openModal(`${modalHeader('Registar pagamento ao fornecedor', `${purchase.reference} · ${supplier?.name || 'Fornecedor'} · saldo ${money(purchase.balanceDue)}`)}<form id="supplierPaymentForm"><div class="modal-form"><label>Valor pago (Kz)<input name="amount" type="number" min="0.01" step="0.01" required value="${Number(purchase.balanceDue).toFixed(2)}" /></label><label>Meio de pagamento<select name="payment"><option>Transferência</option><option>Multicaixa</option><option>Dinheiro</option></select></label><label class="full">Observação<input name="note" placeholder="Ex.: referência bancária" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar pagamento</button></div></form>`);
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
  if (!cart.length) return notify('Adicione pelo menos um produto à venda.'); const totals = cartNumbers(); const customer = customerById($('#saleCustomer').value); const customerText = customer ? `${customer.name}${customer.nif ? ` · NIF ${customer.nif}` : ''}` : 'Consumidor final';
  openModal(`${modalHeader('Finalizar venda', 'Confirme os dados comerciais e o pagamento antes de concluir.')}<div class="sale-summary"><div><span>Cliente</span><strong>${escapeHtml(customerText)}</strong></div><div><span>Artigos</span><strong>${sum(cart, item => item.quantity)}</strong></div><div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div><div><span>IVA (${number(data.settings.taxRate)}%)</span><strong>${money(totals.tax)}</strong></div><div><span>Total a pagar</span><strong>${money(totals.total)}</strong></div></div><form id="saleForm"><div class="modal-form"><label class="full">Documento<select name="documentType"><option value="Factura-Recibo">Factura-recibo</option><option value="Factura">Factura</option><option value="Venda a dinheiro">Venda a dinheiro</option></select></label><label class="full">Condição de pagamento<select name="settlement" id="saleSettlement"><option value="paid">Pagamento imediato</option><option value="credit">Venda a crédito</option></select></label><label id="salePaymentMethodField">Meio de pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option></select></label><label id="saleCashReceivedField">Valor recebido (Kz)<input name="amountReceived" type="number" min="0" step="0.01" value="${totals.total.toFixed(2)}" /></label><label id="saleDueDateField" class="full" hidden>Data de vencimento<input name="dueDate" type="date" value="${dateISO(30)}" /></label><div id="salePaymentFeedback" class="payment-feedback full"></div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Voltar</button><button class="btn primary" type="submit">Confirmar venda</button></div></form>`);
  const form = $('#saleForm'); updateCheckoutFields(form, totals.total);
  form.addEventListener('input', () => updateCheckoutFields(form, totals.total));
  form.addEventListener('change', () => updateCheckoutFields(form, totals.total));
  form.addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const credit = values.settlement === 'credit'; const payment = credit ? 'Crédito' : values.payment; const received = Number(values.amountReceived || 0);
    if (credit && !customer) return notify('Seleccione ou cadastre um cliente para fazer uma venda a crédito.');
    if (credit && customer.creditLimit > 0 && customerStats(customer.id).balance + totals.total > customer.creditLimit) return notify('Esta venda ultrapassa o limite de crédito definido para o cliente.');
    if (!credit && payment === 'Dinheiro' && received < totals.total) return notify('O valor recebido é inferior ao total da venda.');
    const cashSession = payment === 'Dinheiro' ? currentCashSession() : null;
    if (payment === 'Dinheiro' && !cashSession) return notify('Abra o caixa antes de concluir uma venda em dinheiro.');
    for (const item of cart) { const product = productById(item.productId); if (!product || product.stock < item.quantity) return notify(`${item.name} já não tem stock suficiente.`); }
    const balanceDue = credit ? totals.total : 0;
    const sale = { id: uid('sale'), reference: nextReference('VD', data.sales), date: new Date().toISOString(), customerId: customer?.id || '', customer: customerSnapshot(customer), operatorId: currentUser.id, operatorName: currentUser.name, cashSessionId: cashSession?.id || '', documentType: credit ? 'Factura' : values.documentType, payment, paymentStatus: credit ? 'Pendente' : 'Pago', amountPaid: credit ? 0 : totals.total, balanceDue, dueDate: credit ? values.dueDate : '', amountReceived: !credit && payment === 'Dinheiro' ? received : totals.total, change: !credit && payment === 'Dinheiro' ? Math.max(0, received - totals.total) : 0, items: cart.map(item => ({ ...item })), subtotal: totals.subtotal, discount: totals.discount, discountValue: totals.discountValue, tax: totals.tax, total: totals.total, status: 'Concluída' };
    cart.forEach(item => productById(item.productId).stock -= item.quantity); data.sales.push(sale); audit('Venda concluída', `${sale.reference} · ${money(sale.total)} · ${sale.payment}`); saveData(); closeModal(); cart = []; renderPos(); notify(`Venda ${sale.reference} concluída com sucesso.`); printReceipt(sale);
  });
}
function receivePaymentModal(customer) {
  const dueSales = data.sales.filter(sale => sale.customerId === customer.id && saleBalanceDue(sale) > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!dueSales.length) return notify('Este cliente não tem valores pendentes.');
  openModal(`${modalHeader('Registar recebimento', `Cliente: ${customer.name}`)}<form id="receiptForm"><div class="modal-form"><label class="full">Documento em dívida<select name="saleId">${dueSales.map(sale => `<option value="${sale.id}">${sale.reference} · vence ${shortDate(sale.dueDate || sale.date)} · saldo ${money(saleBalanceDue(sale))}</option>`).join('')}</select></label><label>Valor recebido (Kz)<input name="amount" type="number" min="0.01" step="0.01" required value="${saleBalanceDue(dueSales[0]).toFixed(2)}" /></label><label>Meio de pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option></select></label><label class="full">Data do recebimento<input name="date" type="date" required value="${dateISO()}" /></label><label class="full">Observação<input name="note" placeholder="Ex.: pagamento parcial, referência bancária" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar recebimento</button></div></form>`);
  const form = $('#receiptForm');
  form.elements.saleId.addEventListener('change', () => { const sale = data.sales.find(item => item.id === form.elements.saleId.value); form.elements.amount.value = saleBalanceDue(sale).toFixed(2); });
  form.addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const sale = data.sales.find(item => item.id === values.saleId); const amount = Number(values.amount); if (!sale || amount <= 0) return notify('Introduza um valor válido.'); if (amount > saleBalanceDue(sale)) return notify('O valor é superior ao saldo deste documento.'); const cashSession = values.payment === 'Dinheiro' ? currentCashSession() : null; if (values.payment === 'Dinheiro' && !cashSession) return notify('Abra o caixa antes de receber em dinheiro.'); sale.amountPaid = Number(sale.amountPaid || 0) + amount; sale.balanceDue = Math.max(0, saleBalanceDue(sale) - amount); sale.paymentStatus = sale.balanceDue === 0 ? 'Pago' : 'Parcial'; data.receipts.push({ id: uid('receipt'), saleId: sale.id, customerId: customer.id, userId: currentUser.id, cashSessionId: cashSession?.id || '', date: `${values.date}T12:00:00`, amount, payment: values.payment, note: values.note.trim() }); audit('Recebimento registado', `${sale.reference} · ${money(amount)} · ${values.payment}`); saveData(); closeModal(); notify(`Recebimento de ${money(amount)} registado.`); renderAll(); });
}
function printReceipt(sale) {
  const customer = saleCustomer(sale); const clientDetails = `${escapeHtml(customer.name)}${customer.type && customer.type !== 'Consumidor final' ? `<br><small>${escapeHtml(customer.type)}${customer.nif ? ` · NIF: ${escapeHtml(customer.nif)}` : ''}</small>` : ''}${customer.address ? `<br><small>${escapeHtml(customer.address)}</small>` : ''}`; const win = window.open('', '_blank', 'width=420,height=700'); if (!win) return; win.document.write(`<!doctype html><html><head><title>${escapeHtml(sale.documentType || 'Recibo')} ${sale.reference}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#222;font-size:13px}.head{text-align:center;border-bottom:1px dashed #999;padding-bottom:13px}.head h2{margin:0 0 6px}table{width:100%;border-collapse:collapse;margin:17px 0}td{padding:6px 0;border-bottom:1px solid #eee}.right{text-align:right}.total{font-size:17px;font-weight:bold;border-top:2px solid #222;padding-top:9px;margin-top:8px}.foot{text-align:center;color:#666;margin-top:26px;font-size:11px}@media print{button{display:none}}</style></head><body><div class="head"><h2>${escapeHtml(data.settings.company)}</h2><div>NIF: ${escapeHtml(data.settings.nif || '—')}</div><div>${escapeHtml(data.settings.address || '')}</div></div><p><b>${escapeHtml(sale.documentType || 'Recibo')}:</b> ${escapeHtml(sale.reference)}<br><b>Data:</b> ${fullDate(sale.date)}<br><b>Cliente:</b><br>${clientDetails}</p><table>${sale.items.map(item => `<tr><td>${escapeHtml(item.name)}<br><small>${number(item.quantity)} × ${money(item.price)}</small></td><td class="right">${money(item.quantity * item.price)}</td></tr>`).join('')}</table><div>Subtotal <span style="float:right">${money(sale.subtotal)}</span></div>${sale.discountValue ? `<div>Desconto <span style="float:right">− ${money(sale.discountValue)}</span></div>` : ''}<div>IVA <span style="float:right">${money(sale.tax)}</span></div><div class="total">TOTAL <span style="float:right">${money(sale.total)}</span></div><p>Pagamento: <b>${escapeHtml(sale.payment)}</b><br>Estado: <b>${escapeHtml(sale.paymentStatus || 'Pago')}</b>${saleBalanceDue(sale) ? `<br>Saldo por pagar: <b>${money(saleBalanceDue(sale))}</b>${sale.dueDate ? `<br>Vencimento: ${shortDate(sale.dueDate)}` : ''}` : ''}${sale.change ? `<br>Troco: <b>${money(sale.change)}</b>` : ''}</p><div class="foot">Documento gerado pelo VendaMais. Confirme os requisitos fiscais aplicáveis antes da emissão oficial.<br>Obrigado pela sua preferência.</div><button onclick="window.print()">Imprimir documento</button></body></html>`); win.document.close(); }

function exportSales() { const start = $('#reportStart').value; const end = $('#reportEnd').value; const rows = salesBetween(start, end); const headers = ['Data', 'Referência', 'Documento', 'Cliente', 'Tipo de cliente', 'NIF', 'Pagamento', 'Estado', 'Saldo em dívida', 'Subtotal', 'Desconto', 'IVA', 'Total']; const csv = [headers, ...rows.map(sale => { const customer = saleCustomer(sale); return [sale.date, sale.reference, sale.documentType, customer.name, customer.type, customer.nif, sale.payment, sale.paymentStatus, saleBalanceDue(sale), sale.subtotal, sale.discountValue, sale.tax, sale.total]; })].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n'); download(`vendas-${start || 'inicio'}-${end || 'hoje'}.csv`, new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })); notify('Relatório de vendas exportado.'); }
function download(filename, blob) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function backup() { download(`vendamais-copia-${dateISO()}.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); notify('Cópia de segurança preparada.'); }
function restore(file) { if (!file) return; const reader = new FileReader(); reader.onload = event => { try { const restored = JSON.parse(event.target.result); if (!restored.settings || !Array.isArray(restored.products)) throw new Error(); data = normaliseData(restored); currentUser = getSessionUser(); saveData(); cart = []; $('#companyName').textContent = data.settings.company; renderAccountButton(); renderAll(); notify('Cópia restaurada com sucesso.'); } catch { notify('Este ficheiro não parece ser uma cópia válida do VendaMais.'); } }; reader.readAsText(file); }

function exportDocuments() { const headers = ['Data', 'Referência', 'Tipo', 'Cliente', 'NIF', 'Pagamento', 'Total', 'Estado', 'Operador']; const rows = data.sales.map(sale => { const customer = saleCustomer(sale); return [sale.date, sale.reference, sale.documentType, customer.name, customer.nif, sale.payment, sale.total, sale.status, sale.operatorName || userById(sale.operatorId)?.name || '—']; }); const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n'); download(`documentos-${dateISO()}.csv`, new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })); notify('Documentos exportados.'); }
function renderAccountButton() { const button = $('#accountButton'); if (!button || !currentUser) return; button.textContent = currentUser.initials || currentUser.name.split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase(); button.title = `${currentUser.name} · ${currentUser.role}`; }
function accountModal() {
  openModal(`${modalHeader('Sessão de utilizador', 'Seleccione o operador que está a usar o sistema neste dispositivo.')}<form id="accountForm"><div class="modal-form"><label class="full">Utilizador activo<select name="userId">${data.users.filter(user => user.active).map(user => `<option value="${user.id}" ${user.id === currentUser.id ? 'selected' : ''}>${escapeHtml(user.name)} · ${escapeHtml(user.role)}</option>`).join('')}</select></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Trocar utilizador</button></div></form>`);
  $('#accountForm').addEventListener('submit', event => { event.preventDefault(); const next = userById(new FormData(event.currentTarget).get('userId')); if (!next) return; currentUser = next; localStorage.setItem(USER_SESSION, next.id); audit('Sessão iniciada', `${next.name} · ${next.role}`); saveData(); closeModal(); renderAccountButton(); renderAll(); notify(`Sessão activa: ${next.name}.`); });
}
function userModal(user = null) {
  if (!isAdministrator()) return notify('Apenas administradores podem criar ou alterar utilizadores.');
  const item = user || { name: '', initials: '', role: 'Caixa', active: true };
  openModal(`${modalHeader(user ? 'Editar utilizador' : 'Novo utilizador', 'Administrador: gestão total. Gerente: operação e relatórios. Caixa: vendas e caixa.')}<form id="userForm"><div class="modal-form"><label>Nome completo<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Iniciais<input name="initials" maxlength="3" required value="${escapeHtml(item.initials || '')}" placeholder="Ex.: JM" /></label><label>Função<select name="role"><option ${item.role === 'Caixa' ? 'selected' : ''}>Caixa</option><option ${item.role === 'Gerente' ? 'selected' : ''}>Gerente</option><option ${item.role === 'Administrador' ? 'selected' : ''}>Administrador</option></select></label><label>Estado<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Activo</option><option value="false" ${item.active === false ? 'selected' : ''}>Inactivo</option></select></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${user ? 'Guardar alterações' : 'Criar utilizador'}</button></div></form>`);
  $('#userForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.name = values.name.trim(); values.initials = values.initials.trim().toUpperCase(); values.active = values.active === 'true'; const activeAdmins = data.users.filter(existing => existing.role === 'Administrador' && existing.active && existing.id !== user?.id); if (user?.id === currentUser.id && !values.active) return notify('Não pode desactivar o utilizador que está em sessão.'); if (user?.role === 'Administrador' && user.active && (values.role !== 'Administrador' || !values.active) && activeAdmins.length === 0) return notify('O sistema deve manter pelo menos um administrador activo.'); if (user) Object.assign(user, values); else data.users.push({ id: uid('user'), ...values }); audit(user ? 'Utilizador actualizado' : 'Utilizador criado', `${values.name} · ${values.role}`); saveData(); closeModal(); notify('Utilizador guardado.'); usersModal(); });
}
function usersModal() {
  if (!isAdministrator()) return notify('Apenas administradores podem gerir utilizadores.');
  openModal(`${modalHeader('Utilizadores e permissões', 'Administrador: gestão total. Gerente: operação e relatórios. Caixa: vendas e caixa.')}<div class="users-list">${data.users.map(user => `<div class="user-row"><div class="user-initials">${escapeHtml(user.initials || '—')}</div><div class="item-main"><b>${escapeHtml(user.name)}</b><span>${escapeHtml(user.role)} · ${user.active ? 'Activo' : 'Inactivo'}</span></div><button class="action-btn" type="button" data-edit-user="${user.id}">Editar</button></div>`).join('')}</div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Fechar</button><button class="btn primary" id="newUser" type="button">＋ Novo utilizador</button></div>`);
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
  if (event.target.closest('[data-close-modal]') || event.target === $('#modalBackdrop')) return closeModal();
  const add = event.target.closest('[data-add-product]'); if (add) return addToCart(add.dataset.addProduct);
  const cartChange = event.target.closest('[data-cart-change]'); if (cartChange) return changeCart(cartChange.dataset.cartChange, Number(cartChange.dataset.change));
  if (event.target.closest('#clearCart')) { if (cart.length) { cart = []; renderCart(); notify('Venda actual limpa.'); } return; }
  if (event.target.closest('#newProduct')) return productModal();
  const productAction = event.target.closest('[data-product-action]'); if (productAction) return productModal(productById(productAction.dataset.id));
  if (event.target.closest('#newAdjustment')) return adjustmentModal();
  if (event.target.closest('#newCustomer')) return contactModal('customer');
  if (event.target.closest('#quickNewCustomer')) return contactModal('customer', null, customer => { renderPos(); $('#saleCustomer').value = customer.id; renderSaleCustomerInfo(); });
  if (event.target.closest('#editSaleCustomer')) { const customer = customerById($('#saleCustomer').value); if (customer) return contactModal('customer', customer, saved => { renderPos(); $('#saleCustomer').value = saved.id; renderSaleCustomerInfo(); }); }
  const customerAction = event.target.closest('[data-customer-action]'); if (customerAction) { const customer = customerById(customerAction.dataset.id); return customerAction.dataset.customerAction === 'receive' ? receivePaymentModal(customer) : contactModal('customer', customer); }
  if (event.target.closest('#newSupplier')) return contactModal('supplier');
  const supplierAction = event.target.closest('[data-supplier-action]'); if (supplierAction) return contactModal('supplier', supplierById(supplierAction.dataset.id));
  if (event.target.closest('#newPurchase')) return purchaseModal();
  if (event.target.closest('#suggestPurchase')) { const low = data.products.filter(product => product.stock <= product.minStock); return low.length ? purchaseModal(low) : notify('Nenhum produto está abaixo do limite de reposição.'); }
  const purchaseAction = event.target.closest('[data-purchase-action]'); if (purchaseAction) return supplierPaymentModal(data.purchases.find(purchase => purchase.id === purchaseAction.dataset.id));
  if (event.target.closest('#cashPrimaryAction')) return currentCashSession() ? cashCloseModal() : cashOpenModal();
  if (event.target.closest('#cashMovement')) return cashMovementModal();
  const documentAction = event.target.closest('[data-document-action]'); if (documentAction) { const sale = data.sales.find(item => item.id === documentAction.dataset.id); return documentAction.dataset.documentAction === 'return' ? returnSaleModal(sale) : printReceipt(sale); }
  if (event.target.closest('#exportDocuments')) return exportDocuments();
  if (event.target.closest('#manageUsers')) return usersModal();
  if (event.target.closest('#viewAudit')) return auditModal();
  if (event.target.closest('#manageIntegrations')) return integrationsModal();
  if (event.target.closest('#newUser')) return userModal();
  const editUser = event.target.closest('[data-edit-user]'); if (editUser) return userModal(userById(editUser.dataset.editUser));
  if (event.target.closest('#finishSale')) return saleModal();
  if (event.target.closest('#applyReport')) return renderReports();
  if (event.target.closest('#exportReport')) return exportSales();
  if (event.target.closest('#backupData')) return backup();
  if (event.target.closest('#resetDemo')) { if (confirm('Isto substitui todos os dados actuais pelos dados de demonstração. Continuar?')) { data = demoData(); currentUser = getSessionUser(); cart = []; saveData(); $('#companyName').textContent = data.settings.company; renderAccountButton(); renderAll(); notify('Dados de demonstração repostos.'); } return; }
});
document.addEventListener('input', event => { if (event.target.id === 'productSearch') renderPosProducts(); if (event.target.id === 'saleDiscount') renderCart(); const table = event.target.dataset?.table; if (table === 'products') filterProducts(); if (table === 'customers') filterCustomers(); if (table === 'suppliers') filterSuppliers(); if (table === 'documents') filterDocuments(); });
document.addEventListener('change', event => { if (event.target.id === 'posCategory') renderPosProducts(); if (event.target.id === 'productCategoryFilter') filterProducts(); if (event.target.id === 'saleCustomer') renderSaleCustomerInfo(); if (event.target.id === 'documentStatusFilter') filterDocuments(); if (event.target.id === 'restoreData') restore(event.target.files[0]); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal(); });
$('#settingsForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.taxRate = Number(values.taxRate); values.stockLimit = Number(values.stockLimit); data.settings = { ...data.settings, ...values }; saveData(); $('#companyName').textContent = data.settings.company; notify('Definições guardadas.'); renderAll(); });

function initialize() { $('#topDate').textContent = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); $('#companyName').textContent = data.settings.company; renderAccountButton(); renderDashboard(); }
initialize();
