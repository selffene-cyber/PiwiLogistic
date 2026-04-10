import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createDeliverySchema = z.object({
  rutaId: z.string().min(1),
  clienteId: z.string().min(1),
  clienteNombreSnapshot: z.string().min(1),
  cajasEntregadas: z.number().int().min(0),
  estado: z.enum(['entregado', 'parcial', 'rechazado']).default('entregado'),
  horaEntrega: z.string().optional(),
});

const updateDeliverySchema = z.object({
  cajasEntregadas: z.number().int().min(0).optional(),
  estado: z.enum(['entregado', 'parcial', 'rechazado']).optional(),
  horaEntrega: z.string().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const rutaId = c.req.query('rutaId');

  let conditions = [eq(schema.entregas.tenantId, payload.tenantId)];
  if (rutaId) conditions.push(eq(schema.entregas.rutaId, rutaId));

  const deliveries = await db.select().from(schema.entregas)
    .where(and(...conditions));

  return c.json({ success: true, data: deliveries });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createDeliverySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.entregas).values({
    id,
    tenantId: payload.tenantId,
    rutaId: parsed.data.rutaId,
    clienteId: parsed.data.clienteId,
    clienteNombreSnapshot: parsed.data.clienteNombreSnapshot,
    cajasEntregadas: parsed.data.cajasEntregadas,
    estado: parsed.data.estado,
    horaEntrega: parsed.data.horaEntrega ?? now,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'entregas',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const delivery = await db.select().from(schema.entregas)
    .where(eq(schema.entregas.id, id))
    .get();

  return c.json({ success: true, data: delivery }, 201);
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateDeliverySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.entregas)
    .where(and(eq(schema.entregas.id, id), eq(schema.entregas.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Delivery not found' }, 404);
  }

  await db.update(schema.entregas)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.entregas.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'entregas',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: existing,
    valoresNuevos: parsed.data,
  });

  const delivery = await db.select().from(schema.entregas)
    .where(eq(schema.entregas.id, id))
    .get();

  return c.json({ success: true, data: delivery });
});

export default app;