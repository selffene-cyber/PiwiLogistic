import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  rutEmpresa: text('rut_empresa').notNull(),
  estado: text('estado').notNull().default('activo'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const tenantConfig = sqliteTable('tenant_config', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  diasHabilesMes: integer('dias_habiles_mes').notNull().default(26),
  baseCajasBono: integer('base_cajas_bono'),
  horaInicioOperacion: text('hora_inicio_operacion').notNull().default('07:00'),
  horaCierreOperacion: text('hora_cierre_operacion').notNull().default('21:00'),
  bloquearEdicionRutaCerrada: integer('bloquear_edicion_ruta_cerrada', { mode: 'boolean' }).notNull().default(true),
  usarAuditoria: integer('usar_auditoria', { mode: 'boolean' }).notNull().default(true),
  moneda: text('moneda').notNull().default('CLP'),
  costoArriendoCamionMensual: real('costo_arriendo_camion_mensual').default(0),
  costoMantencionMensual: real('costo_mantencion_mensual').default(0),
  costoAdministracionMensual: real('costo_administracion_mensual').default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});