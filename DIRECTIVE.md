# LOOP DIRECTIVE — USER IMPACT FOCUS
**Set by Zach, 2026-08-23. This file is read IN FULL every cycle. It supersedes
every directive block inside GRADER.md.**

GRADER.md is now an ARCHIVE — grade tables and cycle logs. It is 1.7 MB and the
loop only ever saw its first 3,000 characters (0.17%), which were stale
prohibitions from 2026-08-19. That is why the loop drifted. Do not look to
GRADER.md for direction. Direction lives here.

---

## THE ONE RULE

**Every cycle must reduce friction for a person trying to do a real job.**

Not a grade. Not a version string. Not a tooltip. Not a FAQ. A person.

## WHO THE PERSON IS

A petroleum investment-committee analyst at a major IOC. They have 20 minutes
before a portfolio screening meeting. They have never used this tool before, or
they used it once last month. They are not stupid and they are not patient.
They will not read a methodology section to understand a column header.

## HOW TO RUN A CYCLE

**Step 1 — Pick ONE user task from this list.** Rotate; do not pick the same
task two cycles running. The cycle log must name which one you picked.

  T1. "Which countries should even be on my screening list?"
  T2. "Is this one country attractive at $75/bbl, and can I defend that?"
  T3. "How do these three countries compare side by side?"
  T4. "What is my fiscal-stability and reform exposure here?"
  T5. "Give me something I can paste straight into an IC memo."
  T6. "Where did this number come from and how solid is the evidence?"

**Step 2 — Actually walk the task end to end in the code.** Start from a cold
load (no sessionStorage, no localStorage). Trace the real DOM and the real JS
path a first-time user would hit — the elements, the handlers, the render
functions, the empty states. Do not reason from the changelog. Do not reason
from what GRADER.md claims is done. Read what the page actually does.

**Step 3 — Find the WORST moment in that walk.** The single point where this
analyst would stop, squint, guess wrong, click the wrong thing, or give up. One
moment. The worst one. Not a list of ten small ones.

**Step 4 — Fix that moment.** Change behavior or layout so the moment stops
happening.

**Step 5 — State the impact in user terms, in the commit and the cycle log:**
  - Task: which of T1–T6
  - Friction: what the analyst hit, and where (element / function / line)
  - Change: what is now different on screen or in behavior
  - Result: what the analyst can now do that they could not do before

If you cannot write Step 5 without vague words like "improved", "enhanced",
"clarity", or "polish", you have not made a real change. Go back to Step 3.

**Step 5b — Check it on a phone.** Set by Zach 2026-08-30: *"make sure we stay on
course for finalization of oil gas expertise fiscal ux including mobile defaults."*

Every cycle now verifies its own change at **390 x 844 with `hasTouch: true`**, not
only at desktop width. Two numbers, both cheap to measure:

  - `document.documentElement.scrollWidth` must not exceed `clientWidth`. If your
    change made the page scroll sideways on a phone, it is not done.
  - No control you added or touched may render under 24px tall under
    `pointer: coarse`.

This is in the directive because the loop has already broken it once: v579 left
mobile clean, and by v611 four screens scrolled sideways again and Reform Risk alone
had 15 overflowing elements. Nothing in the cycle was looking, so nothing caught it.

**Step 6 — Verify.** JS syntax gate must PASS. Playwright must actually RUN —
do not record a number "based on prior clean baseline". If the test did not run
this cycle, say so in the log.

## HARD BANS — these are not improvements, do not spend a cycle on them

- **Rubric chasing.** Do not read the 15-category grade table and work the
  lowest rows. 14 of 15 are self-assessed A+; the rubric is at ceiling and has
  stopped carrying information. Grade tables are a record, not a work queue.
- **Version sweeps as the deliverable.** Bumping v490 to v491 across 43
  locations is bookkeeping. Do it silently at the END if you shipped something
  real. It is never the reason a cycle happened, and it does not go in the
  summary as an improvement.
- **Changelog catch-up.** Same. Bookkeeping.
- **New tooltips.** The tooltip audit finished at v448. Every column header,
  mechanic tag, waterfall line and Scenario Builder input already has one. A
  tooltip is what you add when you cannot fix the underlying confusion — fix
  the underlying confusion instead.
