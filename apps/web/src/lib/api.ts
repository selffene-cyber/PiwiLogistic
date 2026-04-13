const API_BASE = import.meta.env.VITE_API_URL || 'https://piwi-api.jeans-selfene.workers.dev';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        return fetch(`${API_BASE}${url}`, { ...options, headers });
      }
    }

    return response;
  }

  async refreshTokens(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this._doRefresh();
    try {
      return await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  private async _doRefresh(): Promise<boolean> {
    const rt = this.refreshToken;
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.data.accessToken;
        localStorage.setItem('accessToken', this.accessToken!);
        return true;
      }
    } catch { /* ignore network errors */ }
    return false;
  }

  async get(url: string) { return this.request(url); }
  async post(url: string, body: unknown) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); }
  async put(url: string, body: unknown) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); }
  async patch(url: string, body: unknown) { return this.request(url, { method: 'PATCH', body: JSON.stringify(body) }); }
  async del(url: string) { return this.request(url, { method: 'DELETE' }); }
}

export const api = new ApiClient();

export async function apiPost(url: string, body: unknown) {
  const res = await api.post(url, body);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export async function apiPut(url: string, body: unknown) {
  const res = await api.put(url, body);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export async function apiPatch(url: string, body: unknown) {
  const res = await api.patch(url, body);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export async function apiPostNoBody(url: string) {
  const res = await api.post(url, {});
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export async function apiDel(url: string) {
  const res = await api.del(url);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `Error ${res.status}`);
  return json;
}