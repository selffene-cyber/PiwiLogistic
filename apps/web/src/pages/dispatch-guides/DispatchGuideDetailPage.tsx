import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { api, apiPut, apiPostNoBody } from '../../lib/api';

interface GuideDetalle {
  id: string;
  tipoCajaId: string;
  clienteInternoId: string | null;
  clienteInternoNombre: string | null;
  direccionInterno: string | null;
  cantidad: number;
  precioUnitarioSnapshot: number;
  subtotal: number;
}

interface DispatchGuide {
  id: string;
  numeroGd: string;
  fecha: string;
  tipoGd: string | null;
  estado: string;
  totalCajas: number;
  totalMonto: number;
  observaciones: string | null;
  rutaId: string;
  ruta?: { fecha: string; estado: string; conductor?: { nombre: string } } | null;
  detalle: GuideDetalle[];
}

interface BoxType { id: string; nombre: string; precioUnitario: number }

const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

const emptyDetalle = { tipoCajaId: '', cantidad: '', clienteInternoId: '', clienteInternoNombre: '', direccionInterno: '' };
const emptyClientForm = { nombreComercial: '', rutSap: '', razonSocial: '', direccion: '', comuna: '', ciudad: '', telefono: '', tipoCliente: 'minorista' };

export default function DispatchGuideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'view' | 'edit'>(() => searchParams.get('edit') === 'true' ? 'edit' : 'view');
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ ...emptyClientForm });
  const [modalDetailIdx, setModalDetailIdx] = useState<number | null>(null);

  const { data: guide, isLoading } = useQuery({
    queryKey: ['dispatch-guide', id],
    queryFn: async () => {
      const res = await api.get(`/api/dispatch-guides/${id}`);
      const json = await res.json();
      return json.data as DispatchGuide;
    },
    enabled: !!id,
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
      return json.data as BoxType[];
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

  const [form, setForm] = useState({
    numeroGd: '',
    fecha: '',
    tipoGd: '',
    observaciones: '',
    rutaId: '',
    detalle: [{ ...emptyDetalle }],
  });

  const initForm = (g: DispatchGuide) => {
    setForm({
      numeroGd: g.numeroGd,
      fecha: g.fecha.split('T')[0],
      tipoGd: g.tipoGd || '',
      observaciones: g.observaciones || '',
      rutaId: g.rutaId,
      detalle: g.detalle.map((d) => ({
        tipoCajaId: d.tipoCajaId,
        cantidad: String(d.cantidad),
        clienteInternoId: d.clienteInternoId || '',
        clienteInternoNombre: d.clienteInternoNombre || '',
        direccionInterno: d.direccionInterno || '',
      })),
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!guide) return <div className="text-center py-12 text-gray-500">Guia no encontrada</div>;

  if (mode === 'view') {
    const isAbierta = guide.estado === 'abierta';
    return (
      <div>
        <button onClick={() => navigate('/dispatch-guides')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeftIcon className="h-4 w-4" /> Volver a Guias
        </button>

        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">GD {guide.numeroGd}</h1>
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${guide.estado === 'cerrada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {guide.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            <div><span className="text-gray-500">Numero GD:</span> <span className="font-medium">{guide.numeroGd}</span></div>
            <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{guide.fecha.split('T')[0]}</span></div>
            <div><span className="text-gray-500">Tipo GD:</span> <span className="font-medium">{guide.tipoGd || 'Normal'}</span></div>
            <div><span className="text-gray-500">Ruta:</span> <span className="font-medium">{guide.ruta ? `${guide.ruta.fecha} - ${guide.ruta.conductor?.nombre ?? 'Sin conductor'}` : '-'}</span></div>
            <div><span className="text-gray-500">Total Cajas:</span> <span className="font-medium">{guide.totalCajas}</span></div>
            <div><span className="text-gray-500">Total Monto:</span> <span className="font-medium">{fmt(guide.totalMonto)}</span></div>
          </div>
          {guide.observaciones && (
            <div className="text-sm"><span className="text-gray-500">Observaciones:</span> <span>{guide.observaciones}</span></div>
          )}
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Detalle ({guide.detalle.length} lineas)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente Interno</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Direccion</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo Caja</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guide.detalle.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 text-sm">{d.clienteInternoNombre || '-'}</td>
                    <td className="px-3 py-2 text-sm">{d.direccionInterno || '-'}</td>
                    <td className="px-3 py-2 text-sm">{d.tipoCajaId ? (boxTypes?.find((bt) => bt.id === d.tipoCajaId)?.nombre ?? d.tipoCajaId.slice(0, 8)) : '-'}</td>
                    <td className="px-3 py-2 text-sm text-right">{d.cantidad}</td>
                    <td className="px-3 py-2 text-sm text-right">{fmt(d.precioUnitarioSnapshot)}</td>
                    <td className="px-3 py-2 text-sm text-right">{fmt(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAbierta && (
          <div className="flex gap-3">
            <button onClick={() => { initForm(guide); setMode('edit'); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Editar
            </button>
            <button
              onClick={async () => {
                await apiPostNoBody(`/api/dispatch-guides/${guide.id}/close`);
                queryClient.invalidateQueries({ queryKey: ['dispatch-guide', id] });
                queryClient.invalidateQueries({ queryKey: ['dispatch-guides'] });
                navigate('/dispatch-guides');
              }}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Cerrar Guia
            </button>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      numeroGd: form.numeroGd,
      fecha: form.fecha,
      observaciones: form.observaciones || undefined,
      rutaId: form.rutaId,
      detalle: form.detalle.filter((d) => d.tipoCajaId && d.cantidad).map((d) => ({
        tipoCajaId: d.tipoCajaId,
        cantidad: Number(d.cantidad),
        clienteInternoId: d.clienteInternoId || null,
        clienteInternoNombre: d.clienteInternoNombre || null,
        direccionInterno: d.direccionInterno || null,
      })),
    };
    if (form.tipoGd) payload.tipoGd = form.tipoGd;
    await apiPut(`/api/dispatch-guides/${id}`, payload);
    queryClient.invalidateQueries({ queryKey: ['dispatch-guide', id] });
    queryClient.invalidateQueries({ queryKey: ['dispatch-guides'] });
    setMode('view');
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
                <button type="submit" className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/dispatch-guides')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a Guias
      </button>

      <form onSubmit={handleSave} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Editar Guia de Despacho</h2>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${guide.estado === 'cerrada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {guide.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
          </span>
        </div>
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
          <button type="button" onClick={() => setMode('view')} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}