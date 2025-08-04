export type Lang = 'en' | 'fr';

let translations: Record<string, string> = {};
let currentLang: Lang = 'en';

export async function loadLang(lang: Lang) {
  translations = await import(`/i18n/${lang}.json`).then((mod) => mod.default);
  currentLang = lang;
  localStorage.setItem("lang", lang); // stocker le choix
}

export function t(key: string): string {
  return translations[key] || key;
}

export function getCurrentLang(): Lang {
  return currentLang;
}
