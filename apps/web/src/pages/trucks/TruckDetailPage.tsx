import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { api, apiPost, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

const propiedadBadges: Record<string, { label: string; color: string }> = {
  propio: { label: 'Propio', color: 'bg-green-100 text-green-700' },
  arrendado: { label: 'Arrendado', color: 'bg-yellow-100 text-yellow-700' },
  leasing: { label: 'Leasing', color: 'bg-blue-100 text-blue-700' },
};

const gasolineraLabels: Record<string, string> = {
  COPEC: 'COPEC',
  SHELL: 'Shell',
  ARAMCO: 'Aramco',
  OTRO: 'Otro',
};

const tipoMantencionLabels: Record<string, string> = {
  preventiva: 'Preventiva',
  correctiva: 'Correctiva',
  neumaticos: 'Neumaticos',
  lubricacion: 'Lubricacion',
  revision_tecnica: 'Revision Tecnica',
  otro: 'Otro',
};

interface FuelLoad {
  id: string;
  fecha: string;
  kmVehiculo: number | null;
  litros: number;
  precioPorLitro: number;
  montoTotal: number;
  gasolinera: string;
  conductorRut: string | null;
  observaciones: string | null;
}

interface Maintenance {
  id: string;
  fecha: string;
  kmVehiculo: number | null;
  kmProxMantencion: number | null;
  tipoMantencion: string;
  descripcion: string | null;
  costo: number | null;
  taller: string | null;
  observaciones: string | null;
}

interface TruckDetail {
  id: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  capacidadCajas: number | null;
  tipoPropiedad: string;
  kmActual: number | null;
  activo: boolean;
  fuelLoads: FuelLoad[];
  maintenance: Maintenance[];
}

const emptyFuelForm = { fecha: '', kmVehiculo: '', litros: '', precioPorLitro: '', gasolinera: 'COPEC', conductorRut: '', observaciones: '' };
const emptyMantForm = { fecha: '', kmVehiculo: '', kmProxMantencion: '', tipoMantencion: 'preventiva', descripcion: '', costo: '', taller: '', observaciones: '' };

export default function TruckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';

  const [tab, setTab] = useState<'info' | 'combustible' | 'mantencion'>('info');
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelForm, setFuelForm] = useState(emptyFuelForm);
  const [showMantForm, setShowMantForm] = useState(false);
  const [mantForm, setMantForm] = useState(emptyMantForm);

  const { data: truck, isLoading } = useQuery({
    queryKey: ['truck', id],
    queryFn: async () => {
      const res = await api.get(`/api/trucks/${id}`);
      const json = await res.json();
      return json.data as TruckDetail;
    },
    enabled: !!id,
  });

  const createFuelMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/fuel-loads', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['truck', id] }); setShowFuelForm(false); setFuelForm(emptyFuelForm); },
  });

  const deleteFuelMut = useMutation({
    mutationFn: (fuelId: string) => apiDel(`/api/fuel-loads/${fuelId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['truck', id] }),
  });

  const createMantMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/maintenance', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['truck', id] }); setShowMantForm(false); setMantForm(emptyMantForm); },
  });

  const deleteMantMut = useMutation({
    mutationFn: (mantId: string) => apiDel(`/api/maintenance/${mantId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['truck', id] }),
  });

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const litros = Number(fuelForm.litros) || 0;
    const precio = Number(fuelForm.precioPorLitro) || 0;
    createFuelMut.mutate({
      camionId: id,
      fecha: fuelForm.fecha,
      kmVehiculo: fuelForm.kmVehiculo ? Number(fuelForm.kmVehiculo) : null,
      litros,
      precioPorLitro: precio,
      montoTotal: litros * precio,
      gasolinera: fuelForm.gasolinera,
      conductorRut: fuelForm.conductorRut || null,
      observaciones: fuelForm.observaciones || null,
    });
  };

  const handleMantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMantMut.mutate({
      camionId: id,
      fecha: mantForm.fecha,
      kmVehiculo: mantForm.kmVehiculo ? Number(mantForm.kmVehiculo) : null,
      kmProxMantencion: mantForm.kmProxMantencion ? Number(mantForm.kmProxMantencion) : null,
      tipoMantencion: mantForm.tipoMantencion,
      descripcion: mantForm.descripcion || null,
      costo: mantForm.costo ? Number(mantForm.costo) : null,
      taller: mantForm.taller || null,
      observaciones: mantForm.observaciones || null,
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!truck) return <div className="text-center py-12 text-gray-500">Camion no encontrado</div>;

  const pb = propiedadBadges[truck.tipoPropiedad] ?? { label: truck.tipoPropiedad, color: 'bg-gray-100 text-gray-600' };

  const tabs = [
    { key: 'info' as const, label: 'Informacion' },
    { key: 'combustible' as const, label: 'Combustible' },
    { key: 'mantencion' as const, label: 'Mantencion' },
  ];

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div>
      <button onClick={() => navigate('/trucks')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a Camiones
      </button>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="bg-white rounded-md border border-gray-200 p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{truck.patente}</h1>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500 block text-xs">Marca</span><span className="font-medium">{truck.marca ?? '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">Modelo</span><span className="font-medium">{truck.modelo ?? '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">Anio</span><span className="font-medium">{truck.anio ?? '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">Capacidad (cajas)</span><span className="font-medium">{truck.capacidadCajas ?? '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">Propiedad</span><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pb.color}`}>{pb.label}</span></div>
            <div><span className="text-gray-500 block text-xs">KM Actual</span><span className="font-medium">{truck.kmActual != null ? truck.kmActual.toLocaleString('es-CL') : '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">Estado</span><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${truck.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{truck.activo ? 'Activo' : 'Inactivo'}</span></div>
          </div>
        </div>
      )}

      {tab === 'combustible' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cargas de Combustible</h2>
            <button onClick={() => { setFuelForm(emptyFuelForm); setShowFuelForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <PlusIcon className="h-4 w-4" /> Nueva Carga
            </button>
          </div>

          {showFuelForm && (
            <form onSubmit={handleFuelSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Nueva Carga</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fecha *</label>
                  <input type="date" required value={fuelForm.fecha} onChange={(e) => setFuelForm({ ...fuelForm, fecha: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Km Vehiculo</label>
                  <input type="number" value={fuelForm.kmVehiculo} onChange={(e) => setFuelForm({ ...fuelForm, kmVehiculo: e.target.value })} className={inputCls} placeholder="Km vehiculo" />
                </div>
                <div>
                  <label className={labelCls}>Litros *</label>
                  <input type="number" step="0.01" required value={fuelForm.litros} onChange={(e) => setFuelForm({ ...fuelForm, litros: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Precio/Lt *</label>
                  <input type="number" step="0.01" required value={fuelForm.precioPorLitro} onChange={(e) => setFuelForm({ ...fuelForm, precioPorLitro: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  Monto Total: <span className="font-medium">{fmt((Number(fuelForm.litros) || 0) * (Number(fuelForm.precioPorLitro) || 0))}</span>
                </div>
                <div>
                  <label className={labelCls}>Gasolinera *</label>
                  <select value={fuelForm.gasolinera} onChange={(e) => setFuelForm({ ...fuelForm, gasolinera: e.target.value })} className={inputCls}>
                    {Object.entries(gasolineraLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Conductor RUT</label>
                  <input type="text" value={fuelForm.conductorRut} onChange={(e) => setFuelForm({ ...fuelForm, conductorRut: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Observaciones</label>
                  <input type="text" value={fuelForm.observaciones} onChange={(e) => setFuelForm({ ...fuelForm, observaciones: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowFuelForm(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createFuelMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createFuelMut.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {createFuelMut.isError && <p className="text-xs text-red-600">Error al guardar</p>}
            </form>
          )}

          {truck.fuelLoads && truck.fuelLoads.length > 0 ? (
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Km</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Litros</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio/Lt</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gasolinera</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conductor RUT</th>
                      {isAdmin && <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {truck.fuelLoads.map((fl) => (
                      <tr key={fl.id}>
                        <td className="px-3 py-2 text-sm">{fl.fecha ? new Date(fl.fecha).toLocaleDateString('es-CL') : '-'}</td>
                        <td className="px-3 py-2 text-sm text-right">{fl.kmVehiculo != null ? fl.kmVehiculo.toLocaleString('es-CL') : '-'}</td>
                        <td className="px-3 py-2 text-sm text-right">{fl.litros}</td>
                        <td className="px-3 py-2 text-sm text-right">{fmt(fl.precioPorLitro)}</td>
                        <td className="px-3 py-2 text-sm text-right">{fmt(fl.montoTotal)}</td>
                        <td className="px-3 py-2 text-sm">{gasolineraLabels[fl.gasolinera] ?? fl.gasolinera}</td>
                        <td className="px-3 py-2 text-sm">{fl.conductorRut ?? '-'}</td>
                        {isAdmin && (
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => { if (confirm('Eliminar carga?')) deleteFuelMut.mutate(fl.id); }} className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-md border border-gray-200 p-8 text-center text-gray-500">Sin registros de combustible</div>
          )}
        </div>
      )}

      {tab === 'mantencion' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Mantenciones</h2>
            <button onClick={() => { setMantForm(emptyMantForm); setShowMantForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <PlusIcon className="h-4 w-4" /> Nueva Mantencion
            </button>
          </div>

          {showMantForm && (
            <form onSubmit={handleMantSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Nueva Mantencion</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fecha *</label>
                  <input type="date" required value={mantForm.fecha} onChange={(e) => setMantForm({ ...mantForm, fecha: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Km Vehiculo</label>
                  <input type="number" value={mantForm.kmVehiculo} onChange={(e) => setMantForm({ ...mantForm, kmVehiculo: e.target.value })} className={inputCls} placeholder="Km vehiculo" />
                </div>
                <div>
                  <label className={labelCls}>Km Prox. Mantencion</label>
                  <input type="number" value={mantForm.kmProxMantencion} onChange={(e) => setMantForm({ ...mantForm, kmProxMantencion: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tipo Mantencion *</label>
                  <select value={mantForm.tipoMantencion} onChange={(e) => setMantForm({ ...mantForm, tipoMantencion: e.target.value })} className={inputCls}>
                    {Object.entries(tipoMantencionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Descripcion</label>
                  <input type="text" value={mantForm.descripcion} onChange={(e) => setMantForm({ ...mantForm, descripcion: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Costo</label>
                  <input type="number" step="0.01" value={mantForm.costo} onChange={(e) => setMantForm({ ...mantForm, costo: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Taller</label>
                  <input type="text" value={mantForm.taller} onChange={(e) => setMantForm({ ...mantForm, taller: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Observaciones</label>
                  <input type="text" value={mantForm.observaciones} onChange={(e) => setMantForm({ ...mantForm, observaciones: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowMantForm(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createMantMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createMantMut.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {createMantMut.isError && <p className="text-xs text-red-600">Error al guardar</p>}
            </form>
          )}

          {truck.maintenance && truck.maintenance.length > 0 ? (
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Km</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prox. Mantencion</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Costo</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Taller</th>
                      {isAdmin && <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {truck.maintenance.map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 text-sm">{m.fecha ? new Date(m.fecha).toLocaleDateString('es-CL') : '-'}</td>
                        <td className="px-3 py-2 text-sm text-right">{m.kmVehiculo != null ? m.kmVehiculo.toLocaleString('es-CL') : '-'}</td>
                        <td className="px-3 py-2 text-sm text-right">{m.kmProxMantencion != null ? m.kmProxMantencion.toLocaleString('es-CL') : '-'}</td>
                        <td className="px-3 py-2 text-sm">{tipoMantencionLabels[m.tipoMantencion] ?? m.tipoMantencion}</td>
                        <td className="px-3 py-2 text-sm max-w-xs truncate">{m.descripcion ?? '-'}</td>
                        <td className="px-3 py-2 text-sm text-right">{m.costo != null ? fmt(m.costo) : '-'}</td>
                        <td className="px-3 py-2 text-sm">{m.taller ?? '-'}</td>
                        {isAdmin && (
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => { if (confirm('Eliminar mantencion?')) deleteMantMut.mutate(m.id); }} className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-md border border-gray-200 p-8 text-center text-gray-500">Sin registros de mantencion</div>
          )}
        </div>
      )}
    </div>
  );
}