import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';
import { rutas } from './rutas';
import { clientes } from './maestros';
import { tiposCaja } from './maestros';
import { guiasDespacho } from './rutas';

export const entregas = sqliteTable('entregas', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  rutaId: text('ruta_id').notNull().references(() => rutas.id),
  clienteId: text('cliente_id').notNull().references(() => clientes.id),
  clienteNombreSnapshot: text('cliente_nombre_snapshot').notNull(),
  clienteDireccionSnapshot: text('cliente_direccion_snapshot'),
  guiaDespachoId: text('guia_despacho_id').references(() => guiasDespacho.id),
  tipoCajaId: text('tipo_caja_id').references(() => tiposCaja.id),
  cajasSolicitadas: integer('cajas_solicitadas').notNull().default(0),
  cajasEntregadas: integer('cajas_entregadas').notNull().default(0),
  cajasDevueltas: integer('cajas_devueltas').notNull().default(0),
  montoCobrado: real('monto_cobrado').notNull().default(0),
  estado: text('estado').notNull().default('entregado'),
  motivoRechazo: text('motivo_rechazo'),
  observaciones: text('observaciones'),
  horaEntrega: text('hora_entrega'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});