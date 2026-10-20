/* WORXXEL — Shared Theme Manager (ES Module)
   Single source for theme state: light | dark | auto
   Persists to localStorage key "wordy-theme" (already used by Dashboard). */
export const THEME_KEY = "wordy-theme";
export const THEMES = ["light", "dark", "auto"];

/** Apply theme to document.documentElement and persist. */
export function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateMetaThemeColor();
}

/** Get current effective theme (resolves "auto" to actual). */
export function getEffectiveTheme() {
  const stored = localStorage.getItem(THEME_KEY) || "auto";
  if (stored === "auto") {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return stored;
}

/** Initialize theme on page load. Call once per page. */
export function initTheme() {
  const theme = getEffectiveTheme();
  document.documentElement.dataset.theme = theme;
  // Listen for system preference changes when in "auto"
  if (storedTheme() === "auto") {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
      document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      updateMetaThemeColor();
    });
  }
  updateMetaThemeColor();
}

/** Toggle between light/dark (skips auto). */
export function toggleTheme() {
  const current = getEffectiveTheme();
  setTheme(current === "dark" ? "light" : "dark");
}

/** Get stored theme (may be "auto"). */
export function storedTheme() {
  return localStorage.getItem(THEME_KEY) || "auto";
}

/** Update meta theme-color to match primary. */
function updateMetaThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const isDark = document.documentElement.dataset.theme === "dark";
    meta.content = isDark ? "#7C80FF" : "#3F4CE0";
  }
}

/** Set language + direction on <html>. */
export function setLanguage(lang) {
  const root = document.documentElement;
  const isRTL = lang === "ar";
  root.lang = lang;
  root.dir = isRTL ? "rtl" : "ltr";
  localStorage.setItem("wordy-lang", lang);
}

/** Initialize language from storage or navigator. */
export function initLanguage() {
  const saved = localStorage.getItem("wordy-lang");
  const nav = navigator.language.startsWith("ar") ? "ar" : "en";
  const lang = saved || nav;
  setLanguage(lang);
  return lang;
}

/** Get current language. */
export function getLanguage() {
  return document.documentElement.lang || "en";
}

/** Toggle language (en <-> ar). */
export function toggleLanguage() {
  setLanguage(getLanguage() === "ar" ? "en" : "ar");
}