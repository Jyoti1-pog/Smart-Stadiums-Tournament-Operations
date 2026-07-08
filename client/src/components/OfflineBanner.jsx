import React from "react";
import { useAiMode } from "../lib/useAiMode.js";
import { useI18n } from "../context/I18nContext.jsx";

export default function OfflineBanner() {
  const mode = useAiMode();
  const { t } = useI18n();
  if (mode !== "offline") return null;
  return (
    <div className="w-full bg-pulse-amber/15 border-b border-pulse-amber/40 text-pulse-amber text-xs sm:text-sm px-4 py-1.5 text-center">
      {t("offlineBanner")}
    </div>
  );
}
