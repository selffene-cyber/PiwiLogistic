import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { readdirSync } from 'fs';
import * as bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const d1Dir = join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

const sqliteFiles = readdirSync(d1Dir).filter((f: string) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
if (sqliteFiles.length === 0) {
  console.error('No D1 SQLite database found. Run `pnpm db:migrate` first.');
  process.exit(1);
}
const dbPath = join(d1Dir, sqliteFiles[0]);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const now = new Date().toISOString();

const tenantId = randomUUID();
const adminRoleId = randomUUID();
const supervisorRoleId = randomUUID();
const operadorRoleId = randomUUID();
const conductorRoleId = randomUUID();
const visualizadorRoleId = randomUUID();
const adminUserId = randomUUID();

const insertTenant = db.prepare(`
  INSERT INTO tenants (id, nombre, rut_empresa, estado, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertTenantConfig = db.prepare(`
  INSERT INTO tenant_config (id, tenant_id, dias_habiles_mes, base_cajas_bono, hora_inicio_operacion, hora_cierre_operacion, bloquear_edicion_ruta_cerrada, usar_auditoria, moneda, costo_arriendo_camion_mensual, costo_mantencion_mensual, costo_administracion_mensual, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertRole = db.prepare(`
  INSERT INTO roles (id, tenant_id, nombre, codigo, descripcion, permisos, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, tenant_id, nombre, email, password_hash, role_id, activo, debe_cambiar_password, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertBonusTier = db.prepare(`
  INSERT INTO bonus_tiers (id, tenant_id, nombre, desde_cajas, hasta_cajas, monto_por_caja, activo, orden, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertBonusConfig = db.prepare(`
  INSERT INTO bonus_config (id, tenant_id, metodo_reparto, incluir_conductor, incluir_peoneta_1, incluir_peoneta_2, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const passwordHash = bcrypt.hashSync('Admin123!', 12);

const seed = db.transaction(() => {
  insertTenant.run(tenantId, 'GOFEX Demo', '76000000-0', 'activo', now, now);

  insertTenantConfig.run(
    randomUUID(), tenantId,
    26, 1000,
    '07:00', '21:00',
    1, 1, 'CLP',
    500000, 150000, 300000,
    now, now
  );

  insertRole.run(adminRoleId, tenantId, 'Administrador', 'ADMIN', 'Acceso total al sistema', '{"all": true}', now, now);
  insertRole.run(supervisorRoleId, tenantId, 'Supervisor', 'SUPERVISOR', 'Gestiona rutas y operaciones', '{"routes": true, "dispatch": true, "deliveries": true, "dashboard": true}', now, now);
  insertRole.run(operadorRoleId, tenantId, 'Operador', 'OPERADOR', 'Registra guias y entregas', '{"dispatch": true, "deliveries": true}', now, now);
  insertRole.run(conductorRoleId, tenantId, 'Conductor', 'CONDUCTOR', 'Ve su ruta asignada', '{"routes": "read_own"}', now, now);
  insertRole.run(visualizadorRoleId, tenantId, 'Visualizador', 'VISUALIZADOR', 'Solo lectura', '{"all": "read"}', now, now);

  insertUser.run(
    adminUserId, tenantId,
    'Admin GOFEX',
    'admin@gofex.cl',
    passwordHash,
    adminRoleId,
    1, 1,
    now, now
  );

  insertBonusTier.run(randomUUID(), tenantId, 'Tramo 1', 0, 1000, 0, 1, 1, now, now);
  insertBonusTier.run(randomUUID(), tenantId, 'Tramo 2', 1001, 1300, 10, 1, 2, now, now);
  insertBonusTier.run(randomUUID(), tenantId, 'Tramo 3', 1301, 1500, 15, 1, 3, now, now);
  insertBonusTier.run(randomUUID(), tenantId, 'Tramo 4', 1501, null, 20, 1, 4, now, now);

  insertBonusConfig.run(randomUUID(), tenantId, 'igualitario', 1, 1, 1, now, now);
});

try {
  seed();
  console.log('Seed data inserted successfully');
  console.log(`  Tenant: GOFEX Demo (${tenantId})`);
  console.log(`  Admin: admin@gofex.cl / Admin123!`);
  console.log(`  Roles: ADMIN, SUPERVISOR, OPERADOR, CONDUCTOR, VISUALIZADOR`);
  console.log(`  Bonus tiers: 4 tramos configurados`);
} catch (error) {
  console.error('Seed failed:', error);
  process.exit(1);
} finally {
  db.close();
}