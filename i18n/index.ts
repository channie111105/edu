import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AppLanguage, resources } from './resources';

export const LANGUAGE_STORAGE_KEY = 'educrm:language';
const DEFAULT_LANGUAGE: AppLanguage = 'vi';
const SUPPORTED_LANGUAGES: AppLanguage[] = ['vi', 'en'];

const normalizeLanguage = (language?: string | null): AppLanguage => {
  if (!language) return DEFAULT_LANGUAGE;

  const normalized = language.toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  return DEFAULT_LANGUAGE;
};

const getInitialLanguage = (): AppLanguage => DEFAULT_LANGUAGE;

const syncDocumentLanguage = (language: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeLanguage(language);
  }
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: ['common', 'marketing'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  syncDocumentLanguage(i18n.language);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE);

    i18n.on('languageChanged', (language) => {
      const normalizedLanguage = normalizeLanguage(language);
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
      syncDocumentLanguage(normalizedLanguage);
    });
  }
}

export default i18n;
