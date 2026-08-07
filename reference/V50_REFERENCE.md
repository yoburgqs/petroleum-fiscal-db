# ORCA v50 — Accepted Client Prototype

**Status:** ACCEPTED — client approved this version as the baseline for the engagement.
**Commit:** `116df4c682ef03beb4f50adefbd891b1d65cb850`
**Tag:** `v50` (pushed to GitHub)
**Date:** 2026-08-05
**File:** `reference/v50_prototype.html` (static copy preserved here)
**Live at time of acceptance:** `https://yoburgqs.github.io/petroleum-fiscal-db/` (now updated to current version)

---

## What v50 Was

The first complete, client-delivered prototype of the ORCA Petroleum Fiscal Intelligence Platform. Accepted as proof of concept to proceed with the engagement.

### DB State at v50
- **Contracts:** ~71,000+ (post-I4 quality fixes)
- **Countries:** 211
- **Mechanics:** 7 (Concession, PSC, TSC, PRRT, Revenue Share, RSC, Buy-back)
- **D-tier contracts:** 0% (all low-confidence data removed or upgraded)
- **Verified facts:** 384,000+

### Key Data Fixes in v50
- Norway: SPT post-2022 rate (78% → correct tiered rate)
- Russia: MET 46% rate (corrected)
- UK: RFCT — 605 contracts fixed
- Venezuela: ISAE 2013 thresholds applied
- 47,000 conflicts resolved across DB

### UX at v50
- 12-tab interface (Fiscal Compare, Country Profile, Regime Explorer, IOC Portfolio, Side-by-Side, Vintage, Mechanics, API, Methodology, Reform Risk, Breakeven Map, Scenario Builder)
- 4-price DCF view ($50/$75/$100/$125)
- Benchmark table with Norway/Angola/Iraq reference tiers
- Vintage badge system
- Export to Excel (basic)
- IRR display
- Performance: async load < 5s

### Audit Results at v50
- 9 PASS / 4 WARN / 0 FAIL (Playwright audit)
- PAGEERROR: 0

---

## The 6-Day Sprint (2026-08-07 to 2026-08-13)

**Mission:** Elevate from accepted prototype to production-grade platform. Client will make final go/no-go decision at the end of 6 days.

**Autonomous improvement cycle:** Every 30 minutes
1. Check Zach's email for direction
2. Run Playwright test (118 tests)
3. Opus grades all UX/DB categories
4. 10 parallel agents fix lowest-graded items
5. Re-test
6. Update GRADER.md
7. Push to GitHub Pages
8. Email Zach summary

**Grader categories (tracking progress from v50 baseline to target):**
| Category | v50 Baseline | Current | Target |
|----------|-------------|---------|--------|
| Data Reliability | B | — | A |
| Visual Design | B+ | B+ | A |
| Information Architecture | C+ | B- | A- |
| Data Presentation | B | B+ | A- |
| Export / Shareability | C | B | A- |
| Interaction Design | B- | B | A- |
| Credibility / Trust | B | B+ | A- |
| Performance | B+ | B+ | A |
| Error States | D | B | A- |
| Naming / Labeling | D | B | A |
| Accessibility | C | B | A- |
| Mobile Responsiveness | B | B+ | A- |
| SDLC / Test Coverage | B- | B+ | A- |
| Search | B- | A- | A |
| Fiscal Completeness | B+ | B+ | A |

---

## How to Restore v50 If Needed

```bash
# View the v50 prototype (static copy):
open reference/v50_prototype.html

# Or check out v50 commit:
git checkout v50

# Return to current:
git checkout main
```

## Notes
- v50 was the ONLY version shown to the client. They have not seen v51+.
- All improvements since v50 are incremental refinements, not scope changes.
- The DB schema and DCF engine are unchanged from v50 — only UX and data quality are improving.
- Do NOT regress any feature that existed at v50. Use `reference/v50_prototype.html` to verify.
