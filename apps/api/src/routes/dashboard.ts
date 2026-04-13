import { Hono } from 'hono';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

async function calculateMetrics(db: ReturnType<typeof import('../lib/db')['getDb']>, tenantId: string, startDate: string, endDate: string) {
  const routes = await db.select().from(schema.rutas)
    .where(and(
      eq(schema.rutas.tenantId, tenantId),
      gte(schema.rutas.fecha, startDate),
      lte(schema.rutas.fecha, endDate),
      inArray(schema.rutas.estado, ['cerrada', 'reabierta']),
    ));

  if (routes.length === 0) {
    return {
      totalRutas: 0,
      totalCajasDespachadas: 0,
      totalCajasEntregadas: 0,
      totalCajasDevueltas: 0,
      totalIngresos: 0,
      totalCostos: 0,
      totalBonos: 0,
      utilidad: 0,
      eficiencia: 0,
      cajasPorDia: 0,
      cajasPorHora: 0,
      rentabilidadPorCaja: 0,
    };
  }

  const routeIds = routes.map((r) => r.id);

  let totalCajasDespachadas = 0;
  for (const routeId of routeIds) {
    const guides = await db.select().from(schema.guiasDespacho)
      .where(eq(schema.guiasDespacho.rutaId, routeId));
    for (const g of guides) {
      totalCajasDespachadas += g.totalCajas ?? 0;
    }
  }

  let totalCajasEntregadas = 0;
  let totalCajasDevueltas = 0;
  let totalIngresos = 0;
  for (const routeId of routeIds) {
    const deliveries = await db.select().from(schema.entregas)
      .where(eq(schema.entregas.rutaId, routeId));
    totalCajasEntregadas += deliveries.reduce((sum, e) => sum + e.cajasEntregadas, 0);
    totalCajasDevueltas += deliveries.reduce((sum, e) => sum + e.cajasDevueltas, 0);
    totalIngresos += deliveries.reduce((sum, e) => sum + (e.montoCobrado ?? 0), 0);
  }

  let totalCostos = 0;
  for (const routeId of routeIds) {
    const costo = await db.select().from(schema.costosOperacion)
      .where(eq(schema.costosOperacion.rutaId, routeId))
      .get();
    totalCostos += costo?.totalCostos ?? 0;
  }

  let totalBonos = 0;
  for (const routeId of routeIds) {
    const bono = await db.select().from(schema.bonos)
      .where(and(eq(schema.bonos.rutaId, routeId), eq(schema.bonos.tenantId, tenantId)))
      .get();
    totalBonos += bono?.bonoTotal ?? 0;
  }

  const utilidad = totalIngresos - totalCostos - totalBonos;
  const eficiencia = totalCajasDespachadas > 0 ? (totalCajasEntregadas / totalCajasDespachadas) * 100 : 0;
  const cajasPorDia = totalCajasEntregadas / routes.length;

  const totalHoras = routes.reduce((sum, r) => {
    if (r.horaSalida && r.horaFin) {
      const inicio = new Date(r.horaSalida).getTime();
      const fin = new Date(r.horaFin).getTime();
      return sum + (fin - inicio) / (1000 * 60 * 60);
    }
    return sum;
  }, 0);

  const cajasPorHora = totalHoras > 0 ? totalCajasEntregadas / totalHoras : 0;
  const rentabilidadPorCaja = totalCajasEntregadas > 0 ? utilidad / totalCajasEntregadas : 0;

  return {
    totalRutas: routes.length,
    totalCajasDespachadas,
    totalCajasEntregadas,
    totalCajasDevueltas,
    totalIngresos,
    totalCostos,
    totalBonos,
    utilidad,
    eficiencia: Math.round(eficiencia * 100) / 100,
    cajasPorDia: Math.round(cajasPorDia * 100) / 100,
    cajasPorHora: Math.round(cajasPorHora * 100) / 100,
    rentabilidadPorCaja: Math.round(rentabilidadPorCaja * 100) / 100,
  };
}

app.get('/today', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const today = new Date().toISOString().split('T')[0];
  const metrics = await calculateMetrics(db, payload.tenantId, today, today);
  return c.json({ success: true, data: metrics });
});

app.get('/week', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startDate = startOfWeek.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];
  const metrics = await calculateMetrics(db, payload.tenantId, startDate, endDate);
  return c.json({ success: true, data: metrics });
});

app.get('/month', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = now.toISOString().split('T')[0];
  const metrics = await calculateMetrics(db, payload.tenantId, startDate, endDate);
  return c.json({ success: true, data: metrics });
});

export default app;