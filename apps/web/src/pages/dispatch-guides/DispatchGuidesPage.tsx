import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, ClipboardDocumentListIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { api, apiPost, apiPostNoBody, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface DispatchGuide {
  id: string;
  numeroGd: string;
  fecha: string;
  tipoGd: string | null;
  estado: string;
  totalCajas: number;
  totalUc: number;
  totalPalets: number;
  totalMonto: number;
  cdId: string | null;
  observaciones: string | null;
  rutaId: string;
  ruta?: { fecha: string; estado: string; conductor?: { nombre: string } };
  detalle?: any[];
}

interface BoxType { id: string; nombre: string; precioUnitario: number; litrosPorCaja: number }
interface DistributionCenter { id: string; nombre: string; codigo: string | null; ciudad: string | null }

const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

const emptyDetalle = { tipoCajaId: '', cantidad: '', clienteInternoId: '', clienteInternoNombre: '', direccionInterno: '' };
const emptyClientForm = { nombreComercial: '', rutSap: '', razonSocial: '', direccion: '', comuna: '', ciudad: '', telefono: '', tipoCliente: 'minorista' };

export default function DispatchGuidesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ numeroGd: '', fecha: new Date().toISOString().split('T')[0], tipoGd: '', observaciones: '', rutaId: '', cdId: '', totalPalets: '', detalle: [{ ...emptyDetalle }] });
  const [filterRuta, setFilterRuta] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ ...emptyClientForm });
  const [modalDetailIdx, setModalDetailIdx] = useState<number | null>(null);

  const { data: guides, isLoading } = useQuery({
    queryKey: ['dispatch-guides', filterRuta],
    queryFn: async () => {
      const url = filterRuta ? `/api/dispatch-guides?rutaId=${filterRuta}` : '/api/dispatch-guides';
      const res = await api.get(url);
      const json = await res.json();
      return json.data as DispatchGuide[];
    },
  });

  const { data: routes } = useQuery({
    queryKey: ['routes-all'],
    queryFn: async () => {
      const res = await api.get('/api/routes');
      const json = await res.json();
      return json.data as any[];
    },
  });

  const { data: boxTypes } = useQuery({
    queryKey: ['box-types'],
    queryFn: async () => {
      const res = await api.get('/api/box-types');
      const json = await res.json();
      return (json.data as BoxType[]);
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await api.get('/api/clients');
      const json = await res.json();
      return json.data as any[];
    },
  });

  const { data: distributionCenters } = useQuery({
    queryKey: ['distribution-centers'],
    queryFn: async () => {
      const res = await api.get('/api/distribution-centers');
      const json = await res.json();
      return (json.data as DistributionCenter[]);
    },
  });

  const createClientMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/clients', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/dispatch-guides/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispatch-guides'] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/dispatch-guides', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dispatch-guides'] }); setShowForm(false); resetForm(); },
  });

  const closeMut = useMutation({
    mutationFn: (id: string) => apiPostNoBody(`/api/dispatch-guides/${id}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispatch-guides'] }),
  });

  const resetForm = () => setForm({ numeroGd: '', fecha: new Date().toISOString().split('T')[0], tipoGd: '', observaciones: '', rutaId: '', cdId: '', totalPalets: '', detalle: [{ ...emptyDetalle }] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      numeroGd: form.numeroGd,
      fecha: form.fecha,
      observaciones: form.observaciones || undefined,
      rutaId: form.rutaId,
      cdId: form.cdId || null,
      totalPalets: Number(form.totalPalets) || 0,
      detalle: form.detalle.filter((d) => d.tipoCajaId && d.cantidad).map((d) => ({
        tipoCajaId: d.tipoCajaId,
        cantidad: Number(d.cantidad),
        clienteInternoId: d.clienteInternoId || null,
        clienteInternoNombre: d.clienteInternoNombre || null,
        direccionInterno: d.direccionInterno || null,
      })),
    };
    if (form.tipoGd) payload.tipoGd = form.tipoGd;
    createMut.mutate(payload);
  };

  const addDetalle = () => setForm({ ...form, detalle: [...form.detalle, { ...emptyDetalle }] });
  const removeDetalle = (idx: number) => setForm({ ...form, detalle: form.detalle.filter((_, i) => i !== idx) });
  const updateDetalle = (idx: number, updates: Record<string, string>) => {
    const newDetalle = [...form.detalle];
    newDetalle[idx] = { ...newDetalle[idx], ...updates };
    setForm({ ...form, detalle: newDetalle });
  };

  const handleClientSelect = (idx: number, value: string) => {
    if (value === '__add__') {
      setModalDetailIdx(idx);
      setClientForm({ ...emptyClientForm });
      setShowClientModal(true);
      return;
    }
    const client = clients?.find((c: any) => c.id === value);
    if (client) {
      updateDetalle(idx, {
        clienteInternoId: client.id,
        clienteInternoNombre: client.nombreComercial,
        direccionInterno: client.direccion || '',
      });
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombreComercial: clientForm.nombreComercial,
      rutSap: clientForm.rutSap || null,
      razonSocial: clientForm.razonSocial || null,
      direccion: clientForm.direccion || null,
      comuna: clientForm.comuna || null,
      ciudad: clientForm.ciudad || null,
      telefono: clientForm.telefono || null,
      tipoCliente: clientForm.tipoCliente,
      activo: true,
    };
    try {
      const res = await api.post('/api/clients', payload);
      const json = await res.json();
      if (json.success && json.data && modalDetailIdx !== null) {
        updateDetalle(modalDetailIdx, {
          clienteInternoId: json.data.id,
          clienteInternoNombre: json.data.nombreComercial,
          direccionInterno: json.data.direccion || '',
        });
        setShowClientModal(false);
        setModalDetailIdx(null);
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      }
    } catch {}
  };

  return (
    <div>
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Agregar Cliente</h2>
            <form onSubmit={handleClientSubmit} className="space-y-2">
              <input required placeholder="Nombre Comercial *" value={clientForm.nombreComercial} onChange={(e) => setClientForm({ ...clientForm, nombreComercial: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              <input placeholder="RUT / SAP" value={clientForm.rutSap} onChange={(e) => setClientForm({ ...clientForm, rutSap: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              <input placeholder="Razon Social" value={clientForm.razonSocial} onChange={(e) => setClientForm({ ...clientForm, razonSocial: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              <input placeholder="Direccion" value={clientForm.direccion} onChange={(e) => setClientForm({ ...clientForm, direccion: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              <input placeholder="Comuna" value={clientForm.comuna} onChange={(e) => setClientForm({ ...clientForm, comuna: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              <input placeholder="Ciudad" value={clientForm.ciudad} onChange={(e) => setClientForm({ ...clientForm, ciudad: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              <input placeholder="Telefono" value={clientForm.telefono} onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              <select value={clientForm.tipoCliente} onChange={(e) => setClientForm({ ...clientForm, tipoCliente: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="minorista">Minorista</option>
                <option value="mayorista">Mayorista</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowClientModal(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createClientMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createClientMut.isPending ? 'Creando...' : 'Crear Cliente'}
                </button>
              </div>
              {createClientMut.isError && <p className="text-xs text-red-600">Error al crear cliente</p>}
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Guias de Despacho</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Nueva Guia
        </button>
      </div>

      <div className="mb-4">
        <select value={filterRuta} onChange={(e) => setFilterRuta(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
          <option value="">Todas las rutas</option>
          {routes?.map((r: any) => (
            <option key={r.id} value={r.id}>{r.fecha} - {r.conductor?.nombre ?? 'Sin conductor'} ({r.estado})</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Nueva Guia de Despacho</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Numero GD *</label>
              <input type="text" required value={form.numeroGd} onChange={(e) => setForm({ ...form, numeroGd: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ruta *</label>
              <select value={form.rutaId} onChange={(e) => setForm({ ...form, rutaId: e.target.value })} required className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Seleccionar ruta</option>
                {routes?.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.fecha} - {r.conductor?.nombre ?? 'Sin conductor'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo GD</label>
              <select value={form.tipoGd} onChange={(e) => setForm({ ...form, tipoGd: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Normal</option>
                <option value="mayorista">Mayorista</option>
                <option value="segunda_vuelta">Segunda Vuelta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Centro Distribucion</label>
              <select value={form.cdId} onChange={(e) => setForm({ ...form, cdId: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Sin CD</option>
                {distributionCenters?.map((dc) => (
                  <option key={dc.id} value={dc.id}>{dc.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Palets</label>
              <input type="number" value={form.totalPalets} onChange={(e) => setForm({ ...form, totalPalets: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
            <input type="text" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Detalle de Cajas</label>
              <button type="button" onClick={addDetalle} className="text-xs text-primary-600 hover:text-primary-800 font-medium">+ Agregar linea</button>
            </div>
            {form.detalle.map((d, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 mb-2 items-end">
                <div className="col-span-2">
                  {i === 0 && <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Cliente Interno</label>}
                  <select value={d.clienteInternoId || ''} onChange={(e) => handleClientSelect(i, e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500">
                    <option value="">Seleccionar cliente</option>
                    <option value="__add__">+ Agregar cliente</option>
                    {clients?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nombreComercial}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Direccion</label>}
                  <input type="text" placeholder="Direccion" value={d.direccionInterno} onChange={(e) => updateDetalle(i, { direccionInterno: e.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500" />
                </div>
                <div>
                  {i === 0 && <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Tipo Caja</label>}
                  <select value={d.tipoCajaId} onChange={(e) => updateDetalle(i, { tipoCajaId: e.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500">
                    <option value="">Tipo</option>
                    {boxTypes?.map((bt) => (
                      <option key={bt.id} value={bt.id}>{bt.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1">
                    {i === 0 && <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Cant.</label>}
                    <input type="number" placeholder="#" value={d.cantidad} onChange={(e) => updateDetalle(i, { cantidad: e.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500" />
                  </div>
                  {form.detalle.length > 1 && <button type="button" onClick={() => removeDetalle(i)} className="text-red-500 hover:text-red-700 px-1 pb-1">X</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={createMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {createMut.isPending ? 'Creando...' : 'Crear Guia'}
            </button>
          </div>
          {createMut.isError && <p className="text-xs text-red-600">Error al crear guia</p>}
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : guides && guides.length > 0 ? (
        <>
        <div className="hidden md:block bg-white rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero GD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clientes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cajas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UC</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Palets</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guides.map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-3 text-sm font-medium">{g.numeroGd}</td>
                    <td className="px-4 py-3 text-sm">{g.ruta ? `${g.ruta.fecha} - ${g.ruta.conductor?.nombre ?? 'Sin conductor'}` : g.rutaId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm">{g.fecha}</td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">{g.detalle?.filter((d: any) => d.clienteInternoNombre).map((d: any) => d.clienteInternoNombre).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${g.estado === 'cerrada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {g.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{g.totalCajas}</td>
                    <td className="px-4 py-3 text-sm text-right">{(g.totalUc ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">{g.totalPalets ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{fmt(g.totalMonto)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => navigate(`/dispatch-guides/${g.id}`)} className="text-primary-600 hover:text-primary-800" title="Ver">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {g.estado === 'abierta' && (
                          <button onClick={() => navigate(`/dispatch-guides/${g.id}?edit=true`)} className="text-primary-600 hover:text-primary-800" title="Editar">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {g.estado === 'abierta' && (
                          <button onClick={() => closeMut.mutate(g.id)} disabled={closeMut.isPending} className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50">
                            Cerrar
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => { if (confirm('Eliminar guia?')) deleteMut.mutate(g.id); }} className="text-red-500 hover:text-red-700">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden space-y-3">
          {guides.map((g) => (
            <div key={g.id} className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{g.numeroGd}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${g.estado === 'cerrada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {g.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span className="text-gray-400">Ruta:</span> {g.ruta ? `${g.ruta.fecha} - ${g.ruta.conductor?.nombre ?? 'Sin conductor'}` : g.rutaId.slice(0, 8)}</div>
                <div><span className="text-gray-400">Fecha:</span> {g.fecha}</div>
                <div><span className="text-gray-400">Clientes:</span> {g.detalle?.filter((d: any) => d.clienteInternoNombre).map((d: any) => d.clienteInternoNombre).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ') || '-'}</div>
                <div><span className="text-gray-400">Total Cajas:</span> {g.totalCajas}</div>
                <div><span className="text-gray-400">Monto:</span> {fmt(g.totalMonto)}</div>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => navigate(`/dispatch-guides/${g.id}`)} className="text-primary-600 hover:text-primary-800" title="Ver"><EyeIcon className="h-4 w-4" /></button>
                {g.estado === 'abierta' && (
                  <button onClick={() => navigate(`/dispatch-guides/${g.id}?edit=true`)} className="text-primary-600 hover:text-primary-800" title="Editar"><PencilIcon className="h-4 w-4" /></button>
                )}
                {g.estado === 'abierta' && (
                  <button onClick={() => closeMut.mutate(g.id)} disabled={closeMut.isPending} className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50">Cerrar</button>
                )}
                {isAdmin && (
                  <button onClick={() => { if (confirm('Eliminar guia?')) deleteMut.mutate(g.id); }} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay guias de despacho</p>
        </div>
      )}
    </div>
  );
}