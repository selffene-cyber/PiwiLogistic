import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { requireRole } from '../middleware/auth';
import { logAudit } from '../lib/audit';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const ROUTE_TRANSITIONS: Record<string, string[]> = {
  planificada: ['en_ruta', 'anulada'],
  en_ruta: ['cerrada'],
  cerrada: ['reabierta'],
  reabierta: ['cerrada'],
  anulada: [],
};

const createRouteSchema = z.object({
  fecha: z.string().min(1),
  camionId: z.string().min(1),
  conductorId: z.string().min(1),
  peoneta1Id: z.string().nullable().optional(),
  peoneta2Id: z.string().nullable().optional(),
});

const updateRouteSchema = z.object({
  fecha: z.string().min(1).optional(),
  camionId: z.string().min(1).optional(),
  conductorId: z.string().min(1).optional(),
  peoneta1Id: z.string().nullable().optional(),
  peoneta2Id: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const fecha = c.req.query('fecha');
  const estado = c.req.query('estado');

  let conditions = [eq(schema.rutas.tenantId, payload.tenantId)];
  if (fecha) conditions.push(eq(schema.rutas.fecha, fecha));
  if (estado) conditions.push(eq(schema.rutas.estado, estado));

  const routes = await db.select().from(schema.rutas)
    .where(and(...conditions));

  const camiones = await db.select({ id: schema.camiones.id, patente: schema.camiones.patente, marca: schema.camiones.marca, modelo: schema.camiones.modelo }).from(schema.camiones)
    .where(eq(schema.camiones.tenantId, payload.tenantId));
  const workers = await db.select().from(schema.trabajadores)
    .where(eq(schema.trabajadores.tenantId, payload.tenantId));

  const camionMap = new Map(camiones.map(c => [c.id, c]));
  const workerMap = new Map(workers.map(w => [w.id, w]));

  const enrichedRoutes = routes.map(r => ({
    ...r,
    camion: camionMap.get(r.camionId) ?? null,
    conductor: workerMap.get(r.conductorId) ? { nombre: workerMap.get(r.conductorId)!.nombre } : null,
    peoneta1: r.peoneta1Id && workerMap.get(r.peoneta1Id) ? { nombre: workerMap.get(r.peoneta1Id)!.nombre } : null,
    peoneta2: r.peoneta2Id && workerMap.get(r.peoneta2Id) ? { nombre: workerMap.get(r.peoneta2Id)!.nombre } : null,
  }));

  return c.json({ success: true, data: enrichedRoutes });
});

app.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = createRouteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(schema.rutas).values({
    id,
    tenantId: payload.tenantId,
    fecha: parsed.data.fecha,
    camionId: parsed.data.camionId,
    conductorId: parsed.data.conductorId,
    peoneta1Id: parsed.data.peoneta1Id ?? null,
    peoneta2Id: parsed.data.peoneta2Id ?? null,
    estado: 'planificada',
    horaSalida: null,
    horaFin: null,
    cerradaAt: null,
    cerradaBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'rutas',
    entidadId: id,
    accion: 'create',
    valoresNuevos: parsed.data,
  });

  const route = await db.select().from(schema.rutas)
    .where(eq(schema.rutas.id, id))
    .get();

  return c.json({ success: true, data: route }, 201);
});

