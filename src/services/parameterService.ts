import api from './api';

export interface ParameterDefinition {
  id?: string;
  parameterId?: string;
  name?: string;
  value?: string;
  userSpecific?: boolean;
}

export interface UserParameterOverride {
  id?: string;
  userId?: string;
  parameterId?: string;
  name?: string;
  value?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveUserParameterPayload {
  userId: string;
  parameterId: string;
  value: string;
}

export const parameterService = {
  listParameters: () => api.get<ParameterDefinition[]>('/parameter'),

  saveParameter: (payload: ParameterDefinition) => api.post<ParameterDefinition>('/parameter', payload),

  listUserParameters: (userId: string) =>
    api.get<UserParameterOverride[]>(`/parameter/user/${userId}`),

  getUserParameterValue: (userId: string, parameterId: string) =>
    api.get<string>(`/parameter/user/${userId}/value`, {
      params: { parameterId },
    }),

  saveUserParameter: (payload: SaveUserParameterPayload) =>
    api.post('/parameter/user', payload),

  deleteUserParameter: (userId: string, parameterId: string) =>
    api.delete(`/parameter/user/${userId}/${parameterId}`),
};
