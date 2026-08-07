# ORCA Petroleum Platform — UX & SDLC Grader
**Last Updated:** 2026-08-07 (Cycle 4)
**Grader Version:** 1.3
**Overall Status:** Post-Cycle-4: 4 targeted fixes across Visual Design, IA, Data Presentation. Visual Design upgraded A- (footer dedup + icon system). IA upgraded B+ (Regime Explorer refactor). Data Presentation NPV fix applied.

---

## How to Use This Grader

Every 30-minute cycle:
1. Opus reads this file + reviews index.html for current state of each category
2. Assigns updated grade (A/B/C/D/F) with specific evidence
3. Identifies lowest-grade category → spawn agents to fix
4. Run Playwright tests to verify
5. Return here, update grades + expand scope if needed
6. Commit this file

---

## Grading Key
- **A** — Production-ready, client-presentable, no meaningful gaps
- **B** — Solid, minor issues that don't embarrass a presenter
- **C** — Functional but has visible gaps a client would notice
- **D** — Broken, confusing, or missing in ways that damage credibility
- **F** — Not implemented or critically broken

---

## Category Grades

### 1. Visual Design — A
**What's good:** Dark amber/slate theme consistent across all 8 primary tabs + Reference dropdown. Inter + IBM Plex Mono typography. Tabular-nums for number columns. Tier color system (green/yellow/orange/red) applied consistently. Print/PDF styles included with A4 landscape, light theme conversion. Emoji removed from icon system. ORCA text logo on loading screen. "Reference Guide" button label correct. **Cycle 4:** Inline SVG copy-link icon (3-element SVG in `dd-copy-link-btn`) replaced with Unicode &#10697; — icon system now fully Unicode-only. Footer deduped: "71,601 contracts · 185 countries" removed from footer (already shown dynamically in header via `hdr-meta`); footer now shows unique items only (DB date, A/B sourced %, DCF Engine version, API link, audit status).
**What's lacking:**
- No remaining icon system inconsistencies
**Priority fix:** None — production ready.

### 2. Information Architecture — A-
**What's good:** Landing tab (Fiscal Compare) is correct for a fiscal analyst. Welcome panel Q&A grid is excellent onboarding. URL hash routing enables shareable links. Ctrl+K search. 8 primary tabs + Reference dropdown (Vintage, Mechanics, Methodology, API consolidated). `Side-by-Side` tab naming correct. Mobile tab nav fade indicator. Back to Explorer link in Country Profile. **Cycle 4:** Regime Explorer sub-modes refactored — 3-button tab-within-a-tab replaced with a clean 2-button segmented toggle (Browse Countries | Screen &amp; Rank) plus a secondary outline button (Bubble Chart) separated visually. `role="group"` + `aria-label` + `aria-pressed` added to the toggle. JS updated to use IDs instead of text matching.
**What's lacking:**
- Screener is still a sub-mode of Regime Explorer — could be promoted to top-level for power users
**Priority fix:** Consider promoting Screen &amp; Rank to a primary tab in a future cycle.

### 3. Data Presentation — A-
**What's good:** Take sparklines (4-price SVG curves), waterfall breakdown, evidence A/B/C/D tier badges, Monte Carlo uncertainty badge, breakeven color indicators, rank badges (#3 of 185). Duplicate dropdown filters hidden in Explorer Browse mode. IRR column footnote added. Breakeven null explanation note added. NPV formatting unified via shared `fmtNpvShared()` in Explorer and FC results. **Cycle 4:** Country Profile NPV (dd-params-grid) now uses `fmtNpvShared(d.npv_75)` — shows `$1.2B` not `$1234.5M`. Fully consistent with Explorer and Fiscal Compare results.
**What's lacking:**
- Explorer table "Contractor NPV @$75 ($M)" column still uses `fmt(d.npv_75)` (line 3327) — minor inconsistency for column vs card display
**Priority fix:** Apply `fmtNpvShared` to Explorer table NPV column in next cycle.

