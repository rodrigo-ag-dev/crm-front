import api from './api';

export interface PagedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface ChatContact {
  id: string;
  fullName: string;
  email: string;
  tenantId: string;
  tenantName?: string;
  platformAdmin: boolean;
  /** True when this contact belongs to a different tenant than the current user. */
  crossTenant: boolean;
}

export interface ChatConversation {
  id: string;
  /** The other person — a 1:1 conversation is always returned from the caller's side. */
  participant: ChatContact;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  /** Set when a platform admin sent this on behalf of senderId — the audit trail. */
  impersonatedByUserId?: string;
  impersonatedByName?: string;
}

/** Payload of the `chat` event on the shared per-user stream. */
export interface ChatStreamEvent {
  message: ChatMessage;
  conversation: ChatConversation;
  /** Authoritative badge across every conversation — assign it, don't increment. */
  totalUnreadCount: number;
}

/** Payload of the `chat-read` event: this user read a conversation elsewhere. */
export interface ChatReadStreamEvent {
  conversationId: string;
  totalUnreadCount: number;
}

export const chatService = {
  getContacts: (search?: string, page = 0, size = 10) =>
    api.get<PagedResult<ChatContact>>('/chat/contacts', { params: { search: search || undefined, page, size } }),

  getConversations: (search?: string, page = 0, size = 15) =>
    api.get<PagedResult<ChatConversation>>('/chat/conversations', { params: { search: search || undefined, page, size } }),

  startConversation: (userId: string) =>
    api.post<ChatConversation>('/chat/conversations', { userId }),

  getMessages: (conversationId: string, before?: string, limit = 50) =>
    api.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`, {
      params: { before, limit },
    }),

  sendMessage: (conversationId: string, body: string) =>
    api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { body }),

  sendImpersonatedMessage: (conversationId: string, body: string) =>
    api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages/impersonated`, { body }),

  markRead: (conversationId: string) => api.patch(`/chat/conversations/${conversationId}/read`),

  deleteConversation: (conversationId: string) => api.delete(`/chat/conversations/${conversationId}`),

  getUnreadCount: () => api.get<{ count: number }>('/chat/unread-count'),
};
