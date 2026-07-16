export type ViewMode = 'list' | 'kanban';

const storageKey = (key: string) => `@CRM:${key}View`;

export const getStoredViewMode = (key: string): ViewMode => {
  if (typeof window === 'undefined') {
    return 'list';
  }

  return window.localStorage.getItem(storageKey(key)) === 'kanban' ? 'kanban' : 'list';
};

export const setStoredViewMode = (key: string, mode: ViewMode) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey(key), mode);
};
