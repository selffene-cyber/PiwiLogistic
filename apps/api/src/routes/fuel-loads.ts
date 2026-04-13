import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createSchema = z.object({
  camionId: z.string().min(1),
  fecha: z.string().min(1),
  kmVehiculo: z.number().min(0),
  litros: z.number().min(0),
  precioPorLitro: z.number().min(0),
  montoTotal: z.number().min(0),
  gasolinera: z.string().min(1),
  conductorRut: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const camionId = c.req.query('camionId');

  let query = db.select().from(schema.cargasCombustible)
    .where(eq(schema.cargasCombustible.tenantId, payload.tenantId));

  if (camionId) {
    query = db.select().from(schema.cargasCombustible)
      .where(and(eq(schema.cargasCombustible.tenantId, payload.tenantId), eq(schema.cargasCombustible.camionId, camionId)));
  }

  const loads = await query;
  return c.json({ success: true, data: loads });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(schema.cargasCombustible).values({
    id,
    tenantId: payload.tenantId,
    camionId: parsed.data.camionId,
    fecha: parsed.data.fecha,
    kmVehiculo: parsed.data.kmVehiculo,
    litros: parsed.data.litros,
    precioPorLitro: parsed.data.precioPorLitro,
    montoTotal: parsed.data.montoTotal,
    gasolinera: parsed.data.gasolinera,
    conductorRut: parsed.data.conductorRut ?? null,
    observaciones: parsed.data.observaciones ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const truck = await db.select().from(schema.camiones)
    .where(and(eq(schema.camiones.id, parsed.data.camionId), eq(schema.camiones.tenantId, payload.tenantId)))
    .get();

  if (truck && (truck.kmActual ?? 0) < parsed.data.kmVehiculo) {
    await db.update(schema.camiones)
      .set({ kmActual: parsed.data.kmVehiculo, updatedAt: new Date().toISOString() })
      .where(eq(schema.camiones.id, parsed.data.camionId));
  }

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'cargas_combustible',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const load = await db.select().from(schema.cargasCombustible)
    .where(eq(schema.cargasCombustible.id, id))
    .get();

  return c.json({ success: true, data: load }, 201);
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.cargasCombustible)
    .where(and(eq(schema.cargasCombustible.id, id), eq(schema.cargasCombustible.tenantId, payload.tenantId)))
    .get();

  if (!existing) return c.json({ success: false, error: 'Fuel load not found' }, 404);

  await db.delete(schema.cargasCombustible).where(eq(schema.cargasCombustible.id, id));

  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'cargas_combustible', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}

  return c.json({ success: true, data: { id } });
});

export default app;