app.get('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const route = await db.select().from(schema.rutas)
    .where(and(eq(schema.rutas.id, id), eq(schema.rutas.tenantId, payload.tenantId)))
    .get();

  if (!route) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  const [guides, deliveries, costos, camion, conductor, peoneta1, peoneta2] = await Promise.all([
    db.select().from(schema.guiasDespacho).where(eq(schema.guiasDespacho.rutaId, id)),
    db.select().from(schema.entregas).where(eq(schema.entregas.rutaId, id)),
    db.select().from(schema.costosOperacion).where(eq(schema.costosOperacion.rutaId, id)),
    route.camionId ? db.select().from(schema.camiones).where(eq(schema.camiones.id, route.camionId)).get() : Promise.resolve(null),
    route.conductorId ? db.select().from(schema.trabajadores).where(eq(schema.trabajadores.id, route.conductorId)).get() : Promise.resolve(null),
    route.peoneta1Id ? db.select().from(schema.trabajadores).where(eq(schema.trabajadores.id, route.peoneta1Id)).get() : Promise.resolve(null),
    route.peoneta2Id ? db.select().from(schema.trabajadores).where(eq(schema.trabajadores.id, route.peoneta2Id)).get() : Promise.resolve(null),
  ]);

  let detalleGdRows: typeof schema.detalleGd.$inferSelect[] = [];
  if (guides.length > 0) {
    const guideIds = guides.map((g) => g.id);
    detalleGdRows = await db.select().from(schema.detalleGd)
      .where(eq(schema.detalleGd.tenantId, payload.tenantId));
    detalleGdRows = detalleGdRows.filter((d) => guideIds.includes(d.guiaDespachoId));
  }

  const bono = await db.select().from(schema.bonos)
    .where(and(eq(schema.bonos.rutaId, id), eq(schema.bonos.tenantId, payload.tenantId)))
    .get();

  return c.json({
    success: true,
    data: {
      ...route,
      camion: camion ? { patente: camion.patente, marca: camion.marca } : null,
      conductor: conductor ? { nombre: conductor.nombre } : null,
      peoneta1: peoneta1 ? { nombre: peoneta1.nombre } : null,
      peoneta2: peoneta2 ? { nombre: peoneta2.nombre } : null,
      guias: guides.map((g) => ({
        ...g,
        detalle: detalleGdRows.filter((d) => d.guiaDespachoId === g.id),
      })),
      entregas: deliveries,
      costos: costos[0] ?? null,
      bono,
    },
  });
});

app.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const body = await c.req.json();
  const parsed = updateRouteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.rutas)
    .where(and(eq(schema.rutas.id, id), eq(schema.rutas.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  if (existing.estado !== 'planificada') {
    return c.json({ success: false, error: 'Can only edit routes in planificada state' }, 400);
  }

  await db.update(schema.rutas)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.rutas.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'rutas',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: existing,
    valoresNuevos: parsed.data,
  });

  const route = await db.select().from(schema.rutas)
    .where(eq(schema.rutas.id, id))
    .get();

  return c.json({ success: true, data: route });
});

