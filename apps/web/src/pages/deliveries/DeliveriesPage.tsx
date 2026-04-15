import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, TruckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { api, apiPost, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface Delivery {
  id: string;
  rutaId: string;
  clienteId: string;
  clienteNombreSnapshot: string | null;
  clienteDireccionSnapshot: string | null;
  guiaDespachoId: string | null;
  tipoCajaId: string | null;
  cajasSolicitadas: number;
  cajasEntregadas: number;
  cajasDevueltas: number;
  ucEntregadas: number;
  montoCobrado: number;
  estado: string;
  motivoRechazo: string | null;
  observaciones: string | null;
  horaEntrega: string | null;
}

const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

const MOTIVOS = [
  { value: 'pedido_errado', label: 'Pedido errado' },
  { value: 'cliente_cerrado', label: 'Cliente cerrado' },
  { value: 'cliente_no_encontrado', label: 'Cliente no encontrado' },
  { value: 'saldo_vencido', label: 'Saldo vencido' },
  { value: 'no_recibe', label: 'No recibe' },
  { value: 'otro', label: 'Otro' },
] as const;

const INITIAL_FORM = {
  rutaId: '',
  guiaDespachoId: '',
  clienteId: '',
  clienteNombreSnapshot: '',
  clienteDireccionSnapshot: '',
  tipoCajaId: '',
  cajasSolicitadas: '',
  cajasEntregadas: '',
  cajasDevueltas: '0',
  ucEntregadas: '0',
  montoCobrado: '0',
  estado: 'entregado',
  motivoRechazo: '',
  observaciones: '',
};

export default function DeliveriesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [filterRuta, setFilterRuta] = useState('');

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries', filterRuta],
    queryFn: async () => {
      const url = filterRuta ? `/api/deliveries?rutaId=${filterRuta}` : '/api/deliveries';
      const res = await api.get(url);
      const json = await res.json();
      return json.data as Delivery[];
    },
  });

  const { data: routes } = useQuery({
    queryKey: ['routes-all'],
    queryFn: async () => {
      const res = await api.get('/api/routes');
      return (await res.json()).data as any[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await api.get('/api/clients');
      return (await res.json()).data as any[];
    },
  });

  const { data: boxTypes } = useQuery({
    queryKey: ['box-types'],
    queryFn: async () => {
      const res = await api.get('/api/box-types');
      return (await res.json()).data as any[];
    },
  });

  const { data: guides } = useQuery({
    queryKey: ['dispatch-guides', form.rutaId || filterRuta],
    queryFn: async () => {
      const rutaId = form.rutaId || filterRuta;
      if (!rutaId) return [];
      const res = await api.get(`/api/dispatch-guides?rutaId=${rutaId}`);
      return (await res.json()).data as any[];
    },
    enabled: !!(form.rutaId || filterRuta),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/deliveries/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deliveries'] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/deliveries', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveries'] }); setShowForm(false); resetForm(); },
  });

  const resetForm = () => setForm(INITIAL_FORM);

  const needsMotivo = form.estado === 'rechazado' || form.estado === 'parcial';

  const handleEstadoChange = (estado: string) => {
    const updated = { ...form, estado };
    if ((estado === 'rechazado' || estado === 'parcial') && form.cajasSolicitadas && form.cajasEntregadas) {
      const devueltas = Number(form.cajasSolicitadas) - Number(form.cajasEntregadas);
      updated.cajasDevueltas = String(Math.max(0, devueltas));
    } else {
      updated.cajasDevueltas = '0';
    }
    setForm(updated);
  };

  const handleClientSelect = (clienteId: string) => {
    const c = clients?.find((cl: any) => cl.id === clienteId);
    setForm({
      ...form,
      clienteId,
      clienteNombreSnapshot: c?.nombreComercial ?? '',
      clienteDireccionSnapshot: c?.direccion ?? '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      rutaId: form.rutaId,
      clienteId: form.clienteId,
      clienteNombreSnapshot: form.clienteNombreSnapshot,
      clienteDireccionSnapshot: form.clienteDireccionSnapshot || undefined,
      guiaDespachoId: form.guiaDespachoId || undefined,
      tipoCajaId: form.tipoCajaId || undefined,
      cajasSolicitadas: Number(form.cajasSolicitadas),
      cajasEntregadas: Number(form.cajasEntregadas),
      ucEntregadas: Number(form.ucEntregadas) || 0,
      montoCobrado: Number(form.montoCobrado),
      estado: form.estado,
      motivoRechazo: needsMotivo ? form.motivoRechazo || undefined : undefined,
      observaciones: form.observaciones || undefined,
    };
    createMut.mutate(payload);
  };

  const summary = useMemo(() => {
    if (!deliveries) return { sol: 0, ent: 0, dev: 0, monto: 0, eff: 0 };
    const sol = deliveries.reduce((s, d) => s + d.cajasSolicitadas, 0);
    const ent = deliveries.reduce((s, d) => s + d.cajasEntregadas, 0);
    const dev = deliveries.reduce((s, d) => s + d.cajasDevueltas, 0);
    const monto = deliveries.reduce((s, d) => s + d.montoCobrado, 0);
    const eff = sol > 0 ? Math.round((ent / sol) * 100) : 0;
    return { sol, ent, dev, monto, eff };
  }, [deliveries]);

  const estadoLabel: Record<string, string> = { entregado: 'Entregado', parcial: 'Parcial', rechazado: 'Rechazado' };
  const estadoColor: Record<string, string> = { entregado: 'bg-green-100 text-green-700', parcial: 'bg-yellow-100 text-yellow-700', rechazado: 'bg-red-100 text-red-700' };
  const motivoLabel: Record<string, string> = Object.fromEntries(MOTIVOS.map(m => [m.value, m.label]));

  const handleExportExcel = () => {
    if (!deliveries || deliveries.length === 0) return;
    const data = deliveries.map((d) => ({
      Cliente: d.clienteNombreSnapshot ?? d.clienteId,
      Direccion: d.clienteDireccionSnapshot ?? '',
      'Tipo Caja': (boxTypes as any[])?.find((bt: any) => bt.id === d.tipoCajaId)?.nombre ?? '',
      'Cajas Solicitadas': d.cajasSolicitadas,
      'Cajas Entregadas': d.cajasEntregadas,
      'Cajas Devueltas': d.cajasDevueltas,
      'Monto Cobrado': d.montoCobrado,
      Estado: estadoLabel[d.estado] ?? d.estado,
      'Motivo Rechazo': (d.estado === 'rechazado' || d.estado === 'parcial') && d.motivoRechazo ? (motivoLabel[d.motivoRechazo] ?? d.motivoRechazo) : '',
      Observaciones: d.observaciones ?? '',
      'Hora Entrega': d.horaEntrega ? new Date(d.horaEntrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entregas');
    const selectedRoute = routes?.find((r: any) => r.id === filterRuta);
    const routeFecha = selectedRoute?.fecha ?? 'todas';
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `entregas_ruta_${routeFecha}_${today}.xlsx`);
  };

  const selectedRutaGuides = useMemo(() => {
    const rutaId = form.rutaId || filterRuta;
    if (!rutaId || !guides) return [];
    return guides;
  }, [form.rutaId, filterRuta, guides]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Entregas</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Nueva Entrega
        </button>
        <button onClick={handleExportExcel} disabled={!deliveries || deliveries.length === 0} className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
          <ArrowDownTrayIcon className="h-4 w-4" /> Exportar Excel
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterRuta} onChange={(e) => setFilterRuta(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
          <option value="">Todas las rutas</option>
          {routes?.map((r: any) => (
            <option key={r.id} value={r.id}>{r.fecha} - {r.conductor?.nombre ?? 'Sin conductor'} ({r.estado})</option>
          ))}
        </select>
      </div>

      {filterRuta && deliveries && deliveries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <div className="bg-white rounded-md border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">Solicitadas</p>
            <p className="text-lg font-bold text-gray-900">{summary.sol}</p>
          </div>
          <div className="bg-white rounded-md border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">Entregadas</p>
            <p className="text-lg font-bold text-green-700">{summary.ent}</p>
          </div>
          <div className="bg-white rounded-md border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">Devueltas</p>
            <p className="text-lg font-bold text-red-600">{summary.dev}</p>
          </div>
          <div className="bg-white rounded-md border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">Monto Cobrado</p>
            <p className="text-lg font-bold text-gray-900">{fmt(summary.monto)}</p>
          </div>
          <div className="bg-white rounded-md border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500">Eficiencia</p>
            <p className="text-lg font-bold text-primary-600">{summary.eff}%</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Nueva Entrega</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ruta *</label>
              <select value={form.rutaId} onChange={(e) => setForm({ ...form, rutaId: e.target.value, guiaDespachoId: '' })} required className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Seleccionar ruta</option>
                {routes?.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.fecha} - {r.conductor?.nombre ?? 'Sin conductor'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guia de Despacho</label>
              <select value={form.guiaDespachoId} onChange={(e) => setForm({ ...form, guiaDespachoId: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Sin guia</option>
                {selectedRutaGuides?.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.numeroGd}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
              <select value={form.clienteId} onChange={(e) => handleClientSelect(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Seleccionar cliente</option>
                {clients?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombreComercial}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Direccion</label>
              <input type="text" value={form.clienteDireccionSnapshot} onChange={(e) => setForm({ ...form, clienteDireccionSnapshot: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Caja</label>
              <select value={form.tipoCajaId} onChange={(e) => setForm({ ...form, tipoCajaId: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Sin tipo</option>
                {boxTypes?.map((bt: any) => (
                  <option key={bt.id} value={bt.id}>{bt.nombre} ({fmt(bt.precioUnitario)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cajas Solicitadas *</label>
              <input type="number" min="0" required value={form.cajasSolicitadas} onChange={(e) => setForm({ ...form, cajasSolicitadas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cajas Entregadas *</label>
              <input type="number" min="0" required value={form.cajasEntregadas} onChange={(e) => setForm({ ...form, cajasEntregadas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">UC Entregadas *</label>
              <input type="number" min="0" step="0.1" required value={form.ucEntregadas} onChange={(e) => setForm({ ...form, ucEntregadas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto Cobrado ($) *</label>
              <input type="number" min="0" required value={form.montoCobrado} onChange={(e) => setForm({ ...form, montoCobrado: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado *</label>
              <select value={form.estado} onChange={(e) => handleEstadoChange(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="entregado">Entregado</option>
                <option value="parcial">Parcial</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            {needsMotivo && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motivo Rechazo *</label>
                <select value={form.motivoRechazo} onChange={(e) => setForm({ ...form, motivoRechazo: e.target.value })} required className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                  <option value="">Seleccionar motivo</option>
                  {MOTIVOS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
              <input type="text" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={createMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {createMut.isPending ? 'Creando...' : 'Crear Entrega'}
            </button>
          </div>
          {createMut.isError && <p className="text-xs text-red-600">Error al crear entrega</p>}
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : deliveries && deliveries.length > 0 ? (
        <>
        <div className="hidden md:block bg-white rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direccion</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Caja</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solicitadas</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entregadas</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Devueltas</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  {isAdmin && <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-3 text-sm font-medium">{d.clienteNombreSnapshot ?? d.clienteId}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{d.clienteDireccionSnapshot ?? '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{(boxTypes as any[])?.find((bt: any) => bt.id === d.tipoCajaId)?.nombre ?? '-'}</td>
                    <td className="px-3 py-3 text-sm text-right">{d.cajasSolicitadas}</td>
                    <td className="px-3 py-3 text-sm text-right">{d.cajasEntregadas}</td>
                    <td className="px-3 py-3 text-sm text-right text-red-600">{d.cajasDevueltas}</td>
                    <td className="px-3 py-3 text-sm text-right">{fmt(d.montoCobrado)}</td>
                    <td className="px-3 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estadoColor[d.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {estadoLabel[d.estado] ?? d.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {(d.estado === 'rechazado' || d.estado === 'parcial') && d.motivoRechazo ? (motivoLabel[d.motivoRechazo] ?? d.motivoRechazo) : '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => { if (confirm('Eliminar entrega?')) deleteMut.mutate(d.id); }} className="text-red-500 hover:text-red-700">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden space-y-3">
          {deliveries.map((d) => (
            <div key={d.id} className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{d.clienteNombreSnapshot ?? d.clienteId}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estadoColor[d.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                  {estadoLabel[d.estado] ?? d.estado}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span className="text-gray-400">Direccion:</span> {d.clienteDireccionSnapshot ?? '-'}</div>
                <div><span className="text-gray-400">Tipo Caja:</span> {(boxTypes as any[])?.find((bt: any) => bt.id === d.tipoCajaId)?.nombre ?? '-'}</div>
                <div><span className="text-gray-400">Solicitadas:</span> {d.cajasSolicitadas}</div>
                <div><span className="text-gray-400">Entregadas:</span> {d.cajasEntregadas}</div>
                <div><span className="text-gray-400">Devueltas:</span> <span className="text-red-600">{d.cajasDevueltas}</span></div>
                <div><span className="text-gray-400">Monto:</span> {fmt(d.montoCobrado)}</div>
                {(d.estado === 'rechazado' || d.estado === 'parcial') && d.motivoRechazo && (
                  <div className="col-span-2"><span className="text-gray-400">Motivo:</span> {motivoLabel[d.motivoRechazo] ?? d.motivoRechazo}</div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2 mt-2 justify-end">
                  <button onClick={() => { if (confirm('Eliminar entrega?')) deleteMut.mutate(d.id); }} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay entregas registradas</p>
        </div>
      )}
    </div>
  );
}