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

/**
 * Payload of the `notification` SSE event. `unreadCount` is authoritative —
 * assign it, don't increment a local badge, so a missed or duplicated event
 * can't make the count drift. `notification` is only present when a *new*
 * notification caused the event (null when it just means "your unread count
 * changed", e.g. read on another device).
 */
export interface NotificationStreamEvent {
  unreadCount: number;
  notification?: TaskNotification | null;
}

export const notificationService = {
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),

  getList: (limit = 20) => api.get<TaskNotification[]>(`/notifications?limit=${limit}`),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),
};
