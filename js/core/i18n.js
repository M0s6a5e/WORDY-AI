/* WORXXEL — i18n System (ES Module)
   Usage:
     import { t, initI18n, setLanguage } from "./i18n.js";
     initI18n(); // reads localStorage, applies to [data-i18n]
     <span data-i18n="editor.save">Save</span>
*/
import { getLanguage, setLanguage as setLang, initLanguage } from "./theme.js";

let dict = {};
let currentLang = "en";

/** Load translation JSON for a language. */
async function loadDict(lang) {
  try {
    const res = await fetch(`js/core/i18n/${lang}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn("[i18n] Failed to load", lang, e);
    return {};
  }
}

/** Initialize i18n: load dict, apply to DOM. Call once per page. */
export async function initI18n() {
  currentLang = initLanguage();
  dict = await loadDict(currentLang);
  applyTranslations();
  return currentLang;
}

/** Get translated string with optional interpolation. */
export function t(key, vars = {}) {
  const keys = key.split(".");
  let val = dict;
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = val[k];
    } else {
      return key; // fallback to key
    }
  }
  if (typeof val !== "string") return key;
  // Simple interpolation: {varName}
  return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "{" + k + "}");
}

/** Switch language, reload dict, re-apply. */
export async function setLanguage(lang) {
  if (lang === currentLang) return;
  await setLang(lang);
  currentLang = lang;
  dict = await loadDict(lang);
  applyTranslations();
  document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang } }));
}

/** Get current language code. */
export function getLanguage() {
  return currentLang;
}

/** Apply translations to all [data-i18n], [data-i18n-placeholder], [data-i18n-aria-label]. */
function applyTranslations() {
  // Text content
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const txt = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = txt;
    } else {
      el.textContent = txt;
    }
  });
  // Placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = t(key);
  });
  // Aria labels
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
    const key = el.getAttribute("data-i18n-aria-label");
    el.setAttribute("aria-label", t(key));
  });
  // Title attributes
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    el.title = t(key);
  });
}

/** Re-apply (e.g. after dynamic DOM insertion). */
export function refreshI18n() {
  applyTranslations();
}