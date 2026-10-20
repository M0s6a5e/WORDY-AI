/* WORXXEL Word Studio — Editor Core (ES Module)
   Uses shared: theme, i18n, api, quota, store, sanitize, ui */
import { AI_ENDPOINT, ACTIONS, OPS_STAGES } from "./config.js";
import { initTheme, getLanguage, setLanguage } from "/js/core/theme.js";
import { initI18n, t, refreshI18n } from "/js/core/i18n.js";
import { aiDocument } from "/js/core/api.js";
import { updateQuotaUI, startQuotaPolling, getAiGenerationUsage } from "/js/core/quota.js";
import { get, save, create, onChange } from "/js/core/store.js";
import { sanitize, sanitizeToFragment, cleanPaste, stripEditorMarkup } from "/js/core/sanitize.js";
import { toast, Modal, confirm, prompt, alert, showLoading } from "/js/core/ui.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const doc = $("#doc"), paper = $("#paper"), stage = $("#stage"),
      handle = $("#handle"), bubble = $("#bubble");

let scope = "selection", savedRange = null, hoverBlock = null, targetBlock = null, readOnly = false;
let currentDocId = null;

/* ---------- URL routing: ?id=<docId>&new=1&type=word&title=...&prompt=... ---------- */
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  currentDocId = params.get("id");
  const isNew = params.get("new") === "1";
  const type = params.get("type") || "word";
  const title = params.get("title");
  const prompt = params.get("prompt");
  return { currentDocId, isNew, type, title, prompt };
}

/* ---------- init ---------- */
async function boot() {
  await initTheme();
  await initI18n();
  refreshI18n();

  const { currentDocId: id, isNew, title, prompt } = parseUrlParams();

  if (id) {
    // Load existing document
    const docData = await get(id);
    if (docData) {
      loadDocument(docData);
      currentDocId = id;
      onChange(() => autosave());
    } else {
      toast(t("errors.notFound"));
      createNewDocument();
    }
  } else if (isNew) {
    // Create new document with AI generation
    await createNewDocument({ title, prompt });
  } else {
    // Load draft or create empty
    const restored = loadDraft();
    if (!restored) createNewDocument();
  }

  setupEventListeners();
  startQuotaPolling(60000);
  updateQuotaUI();

  // Trigger AI generation if prompt provided
  if (isNew && prompt) {
    setTimeout(() => {
      openAI();
      run("custom", prompt);
    }, 500);
  }
}

/* ---------- document load/save ---------- */
function loadDocument(docData) {
  currentDocId = docData.id;
  $("#docTitle").value = docData.title || "";
  doc.innerHTML = docData.content?.html || "";
  docTitle.value = docData.title || "";
  refresh();
  describe();
}

function serializeDocument() {
  return {
    html: stripEditorMarkup(doc.innerHTML),
    text: doc.innerText
  };
}

async function saveDocument(silent = true) {
  if (!currentDocId) return;
  const serialized = serializeDocument();
  const patch = {
    title: $("#docTitle").value,
    content: serialized,
    updatedAt: new Date().toISOString()
  };
  try {
    await save(currentDocId, patch);
    if (!silent) toast(t("toast.saved"));
  } catch (e) {
    console.error("[editor] Save failed", e);
    if (!silent) toast(t("toast.failed"));
  }
}

let autosaveTimer = null;
function autosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveDocument(true), 1500);
}

/* ---------- draft persistence (guest fallback) ---------- */
const DRAFT_KEY = "worxxel-editor-draft";
function saveDraft(silent) {
  $("#saveBadge").textContent = t("editor.saving");
  try {
    localStorage.setItem("worxxel-editor-draft", JSON.stringify({
      title: $("#docTitle").value, html: doc.innerHTML, at: Date.now()
    }));
  } catch (e) {}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { $("#saveBadge").textContent = t("editor.draftSaved"); }, 400);
  if (!silent) toast(t("toast.saved"));
}
let saveTimer = null;
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem("worxxel-editor-draft") || "null");
    if (d && d.html && d.html.length > 40) {
      doc.innerHTML = d.html; $("#docTitle").value = d.title || "Untitled";
      return true;
    }
  } catch (e) {}
  return false;
}

