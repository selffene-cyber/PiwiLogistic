import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

app.get('/current', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const tenant = await db.select().from(schema.tenants)
    .where(eq(schema.tenants.id, payload.tenantId))
    .get();

  if (!tenant) {
    return c.json({ success: false, error: 'Tenant not found' }, 404);
  }

  return c.json({ success: true, data: tenant });
});

const configUpdateSchema = z.object({
  diasHabilesMes: z.number().int().min(1).max(31).optional(),
  baseCajasBono: z.number().int().optional(),
  horaInicioOperacion: z.string().optional(),
  horaCierreOperacion: z.string().optional(),
  bloquearEdicionRutaCerrada: z.boolean().optional(),
  usarAuditoria: z.boolean().optional(),
  moneda: z.enum(['CLP', 'USD']).optional(),
  costoArriendoCamionMensual: z.number().optional(),
  costoMantencionMensual: z.number().optional(),
  costoAdministracionMensual: z.number().optional(),
});

app.put('/current/config', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = configUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);

  const existing = await db.select().from(schema.tenantConfig)
    .where(eq(schema.tenantConfig.tenantId, payload.tenantId))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Tenant config not found' }, 404);
  }

  await db.update(schema.tenantConfig)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.tenantConfig.id, existing.id));

  const updated = await db.select().from(schema.tenantConfig)
    .where(eq(schema.tenantConfig.id, existing.id))
    .get();

  return c.json({ success: true, data: updated });
});

export default app;