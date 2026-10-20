/* WORXXEL — Document Store (ES Module)
   Firestore + localStorage guest fallback. Same API for both modes. */
import { apiFetch } from "./api.js";
import { toast } from "./ui.js";

const GUEST_KEY = "worxxel-guest-docs";
let _mode = "guest"; // "guest" | "cloud"
let _listeners = new Set();

/** Set mode (called after auth state known). */
export function setMode(mode) {
  _mode = mode;
}

/** Get current mode. */
export function getMode() {
  return _mode;
}

/** Guest storage helpers. */
function guestGetAll() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); } catch { return []; }
}
function guestSaveAll(docs) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(docs));
}
function guestGenerateId() {
  return "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function notify() { _listeners.forEach(fn => fn()); }

/** List all documents for current user. */
export async function list() {
  if (_mode === "cloud") {
    try {
      const res = await apiFetch("/api/docs");
      return res.docs || [];
    } catch { return guestGetAll(); }
  }
  return guestGetAll();
}

/** Get single document by ID. */
export async function get(id) {
  if (_mode === "cloud") {
    try {
      return await apiFetch(`/api/docs/${id}`);
    } catch { }
  }
  return guestGetAll().find(d => d.id === id) || null;
}

/** Create a new document (enforces project cap server-side in cloud mode). */
export async function create(doc) {
  const newDoc = {
    id: _mode === "cloud" ? undefined : guestGenerateId(),
    type: doc.type || "word",
    title: doc.title || "Untitled",
    language: doc.language || getLanguage(),
    direction: doc.direction || (getLanguage() === "ar" ? "rtl" : "ltr"),
    content: doc.content || { schemaVersion: 1, blocks: [] },
    sizeBytes: 0,
    status: "ready",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1
  };

  if (_mode === "cloud") {
    try {
      const res = await apiFetch("/api/docs", { method: "POST", body: newDoc });
      notify();
      return res.doc;
    } catch (e) {
      if (e.code === "quota_exceeded") throw e;
      // fallback to guest
      _mode = "guest";
    }
  }
  const docs = guestGetAll();
  docs.unshift(newDoc);
  guestSaveAll(docs);
  notify();
  return newDoc;
}

/** Save (patch) a document. */
export async function save(id, patch) {
  if (_mode === "cloud") {
    try {
      const res = await apiFetch(`/api/docs/${id}`, { method: "PATCH", body: patch });
      notify();
      return res.doc;
    } catch (e) {
      if (e.code === "quota_exceeded") throw e;
      // fallback
    }
  }
  const docs = guestGetAll();
  const idx = docs.findIndex(d => d.id === id);
  if (idx >= 0) {
    docs[idx] = { ...docs[idx], ...patch, updatedAt: new Date().toISOString() };
    guestSaveAll(docs);
    notify();
    return docs[idx];
  }
  return null;
}

/** Delete a document. */
export async function remove(id) {
  if (_mode === "cloud") {
    try {
      await apiFetch(`/api/docs/${id}`, { method: "DELETE" });
      notify();
      return true;
    } catch { }
  }
  const docs = guestGetAll().filter(d => d.id !== id);
  guestSaveAll(docs);
  notify();
  return true;
}

/** Subscribe to changes. */
export function onChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** Migrate guest docs to cloud on sign-in. */
export async function migrateGuestToCloud() {
  if (_mode !== "guest") return;
  const guestDocs = guestGetAll();
  if (!guestDocs.length) return;
  for (const doc of guestDocs) {
    try {
      await create(doc);
    } catch (e) {
      if (e.code === "quota_exceeded") {
        toast("Project limit reached. Some local documents were not imported.");
        break;
      }
    }
  }
  localStorage.removeItem(GUEST_KEY);
  _mode = "cloud";
  notify();
}

/** Optimistic concurrency: save with version check. */
export async function saveWithVersion(id, patch, expectedVersion) {
  const doc = await get(id);
  if (!doc) throw new Error("Document not found");
  if (doc.schemaVersion !== expectedVersion) {
    throw { code: "version_conflict", local: doc, remote: expectedVersion };
  }
  return save(id, { ...patch, schemaVersion: expectedVersion + 1 });
}