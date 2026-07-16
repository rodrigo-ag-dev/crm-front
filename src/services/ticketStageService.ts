import api from './api';

export interface TicketStageOption {
  id: string;
  name: string;
  description: string;
  color: string;
  order: number;
}

export const getTicketStages = async () => {
  return api.get<TicketStageOption[]>('/tickets/stages');
};

export const sortTicketStages = (stages: TicketStageOption[]) => {
  return [...stages].sort((a, b) => a.order - b.order);
};

export const getInitialTicketStageId = (stages: TicketStageOption[]) => {
  return sortTicketStages(stages)[0]?.id || '';
};
