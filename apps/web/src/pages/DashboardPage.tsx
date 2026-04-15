import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CubeIcon,
  CurrencyDollarIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface DashboardMetrics {
  totalRutas: number;
  totalCajasDespachadas: number;
  totalCajasEntregadas: number;
  totalCajasDevueltas: number;
  totalUcPlanificadas: number;
  totalUcEntregadas: number;
  totalIngresos: number;
  totalCostos: number;
  totalBonos: number;
  utilidad: number;
  eficiencia: number;
  cajasPorDia: number;
  cajasPorHora: number;
  rentabilidadPorCaja: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      const res = await api.get(`/api/dashboard/${period}`);
      const json = await res.json();
      return json.data as DashboardMetrics;
    },
  });

  const kpis = [
    { label: 'Cajas Entregadas', value: metrics?.totalCajasEntregadas ?? 0, icon: CubeIcon, color: 'text-primary-500', format: (v: number) => v.toLocaleString() },
    { label: 'UC Entregadas', value: metrics?.totalUcEntregadas ?? 0, icon: ChartBarIcon, color: 'text-blue-500', format: (v: number) => v.toLocaleString() },
    { label: 'Ingresos', value: metrics?.totalIngresos ?? 0, icon: CurrencyDollarIcon, color: 'text-green-500', format: formatCurrency },
    { label: 'Utilidad', value: metrics?.utilidad ?? 0, icon: ArrowTrendingDownIcon, color: 'text-primary-600', format: formatCurrency },
  ];

  const performanceMetrics = metrics ? [
    { label: 'Eficiencia', value: `${metrics.eficiencia}%` },
    { label: 'Cajas/Dia', value: metrics.cajasPorDia.toLocaleString() },
    { label: 'Cajas/Hora', value: metrics.cajasPorHora.toLocaleString() },
    { label: 'Rent./Caja', value: formatCurrency(metrics.rentabilidadPorCaja) },
    { label: 'Rutas Cerradas', value: metrics.totalRutas.toString() },
  ] : [];

  const periodLabels: Record<string, string> = { today: 'Hoy', week: 'Semana', month: 'Mes' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-0.5">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded text-xs font-medium ${period === p ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-md border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {kpi.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.format(kpi.value)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metrics && performanceMetrics.length > 0 && (
              <div className="bg-white rounded-md border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">KPIs - {periodLabels[period]}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {performanceMetrics.map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-lg font-bold text-gray-900">{m.value}</p>
                      <p className="text-xs text-gray-500">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-md border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Resumen Financiero</h2>
              {metrics ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cajas Despachadas</span>
                    <span className="font-medium">{metrics.totalCajasDespachadas.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cajas Entregadas</span>
                    <span className="font-medium text-green-600">{metrics.totalCajasEntregadas.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">UC Entregadas</span>
                    <span className="font-medium text-blue-600">{(metrics.totalUcEntregadas ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">UC Planificadas</span>
                    <span className="font-medium">{(metrics.totalUcPlanificadas ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cajas Devueltas</span>
                    <span className="font-medium text-red-600">{metrics.totalCajasDevueltas.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ingresos</span>
                    <span className="font-medium text-green-600">{formatCurrency(metrics.totalIngresos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Costos</span>
                    <span className="font-medium text-red-600">{formatCurrency(metrics.totalCostos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Bonos</span>
                    <span className="font-medium">{formatCurrency(metrics.totalBonos)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 font-bold">
                    <span>Utilidad</span>
                    <span className={metrics.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(metrics.utilidad)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Sin datos para el periodo</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}