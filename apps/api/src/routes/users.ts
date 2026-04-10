import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { hashPassword } from '../lib/auth';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createUserSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().min(1),
  activo: z.boolean().optional(),
});

const updateUserSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  roleId: z.string().min(1).optional(),
});

const updateStatusSchema = z.object({
  activo: z.boolean(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const users = await db.select({
    id: schema.users.id,
    nombre: schema.users.nombre,
    email: schema.users.email,
    roleId: schema.users.roleId,
    activo: schema.users.activo,
    debeCambiarPassword: schema.users.debeCambiarPassword,
    createdAt: schema.users.createdAt,
    updatedAt: schema.users.updatedAt,
    tenantId: schema.users.tenantId,
    roleNombre: schema.roles.nombre,
    roleCodigo: schema.roles.codigo,
  }).from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.tenantId, payload.tenantId));

  return c.json({ success: true, data: users });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);

  const existing = await db.select().from(schema.users)
    .where(and(eq(schema.users.email, parsed.data.email), eq(schema.users.tenantId, payload.tenantId)))
    .get();

  if (existing) {
    return c.json({ success: false, error: 'Email already exists' }, 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const id = crypto.randomUUID();

  await db.insert(schema.users).values({
    id,
    tenantId: payload.tenantId,
    nombre: parsed.data.nombre,
    email: parsed.data.email,
    passwordHash,
    roleId: parsed.data.roleId,
    activo: parsed.data.activo ?? true,
    debeCambiarPassword: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'users',
    entidadId: id,
    accion: 'create',
    valoresNuevos: { nombre: parsed.data.nombre, email: parsed.data.email },
  });

  const user = await db.select({
    id: schema.users.id,
    nombre: schema.users.nombre,
    email: schema.users.email,
    roleId: schema.users.roleId,
    activo: schema.users.activo,
    debeCambiarPassword: schema.users.debeCambiarPassword,
    createdAt: schema.users.createdAt,
    updatedAt: schema.users.updatedAt,
    tenantId: schema.users.tenantId,
  }).from(schema.users)
    .where(eq(schema.users.id, id))
    .get();

  return c.json({ success: true, data: user }, 201);
});

app.get('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const result = await db.select({
    id: schema.users.id,
    nombre: schema.users.nombre,
    email: schema.users.email,
    roleId: schema.users.roleId,
    activo: schema.users.activo,
    debeCambiarPassword: schema.users.debeCambiarPassword,
    createdAt: schema.users.createdAt,
    updatedAt: schema.users.updatedAt,
    tenantId: schema.users.tenantId,
    roleNombre: schema.roles.nombre,
    roleCodigo: schema.roles.codigo,
  }).from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, payload.tenantId)))
    .get();

  if (!result) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({ success: true, data: result });
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.users)
    .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  await db.update(schema.users)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'users',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: { nombre: existing.nombre, email: existing.email, roleId: existing.roleId },
    valoresNuevos: parsed.data,
  });

  const user = await db.select({
    id: schema.users.id,
    nombre: schema.users.nombre,
    email: schema.users.email,
    roleId: schema.users.roleId,
    activo: schema.users.activo,
    debeCambiarPassword: schema.users.debeCambiarPassword,
    createdAt: schema.users.createdAt,
    updatedAt: schema.users.updatedAt,
    tenantId: schema.users.tenantId,
  }).from(schema.users)
    .where(eq(schema.users.id, id))
    .get();

  return c.json({ success: true, data: user });
});

app.patch('/:id/status', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.users)
    .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  await db.update(schema.users)
    .set({ activo: parsed.data.activo, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'users',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: { activo: existing.activo },
    valoresNuevos: { activo: parsed.data.activo },
  });

  return c.json({ success: true, data: { id, activo: parsed.data.activo } });
});

export default app;