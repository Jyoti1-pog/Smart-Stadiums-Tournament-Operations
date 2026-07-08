import React, { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, DEFAULT_LANG } from "../i18n/index.js";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("sp_lang") || DEFAULT_LANG);

  useEffect(() => {
    localStorage.setItem("sp_lang", lang);
    document.documentElement.dir = LANGUAGES[lang]?.dir || "ltr";
  }, [lang]);

  const t = (key) => LANGUAGES[lang]?.strings[key] ?? LANGUAGES[DEFAULT_LANG].strings[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
