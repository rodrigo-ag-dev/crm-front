import api from './api';

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  active: boolean;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
}

export const tenantService = {
  listTenants: () => api.get<TenantRecord[]>('/tenants'),

  createTenant: (payload: CreateTenantPayload) => api.post<TenantRecord>('/tenants', payload),
};
