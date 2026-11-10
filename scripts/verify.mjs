import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'README.md',
  'LICENSE',
  'package.json',
  'docs/ARQUITETURA.md',
  'docs/PRODUCAO.md',
  'supabase/schema.sql'
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
  'changeStock'
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
for (const fn of requiredFunctions) {
  if (!app.includes(`function ${fn}`)) failures.push(`Função essencial em falta: ${fn}`);
}
if (!app.includes('localStorage')) failures.push('Persistência local não encontrada.');
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
if (!app.includes('data.transfers')) failures.push('Transferências de stock não encontradas.');
if (!app.includes("`Cliente: ${escapeHtml(customer.name)}`")) failures.push('Nome do cliente sem escape no modal de recebimento.');
if (!app.includes("escapeHtml(supplier?.name || 'Fornecedor')")) failures.push('Nome do fornecedor sem escape no modal de pagamento.');
if (!app.includes('const previousData = JSON.stringify(data);')) failures.push('Venda sem cópia de segurança para rollback local.');
if (!app.includes('if (!saveData()) {')) failures.push('Venda não verifica falha de persistência local.');

if (failures.length) {
  console.error('Validação falhou:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Validação concluída: ${requiredFiles.length} ficheiros e ${requiredInterfaceIds.length} ecrãs verificados.`);
