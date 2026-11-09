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
  'backup',
  'restore'
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
if (!app.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) failures.push('Exportação Excel não encontrada.');

if (failures.length) {
  console.error('Validação falhou:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Validação concluída: ${requiredFiles.length} ficheiros e ${requiredInterfaceIds.length} ecrãs verificados.`);
