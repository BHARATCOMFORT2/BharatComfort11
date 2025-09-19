// app/i18n/settings.ts

export const i18n = {
  defaultLocale: "en",
  locales: ["en", "hi"], // add more locales like "fr", "de", etc.
};

export type Locale = (typeof i18n)["locales"][number];
