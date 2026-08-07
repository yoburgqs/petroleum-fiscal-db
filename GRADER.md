# ORCA Petroleum Platform — UX & SDLC Grader
**Last Updated:** 2026-08-07
**Grader Version:** 1.0
**Overall Status:** 85-90% production-ready. Target: A across all categories in 6 days.

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

### 1. Visual Design — B+
**What's good:** Dark amber/slate theme consistent, Inter + IBM Plex Mono typography, tabular-nums for number columns, tier color system (green/yellow/orange/red) applied consistently, print/PDF styles included.
**What's lacking:**
- Mixed icon system: Unicode (`⬇`, `⎘`), emoji (`🔍`, `📊`, `📡`), inline SVG — pick one system
- No real logo/brand mark — loading screen uses `&#9632;` (block character)
- "? Reference" button label is ambiguous and unprofessional
- Footer repeats same stats (71,601 contracts, 185 countries) twice
**Priority fix:** Standardize icon system. Replace block char with text logo or SVG.

### 2. Information Architecture — C+
**What's good:** Landing tab (Fiscal Compare) is correct choice, welcome panel Q&A grid is excellent onboarding, URL hash routing enables shareable links, Ctrl+K search improves navigation.
**What's lacking:**
- 12 tabs is too many — horizontal scrolling with hidden scrollbar means users miss tabs
- `Comparison` vs `Fiscal Compare` naming collision confuses new users
- `Regime Explorer` contains Browse/Screen/Bubble sub-modes = tab-within-a-tab anti-pattern
- No breadcrumb or back button when drilling from Explorer to Country Profile
**Priority fix:** Rename `Comparison` tab to `Side-by-Side`. Consolidate `Vintage`, `Mechanics`, `API`, `Methodology` into `Reference` dropdown.

### 3. Data Presentation — B
**What's good:** Take sparklines (4-price SVG curves), waterfall breakdown, evidence A/B/C/D tier badges, Monte Carlo uncertainty badge, breakeven color indicators, rank badges (#3 of 185).
**What's lacking:**
- Explorer table has BOTH chip-row filters AND dropdown selects for same dimensions (Mechanic, Region) — both visible simultaneously, different option sets ("Americas" chips vs "Latin America"/"North America" dropdowns)
- IRR methodology caveat buried in tiny tooltip — needs footnote or asterisk
- NPV formatting may be inconsistent between FC results and Explorer
- Empty states: Reform Risk and Breakeven Map show "Loading..." forever on failure
**Priority fix:** Remove dropdown select filters from Explorer Browse mode (keep chips only). Fix Region alignment between chips and dropdowns.

### 4. Interaction Design — B-
**What's good:** Fiscal Compare workflow clean, compare basket well-implemented, keyboard shortcuts (Ctrl+K, Esc, arrow keys), country row drill-down, Scenario Builder mechanic-aware parameter groups.
**What's lacking:**
- Run Compare button doesn't auto-run on filter change (manual re-click required)
- Export XLSX button "pops in" after run (should be always-visible but disabled)
- 4-Price View toggle has no visual on/off state indicator
- No "Back to Explorer" link when navigating from Explorer row to Country Profile
- Scenario Builder Run DCF button not visible until modal is opened (per test)
**Priority fix:** Disable-state export button. Add Back link to Country Profile.

### 5. Naming Consistency — D
**What's good:** Tab buttons have consistent casing.
**What's lacking:**
- `Country Profile` (tab label) vs `Country Deep-Dive` (page title inside) — mismatch
- `Regime Explorer` (tab) vs `Global Fiscal Explorer` (browse mode page title) — duplicate titles
- DCF engine shows `v50` in footer but UX shows `v51`
- `Sample Analyses` vs `Sample Analysis` — singular/plural inconsistency in some contexts
**Priority fix:** Fix `Country Deep-Dive` → `Country Profile` in page title. Remove duplicate Explorer page title.

### 6. Error & Empty States — D
**What's good:** Loading overlay hides when data loads, `_platformLoaded` guard prevents double-init.
**What's lacking:**
- Reform Risk tab: "Loading reform history..." text persists if `reform_history.json` fetch fails — no timeout/error state
- Breakeven Map tab: same issue — no failure fallback
- Country Profile with no country selected shows cards without hover affordance (no cursor:pointer, no visual cue)
- `be_75` null in 63% of countries (117/185) — no explanation shown to user when breakeven is `—`
**Priority fix:** Add 10-second timeout → "Data unavailable — reload to retry" fallback for Reform Risk and Breakeven Map.

