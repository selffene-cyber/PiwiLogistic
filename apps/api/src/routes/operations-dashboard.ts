import { Hono } from 'hono';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

app.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const tenantId = payload.tenantId;

  const fechaDesde = c.req.query('fechaDesde');
  const fechaHasta = c.req.query('fechaHasta');
  const conductorId = c.req.query('conductorId');
  const cdId = c.req.query('cdId');
  const estadoFilter = c.req.query('estado');

  const routeConditions = [eq(schema.rutas.tenantId, tenantId)];
  if (fechaDesde) routeConditions.push(gte(schema.rutas.fecha, fechaDesde));
  if (fechaHasta) routeConditions.push(lte(schema.rutas.fecha, fechaHasta));
  if (conductorId) routeConditions.push(eq(schema.rutas.conductorId, conductorId));
  if (estadoFilter) routeConditions.push(eq(schema.rutas.estado, estadoFilter));

  const routes = await db.select().from(schema.rutas)
    .where(and(...routeConditions));

  if (routes.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const routeIds = routes.map((r) => r.id);

  const allGuides = await db.select().from(schema.guiasDespacho)
    .where(eq(schema.guiasDespacho.tenantId, tenantId));

  let guides = allGuides.filter((g) => routeIds.includes(g.rutaId));

  const conductorIds = [...new Set(routes.map((r) => r.conductorId))];
  const camionIds = [...new Set(routes.map((r) => r.camionId))];
  const guideIds = guides.map((g) => g.id);
  const cdIds = [...new Set(guides.map((g) => g.cdId).filter(Boolean) as string[])];

  let cdIdsFiltered = cdIds;
  if (cdId) {
    cdIdsFiltered = [cdId];
    guides = guides.filter((g) => g.cdId === cdId);
  }

  const [trabajadoresRows, camionesRows, centrosRows, detalleRows, entregaRows] = await Promise.all([
    conductorIds.length > 0
      ? db.select().from(schema.trabajadores).where(eq(schema.trabajadores.tenantId, tenantId))
      : Promise.resolve([]),
    camionIds.length > 0
      ? db.select().from(schema.camiones).where(eq(schema.camiones.tenantId, tenantId))
      : Promise.resolve([]),
    cdIdsFiltered.length > 0
      ? db.select().from(schema.centrosDistribucion).where(eq(schema.centrosDistribucion.tenantId, tenantId))
      : Promise.resolve([]),
    guideIds.length > 0
      ? db.select().from(schema.detalleGd).where(eq(schema.detalleGd.tenantId, tenantId))
      : Promise.resolve([]),
    guideIds.length > 0
      ? db.select().from(schema.entregas).where(eq(schema.entregas.tenantId, tenantId))
      : Promise.resolve([]),
  ]);

  const trabajadorMap = new Map(trabajadoresRows.map((t) => [t.id, t.nombre]));
  const camionMap = new Map(camionesRows.map((c) => [c.id, c.patente]));
  const centroMap = new Map(centrosRows.map((cd) => [cd.id, cd.nombre]));

  const routeMap = new Map(routes.map((r) => [r.id, r]));

  const detallesByGuia = new Map<string, typeof detalleRows>();
  for (const d of detalleRows) {
    if (guides.some((g) => g.id === d.guiaDespachoId)) {
      const list = detallesByGuia.get(d.guiaDespachoId) ?? [];
      list.push(d);
      detallesByGuia.set(d.guiaDespachoId, list);
    }
  }

  const entregasByGuia = new Map<string, typeof entregaRows>();
  for (const e of entregaRows) {
    if (e.guiaDespachoId && guides.some((g) => g.id === e.guiaDespachoId)) {
      const list = entregasByGuia.get(e.guiaDespachoId!) ?? [];
      list.push(e);
      entregasByGuia.set(e.guiaDespachoId!, list);
    }
  }

  const guidesByRoute = new Map<string, typeof guides>();
  for (const g of guides) {
    const list = guidesByRoute.get(g.rutaId) ?? [];
    list.push(g);
    guidesByRoute.set(g.rutaId, list);
  }

  const routeGuideIndex = new Map<string, number>();
  for (const [, routeGuides] of guidesByRoute) {
    const sorted = [...routeGuides].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((g, i) => {
      routeGuideIndex.set(g.id, i + 1);
    });
  }

  const results = guides.map((guide) => {
    const route = routeMap.get(guide.rutaId);
    const conductorNombre = route ? trabajadorMap.get(route.conductorId) ?? '' : '';
    const transporte = route ? camionMap.get(route.camionId) ?? '' : '';
    const cdNombre = guide.cdId ? centroMap.get(guide.cdId) ?? '' : '';

    const entregasForGuia = entregasByGuia.get(guide.id) ?? [];
    const totalEntregas = entregasForGuia.length;
    const uniqueClientIds = new Set(entregasForGuia.map((e) => e.clienteId));
    const clientsDelivered = uniqueClientIds.size;

    const detallesForGuia = detallesByGuia.get(guide.id) ?? [];
    const totalClientsInDetail = new Set(detallesForGuia.filter((d) => d.clienteInternoId).map((d) => d.clienteInternoId)).size;

    const ucEntregadas = entregasForGuia.reduce((sum, e) => sum + (e.ucEntregadas ?? 0), 0);
    const ucPlanificadas = detallesForGuia.reduce((sum, d) => sum + (d.ucTotales ?? 0), 0);

    const progreso = totalClientsInDetail > 0 ? `${clientsDelivered}/${totalClientsInDetail}` : `${clientsDelivered}/0`;

    const routeGuides = guidesByRoute.get(guide.rutaId) ?? [];
    const totalGuidesInRoute = routeGuides.length;
    const currentIndex = routeGuideIndex.get(guide.id) ?? 1;
    const vuelta = `${currentIndex}/${totalGuidesInRoute}`;

    const estadoMap: Record<string, string> = {
      cerrada: 'entregado',
      en_ruta: 'en_transito',
      planificada: 'pendiente',
      reabirta: 'en_transito',
    };
    const estado = route ? (estadoMap[route.estado] ?? route.estado) : '';

    const fechaRaw = route?.fecha ?? guide.fecha;
    const fechaEntrega = fechaRaw
      ? (() => {
          const parts = fechaRaw.split('-');
          if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
          return fechaRaw;
        })()
      : '';

    const clientes = detallesForGuia
      .filter((d) => d.clienteInternoId)
      .map((d) => ({
        clienteInternoId: d.clienteInternoId!,
        clienteInternoNombre: d.clienteInternoNombre ?? '',
        direccionInterno: d.direccionInterno ?? '',
        cantidad: d.cantidad,
        ucTotales: d.ucTotales,
      }));

    return {
      conductorId: route?.conductorId ?? '',
      conductorNombre,
      transporte,
      total: guide.totalMonto ?? 0,
      estado,
      progreso,
      ucEntregadas,
      ucPlanificadas,
      cajas: guide.totalCajas ?? 0,
      palets: guide.totalPalets ?? 0,
      vuelta,
      fechaEntrega,
      cd: cdNombre,
      rutaId: guide.rutaId,
      guiaId: guide.id,
      clientes,
    };
  });

  return c.json({ success: true, data: results });
});

export default app;