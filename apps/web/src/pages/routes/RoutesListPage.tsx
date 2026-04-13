import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MapIcon, PlayIcon, StopIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import { api, apiPostNoBody, apiDel } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

interface RouteItem {
  id: string;
  fecha: string;
  estado: string;
  camionId: string;
  conductorId: string;
  peoneta1Id: string | null;
  peoneta2Id: string | null;
  horaSalida: string | null;
  horaFin: string | null;
  camion?: { patente: string; marca: string | null };
  conductor?: { nombre: string };
}

const estadoConfig: Record<string, { label: string; desc: string; color: string }> = {
  planificada: { label: 'Planificada', desc: 'Lista para iniciar', color: 'bg-yellow-100 text-yellow-800' },
  en_ruta: { label: 'En Ruta', desc: 'En camino', color: 'bg-blue-100 text-blue-800' },
  cerrada: { label: 'Cerrada', desc: 'Finalizada', color: 'bg-green-100 text-green-800' },
  reabierta: { label: 'Reabierta', desc: 'Abierta para correccion', color: 'bg-orange-100 text-orange-800' },
  anulada: { label: 'Anulada', desc: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export default function RoutesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterEstado, setFilterEstado] = useState('');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';

  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes', filterEstado],
    queryFn: async () => {
      const url = filterEstado ? `/api/routes?estado=${filterEstado}` : '/api/routes';
      const res = await api.get(url);
      const json = await res.json();
      return json.data as RouteItem[];
    },
  });

  const startMut = useMutation({
    mutationFn: (id: string) => apiPostNoBody(`/api/routes/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });

  const closeMut = useMutation({
    mutationFn: (id: string) => apiPostNoBody(`/api/routes/${id}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });

  const reopenMut = useMutation({
    mutationFn: (id: string) => apiPostNoBody(`/api/routes/${id}/reopen`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/routes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Rutas</h1>
        <button onClick={() => navigate('/routes/new')} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <PlusIcon className="h-4 w-4" /> Nueva Ruta
        </button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'planificada', 'en_ruta', 'cerrada', 'reabierta', 'anulada'].map((e) => (
          <button key={e} onClick={() => setFilterEstado(e)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filterEstado === e ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {e === '' ? 'Todas' : (estadoConfig[e]?.label ?? e)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : routes && routes.length > 0 ? (
        <div className="space-y-3">
          {routes.map((r) => {
            const ec = estadoConfig[r.estado] ?? { label: r.estado, desc: '', color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={r.id} className="bg-white rounded-md border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/routes/${r.id}`)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{r.fecha}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ec.color}`}>{ec.label}</span>
                      <span className="text-[10px] text-gray-400">{ec.desc}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Camion: {r.camion?.patente ?? '-'}</span>
                      <span>Conductor: {r.conductor?.nombre ?? '-'}</span>
                      {r.horaSalida && <span>Salida: {new Date(r.horaSalida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
                      {r.horaFin && <span>Fin: {new Date(r.horaFin).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 ml-2">
                    {r.estado === 'planificada' && (
                      <button onClick={() => startMut.mutate(r.id)} disabled={startMut.isPending} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-50">
                        <PlayIcon className="h-3 w-3" /> Iniciar
                      </button>
                    )}
                    {r.estado === 'en_ruta' && (
                      <button onClick={() => closeMut.mutate(r.id)} disabled={closeMut.isPending} className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-50">
                        <StopIcon className="h-3 w-3" /> Cerrar
                      </button>
                    )}
                    {r.estado === 'cerrada' && isAdmin && (
                      <button onClick={() => reopenMut.mutate(r.id)} disabled={reopenMut.isPending} className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 border border-orange-200 disabled:opacity-50">
                        <ArrowPathIcon className="h-3 w-3" /> Reabrir
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => { if (confirm('Eliminar ruta? Se eliminaran guias, entregas, costos y bonos asociados.')) deleteMut.mutate(r.id); }} disabled={deleteMut.isPending} className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50">
                        <TrashIcon className="h-3 w-3" /> Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
          <MapIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay rutas registradas</p>
        </div>
      )}
    </div>
  );
}