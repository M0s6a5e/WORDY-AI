/* WORXXEL — Quota Display (ES Module)
   Reads server-reported quota from /api/me; no client-side authority. */
import { apiFetch } from "./api.js";
import { getLanguage } from "./theme.js";

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 30000; // 30s

/** Fetch fresh quota from server. */
export async function fetchQuota() {
  try {
    const me = await apiFetch("/api/me");
    _cache = me;
    _cacheAt = Date.now();
    return me;
  } catch (e) {
    console.warn("[quota] Failed to fetch", e);
    return _cache; // return stale on error
  }
}

/** Get cached quota (fetches if stale). */
export async function getQuota() {
  if (!_cache || Date.now() - _cacheAt > CACHE_TTL) {
    return fetchQuota();
  }
  return _cache;
}

/** Get AI generation usage. */
export async function getAiGenerationUsage() {
  const q = await getQuota();
  return q?.usage?.generate || { used: 0, max: 2, resetAt: null };
}

/** Get AI refinement usage. */
export async function getAiRefinementUsage() {
  const q = await getQuota();
  return q?.usage?.refine || { used: 0, max: 20, resetAt: null };
}

/** Get project usage. */
export async function getProjectUsage() {
  const q = await getQuota();
  return q?.projects || { count: 0, max: 4 };
}

/** Get plan name. */
export async function getPlan() {
  const q = await getQuota();
  return q?.plan || "free";
}

/** Format reset time for display. */
export function formatReset(resetAt) {
  if (!resetAt) return "";
  const date = new Date(resetAt);
  const now = new Date();
  const diff = date - now;
  if (diff <= 0) return "resets now";
  const hours = Math.ceil(diff / 3.6e6);
  if (hours < 24) return `resets in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `resets in ${days}d`;
}

/** Update all quota UI elements on page. */
export async function updateQuotaUI() {
  const [gen, refine, proj, plan] = await Promise.all([
    getAiGenerationUsage(),
    getAiRefinementUsage(),
    getProjectUsage(),
    getPlan()
  ]);
  // Generation meter
  const genEl = document.getElementById("ai-gen-usage");
  if (genEl) genEl.textContent = `${gen.used} / ${gen.max} (${formatReset(gen.resetAt)})`;
  // Refinement meter
  const refEl = document.getElementById("ai-refine-usage");
  if (refEl) refEl.textContent = `${refine.used} / ${refine.max} (${formatReset(refine.resetAt)})`;
  // Projects
  const projEl = document.getElementById("projects-usage");
  if (projEl) projEl.textContent = `${proj.count} / ${proj.max}`;
  // Plan badge
  const planEl = document.getElementById("plan-badge");
  if (planEl) planEl.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
}

/** Start auto-refresh. */
let _interval = null;
export function startQuotaPolling(intervalMs = 60000) {
  if (_interval) clearInterval(_interval);
  _interval = setInterval(updateQuotaUI, intervalMs);
}
export function stopQuotaPolling() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}