// lib/i18n.ts
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../app/i18n/locales/en/translation.json";
import hi from "../app/i18n/locales/hi/translation.json";
// You can add more locales (fr, es, de, etc.)

// Initialize i18next instance
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes by default
  },
  react: {
    useSuspense: false,
  },
});

export default i18next;
