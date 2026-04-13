import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';

export const trabajadores = sqliteTable('trabajadores', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  nombre: text('nombre').notNull(),
  rut: text('rut').notNull(),
  tipoTrabajador: text('tipo_trabajador').notNull(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  costoMensualEmpresa: real('costo_mensual_empresa').default(0),
  fechaIngreso: text('fecha_ingreso'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const camiones = sqliteTable('camiones', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  patente: text('patente').notNull(),
  marca: text('marca'),
  modelo: text('modelo'),
  anio: integer('anio'),
  capacidadCajas: integer('capacidad_cajas'),
  tipoPropiedad: text('tipo_propiedad').notNull().default('propio'),
  kmActual: integer('km_actual').default(0),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const cargasCombustible = sqliteTable('cargas_combustible', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  camionId: text('camion_id').notNull().references(() => camiones.id),
  fecha: text('fecha').notNull(),
  kmVehiculo: integer('km_vehiculo').notNull(),
  litros: real('litros').notNull(),
  precioPorLitro: real('precio_por_litro').notNull(),
  montoTotal: real('monto_total').notNull(),
  gasolinera: text('gasolinera').notNull(),
  conductorRut: text('conductor_rut'),
  observaciones: text('observaciones'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const mantencionesCamion = sqliteTable('mantenciones_camion', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  camionId: text('camion_id').notNull().references(() => camiones.id),
  fecha: text('fecha').notNull(),
  kmVehiculo: integer('km_vehiculo').notNull(),
  kmProxMantencion: integer('km_prox_mantencion'),
  tipoMantencion: text('tipo_mantencion').notNull(),
  descripcion: text('descripcion'),
  costo: real('costo').notNull().default(0),
  taller: text('taller'),
  observaciones: text('observaciones'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  nombreComercial: text('nombre_comercial').notNull(),
  razonSocial: text('razon_social'),
  rutSap: text('rut_sap'),
  direccion: text('direccion'),
  comuna: text('comuna'),
  ciudad: text('ciudad'),
  telefono: text('telefono'),
  tipoCliente: text('tipo_cliente').notNull().default('minorista'),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const tiposCaja = sqliteTable('tipos_caja', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  nombre: text('nombre').notNull(),
  precioUnitario: real('precio_unitario').notNull(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});