const STORAGE_KEY = '@CRM:sidebar_expanded';

export const getStoredSidebarExpanded = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
};

export const setStoredSidebarExpanded = (expanded: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(expanded));
};
