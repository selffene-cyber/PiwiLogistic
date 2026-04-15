import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, FunnelIcon, ArrowPathIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fmtNum = (v: number) => (v ?? 0).toLocaleString('es-CL');
const fmtCur = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v ?? 0);

const ESTADO_COLORS: Record<string, string> = {
  entregado: 'bg-green-100 text-green-700',
  en_transito: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-gray-100 text-gray-700',
  fallido: 'bg-red-100 text-red-700',
  parcial: 'bg-blue-100 text-blue-700',
};

const CHART_COLORS: Record<string, string> = {
  entregado: '#16a34a',
  en_transito: '#f59e0b',
  pendiente: '#6b7280',
  fallido: '#dc2626',
  parcial: '#2563eb',
};

const PAGE_SIZE = 25;

interface OpsRow {
  conductorNombre: string;
  transporte: string;
  total: number;
  estado: string;
  progreso: string;
  ucEntregadas: number;
  ucPlanificadas: number;
  cajas: number;
  palets: number;
  vuelta: string;
  fechaEntrega: string;
  cd: string;
  guiaId: string;
  clientes: { clienteInternoNombre: string; direccionInterno: string; cantidad: number; ucTotales: number }[];
}

export default function OperationsDashboardPage() {
  const [filters, setFilters] = useState({ fechaDesde: '', fechaHasta: '', conductorId: '', cdId: '', estado: '', search: '' });
  const [applied, setApplied] = useState(filters);
  const [showFilters, setShowFilters] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const queryParams = new URLSearchParams();
  if (applied.fechaDesde) queryParams.set('fechaDesde', applied.fechaDesde);
  if (applied.fechaHasta) queryParams.set('fechaHasta', applied.fechaHasta);
  if (applied.conductorId) queryParams.set('conductorId', applied.conductorId);
  if (applied.cdId) queryParams.set('cdId', applied.cdId);
  if (applied.estado) queryParams.set('estado', applied.estado);

  const { data: rows, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['ops-dashboard', queryParams.toString()],
    queryFn: async () => {
      const res = await api.get(`/api/operations-dashboard?${queryParams.toString()}`);
      const json = await res.json();
      return (json.data ?? []) as OpsRow[];
    },
    refetchInterval: false,
  });

  const { data: workers } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => { const res = await api.get('/api/workers'); return (await res.json()).data as any[]; },
  });

  const { data: distCenters } = useQuery({
    queryKey: ['distribution-centers'],
    queryFn: async () => { const res = await api.get('/api/distribution-centers'); return (await res.json()).data as any[]; },
  });

  useEffect(() => {
    const interval = setInterval(() => refetch(), 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const applyFilters = () => { setApplied(filters); setPage(1); };
  const clearFilters = () => { setFilters({ fechaDesde: '', fechaHasta: '', conductorId: '', cdId: '', estado: '', search: '' }); setApplied({ fechaDesde: '', fechaHasta: '', conductorId: '', cdId: '', estado: '', search: '' }); setPage(1); };

  const filtered = useMemo(() => {
    let d = rows ?? [];
    if (applied.search) {
      const s = applied.search.toLowerCase();
      d = d.filter(r => r.conductorNombre.toLowerCase().includes(s) || r.transporte.toLowerCase().includes(s) || r.cd.toLowerCase().includes(s));
    }
    if (sortCol) {
      d = [...d].sort((a, b) => {
        const va = (a as any)[sortCol] ?? '';
        const vb = (b as any)[sortCol] ?? '';
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return d;
  }, [rows, applied.search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => {
    const d = filtered;
    const total = d.length;
    const entregados = d.filter(r => r.estado === 'entregado').length;
    const enTransito = d.filter(r => r.estado === 'en_transito').length;
    const pendientes = d.filter(r => r.estado === 'pendiente').length;
    const cumplimiento = total > 0 ? Math.round((entregados / total) * 100) : 0;
    const ucPlanif = d.reduce((s, r) => s + r.ucPlanificadas, 0);
    const ucEntr = d.reduce((s, r) => s + r.ucEntregadas, 0);
    const pctUc = ucPlanif > 0 ? Math.round((ucEntr / ucPlanif) * 100) : 0;
    const valorTotal = d.reduce((s, r) => s + r.total, 0);
    return { total, entregados, enTransito, pendientes, cumplimiento, ucPlanif, ucEntr, pctUc, valorTotal };
  }, [filtered]);

  const barData = useMemo(() => {
    const byConductor = new Map<string, { ucEntr: number; ucPlan: number }>();
    filtered.forEach(r => {
      const cur = byConductor.get(r.conductorNombre) ?? { ucEntr: 0, ucPlan: 0 };
      cur.ucEntr += r.ucEntregadas;
      cur.ucPlan += r.ucPlanificadas;
      byConductor.set(r.conductorNombre, cur);
    });
    return [...byConductor.entries()].slice(0, 10).map(([name, v]) => ({ name, 'UC Entregadas': v.ucEntr, 'UC Planificadas': v.ucPlan }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(r => { counts[r.estado] = (counts[r.estado] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const exportCSV = () => {
    const header = 'Conductor,Transporte,Total,Estado,Progreso,UC Entregadas,UC Planificadas,Cajas,Palets,Vuelta,Fecha,CD';
    const csvRows = filtered.map(r => `"${r.conductorNombre}","${r.transporte}",${r.total},"${r.estado}","${r.progreso}",${r.ucEntregadas},${r.ucPlanificadas},${r.cajas},${r.paletas},"${r.vuelta}","${r.fechaEntrega}","${r.cd}"`);
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'operaciones.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const sortIcon = (col: string) => sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Tablero de Operaciones</h1>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"><ArrowPathIcon className="h-4 w-4" /></button>
          <button onClick={exportCSV} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"><ArrowDownTrayIcon className="h-4 w-4" /> CSV</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"><PrinterIcon className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[
          { l: 'Viajes', v: kpis.total, f: fmtNum },
          { l: 'Entregados', v: kpis.entregados, f: fmtNum, c: 'text-green-600' },
          { l: 'En Transito', v: kpis.enTransito, f: fmtNum, c: 'text-amber-600' },
          { l: 'Pendientes', v: kpis.pendientes, f: fmtNum, c: 'text-gray-600' },
          { l: '% Cumplimiento', v: kpis.cumplimiento, f: v => `${v}%` },
          { l: 'UC Planificadas', v: kpis.ucPlanif, f: fmtNum },
          { l: 'UC Entregadas', v: kpis.ucEntr, f: fmtNum, c: 'text-blue-600' },
          { l: '% UC Entregadas', v: kpis.pctUc, f: v => `${v}%` },
          { l: 'Valor Facturado', v: kpis.valorTotal, f: fmtCur },
        ].map(k => (
          <div key={k.l} className="min-w-[120px] bg-white rounded-md border border-gray-200 p-3 flex-shrink-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{k.l}</p>
            <p className={`text-lg font-bold ${k.c ?? 'text-gray-900'}`}>{k.f(k.v)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 mb-2">
          <FunnelIcon className="h-4 w-4" /> {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
        {showFilters && (
          <div className="bg-white rounded-md border border-gray-200 p-3 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <input type="date" value={filters.fechaDesde} onChange={e => setFilters({...filters, fechaDesde: e.target.value})} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" placeholder="Desde" />
              <input type="date" value={filters.fechaHasta} onChange={e => setFilters({...filters, fechaHasta: e.target.value})} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" placeholder="Hasta" />
              <select value={filters.conductorId} onChange={e => setFilters({...filters, conductorId: e.target.value})} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                <option value="">Todos los conductores</option>
                {workers?.map((w: any) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </select>
              <select value={filters.cdId} onChange={e => setFilters({...filters, cdId: e.target.value})} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                <option value="">Todos los CD</option>
                {distCenters?.map((dc: any) => <option key={dc.id} value={dc.id}>{dc.nombre}</option>)}
              </select>
              <select value={filters.estado} onChange={e => setFilters({...filters, estado: e.target.value})} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                <option value="">Todos los estados</option>
                <option value="entregado">Entregado</option>
                <option value="en_transito">En Transito</option>
                <option value="pendiente">Pendiente</option>
                <option value="fallido">Fallido</option>
                <option value="parcial">Parcial</option>
              </select>
              <input type="text" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" placeholder="Buscar..." />
            </div>
            <div className="flex gap-2">
              <button onClick={clearFilters} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Limpiar</button>
              <button onClick={applyFilters} className="rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700">Aplicar</button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <>
          <div className="bg-white rounded-md border border-gray-200 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 w-8"></th>
                    {[
                      ['conductorNombre', 'Conductor'],
                      ['transporte', 'Transporte'],
                      ['total', 'Total'],
                      ['estado', 'Estado'],
                      ['progreso', 'Progreso'],
                      ['ucEntregadas', 'UC Entregadas'],
                      ['ucPlanificadas', 'UC Planificadas'],
                      ['cajas', 'Cajas'],
                      ['palets', 'Palets'],
                      ['vuelta', 'Vuelta'],
                      ['fechaEntrega', 'Fecha'],
                      ['cd', 'CD'],
                    ].map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 whitespace-nowrap">
                        {label}{sortIcon(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageData.map((r, i) => (
                    <>
                      <tr key={r.guiaId} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                        <td className="px-2 py-2">
                          {r.clientes?.length > 0 && (
                            <button onClick={() => toggleExpand(r.guiaId)} className="text-gray-400 hover:text-gray-600">
                              {expanded.has(r.guiaId) ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium">{r.conductorNombre}</td>
                        <td className="px-3 py-2 text-sm">{r.transporte}</td>
                        <td className="px-3 py-2 text-sm">{fmtCur(r.total)}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLORS[r.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                            {r.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm">{r.progreso}</td>
                        <td className="px-3 py-2 text-sm text-right">{fmtNum(r.ucEntregadas)}</td>
                        <td className="px-3 py-2 text-sm text-right">{fmtNum(r.ucPlanificadas)}</td>
                        <td className="px-3 py-2 text-sm text-right">{fmtNum(r.cajas)}</td>
                        <td className="px-3 py-2 text-sm text-right">{fmtNum(r.palets)}</td>
                        <td className="px-3 py-2 text-sm">{r.vuelta}</td>
                        <td className="px-3 py-2 text-sm">{r.fechaEntrega}</td>
                        <td className="px-3 py-2 text-sm">{r.cd}</td>
                      </tr>
                      {expanded.has(r.guiaId) && r.clientes?.length > 0 && (
                        <tr key={`${r.guiaId}-detail`} className="bg-gray-50">
                          <td colSpan={13} className="px-6 py-2">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-gray-500 uppercase">
                                  <th className="text-left py-1">Cliente</th>
                                  <th className="text-left py-1">Direccion</th>
                                  <th className="text-right py-1">Cajas</th>
                                  <th className="text-right py-1">UC Totales</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.clientes.map((c, ci) => (
                                  <tr key={ci} className="border-t border-gray-100">
                                    <td className="py-1">{c.clienteInternoNombre}</td>
                                    <td className="py-1 text-gray-500">{c.direccionInterno}</td>
                                    <td className="py-1 text-right">{fmtNum(c.cantidad)}</td>
                                    <td className="py-1 text-right">{fmtNum(c.ucTotales)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-gray-500">{filtered.length} registros</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded border border-gray-300 disabled:opacity-30"><ChevronLeftIcon className="h-4 w-4" /></button>
              <span className="text-sm">Pag {page} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded border border-gray-300 disabled:opacity-30"><ChevronRightIcon className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">UC por Conductor</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtNum(v)} />
                  <Legend />
                  <Bar dataKey="UC Planificadas" fill="#d1d5db" />
                  <Bar dataKey="UC Entregadas" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribucion de Estados</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={CHART_COLORS[entry.name] ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}