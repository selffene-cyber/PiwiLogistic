import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { api, apiPost, apiPut, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface BonusTier {
  id: string;
  nombre: string;
  desdeCajas: number;
  hastaCajas: number | null;
  montoPorCaja: number;
  activo: boolean;
  orden: number;
}

interface BonusData {
  bonos: any[];
  config?: { metodoReparto: string; incluirConductor: boolean; incluirPeoneta1: boolean; incluirPeoneta2: boolean };
}

const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

export default function BonusesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BonusTier | null>(null);
  const [form, setForm] = useState({ nombre: '', desdeCajas: '', hastaCajas: '', montoPorCaja: '', activo: true });

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['bonus-tiers'],
    queryFn: async () => {
      const res = await api.get('/api/bonuses/bonus-tiers');
      const json = await res.json();
      return json.data as BonusTier[];
    },
  });

  const { data: bonuses } = useQuery({
    queryKey: ['bonuses'],
    queryFn: async () => {
      const res = await api.get('/api/bonuses/bonuses');
      const json = await res.json();
      return json.data as BonusData;
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/bonuses/bonus-tiers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bonus-tiers'] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/bonuses/bonus-tiers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bonus-tiers'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/api/bonuses/bonus-tiers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bonus-tiers'] }); resetForm(); },
  });

  const resetForm = () => { setShowForm(false); setEditing(null); setForm({ nombre: '', desdeCajas: '', hastaCajas: '', montoPorCaja: '', activo: true }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      desdeCajas: Number(form.desdeCajas),
      hastaCajas: form.hastaCajas ? Number(form.hastaCajas) : null,
      montoPorCaja: Number(form.montoPorCaja),
      activo: form.activo,
    };
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload);
  };

  const startEdit = (t: BonusTier) => {
    setEditing(t);
    setForm({ nombre: t.nombre, desdeCajas: t.desdeCajas.toString(), hastaCajas: t.hastaCajas?.toString() ?? '', montoPorCaja: t.montoPorCaja.toString(), activo: t.activo });
    setShowForm(true);
  };

  const config = bonuses?.config;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Bonos</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Agregar Tramo
        </button>
      </div>

      {config && (
        <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Configuracion de Reparto</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Metodo:</span> <span className="font-medium capitalize">{config.metodoReparto}</span></div>
            <div><span className="text-gray-500">Conductor:</span> <span className="font-medium">{config.incluirConductor ? 'Si' : 'No'}</span></div>
            <div><span className="text-gray-500">Peoneta 1:</span> <span className="font-medium">{config.incluirPeoneta1 ? 'Si' : 'No'}</span></div>
            <div><span className="text-gray-500">Peoneta 2:</span> <span className="font-medium">{config.incluirPeoneta2 ? 'Si' : 'No'}</span></div>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{editing ? 'Editar Tramo' : 'Nuevo Tramo'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Tramo 1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde Cajas *</label>
              <input type="number" required value={form.desdeCajas} onChange={(e) => setForm({ ...form, desdeCajas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta Cajas</label>
              <input type="number" value={form.hastaCajas} onChange={(e) => setForm({ ...form, hastaCajas: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Sin limite" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto por Caja ($) *</label>
              <input type="number" required value={form.montoPorCaja} onChange={(e) => setForm({ ...form, montoPorCaja: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
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
      ) : tiers && tiers.length > 0 ? (
        <>
        <div className="hidden md:block bg-white rounded-md border border-gray-200 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-700 px-4 pt-3 uppercase tracking-wide">Tramos de Bono</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 mt-2">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desde</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hasta</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">$/Caja</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tiers.sort((a, b) => a.orden - b.orden).map((t) => (
                  <tr key={t.id} className={!t.activo ? 'bg-gray-50 text-gray-400' : ''}>
                    <td className="px-4 py-3 text-sm font-medium">{t.nombre}</td>
                    <td className="px-4 py-3 text-sm">{t.desdeCajas.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{t.hastaCajas ? t.hastaCajas.toLocaleString() : 'Sin limite'}</td>
                    <td className="px-4 py-3 text-sm text-right">{fmt(t.montoPorCaja)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right"><button onClick={() => startEdit(t)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>{isAdmin && (<button onClick={() => { if (confirm('Eliminar tramo?')) deleteMut.mutate(t.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tramos de Bono</h2>
          {tiers.sort((a, b) => a.orden - b.orden).map((t) => (
            <div key={t.id} className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{t.nombre}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span className="text-gray-400">Desde:</span> {t.desdeCajas.toLocaleString()}</div>
                <div><span className="text-gray-400">Hasta:</span> {t.hastaCajas ? t.hastaCajas.toLocaleString() : 'Sin limite'}</div>
                <div><span className="text-gray-400">$/Caja:</span> {fmt(t.montoPorCaja)}</div>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => startEdit(t)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && (<button onClick={() => { if (confirm('Eliminar tramo?')) deleteMut.mutate(t.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <BanknotesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay tramos de bono configurados</p>
        </div>
      )}
    </div>
  );
}