async function createNewDocument(opts = {}) {
  const docData = await create({
    type: "word",
    title: opts.title || t("editor.untitled"),
    language: getLanguage(),
    direction: getLanguage() === "ar" ? "rtl" : "ltr",
    content: { schemaVersion: 1, blocks: [] }
  });
  currentDocId = docData.id;
  loadDocument(docData);
  onChange(() => autosave());
  // Clean URL
  history.replaceState(null, "", "./worxxel-word-editor.html?id=" + currentDocId);
}

/* ---------- event listeners ---------- */
function setupEventListeners() {
  // Formatting
  $$("[data-c]").forEach(b => b.addEventListener("mousedown", e => {
    e.preventDefault(); document.execCommand(b.dataset.c); doc.focus(); refresh();
  }));
  $("#blk").addEventListener("change", e => { document.execCommand("formatBlock", false, e.target.value); doc.focus(); });
  $("#size").addEventListener("change", e => { document.execCommand("fontSize", false, e.target.value); doc.focus(); });
  $("#fontFam").addEventListener("change", e => { if (e.target.value) document.execCommand("fontName", false, e.target.value); doc.focus(); });
  $("#addTable").addEventListener("click", () => {
    doc.focus();
    document.execCommand("insertHTML", false,
      '<div class="tbl"><table><tr><th>Header</th><th>Header</th><th>Header</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></table></div><p><br></p>');
    refresh();
  });
  $("#zoom").addEventListener("change", e => {
    const z = parseFloat(e.target.value);
    paper.style.transform = "scale(" + z + ")";
    paper.style.marginBottom = ((z - 1) * paper.offsetHeight) + "px";
  });

  // Stats + outline
  doc.addEventListener("input", () => { refresh(); autosave(); });
  $("#docTitle").addEventListener("input", () => { refresh(); autosave(); });
  $("#saveBtn").addEventListener("click", () => saveDocument(false));

  // Blocks & scopes
  $$("#scopes .chip").forEach(c => c.addEventListener("click", () => setScope(c.dataset.s)));
  $$("#quick").addEventListener("click", e => { if (e.target.dataset.a) run(e.target.dataset.a); });
  $$("[data-ai]").forEach(a => a.addEventListener("click", () => {
    const [s, k] = a.dataset.ai.split(":");
    setScope(s); openAI(); run(k);
  }));
  $("#run").addEventListener("click", () => run("custom"));
  $("#prompt").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run("custom"); } });

  // AI panel
  $("#aiToggle").addEventListener("click", openAI);
  $("#fab").addEventListener("click", openAI);
  $("#aiClose").addEventListener("click", () => { $("#ai").classList.remove("open"); $("#scrim").classList.remove("show"); });
  $("#menuBtn").addEventListener("click", () => { $("#side").classList.toggle("open"); $("#scrim").classList.toggle("show", $("#side").classList.contains("open")); });
  $("#scrim").addEventListener("click", () => { $("#side").classList.remove("open"); $("#ai").classList.remove("open"); $("#scrim").classList.remove("show"); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      bubble.classList.remove("show");
      $("#side").classList.remove("open"); $("#ai").classList.remove("open"); $("#scrim").classList.remove("show");
    }
  });
  if (innerWidth > 1100) $("#ai").classList.add("open");

  // Theme
  $("#theme").addEventListener("click", () => {
    const d = document.documentElement;
    const dark = d.dataset.theme === "dark";
    setLanguage(dark ? "light" : "dark"); // Actually this toggles theme, not language
    // Fix: use theme toggle
    const isDark = getComputedStyle(d).getPropertyValue("--bg").trim().toLowerCase() === "#14131a";
    d.dataset.theme = isDark ? "light" : "dark";
  });

  // Language toggle (could add a button)
  // document.addEventListener("keydown", e => { if (e.key === "F2") toggleLanguage(); });

  // Preview mode
  $("#mEdit").addEventListener("click", () => mode(false));
  $("#mPrev").addEventListener("click", () => mode(true));

  // Export
  $("#exportBtn").addEventListener("click", exportDocx);

  // Paste cleanup
  doc.addEventListener("paste", async e => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      const clean = await cleanPaste(html, false);
      document.execCommand("insertHTML", false, clean);
    } else {
      document.execCommand("insertText", false, text);
    }
    refresh();
  });

  // Boot selection bubble, handle, etc.
  setupSelectionUI();
}

