#!/usr/bin/env python3
"""Additively patch country_data.json with the DCF engine's zero-rate-default count.

Written for cycle 601 (T2). The Country Profile prints a per-regime split -- the
element specifically built to stop an analyst citing the country blend when their
asset sits in one regime. On Brazil it reads:

    Concession   845 (71%)    8.2%   $5.0B
    PSC          348 (29%)   62.7%   $780M
    "Contractor NPV across them runs $780M to $5.0B. Screen on the regime you would sign."

703 of those 845 Concession contracts carry, in dcf_results.warnings, the DCF
engine's own stamp:

    "No fiscal rates found; defaulting to zero-rate concession"

They are priced at govt_take_pct = 0.0 and contractor_npv = $5,533.1M -- the
untaxed project NPV, identical to the decimal on every such contract, because no
fiscal instrument was applied at all. That default is what drags the regime row
to 8.2%. Over the 142 Brazil Concession contracts that DO carry rates, the same
regime is 48.7% take and $2.2B NPV: 40.5pp and 2.2x away from what the page
prints at the decision point.

862 contracts across 17 countries carry the stamp. The warning has always been in
the database and has never reached any surface.

This script ONLY ADDS keys, on the same contract as tools/add_mech_mix.py. It
never rewrites an existing field, and it never runs rebuild_country_data.py
(breakeven regression risk, per office/CLAUDE.md). Source is dcf_results,
read-only, at $75/bbl -- the price every one of these surfaces publishes.

Adds to each mech_mix entry that has any (key omitted entirely where zr == 0):
  zr    : count of contracts in this (country, mechanic) stamped zero-rate
  t75p  : mean govt take across the PRICED remainder, or null if none are priced
  v75p  : mean contractor NPV across the PRICED remainder, or null likewise
"""
import json, os, sqlite3, sys

DB = os.path.expanduser('~/office/data/petroleum_facts.db')
CD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'country_data.json')

# The engine's own string, matched verbatim. Not a threshold and not a heuristic:
# a contract is excluded only where petroleum_dcf.py recorded that it found no
# fiscal rates to apply.
STAMP = 'No fiscal rates found; defaulting to zero-rate concession'


def main():
    db = sqlite3.connect('file:%s?mode=ro' % DB, uri=True)
    c = db.cursor()
    c.execute("""SELECT country, mechanic,
                        SUM(CASE WHEN warnings LIKE ? THEN 1 ELSE 0 END),
                        AVG(CASE WHEN warnings NOT LIKE ? THEN govt_take_pct END),
                        AVG(CASE WHEN warnings NOT LIKE ? THEN contractor_npv_usd_mm END)
                   FROM dcf_results
                  WHERE price_usd_bbl = 75 AND mechanic IS NOT NULL
                  GROUP BY country, mechanic""", ('%' + STAMP + '%',) * 3)
    zr = {}
    for ctry, mech, n_zr, t_p, v_p in c.fetchall():
        if not n_zr:
            continue
        zr[(ctry, mech)] = {
            'zr': int(n_zr),
            't75p': None if t_p is None else round(t_p, 1),
            'v75p': None if v_p is None else round(v_p, 1),
        }

    rows = json.load(open(CD))
    n_rows = n_ctry = n_blank = 0
    for r in rows:
        hit = False
        for m in (r.get('mech_mix') or []):
            e = zr.get((r['country'], m.get('m')))
            if not e:
                continue
            m.update(e)
            n_rows += 1
            hit = True
            if e['t75p'] is None:
                n_blank += 1
        if hit:
            n_ctry += 1

    before = os.path.getsize(CD)
    with open(CD, 'w') as f:
        json.dump(rows, f, separators=(',', ':'))
    after = os.path.getsize(CD)
    print('zero-rate stamp on %d regime rows across %d countries (%d rows have NO priced '
          'contract left at all)' % (n_rows, n_ctry, n_blank))
    print('country_data.json %d -> %d bytes (%+.1f KB)' % (before, after, (after - before) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
