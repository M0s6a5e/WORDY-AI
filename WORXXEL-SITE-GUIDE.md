# WORXXEL — Complete Site Guide

> Single source of truth for the WORXXEL website. Any person or AI reading this
> file should understand what the site is, how it looks, how it is built,
> and how to work on it — without reading any other file first.

## 1. Identity

- **Product:** WORXXEL (brand text rendered `WOR` + blue accent `XXEL`).
- **Tagline idea:** "Create professional Word files with precision."
- **What it is:** a static marketing site + a real in-browser Word document editor
  ("Word Studio") with a side AI assistant panel.
- **What it is NOT:** no backend yet. Auth, limits, AI, and storage are
  frontend-only demos over `localStorage`. A backend (Firebase or equivalent)
  is the planned next step.
- **Repo:** `M0s6a5e/WORDY-AI`, branch `main` (GitHub Pages).
- **Local path:** `WORDY AI V/` on Windows. Stack: plain HTML + CSS + vanilla JS.
  No build step, no framework, no npm.

## 2. Pages (12 HTML files)

| File | Purpose |
|---|---|
| `index.html` | Homepage: hero (video + mascot), features, showcase, steps, templates, use-cases, pricing (Free only), library CTA, footer, chat widget |
| `worxxel-word-editor.html` | **Canonical Word editor (Word Studio).** English, LTR. Real `contenteditable` editor + AI panel + export |
| `wordy-ai-word-creator.html` | Legacy URL, currently holds content identical to the new editor so old links keep working |
| `wordy-ai-excel-creator.html` | Excel system is **cancelled/paused**; page copy rewritten toward Word Studio |
| `wordy-ai-dashboard.html` + `js/dashboard.js` + `css/dashboard.css` | Projects/files/templates workspace (frontend demo data) |
| `wordy-ai-auth.html`, `auth-recovery.html` | Sign in / sign up / password recovery (frontend demo) |
| `about.html`, `help.html`, `contact.html`, `policies.html`, `404.html` | Content, FAQ, support, legal, not-found |
| `wordy-PAY-CHECK.html` (or `wordy-PAY-CHECK`) | Checkout is **blocked/paused** |

Entry CTAs ("Create Word File", "Create Your File") point to
`worxxel-word-editor.html`.

## 3. Design system — name & feel

- **Design language:** *Apple-style liquid glass on warm paper* — i.e.
  **glassmorphism** chrome (frosted translucent bars, cards, buttons, modals)
  floating over a warm paper canvas (`#FAF8F4`) with faint blue/green ambient
  glows. Document paper itself stays **solid white** (like Apple Pages) for
  print fidelity.
- **Glass recipe (light):** `background: rgba(255,255,255,.65–.70)`,
  `backdrop-filter: blur(22px) saturate(1.4)` (+ `-webkit-` prefix),
  `border: 1px solid rgba(255,255,255,.6)`, soft layered shadow, inner top
  highlight via inset shadow where needed.
- **Glass recipe (dark):** `background: rgba(23,22,29,.66)`,
  `border: 1px solid rgba(255,255,255,.12)`.
- **Motion:** Apple-like ease `cubic-bezier(.16,1,.3,1)` (token `--ease`),
  ~0.2–0.4s transitions, hover lift `translateY(-2px)`, always honoring
  `prefers-reduced-motion`.

## 4. Tokens (`css/variables.css` — marketing site)

- **Primary blue:** `--primary #3F4CE0`, hover `#313EC7`, dark `#232E99`,
  tint `#EEF1FD`, glow `rgba(63,76,224,.24)`. All CTAs, links, active states.
- **Emerald green:** `--green #1E9E6C`, tint `#E6F7EF` (success, savings, checks).
- **Text:** `--ink #111827`, soft `#374151`, muted `#64748B`.
- **Surfaces:** `--paper #FAF8F4`, `--surface #FFFFFF`, borders `#E5DFD0`.
- **Radii:** 10 / 16 / 24 / 32 / pill. **Shadows:** `shadow-sm/md/lg`,
  `shadow-glow-primary`.