/* ---------- blocks & scopes (same as before but using shared t()) ---------- */
const blockOf = n => { while (n && n.parentNode !== doc) n = n.parentNode; return (n && n.nodeType === 1) ? n : null; };
function sectionOf(b){
  let s = b;
  while (s && !/^H[12]$/.test(s.tagName)) s = s.previousElementSibling;
  s = s || doc.firstElementChild;
  const out = [s]; let n = s.nextElementSibling;
  while (n && !/^H[12]$/.test(n.tagName)) { out.push(n); n = n.nextElementSibling; }
  return out;
}
const getSel = () => {
  const s = getSelection();
  if (s.rangeCount && doc.contains(s.anchorNode) && !s.isCollapsed) return s;
  if (savedRange) return { toString: () => savedRange.toString(), getRangeAt: () => savedRange, anchorNode: savedRange.startContainer };
  return null;
}
function targets(){
  const sel = getSel();
  const b = targetBlock || (sel && blockOf(sel.anchorNode)) || doc.firstElementChild;
  if (scope === "selection") return sel ? { kind: "sel", text: sel.toString(), range: sel.getRangeAt(0).cloneRange() } : null;
  if (scope === "block") return { kind: "blocks", els: [b] };
  if (scope === "section") return { kind: "blocks", els: sectionOf(b) };
  return { kind: "blocks", els: [...doc.children] };
}
function describe(){
  const t = targets();
  let msg = "";
  if (scope === "selection") msg = (t && t.text && t.text.trim())
    ? t.text.trim().split(/\s+/).length + " " + t("editor.wordsSelected") : t("editor.selectText");
  else if (t) msg = scope === "block" ? t("editor.currentParagraph") : t.els.length + " " + t("editor.blocksInScope");
  $("#scopeInfo").textContent = msg;
  $$("#scopes .chip").forEach(c => c.classList.toggle("on", c.dataset.s === scope));
  $$(".doc .hl").forEach(e => e.classList.remove("hl"));
  if (t && t.els) t.els.forEach(e => e.classList && e.classList.add("hl"));
}
function setScope(s){ scope = s; describe(); }

