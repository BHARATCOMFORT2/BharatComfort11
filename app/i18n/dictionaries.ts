// Loads translation files dynamically
import "server-only";

const dictionaries = {
  en: () => import("/locales/en.json").then((m) => m.default),
  hi: () => import("/locales/hi.json").then((m) => m.default),
  fr: () => import("/locales/fr.json").then((m) => m.default),
};

export const getDictionary = async (locale: string) =>
  dictionaries[locale as keyof typeof dictionaries]?.() ?? dictionaries.en();
