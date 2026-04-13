import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api, apiPost, apiPut, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface Client {
  id: string;
  nombreComercial: string;
  razonSocial: string | null;
  rutSap: string | null;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  telefono: string | null;
  tipoCliente: string;
  activo: boolean;
}

const emptyForm = { nombreComercial: '', razonSocial: '', rutSap: '', direccion: '', comuna: '', ciudad: '', telefono: '', tipoCliente: 'minorista', activo: true };

export default function ClientsListPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dupWarning, setDupWarning] = useState<{ field: string; nombreComercial: string; rutSap: string | null } | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await api.get('/api/clients');
      const json = await res.json();
      return json.data as Client[];
    },
  });

  const checkDuplicate = useCallback(async (field: 'rutSap' | 'nombreComercial', value: string) => {
    if (!value || (editing && field === 'rutSap' && value === editing.rutSap) || (editing && field === 'nombreComercial' && value === editing.nombreComercial)) {
      setDupWarning(null);
      return;
    }
    try {
      const params = new URLSearchParams({ [field]: value });
      if (editing) params.set('excludeId', editing.id);
      const res = await api.get(`/api/clients/check-duplicate?${params.toString()}`);
      const json = await res.json();
      if (json.duplicate) {
        setDupWarning({ field: json.field, nombreComercial: json.existing.nombreComercial, rutSap: json.existing.rutSap });
      } else {
        setDupWarning(null);
      }
    } catch {
      setDupWarning(null);
    }
  }, [editing]);

  useEffect(() => {
    if (form.rutSap.length >= 4) {
      const timer = setTimeout(() => checkDuplicate('rutSap', form.rutSap), 500);
      return () => clearTimeout(timer);
    }
    setDupWarning(null);
  }, [form.rutSap, checkDuplicate]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/clients', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/api/clients/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); resetForm(); },
  });

  const resetForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); setDupWarning(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombreComercial: form.nombreComercial,
      razonSocial: form.razonSocial || null,
      rutSap: form.rutSap || null,
      direccion: form.direccion || null,
      comuna: form.comuna || null,
      ciudad: form.ciudad || null,
      telefono: form.telefono || null,
      tipoCliente: form.tipoCliente,
      activo: form.activo,
    };
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload);
  };

  const startEdit = (c: Client) => {
    setEditing(c);
    setForm({ nombreComercial: c.nombreComercial, razonSocial: c.razonSocial ?? '', rutSap: c.rutSap ?? '', direccion: c.direccion ?? '', comuna: c.comuna ?? '', ciudad: c.ciudad ?? '', telefono: c.telefono ?? '', tipoCliente: c.tipoCliente, activo: c.activo });
    setDupWarning(null);
    setShowForm(true);
  };

  const mutError = createMut.isError || updateMut.isError;
  const mutErrorMsg = (createMut.error as Error)?.message || (updateMut.error as Error)?.message || 'Error al guardar';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Agregar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          {dupWarning && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800">
                Ya existe un cliente con {dupWarning.field === 'rutSap' ? 'RUT/SAP' : 'nombre'} <strong>{form[dupWarning.field as keyof typeof form]}</strong>: <strong>{dupWarning.nombreComercial}</strong>{dupWarning.rutSap ? ` (${dupWarning.rutSap})` : ''}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre Comercial *</label>
              <input type="text" required value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Razon Social</label>
              <input type="text" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RUT / SAP</label>
              <input type="text" value={form.rutSap} onChange={(e) => { setForm({ ...form, rutSap: e.target.value }); setDupWarning(null); }} className={`w-full rounded-md border px-3 py-1.5 text-sm focus:ring-1 ${dupWarning?.field === 'rutSap' ? 'border-amber-400 focus:border-amber-500' : 'border-gray-300 focus:border-primary-500'}`} placeholder="RUT o SAP" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
              <select value={form.tipoCliente} onChange={(e) => setForm({ ...form, tipoCliente: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="minorista">Minorista</option>
                <option value="mayorista">Mayorista</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Direccion</label>
              <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comuna</label>
              <input type="text" value={form.comuna} onChange={(e) => setForm({ ...form, comuna: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
              <input type="text" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefono</label>
              <input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
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
          {mutError && <p className="text-xs text-red-600">{mutErrorMsg}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : clients && clients.length > 0 ? (
        <>
        <div className="hidden md:block bg-white rounded-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUT / SAP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ciudad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((c) => (
                  <tr key={c.id} className={!c.activo ? 'bg-gray-50 text-gray-400' : ''}>
                    <td className="px-4 py-3 text-sm font-medium">{c.nombreComercial}</td>
                    <td className="px-4 py-3 text-sm">{c.rutSap ?? '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.tipoCliente === 'mayorista' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.tipoCliente === 'mayorista' ? 'Mayorista' : 'Minorista'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{c.ciudad ?? '-'}</td>
                    <td className="px-4 py-3 text-sm">{c.telefono ?? '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right"><button onClick={() => startEdit(c)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>{isAdmin && (<button onClick={() => { if (confirm('Eliminar cliente?')) deleteMut.mutate(c.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden space-y-3">
          {clients.map((c) => (
            <div key={c.id} className="bg-white rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">{c.nombreComercial}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span className="text-gray-400">RUT/SAP:</span> {c.rutSap ?? '-'}</div>
                <div><span className="text-gray-400">Tipo:</span> <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.tipoCliente === 'mayorista' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{c.tipoCliente === 'mayorista' ? 'Mayorista' : 'Minorista'}</span></div>
                <div><span className="text-gray-400">Ciudad:</span> {c.ciudad ?? '-'}</div>
                <div><span className="text-gray-400">Telefono:</span> {c.telefono ?? '-'}</div>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => startEdit(c)} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>
                {isAdmin && (<button onClick={() => { if (confirm('Eliminar cliente?')) deleteMut.mutate(c.id); }} className="text-red-500 hover:text-red-700 ml-2"><TrashIcon className="h-4 w-4" /></button>)}
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay clientes registrados</p>
        </div>
      )}
    </div>
  );
}