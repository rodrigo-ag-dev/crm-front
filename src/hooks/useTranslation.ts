import { useLanguage } from '../contexts/LanguageContext';

export const useTranslation = () => {
  const { translations } = useLanguage();

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let value: any = translations;

    for (const key of keys) {
      value = value?.[key];
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key not found: ${path}`);
      return path;
    }

    if (params) {
      return Object.entries(params).reduce((acc, [key, val]) => {
        return acc.replace(`{${key}}`, String(val));
      }, value);
    }

    return value;
  };

  return { t };
};
