import api from './api';

export interface TaskNotification {
  id: string;
  taskId: string;
  taskTitle?: string;
  taskDueAt?: string;
  type: 'OVERDUE';
  readAt?: string;
  createdAt: string;
}

export const notificationService = {
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),

  getList: (limit = 20) => api.get<TaskNotification[]>(`/notifications?limit=${limit}`),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),
};
