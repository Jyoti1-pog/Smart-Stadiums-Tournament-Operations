import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import ar from "./ar.json";
import hi from "./hi.json";
import pt from "./pt.json";

export const LANGUAGES = {
  en: { label: "English", flag: "🇬🇧", dir: "ltr", strings: en },
  es: { label: "Español", flag: "🇪🇸", dir: "ltr", strings: es },
  fr: { label: "Français", flag: "🇫🇷", dir: "ltr", strings: fr },
  ar: { label: "العربية", flag: "🇸🇦", dir: "rtl", strings: ar },
  hi: { label: "हिन्दी", flag: "🇮🇳", dir: "ltr", strings: hi },
  pt: { label: "Português", flag: "🇵🇹", dir: "ltr", strings: pt },
};

export const DEFAULT_LANG = "en";