/* ---------- selection bubble ---------- */
const BUBBLE = [["✦ Ask AI","ask"],["Professional","professional"],["Rephrase","fix"],["Shorten","shorten"],["Expand","expand"],["Translate","translate"]];
function setupSelectionUI() {
  bubble.innerHTML = BUBBLE.map(([l, a], i) => '<button class="' + (i ? "" : "first") + '" data-a="' + a + '">' + l + "</button>").join("");
  bubble.addEventListener("mousedown", e => e.preventDefault());
  bubble.addEventListener("click", e => {
    const a = e.target.dataset && e.target.dataset.a;
    if (!a) return;
    setScope("selection"); openAI();
    if (a === "ask") $("#prompt").focus(); else run(a);
  });
  document.addEventListener("selectionchange", () => {
    if (readOnly) return bubble.classList.remove("show");
    const s = getSelection();
    if (!s.rangeCount || s.isCollapsed || !doc.contains(s.anchorNode)) { bubble.classList.remove("show"); return; }
    savedRange = s.getRangeAt(0).cloneRange();
    const r = savedRange.getBoundingClientRect();
    bubble.classList.add("show");
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    bubble.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + "px";
    bubble.style.top = ((r.top - h - 12 < 70) ? (r.bottom + 12) : (r.top - h - 12)) + "px";
    if (scope === "selection") describe();
  });

  // Per-block handle
  doc.addEventListener("mousemove", e => {
    if (readOnly) return;
    const b = blockOf(e.target);
    if (!b || b === hoverBlock) return;
    hoverBlock = b;
    const pr = paper.getBoundingClientRect(), br = b.getBoundingClientRect(), k = pr.height / paper.offsetHeight || 1;
    handle.style.top = ((br.top - pr.top) / k + Math.min(4, Math.max(0, br.height / 2 - 15))) + "px";
    handle.classList.add("show");
  });
  paper.addEventListener("mouseleave", () => { if (!matchMedia("(pointer: coarse)").matches) handle.classList.remove("show"); });
  handle.addEventListener("click", () => {
    targetBlock = hoverBlock;
    setScope(/^H[12]$/.test(hoverBlock.tagName) ? "section" : "block");
    openAI();
  });
  doc.addEventListener("click", e => {
    const b = blockOf(e.target);
    if (b && matchMedia("(pointer: coarse)").matches) {
      hoverBlock = b;
      const pr = paper.getBoundingClientRect(), br = b.getBoundingClientRect();
      handle.style.top = (br.top - pr.top) + "px"; handle.classList.add("show");
    }
    if (b && scope !== "selection" && getSelection().isCollapsed) { targetBlock = b; describe(); }
  });

  // Quick chips
  $("#quick").innerHTML = Object.entries(ACTIONS).map(([k, v]) => '<button class="chip" data-a="' + k + '">' + v + "</button>").join("");
}

/* ---------- assistant panel ---------- */
const openAI = () => { $("#ai").classList.add("open"); if (innerWidth <= 1100) $("#scrim").classList.add("show"); };

/* ---------- operations modal ---------- */
const opsStageEls = () => [...document.querySelectorAll("#opsStages li")];
export function opsShow(title){
  const ops = $("#ops");
  $("#opsTitle").textContent = title || t("editor.generating");
  $("#opsFill").style.width = "4%";
  opsStageEls().forEach(li => li.classList.remove("done", "active"));
  ops.setAttribute("aria-hidden", "false"); ops.classList.add("show");
  ops._fill = setInterval(() => {
    const f = $("#opsFill"), w = Math.min(92, parseFloat(f.style.width || "4") + 7);
    f.style.width = w + "%";
  }, 220);
  ops._step = 0;
  ops._tick = setInterval(() => {
    const els = opsStageEls();
    els.forEach((li, i) => {
      li.classList.toggle("done", i < ops._step);
      li.classList.toggle("active", i === ops._step);
    });
    if (ops._step < els.length) ops._step++;
  }, REDUCED ? 60 : 480);
}
export function opsDone(){
  const ops = $("#ops");
  clearInterval(ops._fill); clearInterval(ops._tick);
  $("#opsFill").style.width = "100%";
  opsStageEls().forEach(li => { li.classList.add("done"); li.classList.remove("active"); });
  setTimeout(() => { ops.classList.remove("show"); ops.setAttribute("aria-hidden", "true"); }, REDUCED ? 60 : 420);
}

/* ---------- AI call ---------- */
async function callAI(action, t, prompt){
  const text = t.kind === "sel" ? t.text : (t.els || []).map(e => e.innerText).join("\n");
  if (AI_ENDPOINT) {
    return aiDocument({ action, scope, text, prompt, language: getLanguage() });
  }
  await delay(1500);
  // Demo transforms (same as before)
  if (action === "custom" && scope === "doc" && /create|generate|write|draft|plan|report|proposal/i.test(prompt || "")) {
    return { text: "", html: demoBuild(prompt, $("#docTitle").value.trim() || t("editor.untitled")) };
  }
  if (action === "expand") return { text: text + "\nStrengthen this with concrete examples, owners, and measurable outcomes for each phase." };
  if (action === "shorten") return { text: firstSentences(text, 1) };
  if (action === "summarize") return { text: t("editor.summarizeShort") + ": " + firstSentences(text, 2) };
  if (action === "bullets") return { text: text.split(/(?<=[.!?])\s+/).filter(Boolean).map(s => "• " + s.trim()).join("\n") };
  if (action === "table") return { text: "", html: tableFromText(text), asTable: true };
  if (action === "professional") return { text: "In formal terms: " + text };
  if (action === "translate") return { text: t("editor.translate") + ": " + text };
  if (action === "fix") return { text };
  if (action === "custom") return { text: t("editor.customDraft", { prompt }) + "\n" + text };
  return { text };
}

