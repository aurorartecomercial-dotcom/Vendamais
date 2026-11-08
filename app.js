/* VendaMais — aplicação local de gestão comercial */
const STORE = 'vendamais_local_v1';
const STORAGE_VERSION = 1;
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
    settings: { company: 'Comercial Horizonte, Lda.', nif: '5412345678', phone: '+244 923 000 000', email: 'geral@comercialhorizonte.ao', address: 'Luanda, Angola', taxRate: 14, stockLimit: 5 },
    products,
    customers: [
      { id: 'c_ana', name: 'Ana Manuel', phone: '+244 923 444 120', email: 'ana.manuel@email.ao', nif: '003456789LA012', address: 'Viana, Luanda' },
      { id: 'c_lucas', name: 'Lucas Tavares', phone: '+244 922 181 222', email: '', nif: '002116789LA037', address: 'Maianga, Luanda' },
      { id: 'c_maria', name: 'Maria & Filhos', phone: '+244 924 860 110', email: 'compras@mariafilhos.ao', nif: '5001123901', address: 'Cacuaco, Luanda' }
    ],
    suppliers: [
      { id: 's_kimb', name: 'Kimbos Distribuição', phone: '+244 222 300 210', email: 'vendas@kimbos.ao', nif: '5000872165', address: 'Luanda' },
      { id: 's_papel', name: 'Papelaria Nacional', phone: '+244 924 305 020', email: '', nif: '5400943831', address: 'Benfica, Luanda' },
      { id: 's_alim', name: 'Alimenta Angola', phone: '+244 222 724 450', email: 'comercial@alimenta.ao', nif: '5411982312', address: 'Viana, Luanda' }
    ],
    sales,
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

