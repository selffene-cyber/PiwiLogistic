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
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard', 'today'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/today');
      const json = await res.json();
      return json.data as DashboardMetrics;
    },
  });

  const kpis = [
    { label: 'Cajas Hoy', value: metrics?.totalCajasEntregadas ?? 0, icon: CubeIcon, color: 'text-primary-500', format: (v: number) => v.toLocaleString() },
    { label: 'Ingresos', value: metrics?.totalIngresos ?? 0, icon: CurrencyDollarIcon, color: 'text-green-500', format: formatCurrency },
    { label: 'Costos', value: metrics?.totalCostos ?? 0, icon: ArrowTrendingDownIcon, color: 'text-red-500', format: formatCurrency },
    { label: 'Utilidad', value: metrics?.utilidad ?? 0, icon: ChartBarIcon, color: 'text-primary-600', format: formatCurrency },
  ];

  const performanceMetrics = metrics ? [
    { label: 'Eficiencia', value: `${metrics.eficiencia}%` },
    { label: 'Cajas/Dia', value: metrics.cajasPorDia.toLocaleString() },
    { label: 'Cajas/Hora', value: metrics.cajasPorHora.toLocaleString() },
    { label: 'Rent./Caja', value: formatCurrency(metrics.rentabilidadPorCaja) },
    { label: 'Rutas Cerradas', value: metrics.totalRutas.toString() },
  ] : [];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Dashboard</h1>

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

          {metrics && performanceMetrics.length > 0 && (
            <div className="bg-white rounded-md border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">KPIs</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {performanceMetrics.map((m) => (
                  <div key={m.label} className="text-center">
                    <p className="text-lg font-bold text-gray-900">{m.value}</p>
                    <p className="text-xs text-gray-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}