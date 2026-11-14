import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'cloud.js',
  'supabase-config.js',
  'README.md',
  'LICENSE',
  'package.json',
  'docs/ARQUITETURA.md',
  'docs/PRODUCAO.md',
  'docs/ONLINE.md',
  'docs/PROFESSIONAL.md',
  'supabase/schema.sql',
  'supabase/2026-11-professional-upgrade.sql'
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
  'productPerformance'
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
for (const fn of requiredFunctions) {
  if (!app.includes(`function ${fn}`)) failures.push(`Função essencial em falta: ${fn}`);
}
if (!app.includes('localStorage')) failures.push('Cópia de trabalho local não encontrada.');
if (!app.includes('VendaMaisCloud')) failures.push('Integração com dados online não encontrada.');
if (!cloud.includes('sales_ledger')) failures.push('Livro central de vendas não encontrado.');
if (!cloud.includes('recordSale')) failures.push('Registo remoto de vendas não encontrado.');
if (!cloud.includes('save_vendamais_state')) failures.push('Sincronização do estado empresarial não encontrada.');
if (!cloud.includes('flushPendingSales')) failures.push('Fila de vendas sem internet não encontrada.');
if (!cloud.includes('requestAccess')) failures.push('Pedido de acesso online não encontrado.');
if (!cloud.includes('inviteStaff') || !cloud.includes('claimInvitation')) failures.push('Convites preparados pelo administrador não encontrados.');
if (!app.includes('STORAGE_VERSION')) failures.push('Versão de dados não encontrada.');
if (!app.includes('customerSnapshot')) failures.push('Cópia dos dados do cliente não encontrada.');
if (!app.includes('creditLimit')) failures.push('Controlo de crédito de cliente não encontrado.');
if (!app.includes('cashSessions')) failures.push('Controlo de caixa não encontrado.');
if (!app.includes('auditLog')) failures.push('Auditoria operacional não encontrada.');
if (!app.includes('isAdministrator')) failures.push('Protecção de administrador não encontrada.');
if (!app.includes('ROLE_VIEWS')) failures.push('Permissões por perfil não encontradas.');
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
if (!html.includes('id="sellerDailyTable"') || !html.includes('id="sellerMonthlyTable"')) failures.push('Tabelas diária e mensal de vendedores não encontradas.');
if (!html.includes('id="storeTodayTable"')) failures.push('Resumo diário por loja não encontrado.');
if (!html.includes('id="manageCloud"')) failures.push('Configuração de dados online não encontrada.');
if (!app.includes('renderOperationalControl')) failures.push('Controlo operacional do administrador não encontrado.');
if (!app.includes('cloudAccessManagementModal')) failures.push('Gestão de acessos online não encontrada.');
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
if (!app.includes('if (!saveData()) {')) failures.push('Venda não verifica falha de persistência local.');

if (failures.length) {
  console.error('Validação falhou:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Validação concluída: ${requiredFiles.length} ficheiros e ${requiredInterfaceIds.length} ecrãs verificados.`);
