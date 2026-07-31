import api from '../services/api';
import type { TaskEntityType } from '../services/taskService';

export interface MentionCandidate {
  entityType: TaskEntityType;
  entityId: string;
  label: string;
  secondary?: string;
}

interface RawEntity {
  id: string;
  name?: string;
  title?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
}

export async function searchMentionCandidates(query: string): Promise<MentionCandidate[]> {
  const term = encodeURIComponent(query.trim());
  if (!term) return [];

  const [dealsRes, contactsRes, companiesRes, ticketsRes] = await Promise.all([
    api.get(`/deals/search?title=${term}&size=5`).catch(() => null),
    api.get(`/contacts/search?name=${term}&size=5`).catch(() => null),
    api.get(`/companies/search?name=${term}&size=5`).catch(() => null),
    api.get(`/tickets/search?title=${term}&size=5`).catch(() => null),
  ]);

  const toCandidates = (
    response: { data?: { content?: RawEntity[] } } | null,
    entityType: TaskEntityType,
    labelField: 'name' | 'title',
    secondaryField?: 'email' | 'companyName' | 'contactName',
  ): MentionCandidate[] =>
    (response?.data?.content || []).map((item) => ({
      entityType,
      entityId: item.id,
      label: (item[labelField] as string) || item.id,
      secondary: secondaryField ? item[secondaryField] : undefined,
    }));

  return [
    ...toCandidates(dealsRes, 'DEAL', 'title'),
    ...toCandidates(contactsRes, 'CONTACT', 'name', 'email'),
    ...toCandidates(companiesRes, 'COMPANY', 'name', 'email'),
    ...toCandidates(ticketsRes, 'TICKET', 'title', 'companyName'),
  ];
}
