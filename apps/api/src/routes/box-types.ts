import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createBoxTypeSchema = z.object({
  nombre: z.string().min(1),
  precioUnitario: z.number().positive(),
  litrosPorCaja: z.number().positive().default(1),
  activo: z.boolean().optional(),
});

const updateBoxTypeSchema = z.object({
  nombre: z.string().min(1).optional(),
  precioUnitario: z.number().positive().optional(),
  litrosPorCaja: z.number().positive().optional(),
  activo: z.boolean().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const boxTypes = await db.select().from(schema.tiposCaja)
    .where(eq(schema.tiposCaja.tenantId, payload.tenantId));

  return c.json({ success: true, data: boxTypes });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createBoxTypeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(schema.tiposCaja).values({
    id,
    tenantId: payload.tenantId,
    nombre: parsed.data.nombre,
    precioUnitario: parsed.data.precioUnitario,
    litrosPorCaja: parsed.data.litrosPorCaja,
    activo: parsed.data.activo ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'tiposCaja',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const boxType = await db.select().from(schema.tiposCaja)
    .where(eq(schema.tiposCaja.id, id))
    .get();

  return c.json({ success: true, data: boxType }, 201);
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateBoxTypeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.tiposCaja)
    .where(and(eq(schema.tiposCaja.id, id), eq(schema.tiposCaja.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Box type not found' }, 404);
  }

  await db.update(schema.tiposCaja)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.tiposCaja.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'tiposCaja',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: existing,
    valoresNuevos: parsed.data,
  });

  const boxType = await db.select().from(schema.tiposCaja)
    .where(eq(schema.tiposCaja.id, id))
    .get();

  return c.json({ success: true, data: boxType });
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const existing = await db.select().from(schema.tiposCaja)
    .where(and(eq(schema.tiposCaja.id, id), eq(schema.tiposCaja.tenantId, payload.tenantId)))
    .get();
  if (!existing) return c.json({ success: false, error: 'Box type not found' }, 404);
  await db.delete(schema.tiposCaja).where(eq(schema.tiposCaja.id, id));
  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'tiposCaja', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}
  return c.json({ success: true, data: { id } });
});

export default app;