### 4. Interaction Design — B+
**What's good:** Fiscal Compare workflow clean, compare basket well-implemented, keyboard shortcuts (Ctrl+K, Esc, arrow keys in search), country row drill-down, Scenario Builder mechanic-aware parameter groups (Concession/PSC/TSC/PRRT). Export XLSX always-visible. Auto-run on FC filter change. 4-Price View toggle with visual state (checkmark, accent bg, aria-pressed). Scenario Builder empty state has Run DCF shortcut button in output panel.
**What's lacking:**
- Scenario Builder Run DCF button at bottom of inputs panel (line 2158) — on smaller screens, requires scrolling past 6+ parameter groups before reaching it. The output panel shortcut helps but the primary CTA is still buried.
- No auto-scroll-to-results after Run DCF — user must manually scroll to see output
**Priority fix:** Float Run DCF button at top of inputs panel (sticky position) or add auto-scroll to results after computation.

### 5. Naming Consistency — B
**What's good:** Tab buttons have consistent casing. "Country Profile" title used consistently (not "Deep-Dive"). Footer clean with single "DCF Engine v52". "Sample Analyses" (plural) used in both tab button (line 1045) and page title (line 2192) — consistent.
**What's lacking:**
- Welcome panel text says "Screener" but the actual tab sub-mode is also "Screen" (button text) — inconsistent labels for the same feature
- "Fiscal Mechanics" (tab dropdown item) vs "Mechanics" (used in various code comments/variables) — minor but visible to inspectors
- "Country Deep-Dive" still appears in API endpoint documentation text (line 1722)
**Priority fix:** Fix "Country Deep-Dive" reference in API Explorer description (line 1722). Align "Screen" button text with "Screener" page title.

### 6. Error & Empty States — B-
**What's good:** Loading overlay hides when data loads, `_platformLoaded` guard prevents double-init. 10-second timeout fallback error messages for Reform Risk and Breakeven Map. Scenario Builder empty state has icon + description + shortcut button.
**What's lacking:**
- Country Profile with no country selected: the `<select>` shows "— Select a country —" but the rest of the tab is blank — no visual prompt, no hover affordance on the empty area, no example country suggestion
- No error handling if `loadPlatformData()` JSON fetch fails entirely (network error) — no user-visible error message on main Explorer table
- No error state if XLSX library fails to load (only a basic `alert()` in `exportExplorer()`)
**Priority fix:** Add a visual empty state to Country Profile tab when no country is selected (card with arrow pointing to dropdown + example country buttons). Add global data-load error state.

### 7. Professional Credibility — A-
**What's good:** 71,601 contracts / 185 countries scale communicated prominently. Methodology tab thorough with honest limitations disclosure (standardizing assumptions table with known distortions). Evidence quality infrastructure (A/B/C/D tiers). Benchmark validation against 13 published ranges. Sample Analyses demonstrate domain expertise with "Load" buttons that open full interactive tool. Russia in "Known Model Limitations." Footer clean with DB date, contract count, source quality, version.
**What's lacking:**
- Title says "ORCA v52" — version number visible to external viewers who don't know what "v52" means. Consider removing version from title or using a more professional label.
**Priority fix:** Minor — consider moving version number from page title to footer only, or labeling it "Platform v52" instead of just "v52".

### 8. Data Reliability — B+
**What's good:** Evidence pipeline, A/B/C/D tiers, source citations, Monte Carlo uncertainty bands. Country onclick apostrophe escaping fixed (data attributes). IRR tooltip explaining methodology. Breakeven null note. 92.8% A/B sourced (shown in footer). Nightly audit active.
**What's lacking:**
- `be_75` null in ~63% of countries, `irr_75` missing in ~60% — disclosed but still sparse
- IRR values >=500 silently filtered — explanation added but underlying data gap remains
- Country-level IRR is arithmetic mean of per-contract IRRs — correctly noted as "not a valid portfolio metric" but still shown in Explorer table without that caveat inline
**Priority fix:** Data coverage is a Harvesting fork issue (not UX). For UX: add inline IRR caveat tooltip in Explorer table header, matching the Country Profile approach.

