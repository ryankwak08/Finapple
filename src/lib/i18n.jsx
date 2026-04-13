import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { safeStorage } from '@/lib/safeStorage';

export const LANGUAGE_STORAGE_KEY = 'finapple:language';

const translations = {
  ko: {
    appTagline: '생활 금융 학습 앱',
    navigationMenu: '탐색 메뉴',
    tabStudy: '금융 상식',
    tabQuiz: '퀴즈',
    tabSurvival: '생존',
    tabLeaderboard: '리그',
    tabGlossary: '용어사전',
    tabShop: '상점',
    runtimeErrorTitle: '앱을 불러오지 못했어요',
    runtimeErrorBody: '새로고침 후 다시 시도해주세요. 문제가 계속되면 잠시 뒤 다시 접속해주세요.',
    reload: '다시 불러오기',
    languageSelector: '언어 선택',
    korean: '한국어',
    english: 'English',
  },
  en: {
    appTagline: 'Everyday finance learning app',
    navigationMenu: 'Navigation',
    tabStudy: 'Learn',
    tabQuiz: 'Quiz',
    tabSurvival: 'Survival',
    tabLeaderboard: 'League',
    tabGlossary: 'Glossary',
    tabShop: 'Shop',
    runtimeErrorTitle: 'We could not load the app',
    runtimeErrorBody: 'Please refresh and try again. If the issue keeps happening, come back in a little while.',
    reload: 'Reload',
    languageSelector: 'Language',
    korean: 'Korean',
    english: 'English',
  },
};

const defaultLanguageContext = {
  locale: 'ko',
  setLocale: () => {},
  isEnglish: false,
  t: (key, fallback) => fallback ?? key,
};

export const LanguageContext = createContext(defaultLanguageContext);

function getInitialLocale() {
  const storedLocale = safeStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLocale === 'en' ? 'en' : 'ko';
}

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => {
    safeStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    isEnglish: locale === 'en',
    t: (key, fallback) => translations[locale]?.[key] ?? fallback ?? key,
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
