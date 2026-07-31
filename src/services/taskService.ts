import api from './api';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
export type TaskEntityType = 'DEAL' | 'CONTACT' | 'COMPANY' | 'TICKET';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueAt?: string;
  priority: TaskPriority;
  status: TaskStatus;
  entityType?: TaskEntityType;
  entityId?: string;
  entityLabel?: string;
  ownerId?: string;
  completedAt?: string;
  checklistTotal: number;
  checklistDone: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskChecklistItem {
  id: string;
  label: string;
  done: boolean;
  position: number;
}

export interface TaskSearchFilters {
  status?: TaskStatus;
  entityType?: TaskEntityType;
  entityId?: string;
  dueBefore?: string;
  page?: number;
  size?: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

export const taskService = {
  search: (filters: TaskSearchFilters) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.entityType) params.set('entityType', filters.entityType);
    if (filters.entityId) params.set('entityId', filters.entityId);
    if (filters.dueBefore) params.set('dueBefore', filters.dueBefore);
    if (filters.page !== undefined) params.set('page', String(filters.page));
    if (filters.size !== undefined) params.set('size', String(filters.size));
    const qs = params.toString();
    return api.get<PagedResponse<TaskItem>>(`/tasks${qs ? `?${qs}` : ''}`);
  },

  getToday: (limit = 200) => api.get<TaskItem[]>(`/tasks/today?limit=${limit}`),

  getByEntity: (entityType: TaskEntityType, entityId: string) =>
    api.get<TaskItem[]>(`/tasks/entity/${entityType}/${entityId}`),

  getById: (id: string) => api.get<TaskItem>(`/tasks/${id}`),

  create: (payload: Partial<TaskItem>) => api.post<TaskItem>('/tasks', payload),

  update: (id: string, payload: Partial<TaskItem>) => api.put<TaskItem>(`/tasks/${id}`, payload),

  changeStatus: (id: string, status: TaskStatus) => api.patch<TaskItem>(`/tasks/${id}/status`, { status }),

  snooze: (id: string, dueAt: string) => api.patch<TaskItem>(`/tasks/${id}/snooze`, { dueAt }),

  remove: (id: string) => api.delete(`/tasks/${id}`),

  getChecklist: (taskId: string) => api.get<TaskChecklistItem[]>(`/tasks/${taskId}/items`),

  addChecklistItem: (taskId: string, label: string) =>
    api.post<TaskChecklistItem>(`/tasks/${taskId}/items`, { label, done: false, position: 0 }),

  updateChecklistItem: (taskId: string, itemId: string, payload: Partial<TaskChecklistItem>) =>
    api.patch<TaskChecklistItem>(`/tasks/${taskId}/items/${itemId}`, payload),

  removeChecklistItem: (taskId: string, itemId: string) =>
    api.delete(`/tasks/${taskId}/items/${itemId}`),
};
