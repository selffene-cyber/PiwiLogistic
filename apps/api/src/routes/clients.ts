import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createClientSchema = z.object({
  nombreComercial: z.string().min(1),
  razonSocial: z.string().nullable().optional(),
  rutSap: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  comuna: z.string().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  tipoCliente: z.enum(['minorista', 'mayorista']).optional(),
  activo: z.boolean().optional(),
});

const updateClientSchema = z.object({
  nombreComercial: z.string().min(1).optional(),
  razonSocial: z.string().nullable().optional(),
  rutSap: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  comuna: z.string().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  tipoCliente: z.enum(['minorista', 'mayorista']).optional(),
  activo: z.boolean().optional(),
});

const nullablePreprocess = (val: unknown) => val === '' ? null : val;

app.get('/check-duplicate', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const rutSap = c.req.query('rutSap');
  const nombreComercial = c.req.query('nombreComercial');
  const excludeId = c.req.query('excludeId');

  if (rutSap) {
    const existing = await db.select().from(schema.clientes)
      .where(and(eq(schema.clientes.tenantId, payload.tenantId), eq(schema.clientes.rutSap, rutSap)))
      .get();
    if (existing && existing.id !== excludeId) {
      return c.json({ duplicate: true, field: 'rutSap', existing: { id: existing.id, nombreComercial: existing.nombreComercial, rutSap: existing.rutSap } });
    }
  }

  if (nombreComercial) {
    const existing = await db.select().from(schema.clientes)
      .where(and(eq(schema.clientes.tenantId, payload.tenantId), eq(schema.clientes.nombreComercial, nombreComercial)))
      .get();
    if (existing && existing.id !== excludeId) {
      return c.json({ duplicate: true, field: 'nombreComercial', existing: { id: existing.id, nombreComercial: existing.nombreComercial, rutSap: existing.rutSap } });
    }
  }

  return c.json({ duplicate: false });
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const clients = await db.select().from(schema.clientes)
    .where(eq(schema.clientes.tenantId, payload.tenantId));

  return c.json({ success: true, data: clients });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  if (parsed.data.rutSap) {
    const existing = await db.select().from(schema.clientes)
      .where(and(eq(schema.clientes.tenantId, payload.tenantId), eq(schema.clientes.rutSap, parsed.data.rutSap)))
      .get();
    if (existing) {
      return c.json({ success: false, error: `Ya existe un cliente con RUT/SAP ${parsed.data.rutSap}`, existingId: existing.id, existingNombre: existing.nombreComercial }, 409);
    }
  }

  await db.insert(schema.clientes).values({
    id,
    tenantId: payload.tenantId,
    nombreComercial: parsed.data.nombreComercial,
    razonSocial: parsed.data.razonSocial ?? null,
    rutSap: parsed.data.rutSap ?? null,
    direccion: parsed.data.direccion ?? null,
    comuna: parsed.data.comuna ?? null,
    ciudad: parsed.data.ciudad ?? null,
    telefono: parsed.data.telefono ?? null,
    tipoCliente: parsed.data.tipoCliente ?? 'minorista',
    activo: parsed.data.activo ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'clientes',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const client = await db.select().from(schema.clientes)
    .where(eq(schema.clientes.id, id))
    .get();

  return c.json({ success: true, data: client }, 201);
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.clientes)
    .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Client not found' }, 404);
  }

  await db.update(schema.clientes)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.clientes.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'clientes',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: existing,
    valoresNuevos: parsed.data,
  });

  const client = await db.select().from(schema.clientes)
    .where(eq(schema.clientes.id, id))
    .get();

  return c.json({ success: true, data: client });
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const existing = await db.select().from(schema.clientes)
    .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, payload.tenantId)))
    .get();
  if (!existing) return c.json({ success: false, error: 'Client not found' }, 404);
  await db.delete(schema.clientes).where(eq(schema.clientes.id, id));
  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'clientes', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}
  return c.json({ success: true, data: { id } });
});

export default app;