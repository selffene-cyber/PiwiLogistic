export type RouteEstado = 'planificada' | 'en_ruta' | 'cerrada' | 'reabierta' | 'anulada';
export type GuiaEstado = 'abierta' | 'cerrada' | 'anulada';
export type EntregaEstado = 'entregado' | 'parcial' | 'rechazado';
export type TipoTrabajador = 'conductor' | 'peoneta' | 'administrativo';
export type TipoCliente = 'minorista' | 'mayorista';
export type TipoGD = 'normal' | 'mayorista' | 'segunda_vuelta';
export type MetodoReparto = 'igualitario' | 'ponderado_por_rol';
export type AuditAccion = 'create' | 'update' | 'delete' | 'close' | 'reopen';
export type Moneda = 'CLP' | 'USD';

export const ROLE_CODES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERADOR: 'OPERADOR',
  CONDUCTOR: 'CONDUCTOR',
  VISUALIZADOR: 'VISUALIZADOR',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ROUTE_TRANSITIONS: Record<RouteEstado, RouteEstado[]> = {
  planificada: ['en_ruta', 'anulada'],
  en_ruta: ['cerrada'],
  cerrada: ['reabierta'],
  reabierta: ['cerrada'],
  anulada: [],
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardMetrics {
  cajasHoy: number;
  ingresos: number;
  costos: number;
  bonos: number;
  utilidad: number;
  eficiencia: number;
  cajasPorDia: number;
  cajasPorHora: number;
  rentabilidadPorCaja: number;
}