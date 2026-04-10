import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';
import { users } from './auth';

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').references(() => users.id),
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id').notNull(),
  accion: text('accion').notNull(),
  valoresAnteriores: text('valores_anteriores'),
  valoresNuevos: text('valores_nuevos'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});