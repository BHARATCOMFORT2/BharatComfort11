"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "./dictionaries";
import { Locale, i18n } from "./settings";

export function useI18n() {
  const params = useParams();
  const locale = (params?.locale as Locale) || i18n.defaultLocale;

  const [dict, setDict] = useState<Record<string, string>>({});

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  return { dict, locale };
}
