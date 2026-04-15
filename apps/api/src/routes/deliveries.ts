import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createDeliverySchema = z.object({
  rutaId: z.string().min(1),
  clienteId: z.string().min(1),
  clienteNombreSnapshot: z.string().min(1),
  clienteDireccionSnapshot: z.string().optional(),
  guiaDespachoId: z.string().optional(),
  tipoCajaId: z.string().optional(),
  cajasEntregadas: z.number().int().min(0),
  cajasSolicitadas: z.number().int().min(0).default(0),
  cajasDevueltas: z.number().int().min(0).default(0),
  ucEntregadas: z.number().min(0).default(0),
  montoCobrado: z.number().min(0).default(0),
  motivoRechazo: z.enum(['pedido_errado', 'cliente_cerrado', 'cliente_no_encontrado', 'saldo_vencido', 'no_recibe', 'otro']).optional(),
  observaciones: z.string().optional(),
  estado: z.enum(['entregado', 'parcial', 'rechazado']).default('entregado'),
  horaEntrega: z.string().optional(),
});

const updateDeliverySchema = z.object({
  clienteNombreSnapshot: z.string().min(1).optional(),
  clienteDireccionSnapshot: z.string().optional(),
  guiaDespachoId: z.string().optional(),
  tipoCajaId: z.string().optional(),
  cajasEntregadas: z.number().int().min(0).optional(),
  cajasSolicitadas: z.number().int().min(0).optional(),
  cajasDevueltas: z.number().int().min(0).optional(),
  ucEntregadas: z.number().min(0).optional(),
  montoCobrado: z.number().min(0).optional(),
  motivoRechazo: z.enum(['pedido_errado', 'cliente_cerrado', 'cliente_no_encontrado', 'saldo_vencido', 'no_recibe', 'otro']).optional(),
  observaciones: z.string().optional(),
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

  const { estado, cajasSolicitadas, cajasEntregadas, cajasDevueltas, ...rest } = parsed.data;
  let resolvedCajasDevueltas = cajasDevueltas;
  if ((estado === 'rechazado' || estado === 'parcial') && cajasDevueltas === undefined) {
    resolvedCajasDevueltas = cajasSolicitadas - cajasEntregadas;
  }

  await db.insert(schema.entregas).values({
    id,
    tenantId: payload.tenantId,
    rutaId: parsed.data.rutaId,
    clienteId: parsed.data.clienteId,
    clienteNombreSnapshot: parsed.data.clienteNombreSnapshot,
    clienteDireccionSnapshot: parsed.data.clienteDireccionSnapshot ?? null,
    guiaDespachoId: parsed.data.guiaDespachoId ?? null,
    tipoCajaId: parsed.data.tipoCajaId ?? null,
    cajasEntregadas,
    cajasSolicitadas,
    cajasDevueltas: resolvedCajasDevueltas,
    ucEntregadas: parsed.data.ucEntregadas,
    montoCobrado: parsed.data.montoCobrado,
    motivoRechazo: parsed.data.motivoRechazo ?? null,
    observaciones: parsed.data.observaciones ?? null,
    estado,
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

  const updateData = { ...parsed.data, updatedAt: new Date().toISOString() };

  if (parsed.data.estado === 'rechazado' || parsed.data.estado === 'parcial') {
    if (parsed.data.cajasDevueltas === undefined) {
      const solic = parsed.data.cajasSolicitadas ?? existing.cajasSolicitadas;
      const entreg = parsed.data.cajasEntregadas ?? existing.cajasEntregadas;
      updateData.cajasDevueltas = solic - entreg;
    }
  }

  await db.update(schema.entregas)
    .set(updateData)
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

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const existing = await db.select().from(schema.entregas)
    .where(and(eq(schema.entregas.id, id), eq(schema.entregas.tenantId, payload.tenantId)))
    .get();
  if (!existing) return c.json({ success: false, error: 'Delivery not found' }, 404);
  await db.delete(schema.entregas).where(eq(schema.entregas.id, id));
  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'entregas', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}
  return c.json({ success: true, data: { id } });
});

export default app;