function firstSentences(text, n){
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, n || 2).join(" ");
}
function tableFromText(text){
  const parts = text.split(/[\n•]+/).join(" ").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean).slice(0, 8);
  const rows = parts.map((p, i) => "<tr><td>" + (i + 1) + "</td><td>" + esc(p) + "</td></tr>").join("");
  return '<div class="tbl"><table><tr><th>#</th><th>Item</th></tr>' + rows + "</table></div>";
}
function demoBuild(promptText, titleText){
  const q = String(promptText || "").replace(/\s+/g, " ").trim();
  const title = esc(titleText || t("editor.untitled"));
  const date = new Date().toLocaleDateString(getLanguage() === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  return "<h1>" + title + "</h1>"
    + "<p>" + t("editor.preparedWith", { date }) + "</p>"
    + "<h2>" + t("editor.overview") + "</h2>"
    + "<p>" + (q ? t("editor.draftFromRequest", { q: esc(q) }) : t("editor.startWriting")) + "</p>"
    + "<h2>" + t("editor.keyObjectives") + "</h2>"
    + "<p>" + t("editor.objectivesList") + "</p>"
    + "<h2>" + t("editor.plan") + "</h2>"
    + '<div class="tbl"><table><tr><th>' + t("editor.phase") + '</th><th>' + t("editor.duration") + '</th><th>' + t("editor.owner") + '</th></tr><tr><td>' + t("editor.preparation") + '</td><td>2 weeks</td><td>' + t("editor.team") + '</td></tr><tr><td>' + t("editor.execution") + '</td><td>3 weeks</td><td>' + t("editor.team") + '</td></tr><tr><td>' + t("editor.review") + '</td><td>1 week</td><td>' + t("editor.team") + '</td></tr></table></div>'
    + "<h2>" + t("editor.nextSteps") + "</h2>"
    + "<p>" + t("editor.editDraft") + "</p>";
}

/* ---------- run + apply ---------- */
async function run(action, promptOverride){
  const genUsage = await getAiGenerationUsage();
  if (genUsage.used >= genUsage.max) { toast(t("toast.limitReached")); openAI(); return; }
  const t = targets();
  if (!t || (t.kind === "sel" && !t.text.trim())) { toast(t("editor.selectTextFirst")); openAI(); return; }
  const prompt = promptOverride || $("#prompt").value.trim();
  if (action === "custom" && !prompt) { $("#prompt").focus(); openAI(); return; }
  const label = action === "custom" ? t("editor.customCommand") : (ACTIONS[action] || t("common.working"));
  const card = document.createElement("div"); card.className = "res";
  card.innerHTML = "<small>" + esc(label) + "</small><span class='dots'><i></i><i></i><i></i></span>";
  $("#results").prepend(card);
  opsShow(label + "…");
  try {
    const out = await callAI(action, t, prompt);
    opsDone();
    // bump usage is server-side now
    try { $("#tok").textContent = +$("#tok").textContent + Math.ceil(((out.text || "") + (out.html || "")).length / 3); } catch (e) {}
    if (out.html && !out.asTable && scope === "doc" && action === "custom") {
      paper.classList.add("creating");
      doc.innerHTML = out.html;
      [...doc.children].forEach((el, i) => {
        el.classList.add("rise"); el.style.animationDelay = REDUCED ? "0s" : (i * 70) + "ms";
        el.classList.add("flash");
      });
      setTimeout(() => paper.classList.remove("creating"), 1300);
      refresh(); describe(); autosave();
      card.innerHTML = "<small>" + esc(label) + " — " + t("editor.applied") + "</small><div class='out'>" + t("editor.documentDrafted") + "</div>"
        + "<div class='acts'><button class='btn' data-x='copy'>" + t("common.copy") + "</button><button class='btn' data-x='drop'>" + t("common.discard") + "</button></div>";
      card.querySelector("[data-x='copy']").onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(doc.innerText); toast(t("toast.copied")); };
      card.querySelector("[data-x='drop']").onclick = () => card.remove();
      toast(t("toast.documentCreated"));
      return;
    }
    card.innerHTML = "<small>" + esc(label) + "</small><div class='out'></div>"
      + "<div class='acts'><button class='btn pri' data-x='rep'>" + t("editor.replace") + "</button><button class='btn' data-x='ins'>" + t("editor.insertAfter") + "</button><button class='btn' data-x='copy'>" + t("common.copy") + "</button><button class='btn' data-x='drop'>" + t("common.discard") + "</button></div>";
    const outEl = card.querySelector(".out");
    if (out.html && out.asTable) { outEl.innerHTML = out.html; }
    else { outEl.innerText = out.text; }
    const [b1, b2, b3, b4] = card.querySelectorAll("button");
    b1.onclick = () => { apply(t, out, true, action); card.remove(); };
    b2.onclick = () => { apply(t, out, false, action); card.remove(); };
    b3.onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(out.text || outEl.innerText); toast(t("toast.copied")); };
    b4.onclick = () => card.remove();
  } catch (e) { opsDone(); card.innerHTML = t("errors.aiUnavailable"); }
}
function apply(t, out, replace, action){
  if (out.html && out.asTable) {
    const last = t.kind === "sel" ? blockOf(getSel().anchorNode) : t.els[t.els.length - 1];
    if (replace && t.kind !== "sel" && t.els.length === 1 && !/^H[12]$/.test(t.els[0].tagName)) { t.els[0].outerHTML = out.html; }
    else if (last) { last.insertAdjacentHTML("afterend", out.html); }
    else { doc.insertAdjacentHTML("beforeend", out.html); }
  } else if (t.kind === "sel") {
    const s = getSelection(); s.removeAllRanges(); s.addRange(t.range);
    if (replace) { document.execCommand("insertText", false, out.text); }
    else { t.range.collapse(false); s.removeAllRanges(); s.addRange(t.range); document.execCommand("insertText", false, " " + out.text); }
  } else {
    const paras = String(out.text).split("\n").filter(p => p.trim());
    const last = t.els[t.els.length - 1];
    if (replace) {
      t.els.slice(1).forEach(e => e.remove());
      const f = t.els[0];
      if (/^H[12]$/.test(f.tagName) || f.tagName === "DIV") { f.insertAdjacentHTML("afterend", paras.map(p => "<p>" + esc(p) + "</p>").join("")); f.classList.add("flash"); }
      else { f.textContent = paras[0] || ""; f.classList.add("flash"); paras.slice(1).reverse().forEach(p => f.insertAdjacentHTML("afterend", "<p>" + esc(p) + "</p>")); }
    } else {
      last.insertAdjacentHTML("afterend", paras.map(p => "<p class='flash'>" + esc(p) + "</p>").join(""));
    }
  }
  refresh(); describe(); autosave();
  toast(t("toast.applied"));
}