app.post('/:id/start', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.rutas)
    .where(and(eq(schema.rutas.id, id), eq(schema.rutas.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  if (!ROUTE_TRANSITIONS[existing.estado]?.includes('en_ruta')) {
    return c.json({ success: false, error: `Cannot transition from ${existing.estado} to en_ruta` }, 400);
  }

  const now = new Date().toISOString();
  await db.update(schema.rutas)
    .set({ estado: 'en_ruta', horaSalida: now, updatedAt: now })
    .where(eq(schema.rutas.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'rutas',
    entidadId: id,
    accion: 'update',
    valoresAnteriores: { estado: existing.estado },
    valoresNuevos: { estado: 'en_ruta', horaSalida: now },
  });

  const route = await db.select().from(schema.rutas)
    .where(eq(schema.rutas.id, id))
    .get();

  return c.json({ success: true, data: route });
});

app.post('/:id/close', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.rutas)
    .where(and(eq(schema.rutas.id, id), eq(schema.rutas.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  if (!ROUTE_TRANSITIONS[existing.estado]?.includes('cerrada')) {
    return c.json({ success: false, error: `Cannot transition from ${existing.estado} to cerrada` }, 400);
  }

  const nowISO = new Date().toISOString();

  await db.update(schema.rutas)
    .set({ estado: 'cerrada', horaFin: nowISO, cerradaAt: nowISO, cerradaBy: payload.sub, updatedAt: nowISO })
    .where(eq(schema.rutas.id, id));

  const config = await db.select().from(schema.tenantConfig)
    .where(eq(schema.tenantConfig.tenantId, payload.tenantId))
    .get();

  const diasHabiles = config?.diasHabilesMes ?? 26;
  const valorUc = config?.valorUc ?? 200;

  const arriendoDiario = (config?.costoArriendoCamionMensual ?? 0) / diasHabiles;
  const mantencionDiaria = (config?.costoMantencionMensual ?? 0) / diasHabiles;
  const adminDiaria = (config?.costoAdministracionMensual ?? 0) / diasHabiles;

  const conductor = await db.select().from(schema.trabajadores)
    .where(eq(schema.trabajadores.id, existing.conductorId))
    .get();
  const sueldoConductorDiario = (conductor?.costoMensualEmpresa ?? 0) / diasHabiles;

  let peonetasDiario = 0;
  if (existing.peoneta1Id) {
    const p1 = await db.select().from(schema.trabajadores)
      .where(eq(schema.trabajadores.id, existing.peoneta1Id))
      .get();
    peonetasDiario += (p1?.costoMensualEmpresa ?? 0) / diasHabiles;
  }
  if (existing.peoneta2Id) {
    const p2 = await db.select().from(schema.trabajadores)
      .where(eq(schema.trabajadores.id, existing.peoneta2Id))
      .get();
    peonetasDiario += (p2?.costoMensualEmpresa ?? 0) / diasHabiles;
  }

  const totalCostos = arriendoDiario + sueldoConductorDiario + peonetasDiario + mantencionDiaria + adminDiaria;

  await db.insert(schema.costosOperacion).values({
    id: crypto.randomUUID(),
    tenantId: payload.tenantId,
    rutaId: id,
    arriendoCamion: arriendoDiario,
    sueldoConductor: sueldoConductorDiario,
    peonetas: peonetasDiario,
    mantencion: mantencionDiaria,
    administracion: adminDiaria,
    totalCostos,
    createdAt: nowISO,
    updatedAt: nowISO,
  });

  const guides = await db.select().from(schema.guiasDespacho)
    .where(eq(schema.guiasDespacho.rutaId, id));

  let totalCajasDespachadas = 0;
  let totalUcPlanificadas = 0;
  let totalIngresos = 0;
  for (const guide of guides) {
    totalCajasDespachadas += guide.totalCajas ?? 0;
    totalUcPlanificadas += guide.totalUc ?? 0;
    totalIngresos += (guide.totalUc ?? 0) * valorUc;
  }

  const entregas = await db.select().from(schema.entregas)
    .where(eq(schema.entregas.rutaId, id));
  const totalCajasEntregadas = entregas.reduce((sum, e) => sum + e.cajasEntregadas, 0);
  const totalUcEntregadas = entregas.reduce((sum, e) => sum + (e.ucEntregadas ?? 0), 0);

  const tiers = await db.select().from(schema.bonusTiers)
    .where(and(eq(schema.bonusTiers.tenantId, payload.tenantId), eq(schema.bonusTiers.activo, true)));

  let bonoTotal = 0;
  let cajasExcedentes = 0;
  if (tiers.length > 0 && totalCajasEntregadas > 0) {
    for (const tier of tiers) {
      if (totalCajasEntregadas > tier.desdeCajas) {
        const max = tier.hastaCajas ?? totalCajasEntregadas;
        const cajasEnTramo = Math.min(totalCajasEntregadas, max) - tier.desdeCajas;
        bonoTotal += cajasEnTramo * tier.montoPorCaja;
      }
    }
    const baseCajas = tiers[0]?.desdeCajas ?? 0;
    cajasExcedentes = Math.max(0, totalCajasEntregadas - baseCajas);
  }

  const bonusConfigRow = await db.select().from(schema.bonusConfig)
    .where(eq(schema.bonusConfig.tenantId, payload.tenantId))
    .get();

  let personas = 0;
  if (bonusConfigRow) {
    if (bonusConfigRow.incluirConductor && existing.conductorId) personas++;
    if (bonusConfigRow.incluirPeoneta1 && existing.peoneta1Id) personas++;
    if (bonusConfigRow.incluirPeoneta2 && existing.peoneta2Id) personas++;
  } else {
    personas = [existing.conductorId, existing.peoneta1Id, existing.peoneta2Id].filter(Boolean).length;
  }

  const bonoPorPersona = personas > 0 ? bonoTotal / personas : 0;

  await db.insert(schema.bonos).values({
    id: crypto.randomUUID(),
    tenantId: payload.tenantId,
    rutaId: id,
    cajasExcedentes,
    bonoTotal,
    bonoPorPersona,
    createdAt: nowISO,
    updatedAt: nowISO,
  });

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'rutas',
    entidadId: id,
    accion: 'close',
    valoresAnteriores: { estado: existing.estado },
    valoresNuevos: { estado: 'cerrada', totalCostos, bonoTotal, bonoPorPersona },
  });

  const route = await db.select().from(schema.rutas)
    .where(eq(schema.rutas.id, id))
    .get();

  return c.json({ success: true, data: route });
});

