/* WORXXEL Word Studio — Editor Core (ES Module)
   Real editor logic: contenteditable, formatting, AI panel, operations modal, export, persistence. */
export const AI_ENDPOINT = ""; // set via Worker deploy; leave empty for demo transforms

export const ACTIONS = {
  professional: "Make professional", summarize: "Summarize", expand: "Expand",
  fix: "Fix grammar & style", shorten: "Shorten", translate: "Translate",
  table: "Make a table", bullets: "To bullets"
};

export const OPS_STAGES = [
  "Analyzing your request",
  "Drafting the content",
  "Formatting & styling",
  "Final review"
];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const doc = $("#doc"), paper = $("#paper"), stage = $("#stage"),
      handle = $("#handle"), bubble = $("#bubble");

let scope = "selection", savedRange = null, hoverBlock = null, targetBlock = null, readOnly = false;

/* ---------- toast ---------- */
export function toast(m) {
  const t = $("#toast"); t.textContent = m; t.classList.add("show");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);
}
export const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&","<":"<",">":">",'"':"""}[c]));
export const delay = ms => new Promise(r => setTimeout(r, REDUCED ? 60 : ms));

/* ---------- free plan (shared with dashboard via wordy-ai-usage) ---------- */
const DAILY_AI_LIMIT = 2, DRAFT_KEY = "worxxel-editor-draft";
export function todayKey() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function getAiUsage(){
  try { const u = JSON.parse(localStorage.getItem("wordy-ai-usage") || "{}");
    return (u.date === todayKey()) ? u : { date: todayKey(), count: 0 };
  } catch (e) { return { date: todayKey(), count: 0 }; }
}
export function aiLeft(){ return Math.max(0, DAILY_AI_LIMIT - (getAiUsage().count || 0)); }
function bumpAiUsage(){
  const u = getAiUsage(); u.count = (u.count || 0) + 1;
  try { localStorage.setItem("wordy-ai-usage", JSON.stringify(u)); } catch (e) {}
  updateUsageUI();
}
function updateUsageUI(){ $("#aiLeft").textContent = aiLeft() + " / " + DAILY_AI_LIMIT; }

/* ---------- draft persistence (this browser) ---------- */
const docTitle = $("#docTitle");
let saveTimer = null;
function saveDraft(silent){
  $("#saveBadge").textContent = "Saving…";
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      title: docTitle.value, html: doc.innerHTML, at: Date.now()
    }));
  } catch (e) {}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { $("#saveBadge").textContent = "Draft · Saved"; }, 400);
  if (!silent) toast("Saved in this browser");
}
function loadDraft(){
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (d && d.html && d.html.length > 40) {
      doc.innerHTML = d.html; docTitle.value = d.title || docTitle.value;
      return true;
    }
  } catch (e) {}
  return false;
}

/* ---------- formatting ---------- */
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

/* ---------- stats + outline + table wrapping ---------- */
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
  $("#footTitle").textContent = docTitle.value.trim() || "Untitled";
  const ol = $("#outline"); ol.innerHTML = "";
  const heads = doc.querySelectorAll("h1,h2");
  if (!heads.length) { ol.innerHTML = '<div class="empty">No headings yet — format a line as Heading 1 or 2 to build an outline.</div>'; }
  heads.forEach(h => {
    const a = document.createElement("a");
    a.textContent = h.textContent.trim() || "Untitled";
    if (h.tagName === "H2") a.className = "sub";
    a.addEventListener("click", () => {
      h.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
      $("#side").classList.remove("open"); $("#scrim").classList.remove("show");
    });
    ol.appendChild(a);
  });
}
doc.addEventListener("input", () => { refresh(); clearTimeout(doc._sv); doc._sv = setTimeout(() => saveDraft(true), 1200); });
docTitle.addEventListener("input", () => { refresh(); clearTimeout(doc._sv); doc._sv = setTimeout(() => saveDraft(true), 1200); });
$("#saveBtn").addEventListener("click", () => saveDraft(false));

