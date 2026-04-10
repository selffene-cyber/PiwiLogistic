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
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  nombreComercial: text('nombre_comercial').notNull(),
  razonSocial: text('razon_social'),
  rut: text('rut'),
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