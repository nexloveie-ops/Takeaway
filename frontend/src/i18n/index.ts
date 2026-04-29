import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

// Default language is en-US. Clear any previously saved zh-CN default.
if (!localStorage.getItem('language_v2')) {
  // First time with new default — reset to en-US
  localStorage.setItem('language', 'en-US');
  localStorage.setItem('language_v2', '1');
}
const savedLanguage = localStorage.getItem('language') || 'en-US';

i18n.use(initReactI18next).init({
  resources: {
    'en-US': { translation: enUS },
    'zh-CN': { translation: zhCN },
  },
  lng: savedLanguage,
  fallbackLng: 'en-US',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