/* ---------- blocks & scopes ---------- */
export const blockOf = n => { while (n && n.parentNode !== doc) n = n.parentNode; return (n && n.nodeType === 1) ? n : null; };
export function sectionOf(b){
  let s = b;
  while (s && !/^H[12]$/.test(s.tagName)) s = s.previousElementSibling;
  s = s || doc.firstElementChild;
  const out = [s]; let n = s.nextElementSibling;
  while (n && !/^H[12]$/.test(n.tagName)) { out.push(n); n = n.nextElementSibling; }
  return out;
}
function getSel() {
  const s = getSelection();
  if (s.rangeCount && doc.contains(s.anchorNode) && !s.isCollapsed) return s;
  if (savedRange) return { toString: () => savedRange.toString(), getRangeAt: () => savedRange, anchorNode: savedRange.startContainer };
  return null;
}
export function targets(){
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
    ? t.text.trim().split(/\s+/).length + " words selected" : "Select text in the document to begin.";
  else if (t) msg = scope === "block" ? "Current paragraph" : t.els.length + " blocks in scope";
  $("#scopeInfo").textContent = msg;
  $$("#scopes .chip").forEach(c => c.classList.toggle("on", c.dataset.s === scope));
  $$(".doc .hl").forEach(e => e.classList.remove("hl"));
  if (t && t.els) t.els.forEach(e => e.classList && e.classList.add("hl"));
}
function setScope(s){ scope = s; describe(); }
$$("#scopes .chip").forEach(c => c.addEventListener("click", () => setScope(c.dataset.s)));

/* ---------- selection bubble ---------- */
const BUBBLE = [["✦ Ask AI","ask"],["Professional","professional"],["Rephrase","fix"],["Shorten","shorten"],["Expand","expand"],["Translate","translate"]];
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

/* ---------- per-block ✦ handle ---------- */
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

/* ---------- assistant panel ---------- */
$("#quick").innerHTML = Object.entries(ACTIONS).map(([k, v]) => '<button class="chip" data-a="' + k + '">' + v + "</button>").join("");
$("#quick").addEventListener("click", e => { if (e.target.dataset.a) run(e.target.dataset.a); });
$$("[data-ai]").forEach(a => a.addEventListener("click", () => {
  const [s, k] = a.dataset.ai.split(":");
  setScope(s); openAI(); run(k);
}));
$("#run").addEventListener("click", () => run("custom"));
$("#prompt").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run("custom"); } });
const openAI = () => { $("#ai").classList.add("open"); if (innerWidth <= 1100) $("#scrim").classList.add("show"); };
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

/* ---------- operations modal (progress + stages) ---------- */
const opsStageEls = () => [...document.querySelectorAll("#opsStages li")];
export function opsShow(title){
  const ops = $("#ops");
  $("#opsTitle").textContent = title || "Generating…";
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

/* ---------- demo transformations (used until AI_ENDPOINT is set) ---------- */
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
  const title = esc(titleText || "New Document");
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return "<h1>" + title + "</h1>"
    + "<p>Prepared with WORXXEL · " + date + "</p>"
    + "<h2>Overview</h2>"
    + "<p>" + (q ? "This draft was created from your request: &ldquo;" + esc(q) + "&rdquo;. Edit any part directly, or ask the assistant to expand a section." : "Start writing — select any text to see AI options.") + "</p>"
    + "<h2>Key objectives</h2>"
    + "<p>• Clarify the goal and the audience<br>• Define measurable outcomes<br>• Assign owners and deadlines</p>"
    + "<h2>Plan</h2>"
    + '<div class="tbl"><table><tr><th>Phase</th><th>Duration</th><th>Owner</th></tr><tr><td>Preparation</td><td>2 weeks</td><td>Team</td></tr><tr><td>Execution</td><td>3 weeks</td><td>Team</td></tr><tr><td>Review</td><td>1 week</td><td>Team</td></tr></table></div>'
    + "<h2>Next steps</h2>"
    + "<p>Edit this draft directly, or ask the assistant to expand any section.</p>";
}
async function callAI(action, t, prompt){
  const text = t.kind === "sel" ? t.text : (t.els || []).map(e => e.innerText).join("\n");
  if (AI_ENDPOINT) {
    const r = await fetch(AI_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, scope, text, prompt })
    });
    return { text: (await r.json()).text, html: null };
  }
  await delay(1500);
  if (action === "custom" && scope === "doc" && /create|generate|write|draft|plan|report|proposal/i.test(prompt || "")) {
    return { text: "", html: demoBuild(prompt, docTitle.value.trim() || "New Document") };
  }
  if (action === "expand") return { text: text + "\nStrengthen this with concrete examples, owners, and measurable outcomes for each phase." };
  if (action === "shorten") return { text: firstSentences(text, 1) };
  if (action === "summarize") return { text: "Summary: " + firstSentences(text, 2) };
  if (action === "bullets") return { text: text.split(/(?<=[.!?])\s+/).filter(Boolean).map(s => "• " + s.trim()).join("\n") };
  if (action === "table") return { text: "", html: tableFromText(text), asTable: true };
  if (action === "professional") return { text: "In formal terms: " + text };
  if (action === "translate") return { text: "[Translated] " + text };
  if (action === "fix") return { text };
  if (action === "custom") return { text: 'Draft for "' + prompt + '":\n' + text };
  return { text };
}

