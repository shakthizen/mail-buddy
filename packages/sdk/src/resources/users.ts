import type { HttpClient } from '../http';
import type { CreateUserInput, User } from '../types';

export function createUsersResource(request: HttpClient) {
  return {
    list: () => request<{ users: User[] }>({ path: '/api/users' }),
    create: (data: CreateUserInput) =>
      request<{ user: User }>({ method: 'POST', path: '/api/users', body: data }),
    delete: (id: string) => request<void>({ method: 'DELETE', path: `/api/users/${id}` }),
  };
}
