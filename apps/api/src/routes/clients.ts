import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createClientSchema = z.object({
  nombreComercial: z.string().min(1),
  razonSocial: z.string().optional(),
  rut: z.string().optional(),
  direccion: z.string().optional(),
  comuna: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  tipoCliente: z.enum(['minorista', 'mayorista']).optional(),
  activo: z.boolean().optional(),
});

const updateClientSchema = z.object({
  nombreComercial: z.string().min(1).optional(),
  razonSocial: z.string().optional(),
  rut: z.string().optional(),
  direccion: z.string().optional(),
  comuna: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  tipoCliente: z.enum(['minorista', 'mayorista']).optional(),
  activo: z.boolean().optional(),
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

  await db.insert(schema.clientes).values({
    id,
    tenantId: payload.tenantId,
    nombreComercial: parsed.data.nombreComercial,
    razonSocial: parsed.data.razonSocial ?? null,
    rut: parsed.data.rut ?? null,
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

export default app;