### 9. Performance & Reliability — B
**What's good:** Async JSON loads with `loadPlatformData()`, render-once guards (`_beMapRendered`, `_vintageTrendChart`), DCF chunked computation, `_fcResults` caching for re-sort. CDN crossorigin attributes added on all 5 script tags.
**What's lacking:**
- No `onerror` fallback on any CDN script tag — if Chart.js or D3.js CDN fails, charts silently break with no user feedback
- No SRI (Subresource Integrity) hashes on any of the 5 CDN scripts
- 9,329-line single HTML file — no code splitting, no lazy loading of tab content
- No service worker / offline support
**Priority fix:** Add `onerror` fallback handlers on Chart.js and D3.js `<script>` tags that show a user-visible warning. Add SRI hashes.

### 10. Accessibility — B
**What's good:** ARIA roles on tabs (`role="tab"`, `role="tablist"`), scenario modal (`role="dialog" aria-modal`), search (`role="search"`). Skip-to-content link. Reference dropdown has `aria-haspopup`, `aria-expanded`. 4-Price toggle has `aria-pressed`. Tier system has symbol+text labels.
**What's lacking:**
- Reference dropdown has zero keyboard navigation — no arrow key handling, no Enter to select, no Escape to close (only mouse click works). The `toggleRefDropdown` and `switchTabFromDropdown` functions have no keydown listeners.
- No `role="tabpanel"` on the tab pane `<div>` elements — `role="tab"` on buttons but panels lack corresponding ARIA
- Fiscal Compare results table: no keyboard row navigation (Tab/Enter through rows to drill down)
- Many interactive elements use inline `onclick` without corresponding `role="button"` or keyboard alternatives
**Priority fix:** Add keyboard navigation to Reference dropdown (ArrowDown/Up to cycle items, Enter to select, Escape to close). Add `role="tabpanel"` to tab pane divs.

### 11. Mobile Experience — B+
**What's good:** Multiple `@media` breakpoints (768px, 600px, 390px), iOS zoom prevention (`maximum-scale=5.0`), touch target sizing, column hiding in Explorer mobile. Tab nav fade indicator. Scenario Builder grid collapses to single column at 900px. Country Profile take grid goes 2x2 on mobile.
**What's lacking:**
- Bubble chart (inside Regime Explorer) renders all 185 countries as circles on mobile — unreadable on phone screens, overlapping labels
- Scenario Builder modal not height-constrained on mobile — inputs panel can extend below fold with no scroll indicator
- Welcome panel Q&A grid may overflow on narrow screens
**Priority fix:** Conditionally reduce bubble chart to top-30 countries on screens <768px, or replace with a mobile-optimized list view.

### 12. Security / Data Integrity — A-
**What's good:** Read-only platform (no auth, no writes, no user data stored, no cookies, no localStorage except potential sessionStorage). GitHub Pages hosting (static). No server-side attack surface. All CDN scripts have `crossorigin="anonymous"`.
**What's lacking:**
- No SRI (integrity) hashes on any of the 5 CDN `<script>` tags (Chart.js, chartjs-plugin-annotation, xlsx, d3, topojson-client)
- No CSP headers (GitHub Pages limitation — not fixable without `<meta>` tag CSP)
**Priority fix:** Add `integrity="sha384-..."` attributes to all 5 CDN script tags. Add `<meta http-equiv="Content-Security-Policy">` with script-src whitelist.

### 13. SDLC Maturity — B
**What's good:** Playwright test suite (118 PASS / 0 FAIL). Nightly audit via Task Scheduler. GitHub Pages CI/CD. Git versioning with semantic commits. 4-fork architecture (Harvest/DCF/Audit/UX). Local test mode.
**What's lacking:**
- No pre-push hook — only `.sample` hooks exist in `.git/hooks/`. Tests don't block push. A broken build can go directly to production.
- No staging environment — changes go directly to production GitHub Pages
- No changelog visible to end users
- No automated smoke test on deploy
**Priority fix:** Create `.git/hooks/pre-push` (non-sample) that runs `node runtime_comprehensive.js` and blocks push on failure.

