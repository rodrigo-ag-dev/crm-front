import api from './api';

export type UserRole = 'ADMIN' | 'USER';

export interface UserRecord {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
  tenantId: string;
  tenantName: string;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateUserPayload {
  username: string;
  fullName: string;
  email: string;
}

export interface ResetPasswordResult {
  temporaryPassword: string;
}

export const userService = {
  listUsers: () => api.get<UserRecord[]>('/user'),

  createUser: (payload: CreateUserPayload) => api.post<UserRecord>('/user', payload),

  updateUser: (id: string, payload: UpdateUserPayload) => api.put<UserRecord>(`/user/${id}`, payload),

  updateUserRole: (id: string, role: UserRole) =>
    api.patch<UserRecord>(`/user/${id}/role`, { role }),

  setUserActive: (id: string, active: boolean) =>
    api.patch<UserRecord>(`/user/${id}/active`, { active }),

  resetPassword: (id: string) => api.post<ResetPasswordResult>(`/user/${id}/reset-password`),
};
