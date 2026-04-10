import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CONDUCTOR';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
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
      set({ user, isAuthenticated: true, isLoading: false, error: null });
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
    set({ isLoading: true });
    try {
      const res = await api.get('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        set({ user: data.data, isAuthenticated: true, isLoading: false });
      } else {
        api.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));