function normaliseData(candidate) {
  const base = demoData();
  if (!candidate || typeof candidate !== 'object' || !candidate.settings) return base;
  const collections = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'movements'];
  const restored = { ...base, ...candidate, settings: { ...base.settings, ...candidate.settings }, meta: { ...base.meta, ...candidate.meta, schemaVersion: STORAGE_VERSION } };
  collections.forEach(key => { restored[key] = Array.isArray(candidate[key]) ? candidate[key] : []; });
  return restored;
}
function loadData() { try { return normaliseData(JSON.parse(localStorage.getItem(STORE))); } catch { return demoData(); } }
let data = loadData();
function saveData() {
  data.meta = { ...data.meta, schemaVersion: STORAGE_VERSION, lastUpdated: new Date().toISOString() };
  try { localStorage.setItem(STORE, JSON.stringify(data)); return true; }
  catch { notify('Não foi possível guardar os dados neste navegador.'); return false; }
}
function notify(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('show'), 2800); }
function productById(id) { return data.products.find(item => item.id === id); }
function customerById(id) { return data.customers.find(item => item.id === id); }
function supplierById(id) { return data.suppliers.find(item => item.id === id); }
function categoryList() { return [...new Set(data.products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function saleCost(sale) { return sale.items.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0); }
function sum(array, fn) { return array.reduce((total, item) => total + Number(fn(item) || 0), 0); }
function dayStart(value) { return value ? new Date(`${value}T00:00:00`).getTime() : -Infinity; }
function dayEnd(value) { return value ? new Date(`${value}T23:59:59`).getTime() : Infinity; }
function salesBetween(start, end) { return data.sales.filter(sale => { const time = new Date(sale.date).getTime(); return time >= dayStart(start) && time <= dayEnd(end); }); }
function monthStart() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`; }

function setTitle(view) {
  const titles = { dashboard: 'Visão geral', pos: 'Nova venda', products: 'Produtos & stock', inventory: 'Inventário', customers: 'Clientes', suppliers: 'Fornecedores', purchases: 'Compras', reports: 'Balanço & relatórios', settings: 'Definições' };
  $('#viewTitle').textContent = titles[view];
}
function showView(view) {
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
  $('#recentSales').innerHTML = recent.length ? recent.map(sale => `<tr><td><b>${sale.reference}</b><br><small class="muted">${shortDate(sale.date)}</small></td><td>${escapeHtml(customerById(sale.customerId)?.name || 'Consumidor final')}</td><td class="money"><b>${money(sale.total)}</b></td><td><span class="status completed">${sale.status}</span></td></tr>`).join('') : emptyRow(4);
  const costs = sum(monthly, saleCost); const purchaseTotal = sum(data.purchases.filter(p => p.date >= start), purchase => purchase.total);
  $('#financialSummary').innerHTML = summaryRows([['Receitas de vendas', money(income)], ['Custo dos produtos vendidos', `− ${money(costs)}`], ['Compras de mercadoria', `− ${money(purchaseTotal)}`], ['Margem bruta', money(income - costs), true]]);
}
function summaryRows(rows) { return rows.map(([label, value, total]) => `<div class="summary-row ${total ? 'total' : ''}"><span>${label}</span><strong>${value}</strong></div>`).join(''); }

function renderPos() {
  const categorySelect = $('#posCategory'); const previousCategory = categorySelect.value;
  categorySelect.innerHTML = '<option value="">Todas as categorias</option>' + categoryList().map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  categorySelect.value = previousCategory;
  $('#saleCustomer').innerHTML = '<option value="">Consumidor final</option>' + data.customers.sort((a,b) => a.name.localeCompare(b.name)).map(customer => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`).join('');
  renderPosProducts(); renderCart();
}
function renderPosProducts() {
  const search = $('#productSearch').value.trim().toLowerCase(); const category = $('#posCategory').value;
  const products = data.products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.code}`.toLowerCase().includes(search)));
  $('#posProducts').innerHTML = products.length ? products.map((product, index) => `<button class="product-card ${product.stock <= 0 ? 'sold-out' : ''}" data-add-product="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}><span class="product-image">${icons[index % icons.length]}</span><b>${escapeHtml(product.name)}</b><span class="code">${escapeHtml(product.code)}</span><footer><strong>${money(product.price)}</strong><small>${number(product.stock)} un.</small></footer></button>`).join('') : '<div class="empty-state">Nenhum produto encontrado.</div>';
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
  const products = data.products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.code}`.toLowerCase().includes(search)));
  $('#productsCount').textContent = `${products.length} produto${products.length === 1 ? '' : 's'}`;
  $('#productsTable').innerHTML = products.length ? products.map((product, index) => { const low = product.stock <= product.minStock; return `<tr><td><div class="product-name"><span class="mini-icon">${icons[index % icons.length]}</span><div><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.code)}</small></div></div></td><td>${escapeHtml(product.category || '—')}</td><td class="money">${money(product.price)}</td><td class="money">${money(product.cost)}</td><td><b>${number(product.stock)}</b> un.</td><td><span class="status ${low ? 'pending' : 'completed'}">${low ? 'Stock reduzido' : 'Em stock'}</span></td><td><button class="action-btn" data-product-action="edit" data-id="${product.id}">Editar</button></td></tr>`; }).join('') : emptyRow(7, 'Nenhum produto corresponde à pesquisa.');
}

function renderInventory() {
  const totalUnits = sum(data.products, product => product.stock); const costValue = sum(data.products, product => product.stock * product.cost); const salesValue = sum(data.products, product => product.stock * product.price); const low = data.products.filter(product => product.stock <= product.minStock).length;
  $('#inventoryMetrics').innerHTML = [['Unidades em stock', number(totalUnits), `${data.products.length} referências`, '◈', ''], ['Valor ao custo', money(costValue), 'Capital em mercadoria', '◒', ''], ['Valor de venda', money(salesValue), 'Potencial de faturação', '↗', 'positive'], ['A repor', low, low ? 'Produtos abaixo do limite' : 'Nenhum alerta', '⚠', low ? 'warning' : 'positive']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#inventoryStatus').innerHTML = summaryRows([['Produtos registados', `${data.products.length} referências`], ['Em nível normal', `${data.products.length - low} produtos`], ['Abaixo do limite', `${low} produtos`], ['Valor total ao custo', money(costValue), true]]);
  const movements = [...data.movements, ...data.sales.flatMap(sale => sale.items.map(item => ({ id: `sale-${sale.id}-${item.productId}`, date: sale.date, productId: item.productId, productName: item.name, type: 'Saída', quantity: item.quantity, note: sale.reference })))].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 18);
  $('#movementsTable').innerHTML = movements.length ? movements.map(movement => `<tr><td>${fullDate(movement.date)}</td><td><b>${escapeHtml(movement.productName)}</b></td><td><span class="status ${movement.type === 'Saída' ? 'danger' : 'completed'}">${movement.type}</span></td><td><b class="${movement.type === 'Saída' ? 'text-danger' : ''}">${movement.type === 'Saída' ? '−' : '+'}${number(movement.quantity)}</b></td><td class="muted">${escapeHtml(movement.note || '—')}</td></tr>`).join('') : emptyRow(5);
}

function customerStats(customerId) { const sales = data.sales.filter(sale => sale.customerId === customerId); return { count: sales.length, total: sum(sales, sale => sale.total) }; }
function renderCustomers() {
  const total = data.customers.length; const bought = data.customers.filter(customer => customerStats(customer.id).count).length; const revenue = sum(data.sales.filter(sale => sale.customerId), sale => sale.total);
  $('#customerMetrics').innerHTML = [['Clientes registados', total, 'Na sua base de dados', '♙', ''], ['Clientes activos', bought, 'Com pelo menos uma compra', '✓', 'positive'], ['Vendas a clientes', money(revenue), 'Histórico registado', '◷', ''], ['Saldo em dívida', money(0), 'Sem crédito em aberto', '◉', 'positive']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  filterCustomers();
}
function filterCustomers() { const search = $('.filter-input[data-table="customers"]').value.trim().toLowerCase(); const customers = data.customers.filter(customer => !search || `${customer.name} ${customer.phone} ${customer.nif}`.toLowerCase().includes(search)); $('#customersTable').innerHTML = customers.length ? customers.sort((a,b) => a.name.localeCompare(b.name)).map(customer => { const stats = customerStats(customer.id); return `<tr><td><b>${escapeHtml(customer.name)}</b><br><small class="muted">${escapeHtml(customer.email || 'Sem e-mail')}</small></td><td>${escapeHtml(customer.phone || '—')}</td><td>${escapeHtml(customer.nif || '—')}</td><td>${stats.count}</td><td class="money">${money(stats.total)}</td><td><span class="status completed">Regular</span></td><td><button class="action-btn" data-customer-action="edit" data-id="${customer.id}">Editar</button></td></tr>`; }).join('') : emptyRow(7, 'Nenhum cliente encontrado.'); }

function renderSuppliers() { filterSuppliers(); }
function filterSuppliers() { const search = $('.filter-input[data-table="suppliers"]').value.trim().toLowerCase(); const suppliers = data.suppliers.filter(supplier => !search || `${supplier.name} ${supplier.phone} ${supplier.nif}`.toLowerCase().includes(search)); $('#suppliersTable').innerHTML = suppliers.length ? suppliers.sort((a,b) => a.name.localeCompare(b.name)).map(supplier => { const purchases = data.purchases.filter(purchase => purchase.supplierId === supplier.id); return `<tr><td><b>${escapeHtml(supplier.name)}</b><br><small class="muted">${escapeHtml(supplier.email || 'Sem e-mail')}</small></td><td>${escapeHtml(supplier.phone || '—')}</td><td>${escapeHtml(supplier.nif || '—')}</td><td>${escapeHtml(supplier.address || '—')}</td><td>${purchases.length} compra${purchases.length === 1 ? '' : 's'}</td><td><button class="action-btn" data-supplier-action="edit" data-id="${supplier.id}">Editar</button></td></tr>`; }).join('') : emptyRow(6, 'Nenhum fornecedor encontrado.'); }

function renderPurchases() {
  const start = monthStart(); const monthly = data.purchases.filter(purchase => purchase.date >= start); const total = sum(monthly, purchase => purchase.total); const open = monthly.filter(purchase => purchase.payment === 'Crédito');
  $('#purchaseMetrics').innerHTML = [['Compras do mês', money(total), `${monthly.length} documentos`, '⊞', ''], ['Fornecedores activos', new Set(monthly.map(purchase => purchase.supplierId)).size, 'Com compras neste mês', '♧', ''], ['A crédito', money(sum(open, purchase => purchase.total)), `${open.length} compra${open.length === 1 ? '' : 's'}`, '◷', open.length ? 'warning' : 'positive'], ['Última compra', data.purchases.length ? shortDate([...data.purchases].sort((a,b) => b.date.localeCompare(a.date))[0].date) : '—', 'Registo mais recente', '◒', '']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  const purchases = [...data.purchases].sort((a,b) => b.date.localeCompare(a.date));
  $('#purchasesTable').innerHTML = purchases.length ? purchases.map(purchase => `<tr><td><b>${purchase.reference}</b></td><td>${shortDate(purchase.date)}</td><td>${escapeHtml(supplierById(purchase.supplierId)?.name || 'Fornecedor removido')}</td><td>${sum(purchase.items, item => item.quantity)} un. / ${purchase.items.length} item${purchase.items.length === 1 ? '' : 's'}</td><td class="money"><b>${money(purchase.total)}</b></td><td><span class="status ${purchase.payment === 'Crédito' ? 'pending' : 'completed'}">${escapeHtml(purchase.payment)}</span></td></tr>`).join('') : emptyRow(6);
}

function renderReports() {
  const startInput = $('#reportStart'); const endInput = $('#reportEnd'); if (!startInput.value) startInput.value = monthStart(); if (!endInput.value) endInput.value = dateISO();
  const sales = salesBetween(startInput.value, endInput.value); const revenue = sum(sales, sale => sale.total); const net = sum(sales, sale => sale.subtotal - sale.discountValue); const tax = sum(sales, sale => sale.tax); const cogs = sum(sales, saleCost); const profit = revenue - tax - cogs;
  $('#reportMetrics').innerHTML = [['Faturação', money(revenue), `${sales.length} vendas concluídas`, '↗', 'positive'], ['Vendas líquidas', money(net), 'Antes de IVA', '◷', ''], ['IVA liquidado', money(tax), 'Incluído na faturação', '◒', ''], ['Margem bruta', money(profit), revenue ? `${number(profit / revenue * 100)}% da faturação` : 'Sem vendas no período', '◈', profit >= 0 ? 'positive' : 'warning']].map(([label, value, hint, icon, kind]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="value">${value}</div><div class="hint ${kind}">${hint}</div></article>`).join('');
  $('#incomeStatement').innerHTML = `<div class="statement-row"><span>Faturação total</span><strong>${money(revenue)}</strong></div><div class="statement-row"><span>IVA incluído</span><strong>− ${money(tax)}</strong></div><div class="statement-row"><span>Vendas sem IVA</span><strong>${money(revenue - tax)}</strong></div><div class="statement-row"><span>Custo dos produtos vendidos</span><strong>− ${money(cogs)}</strong></div><div class="statement-row emphasis ${profit < 0 ? 'loss' : ''}"><span>Resultado bruto</span><strong>${money(profit)}</strong></div>`;
  const payments = ['Dinheiro', 'Multicaixa', 'Transferência', 'Outro']; $('#paymentSummary').innerHTML = payments.map(payment => { const amount = sum(sales.filter(sale => sale.payment === payment), sale => sale.total); const count = sales.filter(sale => sale.payment === payment).length; return `<div class="summary-row"><span>${payment} <small class="muted">(${count})</small></span><strong>${money(amount)}</strong></div>`; }).join('');
  $('#reportSalesTable').innerHTML = sales.length ? [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => `<tr><td>${shortDate(sale.date)}</td><td><b>${sale.reference}</b></td><td>${escapeHtml(customerById(sale.customerId)?.name || 'Consumidor final')}</td><td>${escapeHtml(sale.payment)}</td><td class="money"><b>${money(sale.total)}</b></td></tr>`).join('') : emptyRow(5, 'Não existem vendas neste período.');
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
  const isEdit = Boolean(product); const p = product || { code: '', name: '', category: '', price: '', cost: '', stock: 0, minStock: data.settings.stockLimit };
  openModal(`${modalHeader(isEdit ? 'Editar produto' : 'Novo produto', isEdit ? 'Actualize as informações do artigo.' : 'Adicione um artigo ao catálogo e ao stock.')}<form id="productForm"><div class="modal-form"><label>Nome do produto<input name="name" required value="${escapeHtml(p.name)}" /></label><label>Código / referência<input name="code" required value="${escapeHtml(p.code)}" /></label><label>Categoria<input name="category" list="categories" required value="${escapeHtml(p.category)}" /><datalist id="categories">${categoryList().map(category => `<option value="${escapeHtml(category)}">`).join('')}</datalist></label><label>Preço de venda (Kz)<input name="price" type="number" min="0" step="0.01" required value="${p.price}" /></label><label>Custo unitário (Kz)<input name="cost" type="number" min="0" step="0.01" required value="${p.cost}" /></label><label>Stock actual<input name="stock" type="number" min="0" step="1" required value="${p.stock}" /></label><label>Limite mínimo<input name="minStock" type="number" min="0" step="1" required value="${p.minStock}" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${isEdit ? 'Guardar alterações' : 'Criar produto'}</button></div></form>`);
  $('#productForm').addEventListener('submit', event => { event.preventDefault(); const form = new FormData(event.currentTarget); const payload = Object.fromEntries(form.entries()); ['price', 'cost', 'stock', 'minStock'].forEach(key => payload[key] = Number(payload[key])); if (isEdit) { const oldStock = product.stock; Object.assign(product, payload); if (payload.stock !== oldStock) data.movements.push({ id: uid('mov'), date: new Date().toISOString(), productId: product.id, productName: product.name, type: payload.stock > oldStock ? 'Entrada' : 'Saída', quantity: Math.abs(payload.stock - oldStock), note: 'Correcção no produto' }); notify('Produto actualizado.'); } else { data.products.push({ id: uid('prod'), ...payload }); notify('Produto criado com sucesso.'); } saveData(); closeModal(); renderAll(); });
}
function adjustmentModal() {
  openModal(`${modalHeader('Ajustar stock', 'Registe uma entrada, saída ou correcção de inventário.')}<form id="adjustmentForm"><div class="modal-form"><label class="full">Produto<select name="productId" required><option value="">Seleccione o produto</option>${options(data.products.sort((a,b) => a.name.localeCompare(b.name)), '', item => `${item.name} — ${number(item.stock)} un.`)}</select></label><label>Movimento<select name="type"><option>Entrada</option><option>Saída</option></select></label><label>Quantidade<input name="quantity" type="number" min="1" step="1" required /></label><label class="full">Motivo / nota<input name="note" required placeholder="Ex.: contagem física, mercadoria danificada" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar movimento</button></div></form>`);
  $('#adjustmentForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const product = productById(values.productId); const quantity = Number(values.quantity); if (!product) return notify('Seleccione um produto.'); if (values.type === 'Saída' && quantity > product.stock) return notify('A saída não pode ser superior ao stock actual.'); product.stock += values.type === 'Entrada' ? quantity : -quantity; data.movements.push({ id: uid('mov'), date: new Date().toISOString(), productId: product.id, productName: product.name, type: values.type, quantity, note: values.note }); saveData(); closeModal(); notify('Movimento de stock registado.'); renderAll(); });
}
function contactModal(kind, entity) {
  const isCustomer = kind === 'customer'; const title = isCustomer ? 'cliente' : 'fornecedor'; const item = entity || { name: '', phone: '', email: '', nif: '', address: '' };
  openModal(`${modalHeader(entity ? `Editar ${title}` : `Novo ${title}`, isCustomer ? 'Guarde os dados e acompanhe as compras.' : 'Guarde os contactos dos seus parceiros de compra.')}<form id="contactForm"><div class="modal-form"><label>Nome / empresa<input name="name" required value="${escapeHtml(item.name)}" /></label><label>Telefone<input name="phone" value="${escapeHtml(item.phone)}" /></label><label>E-mail<input name="email" type="email" value="${escapeHtml(item.email)}" /></label><label>NIF<input name="nif" value="${escapeHtml(item.nif)}" /></label><label class="full">Morada<input name="address" value="${escapeHtml(item.address)}" /></label></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${entity ? 'Guardar alterações' : `Criar ${title}`}</button></div></form>`);
  $('#contactForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const list = isCustomer ? data.customers : data.suppliers; if (entity) Object.assign(entity, values); else list.push({ id: uid(isCustomer ? 'customer' : 'supplier'), ...values }); saveData(); closeModal(); notify(`${isCustomer ? 'Cliente' : 'Fornecedor'} guardado com sucesso.`); renderAll(); });
}
function purchaseLine() { return `<div class="purchase-line"><div><span class="line-label">Produto</span><select name="productId" required><option value="">Seleccione</option>${options(data.products.sort((a,b) => a.name.localeCompare(b.name)), '', product => `${product.name} (${number(product.stock)} un.)`)}</select></div><div><span class="line-label">Quantidade</span><input name="quantity" type="number" min="1" step="1" required value="1" /></div><div><span class="line-label">Custo (Kz)</span><input name="unitCost" type="number" min="0" step="0.01" required /></div><button class="remove-line" type="button" title="Remover linha">×</button></div>`; }
function purchaseModal() {
  openModal(`${modalHeader('Registar compra', 'O stock será actualizado assim que guardar o documento.')}<form id="purchaseForm"><div class="modal-form"><label>Fornecedor<select name="supplierId" required><option value="">Seleccione o fornecedor</option>${options(data.suppliers.sort((a,b) => a.name.localeCompare(b.name)), '')}</select></label><label>Data<input name="date" type="date" required value="${dateISO()}" /></label><label>Pagamento<select name="payment"><option>Dinheiro</option><option>Multicaixa</option><option>Transferência</option><option>Crédito</option></select></label><label>Referência (opcional)<input name="reference" placeholder="Ex.: FT 1234" /></label><div class="full"><span class="line-label">Artigos comprados</span><div id="purchaseLines" class="purchase-lines">${purchaseLine()}</div><button class="add-line" type="button" id="addPurchaseLine">＋ Adicionar artigo</button></div></div><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registar compra</button></div></form>`);
  $('#addPurchaseLine').addEventListener('click', () => { $('#purchaseLines').insertAdjacentHTML('beforeend', purchaseLine()); });
  $('#purchaseLines').addEventListener('click', event => { if (event.target.classList.contains('remove-line')) { const lines = $$('.purchase-line', $('#purchaseLines')); if (lines.length === 1) return notify('A compra deve ter pelo menos um artigo.'); event.target.closest('.purchase-line').remove(); } });
  $('#purchaseForm').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); const lines = $$('.purchase-line', form).map(line => ({ productId: $('[name="productId"]', line).value, quantity: Number($('[name="quantity"]', line).value), unitCost: Number($('[name="unitCost"]', line).value) })); if (lines.some(line => !line.productId || line.quantity <= 0 || line.unitCost < 0)) return notify('Preencha todos os artigos da compra.'); const items = lines.map(line => ({ ...line, name: productById(line.productId).name })); const total = sum(items, item => item.quantity * item.unitCost); const purchase = { id: uid('buy'), reference: values.reference.trim() || `CP-${String(data.purchases.length + 1).padStart(4, '0')}`, date: values.date, supplierId: values.supplierId, payment: values.payment, total, items }; data.purchases.push(purchase); items.forEach(item => { const product = productById(item.productId); product.stock += item.quantity; product.cost = item.unitCost; data.movements.push({ id: uid('mov'), date: `${values.date}T12:00:00`, productId: product.id, productName: product.name, type: 'Entrada', quantity: item.quantity, note: `Compra ${purchase.reference}` }); }); saveData(); closeModal(); notify('Compra registada e stock actualizado.'); renderAll(); });
}
function saleModal() {
  if (!cart.length) return notify('Adicione pelo menos um produto à venda.'); const totals = cartNumbers();
  openModal(`${modalHeader('Finalizar venda', 'Confirme o pagamento para concluir a transação.')}<div class="sale-summary"><div><span>Artigos</span><strong>${sum(cart, item => item.quantity)}</strong></div><div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div><div><span>IVA (${number(data.settings.taxRate)}%)</span><strong>${money(totals.tax)}</strong></div><div><span>Total a pagar</span><strong>${money(totals.total)}</strong></div></div><form id="saleForm"><label class="field-label">Meio de pagamento<div class="payment-options"><label class="payment-choice"><input type="radio" name="payment" value="Dinheiro" checked /><span>Dinheiro</span></label><label class="payment-choice"><input type="radio" name="payment" value="Multicaixa" /><span>Multicaixa</span></label><label class="payment-choice"><input type="radio" name="payment" value="Transferência" /><span>Transferência</span></label></div></label><div class="modal-footer"><button class="btn secondary" type="button" data-close-modal>Voltar</button><button class="btn primary" type="submit">Confirmar pagamento</button></div></form>`);
  $('#saleForm').addEventListener('submit', event => { event.preventDefault(); const payment = new FormData(event.currentTarget).get('payment'); for (const item of cart) { const product = productById(item.productId); if (!product || product.stock < item.quantity) return notify(`${item.name} já não tem stock suficiente.`); } const sale = { id: uid('sale'), reference: `VD-${String(data.sales.length + 1001).padStart(4, '0')}`, date: new Date().toISOString(), customerId: $('#saleCustomer').value, payment, items: cart.map(item => ({ ...item })), subtotal: totals.subtotal, discount: totals.discount, discountValue: totals.discountValue, tax: totals.tax, total: totals.total, status: 'Concluída' }; cart.forEach(item => productById(item.productId).stock -= item.quantity); data.sales.push(sale); saveData(); closeModal(); cart = []; renderPos(); notify(`Venda ${sale.reference} concluída com sucesso.`); printReceipt(sale); });
}
function printReceipt(sale) {
  const customer = customerById(sale.customerId)?.name || 'Consumidor final'; const win = window.open('', '_blank', 'width=420,height=640'); if (!win) return; win.document.write(`<!doctype html><html><head><title>Recibo ${sale.reference}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#222;font-size:13px}.head{text-align:center;border-bottom:1px dashed #999;padding-bottom:13px}.head h2{margin:0 0 6px}table{width:100%;border-collapse:collapse;margin:17px 0}td{padding:6px 0;border-bottom:1px solid #eee}.right{text-align:right}.total{font-size:17px;font-weight:bold;border-top:2px solid #222;padding-top:9px;margin-top:8px}.foot{text-align:center;color:#666;margin-top:26px;font-size:11px}@media print{button{display:none}}</style></head><body><div class="head"><h2>${escapeHtml(data.settings.company)}</h2><div>NIF: ${escapeHtml(data.settings.nif || '—')}</div><div>${escapeHtml(data.settings.address || '')}</div></div><p><b>Recibo:</b> ${sale.reference}<br><b>Data:</b> ${fullDate(sale.date)}<br><b>Cliente:</b> ${escapeHtml(customer)}</p><table>${sale.items.map(item => `<tr><td>${escapeHtml(item.name)}<br><small>${number(item.quantity)} × ${money(item.price)}</small></td><td class="right">${money(item.quantity * item.price)}</td></tr>`).join('')}</table><div>Subtotal <span style="float:right">${money(sale.subtotal)}</span></div>${sale.discountValue ? `<div>Desconto <span style="float:right">− ${money(sale.discountValue)}</span></div>` : ''}<div>IVA <span style="float:right">${money(sale.tax)}</span></div><div class="total">TOTAL <span style="float:right">${money(sale.total)}</span></div><p>Pagamento: <b>${escapeHtml(sale.payment)}</b></p><div class="foot">Obrigado pela sua preferência.</div><button onclick="window.print()">Imprimir recibo</button></body></html>`); win.document.close(); }

