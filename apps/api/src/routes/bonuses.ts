import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { requireRole } from '../middleware/auth';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createTierSchema = z.object({
  nombre: z.string().min(1),
  desdeCajas: z.number().int().min(0),
  hastaCajas: z.number().int().nullable().optional(),
  montoPorCaja: z.number().min(0),
  orden: z.number().int().min(0).default(0),
});

const updateTierSchema = z.object({
  nombre: z.string().min(1).optional(),
  desdeCajas: z.number().int().min(0).optional(),
  hastaCajas: z.number().int().nullable().optional(),
  montoPorCaja: z.number().min(0).optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
});

app.get('/bonus-tiers', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const tiers = await db.select().from(schema.bonusTiers)
    .where(and(eq(schema.bonusTiers.tenantId, payload.tenantId), eq(schema.bonusTiers.activo, true)));

  return c.json({ success: true, data: tiers });
});

app.post('/bonus-tiers', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createTierSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.bonusTiers).values({
    id,
    tenantId: payload.tenantId,
    nombre: parsed.data.nombre,
    desdeCajas: parsed.data.desdeCajas,
    hastaCajas: parsed.data.hastaCajas ?? null,
    montoPorCaja: parsed.data.montoPorCaja,
    activo: true,
    orden: parsed.data.orden,
    createdAt: now,
    updatedAt: now,
  });

  const tier = await db.select().from(schema.bonusTiers)
    .where(eq(schema.bonusTiers.id, id))
    .get();

  return c.json({ success: true, data: tier }, 201);
});

app.put('/bonus-tiers/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateTierSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.bonusTiers)
    .where(and(eq(schema.bonusTiers.id, id), eq(schema.bonusTiers.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Bonus tier not found' }, 404);
  }

  await db.update(schema.bonusTiers)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.bonusTiers.id, id));

  const tier = await db.select().from(schema.bonusTiers)
    .where(eq(schema.bonusTiers.id, id))
    .get();

  return c.json({ success: true, data: tier });
});

app.get('/bonuses', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const rutaId = c.req.query('rutaId');

  let conditions = [eq(schema.bonos.tenantId, payload.tenantId)];
  if (rutaId) conditions.push(eq(schema.bonos.rutaId, rutaId));

  const bonuses = await db.select().from(schema.bonos)
    .where(and(...conditions));

  return c.json({ success: true, data: bonuses });
});

app.delete('/bonus-tiers/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const existing = await db.select().from(schema.bonusTiers)
    .where(and(eq(schema.bonusTiers.id, id), eq(schema.bonusTiers.tenantId, payload.tenantId)))
    .get();
  if (!existing) return c.json({ success: false, error: 'Bonus tier not found' }, 404);
  await db.update(schema.bonusTiers).set({ activo: false, updatedAt: new Date().toISOString() }).where(eq(schema.bonusTiers.id, id));
  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'bonusTiers', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}
  return c.json({ success: true, data: { id } });
});

export default app;