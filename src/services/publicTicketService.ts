import axios from 'axios';

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || 'localhost';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5035/api';
  }

  return `${protocol}//${hostname}:5035/api`;
};

const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

export type PublicTicketCommentType = 'CONTACT_MESSAGE' | 'AGENT_REPLY';

export interface PublicTicket {
  id: string;
  title: string;
  stageName?: string;
  canceled: boolean;
  closedAt?: string;
}

export interface PublicTicketComment {
  id: string;
  type: PublicTicketCommentType;
  body: string;
  createdAt: string;
}

export const publicTicketService = {
  getTicket: (token: string) => publicApi.get<PublicTicket>(`/public/tickets/${token}`),

  getComments: (token: string) => publicApi.get<PublicTicketComment[]>(`/public/tickets/${token}/comments`),

  addComment: (token: string, body: string) =>
    publicApi.post<PublicTicketComment>(`/public/tickets/${token}/comments`, { body }),
};
