import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createDistributionCenterSchema = z.object({
  nombre: z.string().min(1),
  codigo: z.string().optional(),
  ciudad: z.string().optional(),
  direccion: z.string().optional(),
  activo: z.boolean().optional(),
});

const updateDistributionCenterSchema = z.object({
  nombre: z.string().min(1).optional(),
  codigo: z.string().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  activo: z.boolean().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const distributionCenters = await db.select().from(schema.centrosDistribucion)
    .where(and(eq(schema.centrosDistribucion.tenantId, payload.tenantId), eq(schema.centrosDistribucion.activo, true)));

  return c.json({ success: true, data: distributionCenters });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createDistributionCenterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(schema.centrosDistribucion).values({
    id,
    tenantId: payload.tenantId,
    nombre: parsed.data.nombre,
    codigo: parsed.data.codigo ?? null,
    ciudad: parsed.data.ciudad ?? null,
    direccion: parsed.data.direccion ?? null,
    activo: parsed.data.activo ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'centrosDistribucion',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const distributionCenter = await db.select().from(schema.centrosDistribucion)
    .where(eq(schema.centrosDistribucion.id, id))
    .get();

  return c.json({ success: true, data: distributionCenter }, 201);
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateDistributionCenterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.centrosDistribucion)
    .where(and(eq(schema.centrosDistribucion.id, id), eq(schema.centrosDistribucion.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Distribution center not found' }, 404);
  }

  await db.update(schema.centrosDistribucion)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.centrosDistribucion.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'centrosDistribucion',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: existing,
    valoresNuevos: parsed.data,
  });

  const distributionCenter = await db.select().from(schema.centrosDistribucion)
    .where(eq(schema.centrosDistribucion.id, id))
    .get();

  return c.json({ success: true, data: distributionCenter });
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const existing = await db.select().from(schema.centrosDistribucion)
    .where(and(eq(schema.centrosDistribucion.id, id), eq(schema.centrosDistribucion.tenantId, payload.tenantId)))
    .get();
  if (!existing) return c.json({ success: false, error: 'Distribution center not found' }, 404);
  await db.delete(schema.centrosDistribucion).where(eq(schema.centrosDistribucion.id, id));
  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'centrosDistribucion', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}
  return c.json({ success: true, data: { id } });
});

export default app;