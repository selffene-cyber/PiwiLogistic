import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createWorkerSchema = z.object({
  nombre: z.string().min(1),
  rut: z.string().min(1),
  tipoTrabajador: z.enum(['conductor', 'peoneta', 'administrativo']),
  activo: z.boolean().optional(),
  costoMensualEmpresa: z.number().optional(),
  fechaIngreso: z.string().optional(),
});

const updateWorkerSchema = z.object({
  nombre: z.string().min(1).optional(),
  rut: z.string().min(1).optional(),
  tipoTrabajador: z.enum(['conductor', 'peoneta', 'administrativo']).optional(),
  activo: z.boolean().optional(),
  costoMensualEmpresa: z.number().optional(),
  fechaIngreso: z.string().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const tipoParam = c.req.query('tipoTrabajador');
  let conditions = [eq(schema.trabajadores.tenantId, payload.tenantId)];
  if (tipoParam) {
    conditions.push(eq(schema.trabajadores.tipoTrabajador, tipoParam));
  }

  const workers = await db.select().from(schema.trabajadores)
    .where(and(...conditions));

  return c.json({ success: true, data: workers });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createWorkerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(schema.trabajadores).values({
    id,
    tenantId: payload.tenantId,
    nombre: parsed.data.nombre,
    rut: parsed.data.rut,
    tipoTrabajador: parsed.data.tipoTrabajador,
    activo: parsed.data.activo ?? true,
    costoMensualEmpresa: parsed.data.costoMensualEmpresa ?? 0,
    fechaIngreso: parsed.data.fechaIngreso ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'trabajadores',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const worker = await db.select().from(schema.trabajadores)
    .where(eq(schema.trabajadores.id, id))
    .get();

  return c.json({ success: true, data: worker }, 201);
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateWorkerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.trabajadores)
    .where(and(eq(schema.trabajadores.id, id), eq(schema.trabajadores.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Worker not found' }, 404);
  }

  await db.update(schema.trabajadores)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.trabajadores.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'trabajadores',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: existing,
    valoresNuevos: parsed.data,
  });

  const worker = await db.select().from(schema.trabajadores)
    .where(eq(schema.trabajadores.id, id))
    .get();

  return c.json({ success: true, data: worker });
});

export default app;