- **Fonts:** Plus Jakarta Sans (UI/headings) · Inter (body alt) · Fraunces
  (display sketch titles) · JetBrains/Space Mono (numbers, code).
- **Theme-color meta:** `#3F4CE0` everywhere.

The editor (`worxxel-word-editor.html`, self-contained `<style>`) mirrors these
tokens with its own `:root` (+ `.logo span`, `.btn.pri`, `.chip.on` all blue).

## 5. Global components & patterns

- **Navbar:** glass, brand = feather `favicon.jpg` badge + `WORXXEL` text;
  links Home / Word Creator / File Library / Pricing / About; glass buttons
  Login (ghost) + Get Started (blue). Mobile: hamburger → glass dropdown.
- **Buttons:** `.btn` base; `.btn-primary` solid blue + glow; `.btn-nav-cta`
  blue gradient; `.btn-secondary`/`.btn-ghost` glass; all `blur(20px)` glass.
- **Cards/boxes:** every card type (`feature-card`, `showcase-card`,
  `template-card`, `price-card`, `usecase-card`, `step`, `trust-tag`, …) is
  glass: translucent + `blur(22px)` + white border + inner glow; ambient orbs
  behind groups so the frosted effect is visible.
- **Footer:** light glass (`var(--paper)` + blur), 4-column grid
  (brand + 3 link columns), blue social tiles, muted links → blue on hover.
- **Chat widget (homepage):** floating glass circle (mascot) + glass side panel
  (header, quick chips, form). No "backend coming" notes in UI copy.
- **Cookie consent:** `js/cookie-consent.js` on every page, blue Accept button,
  persists `wordy-consent` in `localStorage`.
- **Text animation:** `js/sketch-titles.js` — scatter-in letters for
  `[data-sketch]` headings, rising words for `.hero-sub`/`.section-sub`,
  underline swipe for `<mark>`; disabled under reduced-motion.
- **Scroll animation:** GSAP + ScrollTrigger CDN for showcase/steps/templates
  reveals (`js/main.js`). Old hero 3D choreography removed; hero video+mastocat
  layout is final.
- **SEO on all pages:** description, OG + Twitter cards, canonical URL,
  favicon, `robots.txt`, `sitemap.xml`, CSP meta on `index.html`.
- **Accessibility:** skip links, `role=dialog` chat/modals, `aria-live` toasts,
  `loading="lazy"` below-fold images, visible focus rings, print stylesheet
  (`css/print.css` hides chrome when printing).

## 6. Word Studio editor (`worxxel-word-editor.html`) — full spec

Self-contained single file (inline CSS + JS), `lang="en" dir="ltr"`.

- **Layout:** glass top bar (menu · logo · editable title · Draft-Saved badge ·
  Edit/Preview switch · theme · AI toggle · Save · Export .DOC) · glass
  formatting toolbar (undo/redo, block style, font, size, B/I/U, align,
  lists, table, live stats, zoom) · left outline drawer · center A4 paper
  (794px, grid canvas) · right AI panel · selection bubble · ops modal ·
  toast · mobile FAB · scrim.
- **It is a REAL editor:** `contenteditable` document, execCommand formatting,
  insert table (auto-wrapped in horizontal-scroll `.tbl` on mobile),
  live word/min/page stats, auto outline from H1/H2, zoom, Preview mode,
  **Save** persists `{title, html}` to `localStorage` key
  `worxxel-editor-draft` (autosave debounced + manual), **Export .DOC**
  downloads a Word-compatible `.doc` blob (opens in Microsoft Word),
  `document.execCommand`-based Replace/Insert for AI results.
- **AI panel:** scope chips (Selection / Paragraph / Section / Document),
  8 quick refinements (professional, summarize, expand, fix, shorten,
  translate, table, bullets), custom-command box (Enter to run), result cards
  with Replace / Insert after / Copy / Discard, token counter, usage line.
