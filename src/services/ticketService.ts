import api from './api';

export type TicketCommentType = 'CONTACT_MESSAGE' | 'AGENT_REPLY' | 'INTERNAL_NOTE';

export interface TicketStageHistoryEntry {
  id: string;
  ticketId: string;
  fromStageId?: string;
  fromStageName?: string;
  toStageId?: string;
  toStageName?: string;
  changedById?: string;
  changedByName?: string;
  changedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId?: string;
  authorName?: string;
  contactId?: string;
  contactName?: string;
  type: TicketCommentType;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketSearchFilters {
  title?: string;
  companyId?: string;
  contactId?: string;
  ticketStageId?: string;
  canceled?: boolean | string;
  page?: number;
  size?: number;
}

export interface TicketSearchResponse<T = unknown> {
  content?: T[];
  totalPages?: number;
  totalElements?: number;
  number?: number;
  size?: number;
  last?: boolean;
}

export const ticketService = {
  searchTickets: <T = unknown>(filters: TicketSearchFilters) => {
    const queryParams = new URLSearchParams();

    if (filters.page !== undefined) {
      queryParams.set('page', String(filters.page));
    }

    if (filters.size !== undefined) {
      queryParams.set('size', String(filters.size));
    }

    if (filters.title?.trim()) {
      queryParams.set('title', filters.title.trim());
    }

    if (filters.companyId?.trim()) {
      queryParams.set('companyId', filters.companyId.trim());
    }

    if (filters.contactId?.trim()) {
      queryParams.set('contactId', filters.contactId.trim());
    }

    if (filters.ticketStageId?.trim()) {
      queryParams.set('ticketStageId', filters.ticketStageId.trim());
    }

    if (filters.canceled !== undefined && filters.canceled !== '') {
      queryParams.set('canceled', String(filters.canceled));
    }

    const queryString = queryParams.toString();
    return api.get<TicketSearchResponse<T>>(`/tickets/search${queryString ? `?${queryString}` : ''}`);
  },

  getTicketHistory: (ticketId: string) =>
    api.get<TicketStageHistoryEntry[]>(`/tickets/${ticketId}/history`),

  getTicketComments: (ticketId: string) =>
    api.get<TicketComment[]>(`/tickets/${ticketId}/comments`),

  addTicketComment: (ticketId: string, payload: { type: TicketCommentType; body: string }) =>
    api.post<TicketComment>(`/tickets/${ticketId}/comments`, payload),
};