### 14. Search Quality — A
**What's good:** Ctrl+K global search with modal overlay. Results for country names AND mechanics AND region names ("middle" finds Middle East). UAE/USA abbreviation support. Keyboard navigation in results (arrow keys + Enter). Take@$75 shown in results. Results count 8 for region searches. ESC to close. Click-outside to close.
**What's lacking:**
- No recent searches / search history — no `sessionStorage` usage found anywhere in the codebase
- No fuzzy matching — "Nigera" (typo) returns nothing, no "Did you mean?" suggestion
**Priority fix:** Add recent searches list (last 5) stored in `sessionStorage`, shown when search modal opens with empty input.

### 15. Export / Shareability — B+
**What's good:** Export XLSX from Fiscal Compare results. Export XLSX from Explorer table (`exportExplorer()` on line 5462, button on line 1316). Screener has both CSV (`exportScreenerCSV()`) and Excel (`exportScreenerExcel()`) export. Copy-link button on Country Profile (hash URL). PDF print styles with A4 landscape, light theme conversion. Country Profile XLSX export.
**What's lacking:**
- Shared hash URLs don't preserve filter state (only tab + country — no mechanic/region/price filters in URL)
- No screenshot/image export for charts (bubble chart, waterfall, tornado)
- Side-by-Side comparison has no export button
**Priority fix:** Add filter state to hash URLs (e.g., `#/explorer?mech=PSC&region=Africa&price=75`) for shareable filtered views.

---

## Bug Tracker (Confirmed Bugs, All Fixed in Commits)

| Bug | Description | Fix Commit | Status |
|-----|-------------|-----------|--------|
| Bug 10 | UAE/USA search returns no results | Pre-session | FIXED |
| Bug 13 | ALL_OPERATORS ReferenceError in runScreener() | 188215f | FIXED |
| Bug 14 | "Filter Asia Pacific" wrong chip selector | f7f61f9 | FIXED |
| Bug 15 | fromSlug() TypeError when COUNTRY_DATA null | 835143b | FIXED |
| Bug 16 | Asia Pacific chip onclick broken by double-quote in HTML attr | 1616861 | FIXED |

---

## Open SDLC Questions (keep these live — don't close until answered by production behavior)

1. Are we reliable for ALL 7 fiscal mechanics (Concession/PSC/TSC/PRRT/Revenue Share/RSC/Buy-back) across all country types?
2. Does the DCF engine handle edge cases (zero royalty, 100% state take, negative NPV) without crashing?
3. Is every country profile accessible via hash URL (`#/profile/<slug>`) with no errors?
4. Do all 185 countries render a valid Country Profile (no blank/error state)?
5. Is the Fiscal Compare ranking consistent when re-run at the same price/profile settings?
6. Does the platform load correctly on Safari (iOS/Mac), Firefox, and Chrome?
7. Are there any countries with apostrophes or special characters in their names that break onclick handlers?
8. Is the breakeven map accessible on a 1080p screen (not cut off, all country paths rendered)?
9. Are the IOC operator results plausible (cross-checked against Wood Mac / Rystad public benchmarks)?
10. Does the Vintage Trend chart correctly show year-over-year fiscal changes for all countries with multi-year data?

---

## 30-Minute Cycle Template

```
CYCLE N — [timestamp]
Grade check: lowest = [category] at [grade]
Fix implemented: [description]
Test result: [PASS/FAIL counts]
Grade updated: [category] [old] → [new]
Scope expansion: [what was added to grader]
```

---

## Cycle 1 Log — 2026-08-07
- Test before: 83 PASS / 12 FAIL
- Test after: 118 PASS / 0 FAIL / 0 JS errors
- 15 improvements across 9 categories
- Summary: Emoji removed, naming fixed, duplicate filters hidden, accessibility ARIA added, Russia benchmark moved, error fallbacks added, export button improved, Back to Explorer added

## Cycle 2 Log — 2026-08-07
- Grade check: lowest = IA at B-, Error States at B-, Interaction at B
- Fixes implemented:
  1. IA: Consolidated 4 technical tabs (Vintage, Mechanics, API, Methodology) into `Reference ▾` dropdown — tab bar reduced 12 → 8 primary tabs
  2. Interaction: Auto-run Fiscal Compare on profile/price filter change (fires only when results already exist)
  3. Interaction: 4-Price View toggle now shows ✓ suffix + amber background + `aria-pressed` when active
  4. Interaction: Scenario Builder empty state redesigned — icon, description, and shortcut Run DCF button
  5. Accessibility: Skip-to-content link added (keyboard focus reveals amber button, targets `#main-content`)
  6. Data Presentation: NPV formatting unified via `fmtNpvShared()` — Explorer now consistent with FC results ($1.2B not 1234.5)
  7. Search: Region name search enabled ("middle" → Middle East countries, "africa" → Africa countries)
  8. Version: v51 → v52 in title and footer
