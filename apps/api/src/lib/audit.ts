import { getDb } from './db';
import * as schema from '../../../../packages/db/src';

export async function logAudit(d1: D1Database, params: {
  tenantId: string;
  userId?: string;
  entidad: string;
  entidadId: string;
  accion: string;
  valoresAnteriores?: unknown;
  valoresNuevos?: unknown;
}) {
  const db = getDb(d1);
  await db.insert(schema.auditLogs).values({
    id: crypto.randomUUID(),
    tenantId: params.tenantId,
    userId: params.userId,
    entidad: params.entidad,
    entidadId: params.entidadId,
    accion: params.accion,
    valoresAnteriores: params.valoresAnteriores ? JSON.stringify(params.valoresAnteriores) : null,
    valoresNuevos: params.valoresNuevos ? JSON.stringify(params.valoresNuevos) : null,
    createdAt: new Date().toISOString(),
  });
}