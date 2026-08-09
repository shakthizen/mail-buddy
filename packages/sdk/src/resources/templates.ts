import type { HttpClient } from '../http';
import type { CreateTemplateInput, PageParams, Template, UpdateTemplateInput } from '../types';

export function createTemplatesResource(request: HttpClient) {
  return {
    list: (params: PageParams = {}) =>
      request<{ templates: Template[]; limit: number; offset: number }>({
        path: '/api/templates',
        query: params,
      }),
    get: (id: string) => request<Template>({ path: `/api/templates/${id}` }),
    create: (data: CreateTemplateInput) =>
      request<Template>({ method: 'POST', path: '/api/templates', body: data }),
    update: (id: string, data: UpdateTemplateInput) =>
      request<Template>({ method: 'PUT', path: `/api/templates/${id}`, body: data }),
    delete: (id: string) => request<void>({ method: 'DELETE', path: `/api/templates/${id}` }),
  };
}
