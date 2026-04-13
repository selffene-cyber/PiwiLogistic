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
  kmVehiculo: z.number().int().min(0).nullable().optional(),
  kmProxMantencion: z.number().int().min(0).nullable().optional(),
  tipoMantencion: z.enum(['preventiva', 'correctiva', 'neumaticos', 'lubricacion', 'revision_tecnica', 'otro']),
  descripcion: z.string().nullable().optional(),
  costo: z.number().min(0).nullable().optional(),
  taller: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const camionId = c.req.query('camionId');

  let query = db.select().from(schema.mantencionesCamion)
    .where(eq(schema.mantencionesCamion.tenantId, payload.tenantId));

  if (camionId) {
    query = db.select().from(schema.mantencionesCamion)
      .where(and(eq(schema.mantencionesCamion.tenantId, payload.tenantId), eq(schema.mantencionesCamion.camionId, camionId)));
  }

  const records = await query;
  return c.json({ success: true, data: records });
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

  await db.insert(schema.mantencionesCamion).values({
    id,
    tenantId: payload.tenantId,
    camionId: parsed.data.camionId,
    fecha: parsed.data.fecha,
    kmVehiculo: parsed.data.kmVehiculo ?? 0,
    kmProxMantencion: parsed.data.kmProxMantencion ?? null,
    tipoMantencion: parsed.data.tipoMantencion,
    descripcion: parsed.data.descripcion ?? null,
    costo: parsed.data.costo ?? 0,
    taller: parsed.data.taller ?? null,
    observaciones: parsed.data.observaciones ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const truck = await db.select().from(schema.camiones)
    .where(and(eq(schema.camiones.id, parsed.data.camionId), eq(schema.camiones.tenantId, payload.tenantId)))
    .get();

  const kmValue = parsed.data.kmVehiculo ?? 0;
  if (truck && (truck.kmActual ?? 0) < kmValue) {
    await db.update(schema.camiones)
      .set({ kmActual: kmValue, updatedAt: new Date().toISOString() })
      .where(eq(schema.camiones.id, parsed.data.camionId));
  }

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'mantenciones_camion',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const record = await db.select().from(schema.mantencionesCamion)
    .where(eq(schema.mantencionesCamion.id, id))
    .get();

  return c.json({ success: true, data: record }, 201);
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.mantencionesCamion)
    .where(and(eq(schema.mantencionesCamion.id, id), eq(schema.mantencionesCamion.tenantId, payload.tenantId)))
    .get();

  if (!existing) return c.json({ success: false, error: 'Maintenance record not found' }, 404);

  await db.delete(schema.mantencionesCamion).where(eq(schema.mantencionesCamion.id, id));

  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'mantenciones_camion', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}

  return c.json({ success: true, data: { id } });
});

export default app;