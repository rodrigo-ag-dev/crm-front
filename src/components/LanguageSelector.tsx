import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { SimpleDropdown } from './SimpleDropdown';

interface LanguageSelectorProps {
  variant?: 'surface' | 'sidebar';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'surface' }) => {
  const { language, setLanguage } = useLanguage();
  const isSidebar = variant === 'sidebar';

  const languages: { code: 'pt-BR' | 'en-US' | 'es-ES'; label: string; flag: string }[] = [
    { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  ];

  return (
    <div className={`selector-box ${isSidebar ? 'selector-box--sidebar' : 'selector-box--surface'}`}>
      <Globe size={20} className={isSidebar ? 'selector-icon--sidebar' : 'selector-icon--surface'} />
      <SimpleDropdown
        value={language}
        onChange={(id) => setLanguage(id as 'pt-BR' | 'en-US' | 'es-ES')}
        options={languages.map((lang) => ({ id: lang.code, name: lang.label, icon: lang.flag }))}
      />
    </div>
  );
};
