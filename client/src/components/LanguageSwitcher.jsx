import React from "react";
import { LANGUAGES } from "../i18n/index.js";
import { useI18n } from "../context/I18nContext.jsx";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label="Language"
      className="bg-pulse-panel2 border border-pulse-border rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-pulse-teal/60"
    >
      {Object.entries(LANGUAGES).map(([code, l]) => (
        <option key={code} value={code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