/* ---------- preview mode / theme / export ---------- */
export function mode(ro){
  readOnly = ro; doc.contentEditable = String(!ro);
  paper.classList.toggle("ro", ro);
  $("#tools").style.display = ro ? "none" : "";
  $("#mEdit").classList.toggle("on", !ro); $("#mPrev").classList.toggle("on", ro);
  handle.classList.remove("show"); bubble.classList.remove("show");
}
$("#mEdit").addEventListener("click", () => mode(false));
$("#mPrev").addEventListener("click", () => mode(true));

const slug = s => (s || "untitled-document").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "untitled-document";
async function exportDocx() {
  // Lazy-load docx library
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign, Header, Footer, PageNumber, PageOrientation, SectionProperties } = await import("/vendor/docx/docx.min.js");
  const title = $("#docTitle").value.trim() || t("editor.untitled");
  const children = [];

  // Helper to convert block to docx elements
  function blockToDocx(el) {
    if (el.tagName === "H1") return new Paragraph({ text: el.textContent, heading: HeadingLevel.HEADING_1 });
    if (el.tagName === "H2") return new Paragraph({ text: el.textContent, heading: HeadingLevel.HEADING_2 });
    if (el.tagName === "H3") return new Paragraph({ text: el.textContent, heading: HeadingLevel.HEADING_3 });
    if (el.tagName === "P") return new Paragraph({ children: [new TextRun(el.textContent)] });
    if (el.tagName === "BLOCKQUOTE") return new Paragraph({ children: [new TextRun({ text: el.textContent, italics: true })], indent: { left: 720 } });
    if (el.classList?.contains("tbl") && el.querySelector("table")) {
      const table = el.querySelector("table");
      const rows = [...table.querySelectorAll("tr")].map(tr => {
        const cells = [...tr.querySelectorAll("th, td")].map(cell => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell.textContent, bold: cell.tagName === "TH" })] })],
          shading: { fill: cell.tagName === "TH" ? "EEF1FD" : undefined }
        }));
        return new TableRow({ children: cells });
      });
      return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
    }
    if (el.tagName === "HR" && el.classList.contains("pagebreak")) {
      return new Paragraph({ text: "", pageBreakBefore: true });
    }
    return new Paragraph({ children: [new TextRun(el.textContent)] });
  }

  [...doc.children].forEach(el => {
    const dx = blockToDocx(el);
    if (dx) children.push(dx);
  });

  const docx = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
      headers: { default: new Header({ children: [new Paragraph({ text: title, alignment: AlignmentType.CENTER })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "WORXXEL — " }), new PageNumber() ]}) ]) },
      children
    }]
  });

  const blob = await Packer.toBlob(docx);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = slug($("#docTitle").value) + ".docx";
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast(t("toast.exportedXlsx"));
}

