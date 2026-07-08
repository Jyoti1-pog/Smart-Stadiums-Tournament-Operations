import React from "react";
import { useI18n } from "../context/I18nContext.jsx";

export default function AccessibilityToggle({ enabled, onToggle }) {
  const { t } = useI18n();
  return (
    <button
      onClick={() => onToggle(!enabled)}
      aria-pressed={enabled}
      aria-label={t("accessibilityMode")}
      title={t("accessibilityDesc")}
      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
        enabled ? "border-pulse-teal/60 text-pulse-teal bg-pulse-teal/10" : "border-pulse-border text-slate-400"
      }`}
    >
      <span aria-hidden="true">♿</span>
      <span className="hidden sm:inline">{t("accessibilityMode")}</span>
    </button>
  );
}
