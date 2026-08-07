import api from './api';

export interface PagedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export type NotificationEntityType =
  | 'TASK'
  | 'FINANCIAL_INSTALLMENT'
  | 'TICKET'
  | 'DEAL_CLOSE_DATE'
  | 'DEAL_STAGE_SLA';

export type NotificationKind = 'UPCOMING' | 'OVERDUE';

export interface AppNotification {
  id: string;
  entityType: NotificationEntityType;
  entityId: string;
  title?: string;
  dueAt?: string;
  kind: NotificationKind;
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
  notification?: AppNotification | null;
}

export const notificationService = {
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),

  getList: (page = 0, size = 20, read?: boolean) =>
    api.get<PagedResult<AppNotification>>('/notifications', { params: { page, size, read } }),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),

  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};