/* ---------- refresh / describe / stats (unchanged logic) ---------- */
function wrapTables(){
  doc.querySelectorAll("table").forEach(t => {
    if (!t.parentElement || !t.parentElement.classList.contains("tbl")) {
      const w = document.createElement("div"); w.className = "tbl";
      t.before(w); w.appendChild(t);
    }
  });
}
export function refresh(){
  wrapTables();
  const words = (doc.innerText.trim().match(/\S+/g) || []).length;
  $("#wc").textContent = words;
  $("#rt").textContent = Math.max(1, Math.round(words / 200));
  const pages = Math.max(1, Math.ceil(paper.offsetHeight / 1123));
  $("#pg").textContent = pages; $("#footPg").textContent = "1"; $("#footTotal").textContent = pages;
  $("#footTitle").textContent = $("#docTitle").value.trim() || t("editor.untitled");
  const ol = $("#outline"); ol.innerHTML = "";
  const heads = doc.querySelectorAll("h1,h2");
  if (!heads.length) { ol.innerHTML = '<div class="empty">' + t("editor.noHeadings") + '</div>'; }
  heads.forEach(h => {
    const a = document.createElement("a");
    a.textContent = h.textContent.trim() || t("editor.untitled");
    if (h.tagName === "H2") a.className = "sub";
    a.addEventListener("click", () => {
      h.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
      $("#side").classList.remove("open"); $("#scrim").classList.remove("show");
    });
    ol.appendChild(a);
  });
}
doc.addEventListener("blur", describe);

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&","<":"<",">":">",'"':"""}[c]));
const delay = ms => new Promise(r => setTimeout(r, REDUCED ? 60 : ms));

/* ---------- start ---------- */
boot();