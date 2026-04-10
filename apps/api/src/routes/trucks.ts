import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createTruckSchema = z.object({
  patente: z.string().min(1),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anio: z.number().int().optional(),
  capacidadCajas: z.number().int().optional(),
  activo: z.boolean().optional(),
});

const updateTruckSchema = z.object({
  patente: z.string().min(1).optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anio: z.number().int().optional(),
  capacidadCajas: z.number().int().optional(),
  activo: z.boolean().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const activoParam = c.req.query('activo');
  let query = db.select().from(schema.camiones)
    .where(eq(schema.camiones.tenantId, payload.tenantId));

  if (activoParam !== undefined) {
    const activo = activoParam === 'true';
    query = db.select().from(schema.camiones)
      .where(and(eq(schema.camiones.tenantId, payload.tenantId), eq(schema.camiones.activo, activo)));
  }

  const trucks = await query;
  return c.json({ success: true, data: trucks });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createTruckSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(schema.camiones).values({
    id,
    tenantId: payload.tenantId,
    patente: parsed.data.patente,
    marca: parsed.data.marca ?? null,
    modelo: parsed.data.modelo ?? null,
    anio: parsed.data.anio ?? null,
    capacidadCajas: parsed.data.capacidadCajas ?? null,
    activo: parsed.data.activo ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'camiones',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const truck = await db.select().from(schema.camiones)
    .where(eq(schema.camiones.id, id))
    .get();

  return c.json({ success: true, data: truck }, 201);
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateTruckSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.camiones)
    .where(and(eq(schema.camiones.id, id), eq(schema.camiones.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Truck not found' }, 404);
  }

  await db.update(schema.camiones)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.camiones.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'camiones',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: existing,
    valoresNuevos: parsed.data,
  });

  const truck = await db.select().from(schema.camiones)
    .where(eq(schema.camiones.id, id))
    .get();

  return c.json({ success: true, data: truck });
});

export default app;