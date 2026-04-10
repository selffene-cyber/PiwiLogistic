const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8788';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

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

  private async refreshTokens(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.data.accessToken;
        localStorage.setItem('accessToken', this.accessToken!);
        return true;
      }
    } catch { /* ignore */ }
    this.clearTokens();
    return false;
  }

  async get(url: string) { return this.request(url); }
  async post(url: string, body: unknown) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); }
  async put(url: string, body: unknown) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); }
  async patch(url: string, body: unknown) { return this.request(url, { method: 'PATCH', body: JSON.stringify(body) }); }
  async del(url: string) { return this.request(url, { method: 'DELETE' }); }
}

export const api = new ApiClient();