### 7. Professional Credibility — B
**What's good:** 71,601 contracts / 185 countries scale communicated prominently, Methodology tab thorough with honest limitations disclosure, evidence quality infrastructure (A/B/C/D tiers with source citations), benchmark validation against 13 published ranges, Sample Analyses demonstrate domain expertise.
**What's lacking:**
- Russia shows as red "Fail" in validation table alongside 12 passing countries — undermines confidence in the table (should be in a separate "Known Gaps" row)
- "? Reference" button label is not professional
- Duplicate footer stats
- `DCF Engine v50` vs `ORCA v51` version mismatch visible to technical users
**Priority fix:** Move Russia to "Known Model Limitations" row below validation table with explanation.

### 8. Data Reliability — B
**What's good:** Evidence pipeline, A/B/C tiers, source citations, Monte Carlo uncertainty bands.
**What's lacking:**
- `be_75` (breakeven) null in 117/185 countries (63%) — data gap not communicated
- `irr_75` missing in 111/185 countries (60%) — IRR shown as `—` with no explanation
- IRR values ≥500 silently filtered (line 2749) with no user-visible explanation
- Country Profile onclick handlers use `d.country.replace(/'/g, "\\'")` — breaks for typographic apostrophes (e.g., Côte d'Ivoire)
**Priority fix:** Add data coverage % note to column headers or in methodology. Fix onclick apostrophe escaping.

### 9. Performance & Reliability — B+
**What's good:** Async JSON loads with `loadPlatformData()`, render-once guards (`_beMapRendered`, `_vintageTrendChart`), DCF chunked computation via `recompute_chunk.py`, `_fcResults` caching for re-sort.
**What's lacking:**
- No service worker / offline support
- Large single file (9,200+ lines) — no code splitting
- No CDN fallback for Chart.js or D3.js (external CDN links)
**Priority fix:** Add `onerror` fallback for Chart.js and D3.js CDN links.

### 10. Accessibility — C
**What's good:** Semantic HTML in some areas, `alt` text on some elements.
**What's lacking:**
- Tab buttons have no `aria-selected` or `role="tab"`
- Filter chips have no `aria-pressed` or `aria-checked`
- Color used as sole indicator for tier system (green/yellow/orange/red) — colorblind users affected
- No skip-to-content link
- Modal (`#scenario-modal`) has no `role="dialog"` or `aria-modal`
- Keyboard navigation in Fiscal Compare results table
**Priority fix:** Add `aria-selected` to tab buttons. Add `role="dialog" aria-modal="true"` to scenario modal.

### 11. Mobile Experience — B+
**What's good:** Multiple `@media` breakpoints (768px, 600px, 390px), iOS zoom prevention, touch target sizing (44px minimum), column hiding in Explorer mobile.
**What's lacking:**
- 12-tab nav on mobile requires horizontal scroll with no visual affordance
- Bubble chart unreadable on phone (too many datapoints)
- Scenario Builder modal not optimized for mobile keyboard
**Priority fix:** Add visible scroll indicator arrows to tab nav on mobile.

### 12. Security / Data Integrity — A-
**What's good:** Read-only platform (no auth, no writes, no user data stored), GitHub Pages hosting (static), no server-side vulnerabilities possible.
**What's lacking:**
- No CSP headers (GitHub Pages limitation)
- External CDN dependencies (Chart.js, D3.js) without SRI hashes
**Priority fix:** Add SRI hashes to CDN script tags.

### 13. SDLC Maturity — B
**What's good:** Playwright test suite (99+ PASS), nightly audit task scheduler, GitHub Pages CI/CD, git versioning with semantic commits, 4-fork architecture (Harvest/DCF/Audit/UX).
**What's lacking:**
- No automated deployment gate (tests don't block push)
- No staging environment (changes go directly to production GitHub Pages)
- No changelog visible to end users
- Playwright tests run against live GitHub Pages (not local build) — network dependency
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