/* ---------- run + apply ---------- */
export async function run(action){
  if (aiLeft() <= 0) { toast("Daily free limit reached — 2 AI files/day on the Free plan"); openAI(); return; }
  const t = targets();
  if (!t || (t.kind === "sel" && !t.text.trim())) { toast("Select text first, or change the scope"); openAI(); return; }
  const prompt = $("#prompt").value.trim();
  if (action === "custom" && !prompt) { $("#prompt").focus(); openAI(); return; }
  const label = action === "custom" ? "Custom command" : (ACTIONS[action] || "Working");
  const card = document.createElement("div"); card.className = "res";
  card.innerHTML = "<small>" + esc(label) + "</small><span class='dots'><i></i><i></i><i></i></span>";
  $("#results").prepend(card);
  opsShow(label + "…");
  try {
    const out = await callAI(action, t, prompt);
    opsDone();
    bumpAiUsage();
    try { $("#tok").textContent = +$("#tok").textContent + Math.ceil(((out.text || "") + (out.html || "")).length / 3); } catch (e) {}
    if (out.html && !out.asTable && scope === "doc" && action === "custom") {
      paper.classList.add("creating");
      doc.innerHTML = out.html;
      [...doc.children].forEach((el, i) => {
        el.classList.add("rise"); el.style.animationDelay = REDUCED ? "0s" : (i * 70) + "ms";
        el.classList.add("flash");
      });
      setTimeout(() => paper.classList.remove("creating"), 1300);
      refresh(); describe(); saveDraft(true);
      card.innerHTML = "<small>" + esc(label) + " — applied</small><div class='out'>Document drafted on the page with animation. Edit anything directly.</div>"
        + "<div class='acts'><button class='btn' data-x='copy'>Copy text</button><button class='btn' data-x='drop'>Dismiss</button></div>";
      card.querySelector("[data-x='copy']").onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(doc.innerText); toast("Copied"); };
      card.querySelector("[data-x='drop']").onclick = () => card.remove();
      toast("Document created");
      return;
    }
    card.innerHTML = "<small>" + esc(label) + "</small><div class='out'></div>"
      + "<div class='acts'><button class='btn pri' data-x='rep'>Replace</button><button class='btn' data-x='ins'>Insert after</button><button class='btn' data-x='copy'>Copy</button><button class='btn' data-x='drop'>Discard</button></div>";
    const outEl = card.querySelector(".out");
    if (out.html && out.asTable) { outEl.innerHTML = out.html; }
    else { outEl.innerText = out.text; }
    const [b1, b2, b3, b4] = card.querySelectorAll("button");
    b1.onclick = () => { apply(t, out, true, action); card.remove(); };
    b2.onclick = () => { apply(t, out, false, action); card.remove(); };
    b3.onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(out.text || outEl.innerText); toast("Copied"); };
    b4.onclick = () => card.remove();
  } catch (e) { opsDone(); card.innerHTML = "Could not reach the service. Set AI_ENDPOINT and try again."; }
}
export function apply(t, out, replace, action){
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
  refresh(); describe(); saveDraft(true);
  toast("Applied");
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
$("#theme").addEventListener("click", () => {
  const d = document.documentElement;
  const dark = getComputedStyle(d).getPropertyValue("--bg").trim().toLowerCase() === "#14131a";
  d.dataset.theme = dark ? "light" : "dark";
});
const slug = s => (s || "untitled-document").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "untitled-document";
$("#exportBtn").addEventListener("click", () => {
  const title = docTitle.value.trim() || "Untitled Document";
  const css = "body{font-family:Arial,sans-serif;line-height:1.6}h1{font-size:26pt}h2{font-size:18pt;color:#3F4CE0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 8px}blockquote{border-left:3px solid #3F4CE0;margin-left:0;padding-left:12px;color:#333}";
  const file = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(title) + "</title><style>" + css + "</style></head><body><h1>" + esc(title) + "</h1>" + doc.innerHTML + "</body></html>";
  const blob = new Blob(["\ufeff", file], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = slug(title) + ".doc";
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast("Exported — opens in Microsoft Word");
});

/* ---------- boot ---------- */
(function boot(){
  const restored = loadDraft();
  updateUsageUI();
  refresh(); describe();
  if (restored) toast("Draft restored");
})();
doc.addEventListener("blur", describe);