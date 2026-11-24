import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/2026-11-erp-modular-access-restaurant.sql', import.meta.url), 'utf8');

test('a sessão local inválida não assume automaticamente outro utilizador', () => {
  assert.match(app, /function getSessionUser\(\) \{ const id = localStorage\.getItem\(USER_SESSION\); return id \? \(data\.users\.find\(user => user\.id === id && user\.active\) \|\| null\) : null; \}/);
});

test('o catálogo activa apenas módulos implementados e exige administrador', () => {
  assert.match(app, /function toggleCompanyModule\(moduleId\)/);
  assert.match(app, /if \(!isAdministrator\(\)\) return notify\('Apenas o administrador pode activar módulos da empresa\.'\)/);
  assert.match(app, /data\.settings\.enabledModules/);
});

test('o módulo de restaurante inclui mesas, comandas e fluxo de cozinha', () => {
  assert.match(html, /id="restaurantView"/);
  assert.match(app, /function restaurantTableModal\(\)/);
  assert.match(app, /function restaurantOrderModal\(tableId\)/);
  assert.match(app, /function updateRestaurantOrder\(orderId, status\)/);
});

test('a migração aplica isolamento por empresa e limpeza apenas por administrador', () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /public\.current_company_id\(\)/);
  assert.match(migration, /if not public\.is_company_admin\(\) then raise exception/);
});
