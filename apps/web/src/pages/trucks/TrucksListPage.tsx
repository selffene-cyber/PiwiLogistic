import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, TruckIcon } from '@heroicons/react/24/outline';
import { api, apiPost, apiPut, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface Truck {
  id: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  capacidadCajas: number | null;
  tipoPropiedad: string;
  kmActual: number | null;
  activo: boolean;
  createdAt: string;
}

const emptyForm = { patente: '', marca: '', modelo: '', anio: '', capacidadCajas: '', tipoPropiedad: 'propio', kmActual: '', activo: true };

const propiedadBadges: Record<string, { label: string; color: string }> = {
  propio: { label: 'Propio', color: 'bg-green-100 text-green-700' },
  arrendado: { label: 'Arrendado', color: 'bg-yellow-100 text-yellow-700' },
  leasing: { label: 'Leasing', color: 'bg-blue-100 text-blue-700' },
};

export default function TrucksListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: trucks, isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: async () => {
      const res = await api.get('/api/trucks');
      const json = await res.json();
      return json.data as Truck[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/trucks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trucks'] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/trucks', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trucks'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/api/trucks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trucks'] }); resetForm(); },
  });

  const resetForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      patente: form.patente,
      marca: form.marca || null,
      modelo: form.modelo || null,
      anio: form.anio ? Number(form.anio) : null,
      capacidadCajas: form.capacidadCajas ? Number(form.capacidadCajas) : null,
      tipoPropiedad: form.tipoPropiedad,
      kmActual: form.kmActual ? Number(form.kmActual) : null,
      activo: form.activo,
    };
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload);
  };

  const startEdit = (t: Truck) => {
    setEditing(t);
    setForm({
      patente: t.patente,
      marca: t.marca ?? '',
      modelo: t.modelo ?? '',
      anio: t.anio?.toString() ?? '',
      capacidadCajas: t.capacidadCajas?.toString() ?? '',
      tipoPropiedad: t.tipoPropiedad ?? 'propio',
      kmActual: t.kmActual?.toString() ?? '',
      activo: t.activo,
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Camiones</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Agregar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{editing ? 'Editar Camion' : 'Nuevo Camion'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Patente *</label>
              <input type="text" required value={form.patente} onChange={(e) => setForm({ ...form, patente: e.target.value.toUpperCase() })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="AB1234" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
              <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
              <input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Anio</label>
              <input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad (cajas)</label>
              <input type="number" value={form.capacidadCajas} onChange={(e) => setForm({ ...form, capacidadCajas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Propiedad</label>
              <select value={form.tipoPropiedad} onChange={(e) => setForm({ ...form, tipoPropiedad: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="propio">Propio</option>
                <option value="arrendado">Arrendado</option>
                <option value="leasing">Leasing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">KM Actual</label>
              <input type="number" value={form.kmActual} onChange={(e) => setForm({ ...form, kmActual: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Km actual" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                Activo
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={resetForm} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {createMut.isPending || updateMut.isPending ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
          {(createMut.isError || updateMut.isError) && <p className="text-xs text-red-600">Error al guardar</p>}
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : trucks && trucks.length > 0 ? (
        <>
        <div className="hidden md:block bg-white rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca/Modelo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Km</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trucks.map((t) => {
                  const pb = propiedadBadges[t.tipoPropiedad] ?? { label: t.tipoPropiedad, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={t.id} className={!t.activo ? 'bg-gray-50 text-gray-400' : ''}>
                      <td className="px-4 py-3 text-sm font-medium">
                        <button onClick={() => navigate(`/trucks/${t.id}`)} className="text-primary-600 hover:text-primary-800 hover:underline cursor-pointer">{t.patente}</button>
                      </td>
                      <td className="px-4 py-3 text-sm">{[t.marca, t.modelo].filter(Boolean).join(' ') || '-'}</td>
                      <td className="px-4 py-3 text-sm">{t.anio ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{t.capacidadCajas ? `${t.capacidadCajas} cajas` : '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pb.color}`}>{pb.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{t.kmActual != null ? t.kmActual.toLocaleString('es-CL') : '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => navigate(`/trucks/${t.id}`)} className="text-primary-600 hover:text-primary-800 hover:underline text-xs">Ver detalle</button>
                      </td>
                      <td className="px-4 py-3 text-right"><button onClick={() => startEdit(t)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>{isAdmin && (<button onClick={() => { if (confirm('Eliminar camion?')) deleteMut.mutate(t.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden space-y-3">
          {trucks.map((t) => {
            const pb = propiedadBadges[t.tipoPropiedad] ?? { label: t.tipoPropiedad, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={t.id} className="bg-white rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => navigate(`/trucks/${t.id}`)} className="text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline">{t.patente}</button>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                  <div><span className="text-gray-400">Marca/Modelo:</span> {[t.marca, t.modelo].filter(Boolean).join(' ') || '-'}</div>
                  <div><span className="text-gray-400">Propiedad:</span> <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pb.color}`}>{pb.label}</span></div>
                  <div><span className="text-gray-400">Anio:</span> {t.anio ?? '-'}</div>
                  <div><span className="text-gray-400">Capacidad:</span> {t.capacidadCajas ? `${t.capacidadCajas} cajas` : '-'}</div>
                  <div><span className="text-gray-400">Km:</span> {t.kmActual != null ? t.kmActual.toLocaleString('es-CL') : '-'}</div>
                </div>
                <div className="flex gap-2 mt-2 justify-end">
                  <button onClick={() => navigate(`/trucks/${t.id}`)} className="text-xs text-primary-600 hover:text-primary-800 hover:underline">Ver detalle</button>
                  <button onClick={() => startEdit(t)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>
                  {isAdmin && (<button onClick={() => { if (confirm('Eliminar camion?')) deleteMut.mutate(t.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}
                </div>
              </div>
            );
          })}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay camiones registrados</p>
        </div>
      )}
    </div>
  );
}