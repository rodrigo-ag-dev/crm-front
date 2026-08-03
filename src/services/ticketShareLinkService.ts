import api from './api';

export interface TicketShareLink {
  id: string;
  ticketId: string;
  token: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export const ticketShareLinkService = {
  getActive: (ticketId: string) => api.get<TicketShareLink | null>(`/tickets/${ticketId}/share-link`),

  create: (ticketId: string) => api.post<TicketShareLink>(`/tickets/${ticketId}/share-link`),

  revoke: (ticketId: string) => api.delete<void>(`/tickets/${ticketId}/share-link`),
};
