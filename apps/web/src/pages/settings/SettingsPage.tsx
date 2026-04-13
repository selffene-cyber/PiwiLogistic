import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, apiPut, apiPatch, apiDel } from '../../lib/api';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';

interface TenantConfig {
  diasHabilesMes: number;
  baseCajasBono: number;
  horaInicioOperacion: string;
  horaCierreOperacion: string;
  bloquearEdicionRutaCerrada: boolean;
  usarAuditoria: boolean;
  moneda: string;
  costoArriendoCamionMensual: number;
  costoMantencionMensual: number;
  costoAdministracionMensual: number;
}

interface UserItem {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  roleId: string;
  roleNombre?: string;
  roleCodigo?: string;
}


const fmt = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(v) || 0);

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role?.codigo === 'ADMIN';
  const [editConfig, setEditConfig] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [configForm, setConfigForm] = useState<TenantConfig | null>(null);
  const [userForm, setUserForm] = useState({ nombre: '', email: '', password: '', roleId: '' });

  const { data: tenant, isLoading: loadingTenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => { const res = await api.get('/api/tenants/current'); return (await res.json()).data; },
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => { const res = await api.get('/api/users'); return (await res.json()).data as UserItem[]; },
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: string) => apiDel(`/api/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const configMut = useMutation({
    mutationFn: (data: any) => apiPut('/api/tenants/current/config', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant'] }); setEditConfig(false); },
  });

  const createUserMut = useMutation({
    mutationFn: (data: any) => apiPost('/api/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowUserForm(false); setUserForm({ nombre: '', email: '', password: '', roleId: '' }); },
  });

  const toggleUserMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => apiPatch(`/api/users/${id}/status`, { activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const startEditConfig = () => {
    if (tenant?.config) {
      setConfigForm({ ...tenant.config });
      setEditConfig(true);
    }
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm) return;
    configMut.mutate(configForm);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMut.mutate({ ...userForm, activo: true, debeCambiarPassword: true });
  };

  const isLoading = loadingTenant || loadingUsers;

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>;

  const config = tenant?.config as TenantConfig | undefined;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Configuracion</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-md border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Configuracion Operacional</h2>
            {!editConfig && <button onClick={startEditConfig} className="text-primary-600 hover:text-primary-800"><PencilIcon className="h-4 w-4" /></button>}
          </div>

          {editConfig && configForm ? (
            <form onSubmit={handleConfigSubmit} className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dias Habiles/Mes</label>
                  <input type="number" value={configForm.diasHabilesMes} onChange={(e) => setConfigForm({ ...configForm, diasHabilesMes: Number(e.target.value) })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Base Cajas Bono</label>
                  <input type="number" value={configForm.baseCajasBono} onChange={(e) => setConfigForm({ ...configForm, baseCajasBono: Number(e.target.value) })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora Inicio</label>
                  <input type="time" value={configForm.horaInicioOperacion} onChange={(e) => setConfigForm({ ...configForm, horaInicioOperacion: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora Cierre</label>
                  <input type="time" value={configForm.horaCierreOperacion} onChange={(e) => setConfigForm({ ...configForm, horaCierreOperacion: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Arriendo Camion ($)</label>
                  <input type="number" value={configForm.costoArriendoCamionMensual} onChange={(e) => setConfigForm({ ...configForm, costoArriendoCamionMensual: Number(e.target.value) })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mantencion ($)</label>
                  <input type="number" value={configForm.costoMantencionMensual} onChange={(e) => setConfigForm({ ...configForm, costoMantencionMensual: Number(e.target.value) })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Administracion ($)</label>
                  <input type="number" value={configForm.costoAdministracionMensual} onChange={(e) => setConfigForm({ ...configForm, costoAdministracionMensual: Number(e.target.value) })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={configForm.bloquearEdicionRutaCerrada} onChange={(e) => setConfigForm({ ...configForm, bloquearEdicionRutaCerrada: e.target.checked })} className="rounded border-gray-300 text-primary-600" />
                    Bloquear edicion ruta cerrada
                  </label>
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={configForm.usarAuditoria} onChange={(e) => setConfigForm({ ...configForm, usarAuditoria: e.target.checked })} className="rounded border-gray-300 text-primary-600" />
                    Usar Auditoria
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditConfig(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={configMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {configMut.isPending ? 'Guardando...' : 'Guardar Configuracion'}
                </button>
              </div>
              {configMut.isError && <p className="text-xs text-red-600">Error al guardar configuracion</p>}
            </form>
          ) : config ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="text-gray-500">Dias Habiles/Mes:</span> <span className="font-medium">{config.diasHabilesMes}</span></div>
              <div><span className="text-gray-500">Base Cajas Bono:</span> <span className="font-medium">{config.baseCajasBono}</span></div>
              <div><span className="text-gray-500">Horario:</span> <span className="font-medium">{config.horaInicioOperacion} - {config.horaCierreOperacion}</span></div>
              <div><span className="text-gray-500">Arriendo Camion:</span> <span className="font-medium">{fmt(config.costoArriendoCamionMensual)}</span></div>
              <div><span className="text-gray-500">Mantencion:</span> <span className="font-medium">{fmt(config.costoMantencionMensual)}</span></div>
              <div><span className="text-gray-500">Administracion:</span> <span className="font-medium">{fmt(config.costoAdministracionMensual)}</span></div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No se pudo cargar la configuracion</p>
          )}
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Usuarios</h2>
            <button onClick={() => setShowUserForm(true)} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800">
              <PlusIcon className="h-4 w-4" /> Agregar
            </button>
          </div>

          {showUserForm && (
            <form onSubmit={handleUserSubmit} className="bg-gray-50 rounded-md p-3 mb-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input type="text" required value={userForm.nombre} onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contrasena *</label>
                  <input type="password" required minLength={8} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
                  <select value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })} required className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                    <option value="">Seleccionar rol</option>
                    <option value="role-admin-00000000-0000-0000-0000-000000000001">Administrador</option>
                    <option value="role-super-00000000-0000-0000-0000-000000000001">Supervisor</option>
                    <option value="role-opera-00000000-0000-0000-0000-000000000001">Operador</option>
                    <option value="role-condu-00000000-0000-0000-0000-000000000001">Conductor</option>
                    <option value="role-visua-00000000-0000-0000-0000-000000000001">Visualizador</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowUserForm(false)} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createUserMut.isPending} className="flex-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {createUserMut.isPending ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
              {createUserMut.isError && <p className="text-xs text-red-600">Error al crear usuario</p>}
            </form>
          )}

          {users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className={!u.activo ? 'bg-gray-50 text-gray-400' : ''}>
                      <td className="px-4 py-3 text-sm font-medium">{u.nombre}</td>
                      <td className="px-4 py-3 text-sm">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">{u.roleCodigo ?? u.roleNombre ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => toggleUserMut.mutate({ id: u.id, activo: !u.activo })} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        {isAdmin && u.id !== user?.id && (
                          <button onClick={() => { if (confirm('Eliminar usuario?')) deleteUserMut.mutate(u.id); }} className="text-red-500 hover:text-red-700 ml-2">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No hay usuarios</p>
          )}
        </div>
      </div>
    </div>
  );
}