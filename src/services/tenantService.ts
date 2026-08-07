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

export interface SwitchTenantResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role?: string;
    mustChangePassword?: boolean;
    tenantId?: string;
    tenantName?: string;
    platformAdmin?: boolean;
  };
}

export const tenantService = {
  listTenants: () => api.get<TenantRecord[]>('/tenants'),

  createTenant: (payload: CreateTenantPayload) => api.post<TenantRecord>('/tenants', payload),

  /** Platform-admin only. Pass undefined to switch back to the caller's own tenant. */
  switchTenant: (tenantId?: string) =>
    api.post<SwitchTenantResponse>('/auth/switch-tenant', { tenantId: tenantId || null }),
};
