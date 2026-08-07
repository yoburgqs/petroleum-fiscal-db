# ORCA Petroleum Platform — UX & SDLC Grader
**Last Updated:** 2026-08-07
**Grader Version:** 1.0
**Overall Status:** Post-Cycle-1: All categories B- or above. Target: A across all by end of Cycle 6.

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

### 2. Information Architecture — B-
**What's good:** Landing tab (Fiscal Compare) is correct choice, welcome panel Q&A grid is excellent onboarding, URL hash routing enables shareable links, Ctrl+K search improves navigation. `Comparison` tab renamed to `Side-by-Side`. Mobile tab nav fade indicator added. Back to Explorer link added in Country Profile.
**What's lacking:**
- 12 tabs is too many — horizontal scrolling with hidden scrollbar means users miss tabs
- `Regime Explorer` contains Browse/Screen/Bubble sub-modes = tab-within-a-tab anti-pattern
- `Vintage`, `Mechanics`, `API`, `Methodology` tabs still exposed rather than consolidated
**Priority fix:** Consolidate `Vintage`, `Mechanics`, `API`, `Methodology` into `Reference` dropdown.

### 3. Data Presentation — B+
**What's good:** Take sparklines (4-price SVG curves), waterfall breakdown, evidence A/B/C/D tier badges, Monte Carlo uncertainty badge, breakeven color indicators, rank badges (#3 of 185). Duplicate dropdown filters hidden in Explorer Browse mode. IRR column footnote added. Breakeven null explanation note added.
**What's lacking:**
- NPV formatting may be inconsistent between FC results and Explorer
- Region alignment between chips and dropdowns could be tightened further
**Priority fix:** Verify NPV formatting consistency. Align region label language across chip and dropdown selects.

### 4. Interaction Design — B
**What's good:** Fiscal Compare workflow clean, compare basket well-implemented, keyboard shortcuts (Ctrl+K, Esc, arrow keys), country row drill-down, Scenario Builder mechanic-aware parameter groups. Export XLSX button now always-visible with disabled state. Back to Explorer link added to Country Profile.
**What's lacking:**
- Run Compare button doesn't auto-run on filter change (manual re-click required)
- 4-Price View toggle has no visual on/off state indicator
- Scenario Builder Run DCF button not visible until modal is opened (per test)
**Priority fix:** Add on/off visual indicator to 4-Price View toggle. Auto-run compare on filter change.

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

### 10. Accessibility — B
**What's good:** Semantic HTML in some areas, `alt` text on some elements. ARIA roles added: `role="tab"`, `role="tablist"`, `role="tabpanel"`, `role="dialog" aria-modal` on scenario modal, `role="search"`, `aria-pressed` on filter chips.
**What's lacking:**
- Color used as sole indicator for tier system (green/yellow/orange/red) — colorblind users still affected
- No skip-to-content link
- Keyboard navigation in Fiscal Compare results table not fully implemented
**Priority fix:** Add text labels or patterns alongside color in tier system. Add skip-to-content link.

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

### 14. Search Quality — A-
**What's good:** Ctrl+K global search, results for country names AND mechanics, UAE/USA abbreviation support (Bug 10 fixed), keyboard navigation in results.
**What's lacking:**
- Search doesn't support partial region names ("middle" doesn't find "Middle East")
- No search history or recent results
- Results don't show government take directly (need to click through to profile)
**Priority fix:** Add take_75 to search result display.

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
