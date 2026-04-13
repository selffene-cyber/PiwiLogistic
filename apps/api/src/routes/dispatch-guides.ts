import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { logAudit } from '../lib/audit';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const createGuideSchema = z.object({
  numeroGd: z.string().min(1),
  fecha: z.string().min(1),
  tipoGd: z.enum(['normal', 'mayorista', 'segunda_vuelta']).optional(),
  observaciones: z.string().optional(),
  detalle: z.array(z.object({
    tipoCajaId: z.string().min(1),
    cantidad: z.number().int().positive(),
    clienteInternoId: z.string().nullable().optional(),
    clienteInternoNombre: z.string().nullable().optional(),
    direccionInterno: z.string().nullable().optional(),
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

  const rutas = await db.select().from(schema.rutas)
    .where(eq(schema.rutas.tenantId, payload.tenantId));
  const workers = await db.select().from(schema.trabajadores)
    .where(eq(schema.trabajadores.tenantId, payload.tenantId));

  const rutaMap = new Map(rutas.map(r => [r.id, r]));
  const workerMap = new Map(workers.map(w => [w.id, w]));

  const enriched = guides.map(g => {
    const ruta = rutaMap.get(g.rutaId);
    return {
      ...g,
      ruta: ruta ? {
        fecha: ruta.fecha,
        estado: ruta.estado,
        conductor: ruta.conductorId ? { nombre: workerMap.get(ruta.conductorId)?.nombre ?? 'Desconocido' } : null,
      } : null,
    };
  });

  let allDetalle: typeof schema.detalleGd.$inferSelect[] = [];
  if (guides.length > 0) {
    const guideIds = guides.map(g => g.id);
    allDetalle = await db.select().from(schema.detalleGd)
      .where(eq(schema.detalleGd.tenantId, payload.tenantId));
    allDetalle = allDetalle.filter(d => guideIds.includes(d.guiaDespachoId));
  }

  const detalleMap = new Map<string, typeof allDetalle>();
  for (const d of allDetalle) {
    if (!detalleMap.has(d.guiaDespachoId)) detalleMap.set(d.guiaDespachoId, []);
    detalleMap.get(d.guiaDespachoId)!.push(d);
  }

  const result = enriched.map(g => ({
    ...g,
    detalle: detalleMap.get(g.id) ?? [],
  }));

  return c.json({ success: true, data: result });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();

  if (!body.numeroGd || !body.fecha || !body.rutaId || !Array.isArray(body.detalle) || body.detalle.length === 0) {
    return c.json({ success: false, error: 'numeroGd, fecha, rutaId y detalle son requeridos' }, 400);
  }

  const db = getDb(c.env.DB);

  const rutaId = body.rutaId;
  const id = crypto.randomUUID();
  const nowISO = new Date().toISOString();
  let totalCajas = 0;
  let totalMonto = 0;
  const detalleValues: any[] = [];

  const tipoCajaIds = [...new Set(body.detalle.map((d: any) => d.tipoCajaId))];
  const tiposCajaRows = await db.select().from(schema.tiposCaja)
    .where(eq(schema.tiposCaja.tenantId, payload.tenantId));
  const tipoCajaMap = new Map(tiposCajaRows.filter((t: any) => tipoCajaIds.includes(t.id)).map((t: any) => [t.id, t]));

  for (const item of body.detalle) {
    if (!item.tipoCajaId || !item.cantidad || item.cantidad < 1) {
      return c.json({ success: false, error: 'Cada linea de detalle requiere tipoCajaId y cantidad > 0' }, 400);
    }
    const tipoCaja = tipoCajaMap.get(item.tipoCajaId);
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
      clienteInternoId: item.clienteInternoId ?? null,
      clienteInternoNombre: item.clienteInternoNombre ?? null,
      direccionInterno: item.direccionInterno ?? null,
      cantidad: item.cantidad,
      precioUnitarioSnapshot: tipoCaja.precioUnitario,
      subtotal,
      createdAt: nowISO,
      updatedAt: nowISO,
    });
  }

  await db.insert(schema.guiasDespacho).values({
    id,
    tenantId: payload.tenantId,
    rutaId,
    numeroGd: body.numeroGd,
    fecha: body.fecha,
    tipoGd: body.tipoGd || 'normal',
    observaciones: body.observaciones ?? null,
    estado: 'abierta',
    totalCajas,
    totalMonto,
    createdAt: nowISO,
    updatedAt: nowISO,
  });

  const batchSize = 5;
  for (let i = 0; i < detalleValues.length; i += batchSize) {
    await db.insert(schema.detalleGd).values(detalleValues.slice(i, i + batchSize));
  }

  c.executionCtx?.waitUntil?.(
    logAudit(c.env.DB, {
      tenantId: payload.tenantId,
      userId: payload.sub,
      entidad: 'guiasDespacho',
      entidadId: id,
      accion: 'create',
      valoresNuevos: { numeroGd: body.numeroGd, totalCajas, totalMonto },
    }).catch(() => {})
  );

  return c.json({ success: true, data: { id, numeroGd: body.numeroGd, estado: 'abierta', totalCajas, totalMonto } }, 201);
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

  const ruta = await db.select().from(schema.rutas)
    .where(eq(schema.rutas.id, guide.rutaId))
    .get();

  let rutaInfo = null;
  if (ruta) {
    const conductor = ruta.conductorId ? await db.select().from(schema.trabajadores).where(eq(schema.trabajadores.id, ruta.conductorId)).get() : null;
    rutaInfo = {
      fecha: ruta.fecha,
      estado: ruta.estado,
      conductor: conductor ? { nombre: conductor.nombre } : null,
    };
  }

  return c.json({ success: true, data: { ...guide, detalle, ruta: rutaInfo } });
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(schema.guiasDespacho)
    .where(and(eq(schema.guiasDespacho.id, id), eq(schema.guiasDespacho.tenantId, payload.tenantId)))
    .get();
  if (!existing) return c.json({ success: false, error: 'Dispatch guide not found' }, 404);
  if (existing.estado !== 'abierta') return c.json({ success: false, error: 'Solo se pueden editar guias abiertas' }, 400);

  const updateSchema = z.object({
    numeroGd: z.string().min(1).optional(),
    fecha: z.string().min(1).optional(),
    tipoGd: z.enum(['normal', 'mayorista', 'segunda_vuelta']).optional(),
    observaciones: z.string().nullable().optional(),
    detalle: z.array(z.object({
      tipoCajaId: z.string().min(1),
      cantidad: z.number().int().positive(),
      clienteInternoId: z.string().nullable().optional(),
      clienteInternoNombre: z.string().nullable().optional(),
      direccionInterno: z.string().nullable().optional(),
    })).min(1).optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);

  const nowISO = new Date().toISOString();

  if (parsed.data.detalle) {
    await db.delete(schema.detalleGd).where(eq(schema.detalleGd.guiaDespachoId, id));

    const tipoCajaIds = [...new Set(parsed.data.detalle.map((d) => d.tipoCajaId))];
    const tiposCajaRows = await db.select().from(schema.tiposCaja)
      .where(eq(schema.tiposCaja.tenantId, payload.tenantId));
    const tipoCajaMap = new Map(tiposCajaRows.filter((t) => tipoCajaIds.includes(t.id)).map((t) => [t.id, t]));

    let totalCajas = 0;
    let totalMonto = 0;
    const detalleValues: any[] = [];
    for (const item of parsed.data.detalle) {
      const tipoCaja = tipoCajaMap.get(item.tipoCajaId);
      if (!tipoCaja) return c.json({ success: false, error: `Box type ${item.tipoCajaId} not found` }, 400);
      const subtotal = item.cantidad * tipoCaja.precioUnitario;
      totalCajas += item.cantidad;
      totalMonto += subtotal;
      detalleValues.push({
        id: crypto.randomUUID(),
        tenantId: payload.tenantId,
        guiaDespachoId: id,
        tipoCajaId: item.tipoCajaId,
        clienteInternoId: item.clienteInternoId ?? null,
        clienteInternoNombre: item.clienteInternoNombre ?? null,
        direccionInterno: item.direccionInterno ?? null,
        cantidad: item.cantidad,
        precioUnitarioSnapshot: tipoCaja.precioUnitario,
        subtotal,
        createdAt: nowISO,
        updatedAt: nowISO,
      });
    }

    await db.insert(schema.detalleGd).values(detalleValues);
    await db.update(schema.guiasDespacho)
      .set({ numeroGd: parsed.data.numeroGd ?? existing.numeroGd, fecha: parsed.data.fecha ?? existing.fecha, tipoGd: parsed.data.tipoGd ?? existing.tipoGd, observaciones: parsed.data.observaciones !== undefined ? parsed.data.observaciones : existing.observaciones, totalCajas, totalMonto, updatedAt: nowISO })
      .where(eq(schema.guiasDespacho.id, id));

    return c.json({ success: true, data: { ...existing, numeroGd: parsed.data.numeroGd ?? existing.numeroGd, fecha: parsed.data.fecha ?? existing.fecha, tipoGd: parsed.data.tipoGd ?? existing.tipoGd, totalCajas, totalMonto, updatedAt: nowISO, detalle: detalleValues.map(d => ({ id: d.id, tipoCajaId: d.tipoCajaId, clienteInternoId: d.clienteInternoId, clienteInternoNombre: d.clienteInternoNombre, direccionInterno: d.direccionInterno, cantidad: d.cantidad, precioUnitarioSnapshot: d.precioUnitarioSnapshot, subtotal: d.subtotal })) } });
  } else {
    await db.update(schema.guiasDespacho)
      .set({ numeroGd: parsed.data.numeroGd ?? existing.numeroGd, fecha: parsed.data.fecha ?? existing.fecha, tipoGd: parsed.data.tipoGd ?? existing.tipoGd, observaciones: parsed.data.observaciones !== undefined ? parsed.data.observaciones : existing.observaciones, updatedAt: nowISO })
      .where(eq(schema.guiasDespacho.id, id));
    return c.json({ success: true, data: { ...existing, numeroGd: parsed.data.numeroGd ?? existing.numeroGd, fecha: parsed.data.fecha ?? existing.fecha, tipoGd: parsed.data.tipoGd ?? existing.tipoGd, updatedAt: nowISO } });
  }
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

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const existing = await db.select().from(schema.guiasDespacho)
    .where(and(eq(schema.guiasDespacho.id, id), eq(schema.guiasDespacho.tenantId, payload.tenantId)))
    .get();
  if (!existing) return c.json({ success: false, error: 'Dispatch guide not found' }, 404);
  await db.delete(schema.detalleGd).where(eq(schema.detalleGd.guiaDespachoId, id));
  await db.delete(schema.guiasDespacho).where(eq(schema.guiasDespacho.id, id));
  try { await logAudit(c.env.DB, { tenantId: payload.tenantId, userId: payload.sub, entidad: 'guiasDespacho', entidadId: id, accion: 'delete', valoresAnteriores: existing }); } catch {}
  return c.json({ success: true, data: { id } });
});

export default app;