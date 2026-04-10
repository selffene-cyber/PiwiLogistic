import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';
import { rutas } from './rutas';

export const bonusTiers = sqliteTable('bonus_tiers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  nombre: text('nombre').notNull(),
  desdeCajas: integer('desde_cajas').notNull(),
  hastaCajas: integer('hasta_cajas'),
  montoPorCaja: real('monto_por_caja').notNull(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  orden: integer('orden').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const bonusConfig = sqliteTable('bonus_config', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  metodoReparto: text('metodo_reparto').notNull().default('igualitario'),
  incluirConductor: integer('incluir_conductor', { mode: 'boolean' }).notNull().default(true),
  incluirPeoneta1: integer('incluir_peoneta_1', { mode: 'boolean' }).notNull().default(true),
  incluirPeoneta2: integer('incluir_peoneta_2', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const bonos = sqliteTable('bonos', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  rutaId: text('ruta_id').notNull().references(() => rutas.id),
  cajasExcedentes: integer('cajas_excedentes').notNull().default(0),
  bonoTotal: real('bono_total').notNull().default(0),
  bonoPorPersona: real('bono_por_persona').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});