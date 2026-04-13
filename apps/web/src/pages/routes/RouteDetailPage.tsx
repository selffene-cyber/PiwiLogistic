import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, ArrowDownTrayIcon, PlayIcon, StopIcon, ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { api, apiPost, apiPostNoBody, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface DeliveryForm {
  guiaDespachoId: string;
  clienteId: string;
  clienteNombreSnapshot: string;
  clienteDireccionSnapshot: string;
  tipoCajaId: string;
  cajasSolicitadas: string;
  cajasEntregadas: string;
  cajasDevueltas: string;
  montoCobrado: string;
  estado: string;
  motivoRechazo: string;
  observaciones: string;
}

interface RouteDetail {
  id: string;
  fecha: string;
  estado: string;
  camionId: string;
  conductorId: string;
  peoneta1Id: string | null;
  peoneta2Id: string | null;
  horaSalida: string | null;
  horaFin: string | null;
  cerradaAt: string | null;
  camion?: { patente: string; marca: string | null };
  conductor?: { nombre: string };
  peoneta1?: { nombre: string } | null;
  peoneta2?: { nombre: string } | null;
  guias?: any[];
  entregas?: any[];
  costos?: any | null;
  bono?: any | null;
}

const estadoConfig: Record<string, { label: string; color: string }> = {
  planificada: { label: 'Planificada', color: 'bg-yellow-100 text-yellow-800' },
  en_ruta: { label: 'En Ruta', color: 'bg-blue-100 text-blue-800' },
  cerrada: { label: 'Cerrada', color: 'bg-green-100 text-green-800' },
  reabierta: { label: 'Reabierta', color: 'bg-orange-100 text-orange-800' },
  anulada: { label: 'Anulada', color: 'bg-red-100 text-red-800' },
};

const estadoEntrega: Record<string, { label: string; color: string }> = {
  entregado: { label: 'Entregado', color: 'bg-green-100 text-green-700' },
  parcial: { label: 'Parcial', color: 'bg-yellow-100 text-yellow-700' },
  rechazado: { label: 'Rechazado', color: 'bg-red-100 text-red-700' },
};

const MOTIVOS = [
  { value: 'pedido_errado', label: 'Pedido errado' },
  { value: 'cliente_cerrado', label: 'Cliente cerrado' },
  { value: 'cliente_no_encontrado', label: 'Cliente no encontrado' },
  { value: 'saldo_vencido', label: 'Saldo vencido' },
  { value: 'no_recibe', label: 'No recibe' },
  { value: 'otro', label: 'Otro' },
];

const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

const emptyDeliveryForm: DeliveryForm = {
  guiaDespachoId: '', clienteId: '', clienteNombreSnapshot: '', clienteDireccionSnapshot: '',
  tipoCajaId: '', cajasSolicitadas: '', cajasEntregadas: '', cajasDevueltas: '0',
  montoCobrado: '0', estado: 'entregado', motivoRechazo: '', observaciones: '',
};

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({ ...emptyDeliveryForm });

  const { data: route, isLoading } = useQuery({
    queryKey: ['route', id],
    queryFn: async () => {
      const res = await api.get(`/api/routes/${id}`);
      const json = await res.json();
      return json.data as RouteDetail;
    },
    enabled: !!id,
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

  const startMut = useMutation({
    mutationFn: () => apiPostNoBody(`/api/routes/${id}/start`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['route', id] }); queryClient.invalidateQueries({ queryKey: ['routes'] }); },
  });
  const closeMut = useMutation({
    mutationFn: () => apiPostNoBody(`/api/routes/${id}/close`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['route', id] }); queryClient.invalidateQueries({ queryKey: ['routes'] }); },
  });
  const reopenMut = useMutation({
    mutationFn: () => apiPostNoBody(`/api/routes/${id}/reopen`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['route', id] }); queryClient.invalidateQueries({ queryKey: ['routes'] }); },
  });
  const closeGuideMut = useMutation({
    mutationFn: (guideId: string) => apiPostNoBody(`/api/dispatch-guides/${guideId}/close`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['route', id] }); queryClient.invalidateQueries({ queryKey: ['dispatch-guides'] }); },
  });
  const createDeliveryMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/deliveries', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['route', id] }); queryClient.invalidateQueries({ queryKey: ['deliveries'] }); setShowDeliveryForm(false); setDeliveryForm({ ...emptyDeliveryForm }); },
  });
  const deleteDeliveryMut = useMutation({
    mutationFn: (delId: string) => apiDel(`/api/deliveries/${delId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['route', id] }); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!route) return <div className="text-center py-12 text-gray-500">Ruta no encontrada</div>;

  const ec = estadoConfig[route.estado] ?? { label: route.estado, color: 'bg-gray-100 text-gray-600' };
  const guias = route.guias ?? [];
  const entregas = route.entregas ?? [];
  const isPlanificada = route.estado === 'planificada';
  const isEnRuta = route.estado === 'en_ruta';
  const isCerrada = route.estado === 'cerrada';
  const isReabierta = route.estado === 'reabierta';
  const canAct = isEnRuta || isReabierta;

  const despachadoCajas = guias.reduce((s: number, g: any) => s + (g.totalCajas ?? 0), 0);
  const despachadoMonto = guias.reduce((s: number, g: any) => s + (g.totalMonto ?? 0), 0);
  const entregadoCajas = entregas.reduce((s: number, e: any) => s + (e.cajasEntregadas ?? 0), 0);
  const entregadoMonto = entregas.reduce((s: number, e: any) => s + (e.montoCobrado ?? 0), 0);
  const devueltoCajas = entregas.reduce((s: number, e: any) => s + (e.cajasDevueltas ?? 0), 0);
  const eficiencia = despachadoCajas > 0 ? (entregadoCajas / despachadoCajas * 100) : 0;
  const costos = route.costos?.totalCostos ?? 0;
  const bonos = route.bono?.bonoTotal ?? 0;
  const utilidad = entregadoMonto - costos - bonos;

  const handleClientSelect = (value: string) => {
    const selectedGuide = guias.find((g: any) => g.id === deliveryForm.guiaDespachoId);
    if (selectedGuide && value) {
      const det = (selectedGuide.detalle ?? []).find((d: any) => d.clienteInternoId === value);
      if (det) {
        setDeliveryForm({
          ...deliveryForm,
          clienteId: det.clienteInternoId,
          clienteNombreSnapshot: det.clienteInternoNombre || '',
          clienteDireccionSnapshot: det.direccionInterno || '',
          tipoCajaId: det.tipoCajaId || deliveryForm.tipoCajaId,
          cajasSolicitadas: String(det.cantidad),
          cajasEntregadas: String(det.cantidad),
          cajasDevueltas: '0',
          montoCobrado: String(det.subtotal),
        });
        return;
      }
    }
    const client = clients?.find((c: any) => c.id === value);
    if (client) {
      setDeliveryForm({ ...deliveryForm, clienteId: client.id, clienteNombreSnapshot: client.nombreComercial, clienteDireccionSnapshot: client.direccion || '' });
    }
  };

  const handleGuideSelect = (guideId: string) => {
    setDeliveryForm({ ...emptyDeliveryForm, guiaDespachoId: guideId });
  };

  const deliveredClientIds = new Set(
    entregas
      .filter((e: any) => e.guiaDespachoId === deliveryForm.guiaDespachoId)
      .map((e: any) => e.clienteId)
  );

  const filteredClients = deliveryForm.guiaDespachoId
    ? (guias.find((g: any) => g.id === deliveryForm.guiaDespachoId)?.detalle ?? [])
        .filter((d: any) => d.clienteInternoId)
        .filter((d: any) => !deliveredClientIds.has(d.clienteInternoId))
        .map((d: any) => ({
          id: d.clienteInternoId,
          nombreComercial: d.clienteInternoNombre,
          direccion: d.direccionInterno,
        }))
    : (clients ?? []).filter((c: any) => !new Set(entregas.filter((e: any) => !e.guiaDespachoId).map((e: any) => e.clienteId)).has(c.id));

  const handleEstadoEntregaChange = (estado: string) => {
    const updated = { ...deliveryForm, estado };
    if (estado === 'rechazado') {
      updated.cajasEntregadas = '0';
      updated.cajasDevueltas = String(Number(deliveryForm.cajasSolicitadas) || 0);
      updated.montoCobrado = '0';
      updated.motivoRechazo = '';
    } else if (estado === 'parcial') {
      updated.cajasDevueltas = String(Math.max(0, (Number(deliveryForm.cajasSolicitadas) || 0) - (Number(deliveryForm.cajasEntregadas) || 0)));
    }
    if (estado === 'entregado') {
      updated.motivoRechazo = '';
    }
    setDeliveryForm(updated);
  };

  const handleAddDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      rutaId: id,
      clienteId: deliveryForm.clienteId,
      clienteNombreSnapshot: deliveryForm.clienteNombreSnapshot,
      clienteDireccionSnapshot: deliveryForm.clienteDireccionSnapshot || undefined,
      guiaDespachoId: deliveryForm.guiaDespachoId || undefined,
      tipoCajaId: deliveryForm.tipoCajaId || undefined,
      cajasSolicitadas: Number(deliveryForm.cajasSolicitadas) || 0,
      cajasEntregadas: Number(deliveryForm.cajasEntregadas),
      cajasDevueltas: Number(deliveryForm.cajasDevueltas) || 0,
      montoCobrado: Number(deliveryForm.montoCobrado) || 0,
      estado: deliveryForm.estado,
      motivoRechazo: (deliveryForm.estado === 'rechazado' || deliveryForm.estado === 'parcial') ? deliveryForm.motivoRechazo : undefined,
      observaciones: deliveryForm.observaciones || undefined,
    };
    createDeliveryMut.mutate(payload);
  };

  const handleExportCuadre = () => {
    if (!route) return;
    const cuadreData = [
      { Concepto: 'DESPACHADO', 'Total Cajas': despachadoCajas, Monto: despachadoMonto },
      { Concepto: 'ENTREGADO', 'Total Cajas': entregadoCajas, Monto: entregadoMonto },
      { Concepto: 'DEVUELTO', 'Total Cajas': devueltoCajas, Monto: 0 },
      { Concepto: 'EFICIENCIA', 'Total Cajas': 0, Monto: Number(eficiencia.toFixed(1)) },
      { Concepto: 'INGRESOS', 'Total Cajas': 0, Monto: entregadoMonto },
      { Concepto: 'COSTOS', 'Total Cajas': 0, Monto: costos },
      { Concepto: 'BONOS', 'Total Cajas': 0, Monto: bonos },
      { Concepto: 'UTILIDAD', 'Total Cajas': 0, Monto: utilidad },
    ];
    const deliveriesData = entregas.map((e: any) => ({
      Cliente: e.clienteNombreSnapshot ?? '',
      Direccion: e.clienteDireccionSnapshot ?? '',
      'Cajas Solicitadas': e.cajasSolicitadas ?? 0,
      'Cajas Entregadas': e.cajasEntregadas ?? 0,
      'Cajas Devueltas': e.cajasDevueltas ?? 0,
      'Monto Cobrado': e.montoCobrado ?? 0,
      Estado: e.estado ?? '',
      'Hora Entrega': e.horaEntrega ? new Date(e.horaEntrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '',
    }));
    const ws1 = XLSX.utils.json_to_sheet(cuadreData);
    const ws2 = XLSX.utils.json_to_sheet(deliveriesData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Cuadre');
    XLSX.utils.book_append_sheet(wb, ws2, 'Entregas');
    XLSX.writeFile(wb, `cuadre_ruta_${route.fecha}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      <button onClick={() => navigate('/routes')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a Rutas
      </button>

      {/* Header + actions */}
      <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Ruta del {route.fecha}</h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${ec.color}`}>{ec.label}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
          <div><span className="text-gray-500">Camion:</span> <span className="font-medium">{route.camion?.patente ?? '-'}</span></div>
          <div><span className="text-gray-500">Conductor:</span> <span className="font-medium">{route.conductor?.nombre ?? '-'}</span></div>
          <div><span className="text-gray-500">Peoneta 1:</span> <span className="font-medium">{route.peoneta1?.nombre ?? '-'}</span></div>
          <div><span className="text-gray-500">Peoneta 2:</span> <span className="font-medium">{route.peoneta2?.nombre ?? '-'}</span></div>
          {route.horaSalida && <div><span className="text-gray-500">Hora Salida:</span> <span className="font-medium">{new Date(route.horaSalida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>}
          {route.horaFin && <div><span className="text-gray-500">Hora Fin:</span> <span className="font-medium">{new Date(route.horaFin).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>}
        </div>

        <div className="flex flex-wrap gap-2">
          {isPlanificada && (
            <button onClick={() => startMut.mutate()} disabled={startMut.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <PlayIcon className="h-4 w-4" /> Iniciar Ruta
            </button>
          )}
          {(isEnRuta || isReabierta) && (
            <button onClick={() => closeMut.mutate()} disabled={closeMut.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              <StopIcon className="h-4 w-4" /> Cerrar Ruta
            </button>
          )}
          {isCerrada && isAdmin && (
            <button onClick={() => reopenMut.mutate()} disabled={reopenMut.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              <ArrowPathIcon className="h-4 w-4" /> Reabrir Ruta
            </button>
          )}
          {(isEnRuta || isReabierta) && (
            <button onClick={() => { setDeliveryForm({ ...emptyDeliveryForm }); setShowDeliveryForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
              + Registrar Entrega
            </button>
          )}
          <button onClick={handleExportCuadre} className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
            <ArrowDownTrayIcon className="h-4 w-4" /> Exportar Cuadre
          </button>
        </div>
      </div>

      {/* Delivery form modal */}
      {showDeliveryForm && (
        <form onSubmit={handleAddDelivery} className="bg-white rounded-md border border-primary-300 p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Registrar Entrega</h2>
            <button type="button" onClick={() => setShowDeliveryForm(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guia de Despacho</label>
              <select value={deliveryForm.guiaDespachoId} onChange={(e) => handleGuideSelect(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Sin guia (cliente libre)</option>
                {guias.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.numeroGd} ({g.totalCajas} cajas)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
              <select value={deliveryForm.clienteId} onChange={(e) => handleClientSelect(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Seleccionar cliente</option>
                {filteredClients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombreComercial}</option>
                ))}
              </select>
              {deliveryForm.guiaDespachoId && filteredClients.length === 0 && entregas.some((e: any) => e.guiaDespachoId === deliveryForm.guiaDespachoId) && (
                <p className="text-[10px] text-green-600 mt-0.5">Todos los clientes de esta guia ya tienen entrega registrada</p>
              )}
              {deliveryForm.guiaDespachoId && filteredClients.length === 0 && !entregas.some((e: any) => e.guiaDespachoId === deliveryForm.guiaDespachoId) && (
                <p className="text-[10px] text-amber-600 mt-0.5">Esta guia no tiene clientes internos asignados en su detalle</p>
              )}
              {deliveryForm.guiaDespachoId && filteredClients.length > 0 && entregas.some((e: any) => e.guiaDespachoId === deliveryForm.guiaDespachoId) && (
                <p className="text-[10px] text-gray-500 mt-0.5">{filteredClients.length} cliente(s) pendiente(s) de entrega</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Caja</label>
              <select value={deliveryForm.tipoCajaId} onChange={(e) => setDeliveryForm({ ...deliveryForm, tipoCajaId: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">Sin tipo</option>
                {boxTypes?.map((bt: any) => (
                  <option key={bt.id} value={bt.id}>{bt.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cajas Solicitadas</label>
              <input type="number" min="0" value={deliveryForm.cajasSolicitadas} onChange={(e) => setDeliveryForm({ ...deliveryForm, cajasSolicitadas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cajas Entregadas *</label>
              <input type="number" min="0" required value={deliveryForm.estado === 'rechazado' ? 0 : deliveryForm.cajasEntregadas} onChange={(e) => setDeliveryForm({ ...deliveryForm, cajasEntregadas: e.target.value })} readOnly={deliveryForm.estado === 'rechazado'} className={`w-full rounded-md border px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${deliveryForm.estado === 'rechazado' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'border-gray-300'}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cajas Devueltas</label>
              <input type="number" min="0" value={deliveryForm.cajasDevueltas} onChange={(e) => setDeliveryForm({ ...deliveryForm, cajasDevueltas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto Cobrado ($) *</label>
              <input type="number" min="0" required value={deliveryForm.estado === 'rechazado' ? 0 : deliveryForm.montoCobrado} onChange={(e) => setDeliveryForm({ ...deliveryForm, montoCobrado: e.target.value })} readOnly={deliveryForm.estado === 'rechazado'} className={`w-full rounded-md border px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${deliveryForm.estado === 'rechazado' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'border-gray-300'}`} />
              {deliveryForm.estado === 'rechazado' && <p className="text-[10px] text-red-500 mt-0.5">Rechazado: monto = $0 (no se cobro)</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado *</label>
              <select value={deliveryForm.estado} onChange={(e) => handleEstadoEntregaChange(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="entregado">Entregado</option>
                <option value="parcial">Parcial</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            {(deliveryForm.estado === 'rechazado' || deliveryForm.estado === 'parcial') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motivo Rechazo *</label>
                <select value={deliveryForm.motivoRechazo} onChange={(e) => setDeliveryForm({ ...deliveryForm, motivoRechazo: e.target.value })} required className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                  <option value="">Seleccionar</option>
                  {MOTIVOS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>
            )}
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
              <input type="text" value={deliveryForm.observaciones} onChange={(e) => setDeliveryForm({ ...deliveryForm, observaciones: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowDeliveryForm(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={createDeliveryMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {createDeliveryMut.isPending ? 'Guardando...' : 'Registrar Entrega'}
            </button>
          </div>
          {createDeliveryMut.isError && <p className="text-xs text-red-600">Error al registrar entrega</p>}
        </form>
      )}

      {/* Guias de Despacho */}
      {guias.length > 0 && (
        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Guias de Despacho ({guias.length})</h2>
          {guias.map((g: any) => {
            const detalle = g.detalle ?? [];
            const isAbierta = g.estado === 'abierta';
            return (
              <div key={g.id} className="border border-gray-100 rounded-md mb-3 overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">GD {g.numeroGd}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${isAbierta ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{isAbierta ? 'Abierta' : 'Cerrada'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{g.totalCajas} cajas</span>
                    <span>{fmt(g.totalMonto)}</span>
                    {canAct && isAbierta && (
                      <button onClick={() => closeGuideMut.mutate(g.id)} disabled={closeGuideMut.isPending} className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-50">
                        <CheckIcon className="h-3 w-3" /> Cerrar Guia
                      </button>
                    )}
                    <button onClick={() => navigate(`/dispatch-guides/${g.id}`)} className="text-xs text-primary-600 hover:text-primary-800 hover:underline">Ver detalle</button>
                  </div>
                </div>
                {detalle.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-400 uppercase">Cliente</th>
                          <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-400 uppercase">Direccion</th>
                          <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-400 uppercase">Tipo Caja</th>
                          <th className="px-3 py-1.5 text-right text-[10px] font-medium text-gray-400 uppercase">Cant</th>
                          <th className="px-3 py-1.5 text-right text-[10px] font-medium text-gray-400 uppercase">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {detalle.map((d: any) => (
                          <tr key={d.id} className="text-xs">
                            <td className="px-3 py-1.5 text-gray-900 font-medium">{d.clienteInternoNombre || '-'}</td>
                            <td className="px-3 py-1.5 text-gray-500">{d.direccionInterno || '-'}</td>
                            <td className="px-3 py-1.5 text-gray-500">{boxTypes?.find((bt: any) => bt.id === d.tipoCajaId)?.nombre ?? '-'}</td>
                            <td className="px-3 py-1.5 text-right text-gray-900">{d.cantidad}</td>
                            <td className="px-3 py-1.5 text-right text-gray-900">{fmt(d.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Entregas registradas */}
      {entregas.length > 0 && (
        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Entregas ({entregas.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Solicitadas</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Entregadas</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Devueltas</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                  {isAdmin && <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entregas.map((e: any) => {
                  const el = estadoEntrega[e.estado] ?? { label: e.estado, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-sm font-medium">{e.clienteNombreSnapshot ?? '-'}</td>
                      <td className="px-3 py-2 text-sm text-right">{e.cajasSolicitadas ?? '-'}</td>
                      <td className="px-3 py-2 text-sm text-right text-green-700">{e.cajasEntregadas}</td>
                      <td className="px-3 py-2 text-sm text-right text-red-600">{e.cajasDevueltas}</td>
                      <td className="px-3 py-2 text-sm text-right">{fmt(e.montoCobrado)}</td>
                      <td className="px-3 py-2 text-sm"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${el.color}`}>{el.label}</span></td>
                      <td className="px-3 py-2 text-sm">{e.horaEntrega ? new Date(e.horaEntrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => { if (confirm('Eliminar entrega?')) deleteDeliveryMut.mutate(e.id); }} className="text-red-500 hover:text-red-700"><XMarkIcon className="h-4 w-4" /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state for deliveries when en_ruta */}
      {entregas.length === 0 && canAct && (
        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4 text-center">
          <p className="text-sm text-gray-500 mb-2">No hay entregas registradas</p>
          <button onClick={() => { setDeliveryForm({ ...emptyDeliveryForm }); setShowDeliveryForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
            + Registrar Primera Entrega
          </button>
        </div>
      )}

      {/* Cuadre */}
      {(() => {
        const margen = entregadoMonto > 0 ? (utilidad / entregadoMonto * 100) : 0;
        const row = (label: string, cajas: string | number, monto?: string | number, highlight?: boolean) => (
          <div className={`flex justify-between py-1.5 ${highlight ? 'font-bold border-t pt-2 mt-1' : ''}`}>
            <span className={highlight ? 'text-gray-900' : 'text-gray-600'}>{label}</span>
            <div className="flex gap-6">
              <span className="text-right w-28">{typeof cajas === 'number' ? cajas : cajas}</span>
              {monto !== undefined && <span className="text-right w-28">{typeof monto === 'number' ? fmt(monto) : monto}</span>}
            </div>
          </div>
        );
        return (
          <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Cuadre</h2>
            <div className="text-sm space-y-0">
              {row('DESPACHADO', despachadoCajas, despachadoMonto)}
              {row('ENTREGADO', entregadoCajas, entregadoMonto)}
              {row('DEVUELTO', devueltoCajas)}
              {row('EFICIENCIA', `${eficiencia.toFixed(1)}%`)}
              <div className="border-t pt-2 mt-2" />
              {row('INGRESOS', '-', fmt(entregadoMonto))}
              {row('COSTOS', '-', fmt(costos))}
              {row('BONOS', '-', fmt(bonos))}
              {row('UTILIDAD', '-', fmt(utilidad), true)}
              {row('MARGEN', `${margen.toFixed(1)}%`, undefined, true)}
            </div>
          </div>
        );
      })()}

      {/* Costos */}
      {route.costos && (
        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Costos Operacionales</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Arriendo Camion</span><span className="font-medium">{fmt(route.costos.arriendoCamion ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Sueldo Conductor</span><span className="font-medium">{fmt(route.costos.sueldoConductor ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Peonetas</span><span className="font-medium">{fmt(route.costos.peonetas ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Mantencion</span><span className="font-medium">{fmt(route.costos.mantencion ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Administracion</span><span className="font-medium">{fmt(route.costos.administracion ?? 0)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total Costos</span><span>{fmt(route.costos.totalCostos ?? 0)}</span></div>
          </div>
        </div>
      )}

      {/* Bonos */}
      {route.bono && (
        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Bono Calculado</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Cajas Excedentes:</span> <span className="font-medium">{route.bono.cajasExcedentes ?? 0}</span></div>
            <div><span className="text-gray-500">Bono Total:</span> <span className="font-medium">{fmt(route.bono.bonoTotal ?? 0)}</span></div>
            <div><span className="text-gray-500">Bono por Persona:</span> <span className="font-medium">{fmt(route.bono.bonoPorPersona ?? 0)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}