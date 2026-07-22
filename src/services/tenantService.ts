import api from './api';

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  active: boolean;
}

export const tenantService = {
  listTenants: () => api.get<TenantRecord[]>('/tenants'),
};
