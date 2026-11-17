import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'cloud.js',
  'finance-core.js',
  'supabase-config.js',
  'README.md',
  'LICENSE',
  'package.json',
  'docs/ARQUITETURA.md',
  'docs/PRODUCAO.md',
  'docs/ONLINE.md',
  'docs/PROFESSIONAL.md',
  'supabase/schema.sql',
  'supabase/2026-11-professional-upgrade.sql',
  'supabase/2026-11-financial-integrity.sql',
  'supabase/2026-11-discount-approval.sql',
  'tests/finance.test.mjs'
];
const requiredInterfaceIds = [
  'dashboardView',
  'posView',
  'productsView',
  'inventoryView',
  'customersView',
  'suppliersView',
  'purchasesView',
  'reportsView',
  'cashView',
  'documentsView',
  'settingsView'
];
const requiredFunctions = [
  'renderDashboard',
  'renderSellerDashboard',
  'renderPos',
  'renderProducts',
  'renderInventory',
  'renderReports',
  'saleModal',
  'receivePaymentModal',
  'renderCash',
  'renderDocuments',
  'usersModal',
  'auditModal',
  'nextReference',
  'purchaseModal',
  'expensePaymentModal',
  'createExcelWorkbook',
  'exportReportExcel',
  'clearBusinessDataModal',
  'applyRoleInterface',
  'lockSession',
  'changePinModal',
  'backup',
  'restore',
  'locationsModal',
  'transferModal',
  'stockAt',
  'changeStock',
  'expenseOccurrences',
  'weekOfMonth',
  'calculateReport',
  'allocatedMonthlyCost',
  'sellerRollup',
  'productPerformance',
  'previousPeriod',
  'reportTrendHtml'
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`Ficheiro obrigatório em falta: ${file}`);
}

const html = readFileSync(resolve(root, 'index.html'), 'utf8');
for (const id of requiredInterfaceIds) {
  if (!html.includes(`id="${id}"`)) failures.push(`Ecrã obrigatório em falta: #${id}`);
}

const app = readFileSync(resolve(root, 'app.js'), 'utf8');
const cloud = readFileSync(resolve(root, 'cloud.js'), 'utf8');
const professionalSql = readFileSync(resolve(root, 'supabase/2026-11-professional-upgrade.sql'), 'utf8');
const financeCore = readFileSync(resolve(root, 'finance-core.js'), 'utf8');
const financialSql = readFileSync(resolve(root, 'supabase/2026-11-financial-integrity.sql'), 'utf8');
for (const fn of requiredFunctions) {
  if (!app.includes(`function ${fn}`)) failures.push(`Função essencial em falta: ${fn}`);
}
if (!app.includes('localStorage')) failures.push('Cópia de trabalho local não encontrada.');
if (!app.includes('function postFinancialEntry') || !app.includes('idempotencyKey') || !app.includes('backfillFinancialJournal')) failures.push('Diário financeiro idempotente ou migração de dados anteriores em falta.');
if (!html.includes('data-report-tab="journal"') || !html.includes('id="financialJournalTable"')) failures.push('Diário financeiro não está acessível nos relatórios.');
if (!app.includes('Retirada pessoal') || !app.includes('Pagamento de dívida antiga')) failures.push('Classificação de retiradas pessoais ou pagamento de dívida antiga em falta.');
if (!financeCore.includes('summarizeJournal')) failures.push('Resumo de impactos do diário financeiro em falta.');

