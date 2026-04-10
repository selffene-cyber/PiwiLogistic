import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';
import { rutas } from './rutas';
import { clientes } from './maestros';

export const entregas = sqliteTable('entregas', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  rutaId: text('ruta_id').notNull().references(() => rutas.id),
  clienteId: text('cliente_id').notNull().references(() => clientes.id),
  clienteNombreSnapshot: text('cliente_nombre_snapshot').notNull(),
  cajasEntregadas: integer('cajas_entregadas').notNull(),
  estado: text('estado').notNull().default('entregado'),
  horaEntrega: text('hora_entrega'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});