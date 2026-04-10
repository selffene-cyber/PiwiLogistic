import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';
import { rutas } from './rutas';

export const costosOperacion = sqliteTable('costos_operacion', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  rutaId: text('ruta_id').notNull().references(() => rutas.id),
  arriendoCamion: real('arriendo_camion').notNull().default(0),
  sueldoConductor: real('sueldo_conductor').notNull().default(0),
  peonetas: real('peonetas').notNull().default(0),
  mantencion: real('mantencion').notNull().default(0),
  administracion: real('administracion').notNull().default(0),
  totalCostos: real('total_costos').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});