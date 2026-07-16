import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { applyThemePreference, getStoredThemePreference, type ThemePreference } from '../utils/themePreferences';

interface ThemeSelectorProps {
  variant?: 'surface' | 'sidebar' | 'compact';
  label?: string;
  description?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = 'surface',
  label,
  description,
}) => {
  const { t } = useTranslation();
  const [theme, setTheme] = React.useState<ThemePreference>(() => getStoredThemePreference());

  React.useEffect(() => {
    const syncTheme = () => {
      setTheme(getStoredThemePreference());
    };

    window.addEventListener('storage', syncTheme);
    window.addEventListener('themechange', syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('themechange', syncTheme);
    };
  }, []);

  const handleThemeChange = (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    applyThemePreference(nextTheme);
    window.dispatchEvent(new Event('themechange'));
  };

  const isSidebar = variant === 'sidebar';
  const isCompact = variant === 'compact';

  const activeLight = theme === 'light';
  const activeDark = theme === 'dark';

  return (
    <div className={`selector-box ${isCompact ? 'selector-box--compact' : isSidebar ? 'selector-box--sidebar' : 'selector-box--surface'}`}>
      {(label || description) && (
        <div className="selector-section">
          {label && (
            <strong className={`selector-section__title ${isSidebar ? 'selector-section__title--sidebar' : ''}`}>
              {label}
            </strong>
          )}
          {description && (
            <span className={`selector-section__description ${isSidebar ? 'selector-section__description--sidebar' : ''}`}>
              {description}
            </span>
          )}
        </div>
      )}

      <div className="selector-options">
        <button
          type="button"
          onClick={() => handleThemeChange('light')}
          className={`selector-button ${isCompact ? 'selector-button--compact' : ''} ${isSidebar ? 'selector-button--sidebar' : 'selector-button--surface'} ${activeLight ? 'selector-button--active' : 'selector-button--inactive'}`}
          aria-pressed={activeLight}
        >
          {t('settings.lightTheme')}
        </button>
        <button
          type="button"
          onClick={() => handleThemeChange('dark')}
          className={`selector-button ${isCompact ? 'selector-button--compact' : ''} ${isSidebar ? 'selector-button--sidebar' : 'selector-button--surface'} ${activeDark ? 'selector-button--active' : 'selector-button--inactive'}`}
          aria-pressed={activeDark}
        >
          {t('settings.darkTheme')}
        </button>
      </div>
    </div>
  );
};
