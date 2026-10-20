/* WORXXEL — UI Primitives (ES Module)
   Accessible dialogs, toasts, confirms, prompts. All RTL-aware. */
import { getLanguage } from "./theme.js";
import { t } from "./i18n.js";

/** Toast singleton. */
const TOAST_KEY = "worxxel-toast";
let _toastEl = null;

function ensureToast() {
  if (_toastEl) return _toastEl;
  let el = document.getElementById(TOAST_KEY);
  if (!el) {
    el = document.createElement("div");
    el.id = TOAST_KEY;
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  _toastEl = el;
  return el;
}

/** Show a toast message. */
export function toast(message, duration = 2400) {
  const el = ensureToast();
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), duration);
}

/** Toast with action button. */
export function toastAction(message, actionLabel, onAction, duration = 5000) {
  const el = ensureToast();
  el.innerHTML = "";
  const txt = document.createElement("span");
  txt.textContent = message;
  const btn = document.createElement("button");
  btn.className = "btn soft";
  btn.style.marginLeft = "12px";
  btn.textContent = actionLabel;
  btn.onclick = () => { onAction(); el.classList.remove("show"); };
  el.append(txt, btn);
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), duration);
}

/** Accessible modal dialog with focus trap. */
export class Modal {
  constructor(options = {}) {
    this.title = options.title || "";
    this.content = options.content || "";
    this.ariaLabel = options.ariaLabel || options.title || "Dialog";
    this.showClose = options.showClose !== false;
    this.onClose = options.onClose || (() => {});
    this.onConfirm = options.onConfirm || null;
    this.confirmLabel = options.confirmLabel || t("common.confirm");
    this.cancelLabel = options.cancelLabel || t("common.cancel");
    this._el = null;
    this._prevFocus = null;
    this._focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  }

  /** Build and inject the modal into DOM. */
  _build() {
    const el = document.createElement("div");
    el.className = "modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "modal-title");
    el.setAttribute("aria-label", this.ariaLabel);
    el.innerHTML = `
      <div class="modal-card">
        ${this.title ? `<h2 id="modal-title">${this.title}</h2>` : ""}
        <div class="modal-body">${this.content}</div>
        <div class="modal-footer"></div>
      </div>
    `;
    const footer = el.querySelector(".modal-footer");
    if (this.onConfirm) {
      const confirmBtn = document.createElement("button");
      confirmBtn.className = "btn pri";
      confirmBtn.textContent = this.confirmLabel;
      confirmBtn.onclick = () => { this.close(); this.onConfirm(); };
      footer.appendChild(confirmBtn);
    }
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.textContent = this.cancelLabel;
    cancelBtn.onclick = () => this.close();
    footer.appendChild(cancelBtn);
    if (this.showClose) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "ico";
      closeBtn.setAttribute("aria-label", t("common.close"));
      closeBtn.innerHTML = "✕";
      closeBtn.onclick = () => this.close();
      el.querySelector(".modal-card").prepend(closeBtn);
    }
    this._el = el;
    document.body.appendChild(el);
  }

  /** Open the modal with focus trap. */
  open() {
    if (this._el) return;
    this._prevFocus = document.activeElement;
    this._build();
    requestAnimationFrame(() => {
      this._el.classList.add("show");
      this._el.setAttribute("aria-hidden", "false");
      this._trapFocus();
      // Focus first focusable element
      const focusable = this._el.querySelector(this._focusableSelector);
      if (focusable) focusable.focus();
    });
    // Escape key
    this._escHandler = e => { if (e.key === "Escape") this.close(); };
    document.addEventListener("keydown", this._escHandler);
  }

  /** Close the modal. */
  close() {
    if (!this._el) return;
    this._el.classList.remove("show");
    this._el.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", this._escHandler);
    setTimeout(() => {
      this._el.remove();
      this._el = null;
      if (this._prevFocus) this._prevFocus.focus();
      this.onClose();
    }, 200);
  }

  /** Focus trap. */
  _trapFocus() {
    if (!this._el) return;
    const focusable = this._el.querySelectorAll(this._focusableSelector);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    this._tabHandler = e => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    this._el.addEventListener("keydown", this._tabHandler);
  }

  /** Update content. */
  setContent(html) {
    if (this._el) this._el.querySelector(".modal-body").innerHTML = html;
    else this.content = html;
  }
}

/** Confirm dialog (Promise-based). */
export function confirm(message, options = {}) {
  return new Promise(resolve => {
    const modal = new Modal({
      title: options.title || t("common.confirm"),
      content: `<p>${message}</p>`,
      onConfirm: () => resolve(true),
      onClose: () => resolve(false),
      confirmLabel: options.confirmLabel || t("common.confirm"),
      cancelLabel: options.cancelLabel || t("common.cancel")
    });
    modal.open();
  });
}

/** Prompt dialog (Promise-based). */
export function prompt(message, defaultValue = "", options = {}) {
  return new Promise(resolve => {
    const inputId = "modal-prompt-input";
    const modal = new Modal({
      title: options.title || t("common.confirm"),
      content: `<p>${message}</p><input id="${inputId}" type="text" value="${defaultValue}" class="input" style="width:100%;margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid var(--border-solid);font:inherit">`,
      onConfirm: () => {
        const val = document.getElementById(inputId)?.value || "";
        resolve(val);
      },
      onClose: () => resolve(null),
      confirmLabel: options.confirmLabel || t("common.confirm"),
      cancelLabel: options.cancelLabel || t("common.cancel")
    });
    modal.open();
    // Focus input
    setTimeout(() => document.getElementById(inputId)?.focus(), 50);
  });
}

/** Alert dialog (Promise-based). */
export function alert(message, options = {}) {
  return new Promise(resolve => {
    const modal = new Modal({
      title: options.title || t("common.info"),
      content: `<p>${message}</p>`,
      onConfirm: () => resolve(true),
      onClose: () => resolve(true),
      confirmLabel: t("common.ok"),
      showClose: false
    });
    modal.open();
  });
}

/** Loading overlay (for async operations). */
export function showLoading(message = t("common.loading")) {
  const overlay = document.createElement("div");
  overlay.className = "modal loading-overlay";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.innerHTML = `
    <div class="modal-card" style="text-align:center">
      <div class="ops-spin" aria-hidden="true">✦</div>
      <p style="margin-top:12px">${message}</p>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  return {
    close: () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 200);
    },
    setMessage: msg => { overlay.querySelector("p").textContent = msg; }
  };
}