import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, CubeIcon } from '@heroicons/react/24/outline';
import { api, apiPost, apiPut, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface BoxType {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioUnitario: number;
  litrosPorCaja: number;
  activo: boolean;
}

const emptyForm = { nombre: '', descripcion: '', precioUnitario: '', litrosPorCaja: '', activo: true };

export default function BoxTypesListPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BoxType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: boxTypes, isLoading } = useQuery({
    queryKey: ['box-types'],
    queryFn: async () => {
      const res = await api.get('/api/box-types');
      const json = await res.json();
      return json.data as BoxType[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/box-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['box-types'] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/box-types', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['box-types'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/api/box-types/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['box-types'] }); resetForm(); },
  });

  const resetForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precioUnitario: Number(form.precioUnitario),
      litrosPorCaja: Number(form.litrosPorCaja) || 1,
      activo: form.activo,
    };
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload);
  };

  const startEdit = (b: BoxType) => {
    setEditing(b);
    setForm({ nombre: b.nombre, descripcion: b.descripcion ?? '', precioUnitario: b.precioUnitario.toString(), litrosPorCaja: b.litrosPorCaja.toString(), activo: b.activo });
    setShowForm(true);
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Tipos de Caja</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Agregar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{editing ? 'Editar Tipo de Caja' : 'Nuevo Tipo de Caja'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Caja 12L" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio Unitario ($) *</label>
              <input type="number" required value={form.precioUnitario} onChange={(e) => setForm({ ...form, precioUnitario: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Litros por Caja (UC) *</label>
              <input type="number" step="0.1" required value={form.litrosPorCaja} onChange={(e) => setForm({ ...form, litrosPorCaja: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="24" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripcion</label>
              <input type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
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
      ) : boxTypes && boxTypes.length > 0 ? (
        <>
        <div className="hidden md:block bg-white rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Unitario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Litros/Caja</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {boxTypes.map((b) => (
                  <tr key={b.id} className={!b.activo ? 'bg-gray-50 text-gray-400' : ''}>
                    <td className="px-4 py-3 text-sm font-medium">{b.nombre}</td>
                    <td className="px-4 py-3 text-sm">{b.descripcion ?? '-'}</td>
                    <td className="px-4 py-3 text-sm">{fmt(b.precioUnitario)}</td>
                    <td className="px-4 py-3 text-sm">{b.litrosPorCaja} lt</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${b.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {b.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right"><button onClick={() => startEdit(b)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>{isAdmin && (<button onClick={() => { if (confirm('Eliminar tipo de caja?')) deleteMut.mutate(b.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden space-y-3">
          {boxTypes.map((b) => (
            <div key={b.id} className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{b.nombre}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${b.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span className="text-gray-400">Descripcion:</span> {b.descripcion ?? '-'}</div>
                <div><span className="text-gray-400">Precio:</span> {fmt(b.precioUnitario)}</div>
                <div><span className="text-gray-400">Litros/Caja:</span> {b.litrosPorCaja} lt</div>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => startEdit(b)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && (<button onClick={() => { if (confirm('Eliminar tipo de caja?')) deleteMut.mutate(b.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <CubeIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay tipos de caja registrados</p>
        </div>
      )}
    </div>
  );
}