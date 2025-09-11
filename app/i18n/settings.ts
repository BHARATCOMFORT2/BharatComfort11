export const i18n = {
  defaultLocale: "en",
  locales: ["en", "hi", "fr"], // English, Hindi, French (add more as needed)
} as const;

export type Locale = (typeof i18n)["locales"][number];
