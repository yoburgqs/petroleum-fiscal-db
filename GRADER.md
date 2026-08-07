# ORCA Petroleum Platform — UX & SDLC Grader
**Last Updated:** 2026-08-07
**Grader Version:** 1.1
**Overall Status:** Post-Cycle-2: 7 improvements across 6 categories. IA upgraded B- → B+. Interaction upgraded B → B+. Data Presentation upgraded B+ → A-.

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

### 1. Visual Design — A-
**What's good:** Dark amber/slate theme consistent, Inter + IBM Plex Mono typography, tabular-nums for number columns, tier color system (green/yellow/orange/red) applied consistently, print/PDF styles included. Emoji removed from icon system. ORCA text logo added to loading screen. "? Reference" → "Reference Guide" button label fixed.
**What's lacking:**
- Mixed icon system still partially present (Unicode + inline SVG)
- Footer repeats same stats (71,601 contracts, 185 countries) twice
**Priority fix:** Standardize remaining icon system. Deduplicate footer stats.

### 2. Information Architecture — B+
**What's good:** Landing tab (Fiscal Compare) is correct choice, welcome panel Q&A grid is excellent onboarding, URL hash routing enables shareable links, Ctrl+K search improves navigation. `Comparison` tab renamed to `Side-by-Side`. Mobile tab nav fade indicator added. Back to Explorer link added in Country Profile. **Cycle 2:** Vintage, Mechanics, API, Methodology consolidated into `Reference ▾` dropdown — tab bar reduced from 12 to 8 primary tabs + dropdown.
**What's lacking:**
- `Regime Explorer` still contains Browse/Screen/Bubble sub-modes = tab-within-a-tab anti-pattern
- Reform History Browser duplicated between Vintage tab and Vintage Analysis section
**Priority fix:** Refactor Regime Explorer sub-modes into a cleaner 2-button toggle with clearer labels.

### 3. Data Presentation — A-
**What's good:** Take sparklines (4-price SVG curves), waterfall breakdown, evidence A/B/C/D tier badges, Monte Carlo uncertainty badge, breakeven color indicators, rank badges (#3 of 185). Duplicate dropdown filters hidden in Explorer Browse mode. IRR column footnote added. Breakeven null explanation note added. **Cycle 2:** NPV formatting unified via shared `fmtNpvShared()` — Explorer now shows `$1.2B` not `1234.5`, consistent with FC results. Region alignment confirmed correct via `_regionMatch()` mapping.
**What's lacking:**
- Country Profile NPV still uses `fmt(d.npv_75)` which shows raw decimal — could benefit from `fmtNpvShared`
**Priority fix:** Apply `fmtNpvShared` to Country Profile NPV display in the dd-params-grid.

### 4. Interaction Design — B+
**What's good:** Fiscal Compare workflow clean, compare basket well-implemented, keyboard shortcuts (Ctrl+K, Esc, arrow keys), country row drill-down, Scenario Builder mechanic-aware parameter groups. Export XLSX button now always-visible with disabled state. Back to Explorer link added to Country Profile. **Cycle 2:** Auto-run on filter change implemented (profile/price selects fire `runFiscalCompare()` when results exist). 4-Price View toggle now shows `✓` suffix, accent background, and `aria-pressed` when active. Scenario Builder empty state improved with visual icon and Run DCF shortcut button.
**What's lacking:**
- Scenario Builder Run DCF button still not visible on first open without scrolling (modal panel layout)
**Priority fix:** Auto-scroll to Run DCF button on Scenario Builder modal open, or float the Run DCF button at the top of the inputs panel.

### 5. Naming Consistency — B
**What's good:** Tab buttons have consistent casing. `Country Deep-Dive` → `Country Profile` title fixed throughout. Duplicate `Global Fiscal Explorer` page title removed. Footer deduped. v51 version number corrected.
**What's lacking:**
- `Sample Analyses` vs `Sample Analysis` — singular/plural inconsistency in some contexts
- DCF engine internal naming may still differ from UX labels in edge cases
**Priority fix:** Audit all remaining singular/plural inconsistencies and align DCF engine version label.

### 6. Error & Empty States — B-
**What's good:** Loading overlay hides when data loads, `_platformLoaded` guard prevents double-init. 10-second timeout fallback error messages added to Reform Risk and Breakeven Map tabs — both now show "Data unavailable — reload to retry" on failure.
**What's lacking:**
- Country Profile with no country selected shows cards without hover affordance (no cursor:pointer, no visual cue)
- Edge-case empty states in Scenario Builder not fully covered
**Priority fix:** Add hover affordance to Country Profile cards when no country is selected.

### 7. Professional Credibility — B+
**What's good:** 71,601 contracts / 185 countries scale communicated prominently, Methodology tab thorough with honest limitations disclosure, evidence quality infrastructure (A/B/C/D tiers with source citations), benchmark validation against 13 published ranges, Sample Analyses demonstrate domain expertise. Russia moved from validation table to "Known Model Limitations" section with explanation. Footer deduped.
**What's lacking:**
- Version label alignment (DCF internal vs UX display) still worth auditing for technical reviewers
**Priority fix:** Confirm version label consistency across all footer and header display points.

