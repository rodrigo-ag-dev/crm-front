import api from './api';

export interface MaintenanceWindowRecord {
  id: string;
  startsAt: string;
  endsAt: string;
  message: string;
  cancelled: boolean;
  createdByUserId: string;
  createdAt: string;
}

export interface MaintenanceWindowPayload {
  startsAt: string;
  endsAt: string;
  message: string;
}

export interface MaintenanceAnnouncement {
  active: boolean;
  startsAt: string;
  endsAt: string;
  message: string;
}

export const maintenanceWindowService = {
  list: () => api.get<MaintenanceWindowRecord[]>('/maintenance-windows'),

  create: (payload: MaintenanceWindowPayload) =>
    api.post<MaintenanceWindowRecord>('/maintenance-windows', payload),

  update: (id: string, payload: MaintenanceWindowPayload) =>
    api.put<MaintenanceWindowRecord>(`/maintenance-windows/${id}`, payload),

  cancel: (id: string) => api.delete(`/maintenance-windows/${id}`),

  getAnnouncement: () => api.get<MaintenanceAnnouncement>('/maintenance-windows/announcement'),
};
