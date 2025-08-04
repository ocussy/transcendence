let translations = {};
let currentLang = 'en';
export async function loadLang(lang) {
    translations = await import(`/i18n/${lang}.json`).then((mod) => mod.default);
    currentLang = lang;
    localStorage.setItem("lang", lang);
}
export function t(key) {
    return translations[key] || key;
}
export function getCurrentLang() {
    return currentLang;
}
//# sourceMappingURL=i18n.js.map