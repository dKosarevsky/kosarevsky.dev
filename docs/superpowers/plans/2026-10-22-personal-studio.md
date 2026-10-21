# Personal Studio Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Turn the existing portfolio into the approved multilingual personal studio.

**Architecture:** Keep static HTML, CSS and ES modules. Project data and translated copy remain separate from rendering. Load Spotify only after an explicit click; use local project screenshots for featured cards.

**Tech Stack:** HTML, CSS, JavaScript modules, Node 24 local checks, GitHub Pages.

---

### 1. Content and locales
- [x] Update assets/projects.js with chess, book, salvo, aximo, mcp, jpeg; featured flags for chess/book, categories games/ai/tools, action keys play/read/launch/source, local preview paths for chess/book/salvo.
- [x] Rewrite assets/i18n.js in en/ru/zh; all languages share keys. Set the hero to Code/Play/Listen and add music, earlier-work, book action, and artist-player copy.
- [x] Replace Spanish in 404.html; map zh to zh-Hans; retain safe localStorage handling.
- [x] Document verified public source URLs and limitations in PROJECTS.md.

### 2. Layout and behavior
- [x] Update index.html: visible three-section navigation; music section replaces old snake spotlight; earlier-work disclosure; semantic headings and static links for no-JS users.
- [x] Update assets/app.js: render featured cards and linked preview images; honor action fields; set Chinese document language; instantiate one titled Spotify iframe only on click; localize loaded player title.
- [x] Replace unused CSS artwork with screenshot previews and restrained technical diagrams; add large first two cards and compact remaining cards.
- [x] Update assets/style.css for compact mobile hero, persistent navigation, Chinese spacing, accessible tap targets, warm music section, reduced motion.

### 3. Verification and handoff
- [x] Update scripts/check.mjs to validate locales, known public owners, complete localized descriptions, preview files, action keys, earlier-work links, no initial iframe and accurate payload reporting.
- [x] Run `/Users/if/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-vm-modules scripts/check.mjs` and `node scripts/build.mjs` using that runtime. Expected exit 0.
- [x] Serve dist on localhost, inspect desktop and mobile at 390px and 320px in Chrome, click every language/filter and player activation, verify 404 and fallback, inspect overflow and console errors.
- [x] Obtain independent specification and quality review; fix material findings and rerun affected checks.
- [x] Update README with actual behavior and verification.
- [x] Commit feature branch, push and create an attached PR: https://github.com/dKosarevsky/kosarevsky.dev/pull/1. Production merge remains subject to explicit approval.
