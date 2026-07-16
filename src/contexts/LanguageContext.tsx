import React, { createContext, useState, useContext, type ReactNode } from 'react';
import ptBR from '../locales/pt-BR.json';
import enUS from '../locales/en-US.json';
import esES from '../locales/es-ES.json';

type LanguageCode = 'pt-BR' | 'en-US' | 'es-ES';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  translations: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<LanguageCode, any> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('@CRM:language');
    return (saved as LanguageCode) || 'pt-BR';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('@CRM:language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

