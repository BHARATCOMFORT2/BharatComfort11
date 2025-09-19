"use client";

import { useState, useEffect } from "react";
import { getDictionary } from "./dictionaries";

export function useTranslation(locale: string) {
  // allow nested JSON objects
  const [dict, setDict] = useState<any>(null);

  useEffect(() => {
  async function load() {
    if (locale === "en" || locale === "hi") {
      const dictionary = await getDictionary(locale);
      setDict(dictionary);
    } else {
      console.error("Unsupported locale:", locale);
    }
  }
  load();
}, [locale]);


  function t(path: string): string {
    if (!dict) return path;

    // support nested keys like "common.welcome"
    return path.split(".").reduce((acc, key) => acc?.[key], dict) ?? path;
  }

  return { t };
}
