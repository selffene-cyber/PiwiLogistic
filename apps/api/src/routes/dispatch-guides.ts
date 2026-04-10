import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createGuideSchema = z.object({
  numeroGd: z.string().min(1),
  fecha: z.string().min(1),
  tipoGd: z.enum(['normal', 'mayorista', 'segunda_vuelta']).optional(),
  observaciones: z.string().optional(),
  detalle: z.array(z.object({
    tipoCajaId: z.string().min(1),
    cantidad: z.number().int().positive(),
  })).min(1),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const rutaId = c.req.query('rutaId');

  let conditions = [eq(schema.guiasDespacho.tenantId, payload.tenantId)];
  if (rutaId) conditions.push(eq(schema.guiasDespacho.rutaId, rutaId));

  const guides = await db.select().from(schema.guiasDespacho)
    .where(and(...conditions));

  return c.json({ success: true, data: guides });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createGuideSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);

  const ruta = await db.select().from(schema.rutas)
    .where(and(eq(schema.rutas.id, parsed.data.rutaId ?? ''), eq(schema.rutas.tenantId, payload.tenantId)))
    .get();

  if (!ruta) {
    const rutaIdFromBody = (body as { rutaId?: string }).rutaId;
    if (!rutaIdFromBody) {
      return c.json({ success: false, error: 'rutaId is required' }, 400);
    }
  }

  const rutaId = (body as { rutaId: string }).rutaId;
  const id = crypto.randomUUID();
  let totalCajas = 0;
  let totalMonto = 0;

  const detalleValues = [];
  for (const item of parsed.data.detalle) {
    const tipoCaja = await db.select().from(schema.tiposCaja)
      .where(and(eq(schema.tiposCaja.id, item.tipoCajaId), eq(schema.tiposCaja.tenantId, payload.tenantId)))
      .get();

    if (!tipoCaja) {
      return c.json({ success: false, error: `Box type ${item.tipoCajaId} not found` }, 400);
    }

    const subtotal = item.cantidad * tipoCaja.precioUnitario;
    totalCajas += item.cantidad;
    totalMonto += subtotal;

    detalleValues.push({
      id: crypto.randomUUID(),
      tenantId: payload.tenantId,
      guiaDespachoId: id,
      tipoCajaId: item.tipoCajaId,
      cantidad: item.cantidad,
      precioUnitarioSnapshot: tipoCaja.precioUnitario,
      subtotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await db.insert(schema.guiasDespacho).values({
    id,
    tenantId: payload.tenantId,
    rutaId,
    numeroGd: parsed.data.numeroGd,
    fecha: parsed.data.fecha,
    tipoGd: parsed.data.tipoGd ?? 'normal',
    observaciones: parsed.data.observaciones ?? null,
    estado: 'abierta',
    totalCajas,
    totalMonto,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.insert(schema.detalleGd).values(detalleValues);

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'guiasDespacho',
    entidadId: id,
    accion: 'create',
    valoresNuevos: { numeroGd: parsed.data.numeroGd, totalCajas, totalMonto },
  });

  const guide = await db.select().from(schema.guiasDespacho)
    .where(eq(schema.guiasDespacho.id, id))
    .get();

  const detalle = await db.select().from(schema.detalleGd)
    .where(eq(schema.detalleGd.guiaDespachoId, id));

  return c.json({ success: true, data: { ...guide, detalle } }, 201);
});

app.get('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const guide = await db.select().from(schema.guiasDespacho)
    .where(and(eq(schema.guiasDespacho.id, id), eq(schema.guiasDespacho.tenantId, payload.tenantId)))
    .get();

  if (!guide) {
    return c.json({ success: false, error: 'Dispatch guide not found' }, 404);
  }

  const detalle = await db.select().from(schema.detalleGd)
    .where(eq(schema.detalleGd.guiaDespachoId, id));

  return c.json({ success: true, data: { ...guide, detalle } });
});

app.post('/:id/close', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.guiasDespacho)
    .where(and(eq(schema.guiasDespacho.id, id), eq(schema.guiasDespacho.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Dispatch guide not found' }, 404);
  }

  if (existing.estado !== 'abierta') {
    return c.json({ success: false, error: 'Can only close guides in abierta state' }, 400);
  }

  const detalle = await db.select().from(schema.detalleGd)
    .where(eq(schema.detalleGd.guiaDespachoId, id));

  let totalCajas = 0;
  let totalMonto = 0;
  for (const d of detalle) {
    totalCajas += d.cantidad;
    totalMonto += d.subtotal;
  }

  const nowISO = new Date().toISOString();
  await db.update(schema.guiasDespacho)
    .set({ estado: 'cerrada', totalCajas, totalMonto, updatedAt: nowISO })
    .where(eq(schema.guiasDespacho.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'guiasDespacho',
    entidadId: id,
    accion: 'close',
    valoresAnteriores: { estado: existing.estado },
    valoresNuevos: { estado: 'cerrada', totalCajas, totalMonto },
  });

  const guide = await db.select().from(schema.guiasDespacho)
    .where(eq(schema.guiasDespacho.id, id))
    .get();

  return c.json({ success: true, data: guide });
});

export default app;