function exportSales() { const start = $('#reportStart').value; const end = $('#reportEnd').value; const rows = salesBetween(start, end); const headers = ['Data', 'Referência', 'Cliente', 'Pagamento', 'Subtotal', 'Desconto', 'IVA', 'Total']; const csv = [headers, ...rows.map(sale => [sale.date, sale.reference, customerById(sale.customerId)?.name || 'Consumidor final', sale.payment, sale.subtotal, sale.discountValue, sale.tax, sale.total])].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n'); download(`vendas-${start || 'inicio'}-${end || 'hoje'}.csv`, new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })); notify('Relatório de vendas exportado.'); }
function download(filename, blob) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function backup() { download(`vendamais-copia-${dateISO()}.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); notify('Cópia de segurança preparada.'); }
function restore(file) { if (!file) return; const reader = new FileReader(); reader.onload = event => { try { const restored = JSON.parse(event.target.result); if (!restored.settings || !Array.isArray(restored.products)) throw new Error(); data = restored; saveData(); cart = []; $('#companyName').textContent = data.settings.company; renderAll(); notify('Cópia restaurada com sucesso.'); } catch { notify('Este ficheiro não parece ser uma cópia válida do VendaMais.'); } }; reader.readAsText(file); }

document.addEventListener('click', event => {
  const nav = event.target.closest('.nav-link'); if (nav) return showView(nav.dataset.view);
  const go = event.target.closest('[data-go]'); if (go) return showView(go.dataset.go);
  if (event.target.closest('#menuToggle')) return $('#sidebar').classList.toggle('open');
  if (event.target.closest('#quickSale')) return showView('pos');
  if (event.target.closest('[data-close-modal]') || event.target === $('#modalBackdrop')) return closeModal();
  const add = event.target.closest('[data-add-product]'); if (add) return addToCart(add.dataset.addProduct);
  const cartChange = event.target.closest('[data-cart-change]'); if (cartChange) return changeCart(cartChange.dataset.cartChange, Number(cartChange.dataset.change));
  if (event.target.closest('#clearCart')) { if (cart.length) { cart = []; renderCart(); notify('Venda actual limpa.'); } return; }
  if (event.target.closest('#newProduct')) return productModal();
  const productAction = event.target.closest('[data-product-action]'); if (productAction) return productModal(productById(productAction.dataset.id));
  if (event.target.closest('#newAdjustment')) return adjustmentModal();
  if (event.target.closest('#newCustomer')) return contactModal('customer');
  const customerAction = event.target.closest('[data-customer-action]'); if (customerAction) return contactModal('customer', customerById(customerAction.dataset.id));
  if (event.target.closest('#newSupplier')) return contactModal('supplier');
  const supplierAction = event.target.closest('[data-supplier-action]'); if (supplierAction) return contactModal('supplier', supplierById(supplierAction.dataset.id));
  if (event.target.closest('#newPurchase')) return purchaseModal();
  if (event.target.closest('#finishSale')) return saleModal();
  if (event.target.closest('#applyReport')) return renderReports();
  if (event.target.closest('#exportReport')) return exportSales();
  if (event.target.closest('#backupData')) return backup();
  if (event.target.closest('#resetDemo')) { if (confirm('Isto substitui todos os dados actuais pelos dados de demonstração. Continuar?')) { data = demoData(); cart = []; saveData(); $('#companyName').textContent = data.settings.company; renderAll(); notify('Dados de demonstração repostos.'); } return; }
});
document.addEventListener('input', event => { if (event.target.id === 'productSearch') renderPosProducts(); if (event.target.id === 'saleDiscount') renderCart(); const table = event.target.dataset?.table; if (table === 'products') filterProducts(); if (table === 'customers') filterCustomers(); if (table === 'suppliers') filterSuppliers(); });
document.addEventListener('change', event => { if (event.target.id === 'posCategory') renderPosProducts(); if (event.target.id === 'productCategoryFilter') filterProducts(); if (event.target.id === 'restoreData') restore(event.target.files[0]); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal(); });
$('#settingsForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.taxRate = Number(values.taxRate); values.stockLimit = Number(values.stockLimit); data.settings = { ...data.settings, ...values }; saveData(); $('#companyName').textContent = data.settings.company; notify('Definições guardadas.'); renderAll(); });

function initialize() { $('#topDate').textContent = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); $('#companyName').textContent = data.settings.company; renderDashboard(); }
initialize();
