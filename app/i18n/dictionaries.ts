// app/i18n/dictionaries.ts

import 'server-only';

// Define available locales
export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];

const dictionaries = {
  en: () => import("../locales/en.json").then((module) => module.default),
  hi: () => import("../locales/hi.json").then((module) => module.default),
  // add more locales here
};

// Loader function
export const getDictionary = async (locale: Locale) => {
  if (!dictionaries[locale]) {
    throw new Error(`Dictionary for locale "${locale}" not found`);
  }
  return dictionaries[locale]();
};
