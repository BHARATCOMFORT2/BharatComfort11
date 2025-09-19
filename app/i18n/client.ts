// app/i18n/clients.ts

"use client";

import { useEffect, useState } from "react";
import { getDictionary, Locale } from "./dictionaries";

// Hook to load translations for a given locale
export function useDictionary(locale: Locale) {
  const [dict, setDict] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    getDictionary(locale).then((d) => setDict(d));
  }, [locale]);

  return dict;
}
