/* WORXXEL — Sanitize Wrapper (ES Module)
   Thin wrapper around DOMPurify (vendored). Provides allow-lists for:
   - Editor content (Word blocks, tables, inline markup)
   - AI output
   - Imported HTML (docx/mammoth, Excel/SheetJS)
   - Pasted content
   All configs use logical properties for RTL safety. */
import { getLanguage } from "./theme.js";

/** Load DOMPurify from vendor (UMD). */
let _purify = null;
async function getPurify() {
  if (_purify) return _purify;
  // DOMPurify exposes `createDOMPurify` on window or as default export
  const mod = await import("/vendor/dompurify/dompurify.min.js");
  _purify = mod.default || mod.createDOMPurify || window.DOMPurify;
  if (!_purify) throw new Error("DOMPurify not found in vendor bundle");
  return _purify;
}

/** Base allow-list for all editor content. */
const BASE_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "strong", "em", "u", "s", "sub", "sup",
  "span", "a", "br", "hr",
  "img", "div"
];

const BASE_ATTRS = [
  "href", "src", "alt", "title",
  "colspan", "rowspan",
  "dir", "lang",
  "style", "class", "data-bid", "data-i18n", "data-i18n-*"
];

const BASE_STYLE_PROPS = [
  "color", "background-color",
  "font-size", "font-family", "font-weight", "font-style",
  "text-align", "text-decoration",
  "direction", "unicode-bidi",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-color", "border-width", "border-style",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "width", "height", "min-width", "max-width", "min-height", "max-height",
  "vertical-align"
];

const BASE_PROTOCOLS = {
  href: ["http", "https", "mailto", "tel"],
  src: ["http", "https", "data"]
};

/** Config for editor content (Word blocks). */
export const EDITOR_CONFIG = {
  ADD_TAGS: [...BASE_TAGS],
  ADD_ATTR: [...BASE_ATTRS],
  ALLOWED_STYLE: [...BASE_STYLE_PROPS],
  ADD_URI_SAFE_ATTR: ["src"],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|data:image\/)/i,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: true,
  RETURN_TRUSTED_TYPE: false
};

/** Config for AI output (stricter — no scripts, no forms). */
export const AI_CONFIG = {
  ADD_TAGS: BASE_TAGS.filter(t => !["script", "style", "form", "input", "button", "iframe", "object", "embed"].includes(t)),
  ADD_ATTR: BASE_ATTRS.filter(a => !a.startsWith("on") && !["action", "method"].includes(a)),
  ALLOWED_STYLE: BASE_STYLE_PROPS,
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|data:image\/)/i,
  KEEP_CONTENT: true,
  RETURN_DOM_FRAGMENT: true
};

/** Config for pasted content (Word/Google Docs cleanup). */
export const PASTE_CONFIG = {
  ADD_TAGS: BASE_TAGS,
  ADD_ATTR: BASE_ATTRS,
  ALLOWED_STYLE: BASE_STYLE_PROPS,
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|data:image\/)/i,
  KEEP_CONTENT: true,
  RETURN_DOM_FRAGMENT: true,
  FORBID_TAGS: ["script", "style", "meta", "link", "head", "html", "body", "form", "input", "button", "iframe", "object", "embed", "noscript", "applet", "base"],
  FORBID_ATTR: ["on*", "xmlns", "v:*", "o:*", "w:*", "mso-*"]
};

/** Config for imported HTML (mammoth/SheetJS). */
export const IMPORT_CONFIG = {
  ADD_TAGS: BASE_TAGS,
  ADD_ATTR: BASE_ATTRS,
  ALLOWED_STYLE: BASE_STYLE_PROPS,
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|data:image\/)/i,
  KEEP_CONTENT: true,
  RETURN_DOM_FRAGMENT: true
};

/** Sanitize HTML string with given config. */
export async function sanitize(html, config = EDITOR_CONFIG) {
  const purify = await getPurify();
  return purify.sanitize(html, config);
}

/** Sanitize and return DocumentFragment for safe DOM insertion. */
export async function sanitizeToFragment(html, config = EDITOR_CONFIG) {
  const purify = await getPurify();
  return purify.sanitize(html, { ...config, RETURN_DOM_FRAGMENT: true });
}

/** Clean pasted HTML: strip mso-*, font, color unless keepFormatting. */
export async function cleanPaste(html, keepFormatting = false) {
  const purify = await getPurify();
  let clean = purify.sanitize(html, PASTE_CONFIG);
  if (!keepFormatting) {
    // Strip Word-specific styles
    const div = document.createElement("div");
    div.innerHTML = clean;
    div.querySelectorAll("*").forEach(el => {
      // Remove mso-* and font-* styles
      if (el.style) {
        const toRemove = [];
        for (const prop of el.style) {
          if (prop.startsWith("mso-") || prop.startsWith("font-") || prop === "color" || prop === "background-color") {
            toRemove.push(prop);
          }
        }
        toRemove.forEach(p => el.style.removeProperty(p));
      }
      // Remove class attributes from Word
      el.removeAttribute("class");
      // Remove lang/dir if they match document
      if (el.lang === getLanguage()) el.removeAttribute("lang");
      if (el.dir === (getLanguage() === "ar" ? "rtl" : "ltr")) el.removeAttribute("dir");
    });
    clean = div.innerHTML;
  }
  return clean;
}

/** Strip editor-only classes/attrs from serialized content. */
export function stripEditorMarkup(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll(".hl, .flash, .rise").forEach(el => el.classList.remove("hl", "flash", "rise"));
  div.querySelectorAll("[style*='animation-delay']").forEach(el => {
    el.style.removeProperty("animation-delay");
  });
  // Remove contenteditable from blocks
  div.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
  // Remove spellcheck
  div.querySelectorAll("[spellcheck]").forEach(el => el.removeAttribute("spellcheck"));
  return div.innerHTML;
}