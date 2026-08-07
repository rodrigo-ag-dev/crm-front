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

/** Normalizes a stage's stored color into something usable directly in CSS (hex or a var()). */
export const getStageColor = (color?: string) => {
  if (!color) return 'var(--primary-color)';
  return color.startsWith('#') || color.startsWith('var(') ? color : `#${color}`;
};
