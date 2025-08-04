import en from "../locales/en.json" with { type: "json" };
import fr from "../locales/fr.json" with { type: "json" };

const translations = { en, fr };

export function t(lang, key) {
  const selected = translations[lang] || translations.en;
  return selected[key] || key;
}