- **Operations animation:** every AI run opens a glass **modal** (✦ spinner,
  progress bar, 4 stages: Analyzing → Drafting → Formatting → Final review),
  then the paper pulses and changed blocks flash / generated documents build
  with staggered rise-in. Reduced-motion short-circuits all of it.
- **Backend hook:** `const AI_ENDPOINT = ""` — POST
  `{action, scope, text, prompt}` → JSON `{text}` (Cloudflare Worker →
  OpenRouter). Empty = built-in English demo transforms. Scope `doc` +
  create-like prompt generates a full structured document (title, overview,
  objectives, plan table, next steps).
- **Free plan (shared keys with dashboard):** `wordy-ai-usage`
  `{date, count}`, `DAILY_AI_LIMIT = 2` AI files/day, `MAX_PROJECTS = 4`
  (dashboard-side). Editor blocks AI runs at 0 left with a toast.
- **Responsive:** ≤1100px outline becomes left drawer, AI becomes bottom
  sheet + FAB; ≤700px title wraps full-width, AI-top-toggle hidden (FAB
  covers it), paper `width:100%`, tables min 460px with inner scroll,
  `overflow-x:hidden` stage. LTR drawer hides with `translateX(-105%)`.
- **Dark mode:** explicit `data-theme` toggle + `prefers-color-scheme`
  fallback; brand blue lightens to `#7C80FF` in dark for contrast.
- **Print:** `@media print` outputs paper only.

## 7. Rules & constraints (do not regress)

1. Blue brand `#3F4CE0` is final — no crimson experiments.
2. Hero video + mascot layout on `index.html` is final — no replacement.
3. Word-only: no Excel creator revival; Excel page stays Word-oriented.
4. Free plan only: paid plans stay hidden/paused; limits enforced via
   `wordy-ai-usage` / `MAX_PROJECTS`.
5. No "built with AI / AI-powered" phrasing in user-facing copy or meta.
6. New styles must use tokens + glass recipe above; keep `-webkit-` prefixes,
   `prefers-reduced-motion`, focus-visible, and mobile breakpoints.
7. Never use global `* { margin: 0 }` resets; never add emojis unless asked.

## 8. File map

```
index.html  about.html  help.html  contact.html  policies.html  404.html
wordy-ai-auth.html  auth-recovery.html  wordy-ai-dashboard.html
worxxel-word-editor.html   ← canonical Word editor (English, new)
wordy-ai-word-creator.html ← legacy URL, same content as above
wordy-ai-excel-creator.html (paused, Word-oriented copy)
wordy-PAY-CHECK* (paused)   robots.txt  sitemap.xml
css/: variables.css  style.css  responsive.css  glass-buttons.css
     print.css  dashboard.css  word-creator.css  excel-creator.css
js/: main.js  sketch-titles.js  cookie-consent.js  dashboard.js
    word-creator.js  excel-creator.js  auth.js …
assets/images/: favicon.jpg  WORDY CHA.svg  wox-logo.svg  wox-logo-light.svg …
WORXXEL-SITE-GUIDE.md (this file)
```

## 9. Deployment & workflow

- Static hosting (GitHub Pages): push `main` → live at
  `https://m0s6a5e.github.io/WORDY-AI/`.
- Verify with headless Edge screenshots (desktop 1440×950 + mobile 500×844)
  and `git status` before committing. Commit messages are short imperative
  summaries. `git add -A` is used to include everything.
- Test checklist for editor changes: stats count > 0 (proves JS booted),
  outline lists headings, AI run shows ops modal → result card, Export
  downloads `.doc`, Save/refresh restores draft, drawer + bottom-sheet work
  ≤1100px, no horizontal text cutoff on mobile.

## 10. Roadmap (not started)

Backend: Firebase Auth + Firestore (projects, files, usage enforcement
server-side) + Storage; wire `AI_ENDPOINT`; dashboard↔editor shared project
model; paid plans re-introduction; `.docx` (Office Open XML) export via
library; editor undo-history upgrade beyond `execCommand`.