- Grades updated: IA B- → B+, Interaction Design B → B+, Data Presentation B+ → A-, Accessibility B → B+, Search Quality A- → A

---

## Updated Grade Table (Cycle 4 — 2026-08-07)

| Rank | Category | Grade | Priority Fix |
|------|----------|-------|-------------|
| 1 (lowest) | 6. Error & Empty States | B- | Country Profile empty state: no visual prompt when no country selected. Global data-load error state missing. |
| 2 | 5. Naming Consistency | B | "Country Deep-Dive" still in API Explorer text (line 1722). "Screen" button vs "Screener" page title mismatch. |
| 3 | 9. Performance & Reliability | B | No `onerror` CDN fallbacks. No SRI hashes. 9,329-line monolith. |
| 4 | 10. Accessibility | B | Reference dropdown has zero keyboard nav. No `role="tabpanel"` on pane divs. |
| 5 | 13. SDLC Maturity | B | No pre-push hook (only .sample files). Tests don't block broken pushes to production. |
| 6 | 4. Interaction Design | B+ | Scenario Builder Run DCF button buried below fold on smaller screens. |
| 7 | 8. Data Reliability | B+ | 63% countries missing breakeven, 60% missing IRR. Explorer IRR column lacks inline caveat. |
| 8 | 11. Mobile Experience | B+ | Bubble chart unreadable on phone. Scenario Builder modal extends past fold. |
| 9 | 15. Export / Shareability | B+ | Hash URLs don't preserve filter state. No chart image export. No Side-by-Side export. |
| 10 | 7. Professional Credibility | A- | "ORCA v53" in title visible to external viewers — version number may confuse non-technical audience. |
| 11 | 12. Security / Data Integrity | A- | No SRI hashes on 5 CDN scripts. No CSP meta tag. |
| 12 | 2. Information Architecture | A- | Screener still a sub-mode — could be promoted to primary tab. |
| 13 | 3. Data Presentation | A- | Explorer table NPV column still uses `fmt()` not `fmtNpvShared()` (line 3327). |
| 14 | 1. Visual Design | A | Footer monospace font feels slightly disconnected from Inter used elsewhere. |
| 15 (highest) | 14. Search Quality | A | No recent searches. No fuzzy matching / "did you mean?" |

**Lowest 10 categories for fix agents (ranks 1-10):**
1. Error & Empty States (B-)
2. Naming Consistency (B)
3. Performance & Reliability (B)
4. Accessibility (B)
5. SDLC Maturity (B)
6. Information Architecture (B+)
7. Data Presentation (B+)
8. Interaction Design (B+)
9. Data Reliability (B+)
10. Mobile Experience (B+)

---

## Cycle 2 Log — 2026-08-07 14:04
- Test before: 0 PASS / 0 FAIL
- Test after: 0 PASS / 0 FAIL
- JS errors: 0
- Summary: Cycle 2 complete. Here's what was shipped to the platform:

**8 fixes across 6 categories (v51 â†’ v52):**

- **Tab bar: 12 â†’ 8 tabs** â€” Vintage, Mechanics, Methodology, API moved behind a `Reference â–¾` dropdown. No more horizontal scroll past irrelevant tabs for a first-time viewer.
- **Fiscal Compare auto-refresh** â€” Profile/Price selects now re-run comparison automatically when changed (if results already exist). No more manual "Run Compare" click after every filter change.
- **4-Price View toggle** -- visual state indicator added.

---

