import type { HttpClient } from '../http';
import type { Asset, PageParams } from '../types';

export function createAssetsResource(request: HttpClient) {
  return {
    list: (params: PageParams = {}) =>
      request<{ assets: Asset[]; limit: number; offset: number }>({ path: '/api/assets', query: params }),
    upload: (file: Blob | File) => {
      const formData = new FormData();
      formData.set('file', file);
      return request<Asset>({ method: 'POST', path: '/api/assets/upload', formData });
    },
    delete: (id: string) => request<void>({ method: 'DELETE', path: `/api/assets/${id}` }),
  };
}
