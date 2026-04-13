import { create } from 'zustand';
import { api } from '../lib/api';

interface Role {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  permisos: string;
}

interface User {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  roleId: string;
  tenantId: string;
  activo: boolean;
  debeCambiarPassword: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCheckedAuth: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasCheckedAuth: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Invalid credentials');
      }
      const data = await res.json();
      const { accessToken, refreshToken, user } = data.data;
      api.setTokens(accessToken, refreshToken);
      set({ user: { id: user.id, email: user.email, nombre: user.nombre, role: user.role, roleId: user.roleId, tenantId: user.tenantId, activo: user.activo, debeCambiarPassword: user.debeCambiarPassword }, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch { /* ignore */ }
    api.clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  loadUser: async () => {
    api.loadTokens();
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      set({ user: null, isAuthenticated: false, isLoading: false, hasCheckedAuth: true });
      return;
    }
    set({ isLoading: true });
    try {
      const res = await api.get('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        set({ user: data.data, isAuthenticated: true, isLoading: false, hasCheckedAuth: true });
      } else if (res.status === 401) {
        const refreshed = await api.refreshTokens();
        if (refreshed) {
          const retry = await api.get('/api/auth/me');
          if (retry.ok) {
            const data = await retry.json();
            set({ user: data.data, isAuthenticated: true, isLoading: false, hasCheckedAuth: true });
            return;
          }
        }
        api.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false, hasCheckedAuth: true });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, hasCheckedAuth: true });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false, hasCheckedAuth: true });
    }
  },
}));