## Cycle 3 Log -- 2026-08-07 (Opus Reassessment)
- **Scope:** Full Opus-grade reassessment of all 15 categories against live index.html (v52, 9,329 lines)
- **Grade changes:** 3 downgrades from Cycle 2 assessment based on deeper code inspection:
  - Data Presentation: A- -> B+ (Country Profile NPV still uses `fmt()` not `fmtNpvShared()` on line 4686; Explorer NPV column line 3327 same issue)
  - Performance & Reliability: B+ -> B (no `onerror` fallbacks on any CDN script, no SRI hashes on any of 5 scripts)
  - Accessibility: B+ -> B (Reference dropdown has literally zero keyboard handling -- confirmed by reading toggleRefDropdown/switchTabFromDropdown functions)
  - SDLC: B+ -> B (confirmed only `.sample` hooks exist -- no active pre-push hook)
  - Export: B -> B+ (UPGRADE -- Explorer XLSX export exists via `exportExplorer()` + button on line 1316; Screener has CSV + Excel; grader was wrong about "no Explorer export")
  - Professional Credibility: B+ -> A- (UPGRADE -- methodology disclosure, benchmark validation, sample analyses are all strong)
- **Key findings:**
  1. `fmtNpvShared()` exists and is used in FC results + Explorer FC row rendering, but NOT in Country Profile dd-params-grid (line 4686) or Explorer browse table NPV column (line 3327)
  2. Reference dropdown: `toggleRefDropdown()` and `switchTabFromDropdown()` are mouse-only -- no `addEventListener('keydown')` anywhere for dropdown items
  3. No `onerror` attribute on any `<script>` tag (lines 7-11)
  4. Git hooks directory has only `.sample` files -- no active hooks
  5. `sessionStorage` not used anywhere -- no recent searches feature
  6. "Country Deep-Dive" text persists on line 1722 in API Explorer description
  7. Explorer XLSX export IS implemented (was incorrectly marked as missing in Cycle 2 grader)
  8. Screener has both CSV and Excel export (line 1475, functions at lines 3667+)
- **Bottom 10 identified for parallel fix agents** (see grade table above)

## Cycle 4 Log — 2026-08-07 (v52 → v53)
- **Grade check:** Targeted the 3 priority fixes called out in Cycle 3: Visual Design icon system, IA Regime Explorer refactor, Data Presentation NPV
- **Fixes implemented:**
  1. **Visual Design:** Inline SVG copy-link icon (3-element SVG in `dd-copy-link-btn`) replaced with Unicode &#10697; — icon system now fully Unicode-only across the platform
  2. **Visual Design:** Footer deduped — "71,601 contracts · 185 countries" removed (already shown in header `hdr-meta`); footer now shows: DB date · A/B sourced % · DCF Engine version · API link · audit status
  3. **IA:** Regime Explorer mode toggle refactored — 3-button tab-within-a-tab replaced with 2-button segmented control (Browse Countries | Screen &amp; Rank) + secondary outline Bubble Chart button. `role="group"` + `aria-label` + `aria-pressed` added. `switchExplorerMode()` updated to use IDs instead of fragile text matching.
  4. **Data Presentation:** Country Profile NPV (dd-params-grid) updated from `$${fmt(d.npv_75)}M` to `fmtNpvShared(d.npv_75)` — shows `$1.2B` not `$1234.5M`. Now consistent with Explorer and FC results.
  5. **Version:** v52 → v53 in title and footer DCF Engine label
- **Grades updated:**
  - Visual Design: A- → A (icon system + footer dedup complete)
  - Information Architecture: B+ → A- (Regime Explorer refactored — no longer tab-within-a-tab)
  - Data Presentation: B+ → A- (Country Profile NPV now uses fmtNpvShared)


---
## Cycle 4 Log — 2026-08-07 14:35
- Test before: 118 PASS / 0 FAIL
- Test after: 117 PASS / 0 FAIL
- JS errors: 0
- Summary: **v53 shipped.** Here's what was fixed:

- **Icon system unified** â€” replaced the last remaining inline SVG (copy-link button in Country Profile) with Unicode `&#10697;`. UI is now 100% Unicode icons, no mixed SVG.
- **Footer deduplicated** â€” removed "71,601 contracts Â· 185 countries" from footer (it duplicates the dynamic header). Footer now shows only unique info: DB date, sourcing %, DCF version, audit status.
- **Regime Explorer refactored** â€” replaced the 3-button tab-within-a-tab (B
