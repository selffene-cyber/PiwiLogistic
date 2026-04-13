import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import { api, apiPost, apiPut, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface Worker {
  id: string;
  nombre: string;
  rut: string;
  tipoTrabajador: string;
  costoMensualEmpresa: number | null;
  fechaIngreso: string | null;
  activo: boolean;
}

const emptyForm = { nombre: '', rut: '', tipoTrabajador: 'conductor' as string, costoMensualEmpresa: '', fechaIngreso: '', activo: true };

export default function WorkersListPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterType, setFilterType] = useState('');

  const { data: workers, isLoading } = useQuery({
    queryKey: ['workers', filterType],
    queryFn: async () => {
      const url = filterType ? `/api/workers?tipoTrabajador=${filterType}` : '/api/workers';
      const res = await api.get(url);
      const json = await res.json();
      return json.data as Worker[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/workers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workers'] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/workers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workers'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/api/workers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workers'] }); resetForm(); },
  });

  const resetForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      rut: form.rut,
      tipoTrabajador: form.tipoTrabajador,
      costoMensualEmpresa: form.costoMensualEmpresa ? Number(form.costoMensualEmpresa) : null,
      fechaIngreso: form.fechaIngreso || null,
      activo: form.activo,
    };
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload);
  };

  const startEdit = (w: Worker) => {
    setEditing(w);
    setForm({ nombre: w.nombre, rut: w.rut, tipoTrabajador: w.tipoTrabajador, costoMensualEmpresa: w.costoMensualEmpresa?.toString() ?? '', fechaIngreso: w.fechaIngreso?.split('T')[0] ?? '', activo: w.activo });
    setShowForm(true);
  };

  const tipoLabel = (t: string) => ({ conductor: 'Conductor', peoneta: 'Peoneta', administrativo: 'Administrativo' }[t] ?? t);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Trabajadores</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Agregar
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {['', 'conductor', 'peoneta', 'administrativo'].map((t) => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filterType === t ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {t === '' ? 'Todos' : tipoLabel(t)}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{editing ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RUT *</label>
              <input type="text" required value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="12345678-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
              <select value={form.tipoTrabajador} onChange={(e) => setForm({ ...form, tipoTrabajador: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="conductor">Conductor</option>
                <option value="peoneta">Peoneta</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Costo Mensual ($)</label>
              <input type="number" value={form.costoMensualEmpresa} onChange={(e) => setForm({ ...form, costoMensualEmpresa: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Ingreso</label>
              <input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
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
      ) : workers && workers.length > 0 ? (
        <>
        <div className="hidden md:block bg-white rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUT</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo Mensual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workers.map((w) => (
                  <tr key={w.id} className={!w.activo ? 'bg-gray-50 text-gray-400' : ''}>
                    <td className="px-4 py-3 text-sm font-medium">{w.nombre}</td>
                    <td className="px-4 py-3 text-sm">{w.rut}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${w.tipoTrabajador === 'conductor' ? 'bg-blue-100 text-blue-700' : w.tipoTrabajador === 'peoneta' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {tipoLabel(w.tipoTrabajador)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{w.costoMensualEmpresa ? `$${w.costoMensualEmpresa.toLocaleString('es-CL')}` : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${w.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {w.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right"><button onClick={() => startEdit(w)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>{isAdmin && (<button onClick={() => { if (confirm('Eliminar trabajador?')) deleteMut.mutate(w.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden space-y-3">
          {workers.map((w) => (
            <div key={w.id} className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{w.nombre}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${w.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {w.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span className="text-gray-400">RUT:</span> {w.rut}</div>
                <div><span className="text-gray-400">Tipo:</span> <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${w.tipoTrabajador === 'conductor' ? 'bg-blue-100 text-blue-700' : w.tipoTrabajador === 'peoneta' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{tipoLabel(w.tipoTrabajador)}</span></div>
                <div><span className="text-gray-400">Costo Mensual:</span> {w.costoMensualEmpresa ? `$${w.costoMensualEmpresa.toLocaleString('es-CL')}` : '-'}</div>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => startEdit(w)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && (<button onClick={() => { if (confirm('Eliminar trabajador?')) deleteMut.mutate(w.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay trabajadores registrados</p>
        </div>
      )}
    </div>
  );
}