app.post('/:id/reopen', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.rutas)
    .where(and(eq(schema.rutas.id, id), eq(schema.rutas.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  if (!ROUTE_TRANSITIONS[existing.estado]?.includes('reabierta')) {
    return c.json({ success: false, error: `Cannot transition from ${existing.estado} to reabierta` }, 400);
  }

  const nowISO = new Date().toISOString();
  await db.update(schema.rutas)
    .set({ estado: 'reabierta', updatedAt: nowISO })
    .where(eq(schema.rutas.id, id));

  await logAudit(c.env.DB, {
    tenantId: payload.tenantId,
    userId: payload.sub,
    entidad: 'rutas',
    entidadId: id,
    accion: 'reopen',
    valoresAnteriores: { estado: existing.estado },
    valoresNuevos: { estado: 'reabierta' },
  });

  const route = await db.select().from(schema.rutas)
    .where(eq(schema.rutas.id, id))
    .get();

  return c.json({ success: true, data: route });
});

app.delete('/:id', requireRole('ADMIN'), async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(schema.rutas)
    .where(and(eq(schema.rutas.id, id), eq(schema.rutas.tenantId, payload.tenantId)))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'Route not found' }, 404);
  }

  const [guides, deliveries, costos, bonosRows] = await Promise.all([
    db.select().from(schema.guiasDespacho).where(eq(schema.guiasDespacho.rutaId, id)),
    db.select().from(schema.entregas).where(eq(schema.entregas.rutaId, id)),
    db.select().from(schema.costosOperacion).where(eq(schema.costosOperacion.rutaId, id)),
    db.select().from(schema.bonos).where(eq(schema.bonos.rutaId, id)),
  ]);

  const guideIds = guides.map((g) => g.id);
  for (const gid of guideIds) {
    await db.delete(schema.detalleGd).where(eq(schema.detalleGd.guiaDespachoId, gid));
  }
  await db.delete(schema.guiasDespacho).where(eq(schema.guiasDespacho.rutaId, id));
  await db.delete(schema.entregas).where(eq(schema.entregas.rutaId, id));
  await db.delete(schema.costosOperacion).where(eq(schema.costosOperacion.rutaId, id));
  await db.delete(schema.bonos).where(eq(schema.bonos.rutaId, id));
  await db.delete(schema.rutas).where(eq(schema.rutas.id, id));

  try {
    await logAudit(c.env.DB, {
      tenantId: payload.tenantId,
      userId: payload.sub,
      entidad: 'rutas',
      entidadId: id,
      accion: 'delete',
      valoresAnteriores: { fecha: existing.fecha, estado: existing.estado, guias: guideIds.length, entregas: deliveries.length },
    });
  } catch {}

  return c.json({ success: true, data: { id } });
});

export default app;