if (!html.includes('finance-core.js')) failures.push('Núcleo de cálculos financeiros não carregado.');
for (const fn of ['calculateSaleTotals', 'validateSettlement', 'prorateMonthlyCost', 'hasActualFixedExpense', 'weightedAverageCost']) if (!financeCore.includes(fn)) failures.push(`Cálculo financeiro essencial em falta: ${fn}`);
if (!financialSql.includes('create or replace function public.record_vendamais_sale')) failures.push('Migração de integridade financeira do servidor em falta.');
if (!financialSql.includes('v_validated_items') || !financialSql.includes('v_tax_rate') || !financialSql.includes('for update')) failures.push('Validação central de preço, IVA ou concorrência incompleta.');
if (!app.includes('VendaMaisCloud')) failures.push('Integração com dados online não encontrada.');
if (!cloud.includes('sales_ledger')) failures.push('Livro central de vendas não encontrado.');
if (!cloud.includes('recordSale')) failures.push('Registo remoto de vendas não encontrado.');
if (!cloud.includes('save_vendamais_state')) failures.push('Sincronização do estado empresarial não encontrada.');
if (!cloud.includes('flushPendingSales')) failures.push('Fila de vendas sem internet não encontrada.');
if (!cloud.includes('request_vendamais_discount') || !cloud.includes('review_vendamais_discount') || !cloud.includes('discount_requests') || !cloud.includes('onDiscountRequest')) failures.push('Fluxo remoto de aprovação de descontos incompleto.');
if (!app.includes('Central de aprovação de descontos') || !app.includes('discountApprovalId') || !app.includes('requestProductDiscountModal')) failures.push('Interface de aprovação de descontos incompleta.');
if (!financialSql.includes('discountApprovalId') || !financialSql.includes('discount_requests')) failures.push('Validação de descontos aprovados no servidor em falta.');
if (!cloud.includes('requestAccess')) failures.push('Pedido de acesso online não encontrado.');
if (!cloud.includes('inviteStaff') || !cloud.includes('claimInvitation')) failures.push('Convites preparados pelo administrador não encontrados.');
if (!app.includes('STORAGE_VERSION')) failures.push('Versão de dados não encontrada.');
if (!app.includes('customerSnapshot')) failures.push('Cópia dos dados do cliente não encontrada.');
if (!app.includes('creditLimit')) failures.push('Controlo de crédito de cliente não encontrado.');
if (!app.includes('cashSessions')) failures.push('Controlo de caixa não encontrado.');
if (!app.includes('expensePayments') || !app.includes('data-expense-action')) failures.push('Liquidação e histórico de despesas a crédito não encontrados.');
if (!app.includes('coversConfiguredCost')) failures.push('Prevenção explícita de dupla contagem dos custos fixos não encontrada.');
if (!app.includes('auditLog')) failures.push('Auditoria operacional não encontrada.');
if (!app.includes('isAdministrator')) failures.push('Protecção de administrador não encontrada.');
if (!app.includes('ROLE_VIEWS')) failures.push('Permissões por perfil não encontradas.');
if (!app.includes("Vendedor: ['dashboard', 'pos', 'cash', 'documents']")) failures.push('Dashboard individual do vendedor não está acessível.');
if (!app.includes('sale.operatorId === currentUser.id')) failures.push('Dashboard do vendedor sem filtro de titularidade das vendas.');
if (!app.includes('sessionLocked')) failures.push('Bloqueio de sessão não encontrado.');
if (!app.includes('pinMustChange')) failures.push('Controlo de PIN não encontrado.');
if (!app.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) failures.push('Exportação Excel não encontrada.');
if (!app.includes('stockByLocation')) failures.push('Stock por local não encontrado.');
if (!app.includes('activeLocationId')) failures.push('Local de operação não encontrado.');
if (!app.includes('costType')) failures.push('Classificação de despesas fixas/variáveis não encontrada.');
if (!app.includes("recurrence !== 'Mensal'")) failures.push('Despesas mensais recorrentes não encontradas.');
if (!html.includes('id="storePerformanceTable"')) failures.push('Tabela financeira por loja não encontrada.');
if (!html.includes('id="weeklySalesTable"')) failures.push('Tabela de vendas semanais não encontrada.');
if (!html.includes('id="reportLocationFilter"')) failures.push('Filtro de loja nos relatórios não encontrado.');
if (!html.includes('id="sellerReportFilter"')) failures.push('Filtro de vendedores no relatório não encontrado.');
if (!html.includes('id="reportQuality"') || !html.includes('id="reportTrend"') || !html.includes('id="reportComparison"')) failures.push('Painel de qualidade, tendência ou comparação financeira em falta.');
if (!app.includes('costIssues') || !app.includes('Por apurar')) failures.push('Protecção contra lucro apresentado sem custos válidos em falta.');
if (!html.includes('id="sellerDailyTable"') || !html.includes('id="sellerMonthlyTable"')) failures.push('Tabelas diária e mensal de vendedores não encontradas.');
if (!html.includes('id="storeTodayTable"')) failures.push('Resumo diário por loja não encontrado.');
if (!html.includes('id="manageCloud"')) failures.push('Configuração de dados online não encontrada.');
if (!app.includes('renderOperationalControl')) failures.push('Controlo operacional do administrador não encontrado.');
if (!app.includes('cloudAccessManagementModal')) failures.push('Gestão de acessos online não encontrada.');
if (!app.includes('BRAND_THEMES') || !app.includes('applyBrandTheme')) failures.push('Identidade visual por empresa não encontrada.');
if (!app.includes('colorId') || !app.includes('themePickerHtml')) failures.push('Cores individuais por loja não encontradas.');
if (!html.includes('companyThemePicker')) failures.push('Escolha de cores da empresa não encontrada.');
if (!professionalSql.includes('record_vendamais_sale')) failures.push('Venda atómica central não encontrada.');
if (!professionalSql.includes('business_backups')) failures.push('Cópias automáticas online não encontradas.');
if (!professionalSql.includes('audit_events')) failures.push('Auditoria central não encontrada.');
if (!professionalSql.includes('request_vendamais_access')) failures.push('Pedido de acesso central não encontrado.');
if (!professionalSql.includes('staff_invitations') || !professionalSql.includes('invite_vendamais_staff') || !professionalSql.includes('claim_vendamais_invitation')) failures.push('Convites e associação automática à loja não encontrados.');
if (!app.includes('cloudInviteStaffModal')) failures.push('Ecrã de convite de colaborador não encontrado.');
if (!html.includes('supabase-config.js')) failures.push('Configuração publicada do Supabase não encontrada.');
if (!app.includes('data.transfers')) failures.push('Transferências de stock não encontradas.');
if (!app.includes('fixedCosts')) failures.push('Custos fixos por loja não encontrados.');
if (!app.includes('Vendas líquidas (sem IVA)')) failures.push('Cálculo de vendas sem IVA não encontrado.');
if (!app.includes("`Cliente: ${escapeHtml(customer.name)}`")) failures.push('Nome do cliente sem escape no modal de recebimento.');
if (!app.includes("escapeHtml(supplier?.name || 'Fornecedor')")) failures.push('Nome do fornecedor sem escape no modal de pagamento.');
if (!app.includes('const previousData = JSON.stringify(data);')) failures.push('Venda sem cópia de segurança para rollback local.');
if (!app.includes('if (!saveData({ skipCloudSync:')) failures.push('Venda não verifica falha de persistência local.');

if (failures.length) {
  console.error('Validação falhou:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Validação concluída: ${requiredFiles.length} ficheiros e ${requiredInterfaceIds.length} ecrãs verificados.`);
