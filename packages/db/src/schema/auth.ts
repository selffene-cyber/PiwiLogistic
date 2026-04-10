import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  nombre: text('nombre').notNull(),
  codigo: text('codigo').notNull(),
  descripcion: text('descripcion'),
  permisos: text('permisos'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  nombre: text('nombre').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  roleId: text('role_id').notNull().references(() => roles.id),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  debeCambiarPassword: integer('debe_cambiar_password', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});