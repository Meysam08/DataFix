import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationKey, I18nContextType } from './types';
import { translations } from './translations';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'datafix_user_language';

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fa' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const isRTL = language === 'fa';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    // Update HTML document attributes reactively
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
  }, [dir, language]);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.en;
    let text = langDict[key] || translations.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const LanguageProvider = I18nProvider;

export const useI18n = (): I18nContextType => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
};