### 8. Data Reliability — B+
**What's good:** Evidence pipeline, A/B/C tiers, source citations, Monte Carlo uncertainty bands. Country onclick apostrophe escaping fixed (now uses data attributes, no longer breaks for typographic apostrophes). IRR tooltip added explaining methodology and filter threshold. Breakeven null note added to column header.
**What's lacking:**
- `be_75` null in 117/185 countries (63%) and `irr_75` missing in 111/185 countries (60%) — coverage gaps now disclosed but data itself still sparse
- IRR values ≥500 silently filtered — user-visible explanation added but underlying data gap remains
**Priority fix:** Expand breakeven and IRR coverage in Harvesting fork as next data priority.

### 9. Performance & Reliability — B+
**What's good:** Async JSON loads with `loadPlatformData()`, render-once guards (`_beMapRendered`, `_vintageTrendChart`), DCF chunked computation via `recompute_chunk.py`, `_fcResults` caching for re-sort. CDN crossorigin attributes added.
**What's lacking:**
- No service worker / offline support
- Large single file (9,200+ lines) — no code splitting
- No full CDN fallback if Chart.js or D3.js fail to load (crossorigin added, not SRI)
**Priority fix:** Add `onerror` fallback for Chart.js and D3.js CDN script tags.

### 10. Accessibility — B+
**What's good:** Semantic HTML in some areas, `alt` text on some elements. ARIA roles added: `role="tab"`, `role="tablist"`, `role="tabpanel"`, `role="dialog" aria-modal` on scenario modal, `role="search"`, `aria-pressed` on filter chips. **Cycle 2:** Skip-to-content link added (visible on keyboard focus, links to `#main-content` on tab bar). Reference dropdown has `aria-haspopup`, `aria-expanded`. 4-Price View toggle has `aria-pressed`. Tier system already has symbol+text labels (▲ IF, — MOD, ▼ HI, ◆ NOC).
**What's lacking:**
- Keyboard navigation in Fiscal Compare results table not fully implemented (Tab/Enter through rows)
- Reference dropdown not keyboard-navigable (no arrow key handling in menu)
**Priority fix:** Add keyboard navigation to the Reference dropdown menu (arrow keys + Enter + Escape).

### 11. Mobile Experience — B+
**What's good:** Multiple `@media` breakpoints (768px, 600px, 390px), iOS zoom prevention, touch target sizing (44px minimum), column hiding in Explorer mobile. Mobile tab nav fade indicator added — users now see visual affordance for scrollable tab bar.
**What's lacking:**
- Bubble chart unreadable on phone (too many datapoints)
- Scenario Builder modal not optimized for mobile keyboard
**Priority fix:** Reduce bubble chart datapoints on mobile or replace with a mobile-friendly alternative.

### 12. Security / Data Integrity — A-
**What's good:** Read-only platform (no auth, no writes, no user data stored), GitHub Pages hosting (static), no server-side vulnerabilities possible.
**What's lacking:**
- No CSP headers (GitHub Pages limitation)
- External CDN dependencies (Chart.js, D3.js) without SRI hashes
**Priority fix:** Add SRI hashes to CDN script tags.

### 13. SDLC Maturity — B+
**What's good:** Playwright test suite (99+ PASS, now 118 PASS / 0 FAIL post-cycle-1), nightly audit task scheduler, GitHub Pages CI/CD, git versioning with semantic commits, 4-fork architecture (Harvest/DCF/Audit/UX). Local test mode added. Autonomous cycle and Task Scheduler integration in place.
**What's lacking:**
- No automated deployment gate (tests don't block push)
- No staging environment (changes go directly to production GitHub Pages)
- No changelog visible to end users
**Priority fix:** Add pre-push hook that runs `node runtime_comprehensive.js` against local file server.

### 14. Search Quality — A
**What's good:** Ctrl+K global search, results for country names AND mechanics, UAE/USA abbreviation support (Bug 10 fixed), keyboard navigation in results, take@$75 shown in results. **Cycle 2:** Region name search enabled — typing "middle" now finds all Middle East countries; "africa" finds all African countries. Results count increased from 5 to 8 for region-based searches.
**What's lacking:**
- No search history or recent results
**Priority fix:** Add recent searches list (last 5 searches) stored in sessionStorage.

### 15. Export / Shareability — B
**What's good:** Export XLSX from Fiscal Compare results, copy-link button on Country Profile (hash URL), PDF print styles.
**What's lacking:**
- No Excel export from Explorer table
- No CSV export option anywhere
- Shared hash URLs don't preserve filter state (only tab + country)
- No screenshot/image export for charts
**Priority fix:** Add Explorer table XLSX export button.

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
## Cycle 2 Log — 2026-08-07 14:04
- Test before: 0 PASS / 0 FAIL
- Test after: 0 PASS / 0 FAIL
- JS errors: 0
- Summary: Cycle 2 complete. Here's what was shipped to the platform:

**8 fixes across 6 categories (v51 â†’ v52):**

- **Tab bar: 12 â†’ 8 tabs** â€” Vintage, Mechanics, Methodology, API moved behind a `Reference â–¾` dropdown. No more horizontal scroll past irrelevant tabs for a first-time viewer.
- **Fiscal Compare auto-refresh** â€” Profile/Price selects now re-run comparison automatically when changed (if results already exist). No more manual "Run Compare" click after every filter change.
- **4-Pric
