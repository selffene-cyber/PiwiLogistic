import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import { api } from '../../lib/api';

export default function NewRoutePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    camionId: '',
    conductorId: '',
    peoneta1Id: '',
    peoneta2Id: '',
  });

  const { data: trucks } = useQuery({
    queryKey: ['trucks'],
    queryFn: async () => {
      const res = await api.get('/api/trucks');
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: workers } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await api.get('/api/workers');
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const conductores = workers?.filter((w: any) => w.tipoTrabajador === 'conductor') ?? [];
  const peonetas = workers?.filter((w: any) => w.tipoTrabajador === 'peoneta') ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post('/api/routes', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      navigate('/routes');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <PlusIcon className="h-5 w-5 text-primary-500" />
        <h1 className="text-xl font-bold text-gray-900">Nueva Ruta</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Camion</label>
          <select
            value={form.camionId}
            onChange={(e) => setForm({ ...form, camionId: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            required
          >
            <option value="">Seleccionar camion</option>
            {trucks?.map((t: any) => (
              <option key={t.id} value={t.id}>{t.patente} - {t.marca} {t.modelo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conductor</label>
          <select
            value={form.conductorId}
            onChange={(e) => setForm({ ...form, conductorId: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            required
          >
            <option value="">Seleccionar conductor</option>
            {conductores.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peoneta 1</label>
          <select
            value={form.peoneta1Id}
            onChange={(e) => setForm({ ...form, peoneta1Id: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Sin peoneta</option>
            {peonetas.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peoneta 2</label>
          <select
            value={form.peoneta2Id}
            onChange={(e) => setForm({ ...form, peoneta2Id: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Sin peoneta</option>
            {peonetas.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">Error al crear ruta</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/routes')}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear Ruta'}
          </button>
        </div>
      </form>
    </div>
  );
}