import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';
import { camiones, trabajadores } from './maestros';
import { users } from './auth';
import { tiposCaja } from './maestros';

export const rutas = sqliteTable('rutas', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  fecha: text('fecha').notNull(),
  camionId: text('camion_id').notNull().references(() => camiones.id),
  conductorId: text('conductor_id').notNull().references(() => trabajadores.id),
  peoneta1Id: text('peoneta_1_id').references(() => trabajadores.id),
  peoneta2Id: text('peoneta_2_id').references(() => trabajadores.id),
  estado: text('estado').notNull().default('planificada'),
  horaSalida: text('hora_salida'),
  horaFin: text('hora_fin'),
  cerradaAt: text('cerrada_at'),
  cerradaBy: text('cerrada_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const guiasDespacho = sqliteTable('guias_despacho', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  rutaId: text('ruta_id').notNull().references(() => rutas.id),
  numeroGd: text('numero_gd').notNull(),
  fecha: text('fecha').notNull(),
  tipoGd: text('tipo_gd').notNull().default('normal'),
  observaciones: text('observaciones'),
  estado: text('estado').notNull().default('abierta'),
  totalCajas: integer('total_cajas').default(0),
  totalMonto: real('total_monto').default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const detalleGd = sqliteTable('detalle_gd', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  guiaDespachoId: text('guia_despacho_id').notNull().references(() => guiasDespacho.id),
  tipoCajaId: text('tipo_caja_id').notNull().references(() => tiposCaja.id),
  clienteInternoId: text('cliente_interno_id'),
  clienteInternoNombre: text('cliente_interno_nombre'),
  direccionInterno: text('direccion_interno'),
  cantidad: integer('cantidad').notNull(),
  precioUnitarioSnapshot: real('precio_unitario_snapshot').notNull(),
  subtotal: real('subtotal').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});