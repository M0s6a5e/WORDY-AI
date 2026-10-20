/* WORXXEL — API Client (ES Module)
   Fetch wrapper to Cloudflare Worker with auth, timeout, abort, error mapping. */
import { getLanguage } from "./theme.js";
import { toast } from "./ui.js";

const WORKER_BASE = (() => {
  // In production, this is set via build-time env or meta tag
  const meta = document.querySelector('meta[name="worker-origin"]');
  return meta?.content || "https://worxxel-worker.your-subdomain.workers.dev";
})();

const DEFAULT_TIMEOUT = 60000; // 60s for AI generation

/** Get current Firebase ID token. */
async function getAuthHeader() {
  // Firebase Auth is loaded globally in auth.html / dashboard
  if (typeof firebase !== "undefined" && firebase.auth?.currentUser) {
    try {
      const token = await firebase.auth().currentUser.getIdToken(true);
      return { "Authorization": `Bearer ${token}` };
    } catch (e) {
      console.warn("[api] Failed to get ID token", e);
    }
  }
  return {};
}

/** Map Worker error codes to user messages. */
const ERROR_MESSAGES = {
  unauthorized: "Please sign in to continue.",
  quota_exceeded: "Daily limit reached. Try again tomorrow.",
  rate_limited: "Too many requests. Please wait a moment.",
  too_large: "Request too large. Shorten your prompt.",
  bad_request: "Invalid request. Please try again.",
  bad_model_output: "AI returned an unexpected response. Please retry.",
  upstream_unavailable: "AI service temporarily unavailable. Please retry.",
  timeout: "Request timed out. Please try again.",
  network: "Network error. Check your connection."
};

/** Core fetch with auth, timeout, abort, error handling. */
export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers = {}, timeout = DEFAULT_TIMEOUT, signal } = options;
  const url = `${WORKER_BASE}${path}`;

  const authHeaders = await getAuthHeader();
  const fetchHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...authHeaders,
    ...headers
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const abortSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: abortSignal,
      credentials: "omit"
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const code = (isJson && data?.error?.code) || `http_${res.status}`;
      const msg = ERROR_MESSAGES[code] || ERROR_MESSAGES.generic || "Request failed";
      const err = new Error(msg);
      err.code = code;
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      const err = new Error(ERROR_MESSAGES.timeout);
      err.code = "timeout";
      throw err;
    }
    if (e instanceof TypeError && e.message.includes("fetch")) {
      const err = new Error(ERROR_MESSAGES.network);
      err.code = "network";
      throw err;
    }
    throw e;
  }
}

/** POST /api/ai/document — Word generate/edit. */
export async function aiDocument(request) {
  return apiFetch("/api/ai/document", {
    method: "POST",
    body: { ...request, language: getLanguage() }
  });
}

/** POST /api/ai/sheet — Excel generate/edit. */
export async function aiSheet(request) {
  return apiFetch("/api/ai/sheet", {
    method: "POST",
    body: { ...request, language: getLanguage() }
  });
}

/** GET /api/me — user profile, plan, usage, limits. */
export async function getMe() {
  return apiFetch("/api/me");
}

/** POST /api/docs — create document registry entry. */
export async function createDoc(doc) {
  return apiFetch("/api/docs", { method: "POST", body: doc });
}

/** DELETE /api/docs/:id — delete document. */
export async function deleteDoc(id) {
  return apiFetch(`/api/docs/${id}`, { method: "DELETE" });
}

/** POST /api/chat — lightweight chat (optional). */
export async function chat(message) {
  return apiFetch("/api/chat", { method: "POST", body: { message, language: getLanguage() } });
}