- **New FAQs.** Frozen at 974. Nobody reads FAQ 975.
- **Citation-string micro-edits.** The IC citation now carries take, NPV, IRR
  and breakeven. It is done. Stop re-wording it.
- **Text-only changes.** If the rendered layout and the interactive behavior are
  both identical after your edit, it was not a cycle.

## WHAT A GOOD CYCLE LOOKS LIKE

Recent cycles that were genuinely good, for calibration:

- **v451** — deleted the Govt NPV column from Fiscal Compare because the "not
  independently modeled" caveat made it untrustworthy at the decision point.
  Removing a thing was the improvement.
- **v450/v452** — CP headline rebuilt into two zones with global rank and a
  vs-median pill, so the analyst reads position, not just a number.
- **v460 (screener preset clear)** — found a button that called the wrong
  function and had been silently failing. Real bug, real user impact.
- **cycle 344** — found USA filed under region "Other", invisible to every
  region filter. Data bug surfaced by walking the user's actual path.

Notice: all four came from walking a flow, not from reading a rubric.

## STILL LOCKED — do not revert (compressed from the GRADER archive)

- **v371/v373 declutter:** no page-sub paragraphs, no amber instructional
  banners, no routing hints, no "How to read" blocks, no SbS card wrapper, no
  visible Explorer chip rows. Explorer analytics, Screener advanced filters and
  Home "More tools" stay collapsed by default. Screener presets stay a dropdown.
- **v430:** FC IC Analyst Guide starts OPEN with sessionStorage collapse memory.
  Keep the sessionStorage logic.
- **v449:** CP headline take% stays tier-coloured (green≤40 / yellow≤60 /
  orange≤75 / red>75). Screener row-click hint stays.
- **v451:** CP headline stays two-zone. Govt NPV column stays REMOVED from FC.
  Contractor NPV header stays "NPV ($M)". Take% cell stays 14px.
- **v452:** CP headline Zone A keeps global rank + vs-median pill, computed
  before the headline strip to avoid the TDZ error.
- **v489:** Reform Risk stays in the primary Home card grid.
- **v612 mobile layer — do not remove, weaken or narrow its scope.** The block
  headed `v612 — MOBILE LAYER` and the `translateX` state on `#reference-panel`.
  It is deliberately scoped to `pointer: coarse` and `max-width: 720px`, so it
  changes nothing on a desktop: Fiscal Compare still measures 382 of 601 controls
  under 24px with a mouse, and 3 with a thumb. If a cycle finds it in the way, the
  answer is to narrow the selector, never to delete the rule.
  - `#reference-panel` must never go back to a negative `right` offset. A fixed
    element parked off-canvas that way extends the document's scroll width, which
    is what made all twelve screens scroll 390px sideways on a phone.
  - Rows that must scroll rather than wrap opt out with `min-width: max-content`.
    That marker is load-bearing — the wrap rule keys off its absence.
- Tab order is not to be restructured without Zach's explicit approval.

## WHAT "FINISHED" MEANS

Set by Zach 2026-08-30. The course is **finalization of the oil & gas expertise
fiscal UX**, and nothing else. Career is on hold — if a cycle finds itself doing
career work, something has misrouted and the cycle should stop and say so.

Finalization is these five, all measured against the deployed build, none of them
self-assessed:

  1. Runtime suite green, and the number actually read from the suite's own report
     rather than assumed. (Cycles 506-516 shipped while the gate read nothing.)
  2. Zero horizontal scroll at 1920 / 1440 / 1280 / 1024 / 768 / 390.
  3. Zero controls under 24px under `pointer: coarse`.
  4. Zero console and page errors across every tab.
  5. Every export opens, parses, and carries the assumptions behind its numbers.

When all five hold, a cycle that finds nothing should say so and stop, rather than
invent work. That is a finished product, not a failed cycle.

## IF YOU FIND NOTHING

You have not looked hard enough — but do not invent work to fill the cycle. A
cycle that ships nothing and says honestly "walked T3 cold, found no friction
worse than X, which is minor" is worth more than a version sweep dressed up as
an improvement. Log it and stop.
