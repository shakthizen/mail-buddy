import type { HttpClient } from '../http';
import type { AuthLoginResponse, AuthStatusResponse, User } from '../types';

export function createAuthResource(request: HttpClient) {
  return {
    status: () => request<AuthStatusResponse>({ path: '/api/auth/status' }),
    setup: (data: { name: string; email: string; password: string }) =>
      request<AuthLoginResponse>({ method: 'POST', path: '/api/auth/setup', body: data }),
    login: (data: { email: string; password: string }) =>
      request<AuthLoginResponse>({ method: 'POST', path: '/api/auth/login', body: data }),
    logout: () => request<{ success: boolean }>({ method: 'POST', path: '/api/auth/logout' }),
    me: () => request<{ user: User }>({ path: '/api/auth/me' }),
  };
}
