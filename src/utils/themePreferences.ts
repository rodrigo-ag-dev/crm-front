export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = '@CRM:theme';

export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return storedTheme === 'dark' ? 'dark' : 'light';
};

export const applyThemePreference = (theme: ThemePreference) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
};

