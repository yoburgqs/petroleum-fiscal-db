#!/usr/bin/env python3
"""Additively patch country_data.json with the per-mechanic contract mix.

Written for cycle 448 (T3). Side-by-Side and every other comparison surface
printed a single government-take figure per country and, 22 rows lower, a raw
comma-joined `mechanics` string. Two consequences the UX could not see:

  1. `mechanics` is built from the n_* counters in country_data.json, which have
     no bucket for the "India RSC" mechanic. India's 93 risk-service contracts
     were therefore absent from its mechanic string entirely (it read
     "Concession,PSC" over 653 contracts of which 556 are Concession/PSC).
  2. ~/MECHANIC_COMPARABILITY.md (2026-08-26) establishes that TSC / RSC /
     Buy-back take% is a fee-basis structural artefact and is NOT commensurable
     with Concession / PSC / Gross Split / Revenue Share. 11 countries blend the
     two bases into one headline take. Iraq is 68% fee-basis.

This script ONLY ADDS keys. It never rewrites an existing field, and it never
runs rebuild_country_data.py (breakeven regression risk, per office/CLAUDE.md).
Source is dcf_results, read-only, at the four published price points.

Adds per country:
  mech_mix : [{m, n, t75, v75, g}]  — one entry per mechanic actually present
  g1       : {n, t50, t75, t100, t125, v75}  — Group-1-only aggregate, present
             ONLY on countries that blend Group 1 with Group 2 (11 countries)
"""
import json, os, sqlite3, sys

DB = os.path.expanduser('~/office/data/petroleum_facts.db')
CD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'country_data.json')

# Groups per ~/MECHANIC_COMPARABILITY.md. "India RSC" is a risk service contract
# and belongs to Group 2 on the same reasoning as RSC.
GROUP = {
    'Concession': 1, 'PSC': 1, 'Gross Split': 1, 'Revenue Share': 1,
    'TSC': 2, 'RSC': 2, 'Buy-back': 2, 'India RSC': 2,
    'PRRT': 3,
}
PRICES = (50, 75, 100, 125)


def main():
    db = sqlite3.connect('file:%s?mode=ro' % DB, uri=True)
    c = db.cursor()

    # per (country, mechanic) counts + take/npv at $75
    mix = {}
    c.execute("""SELECT country, mechanic, COUNT(*), AVG(govt_take_pct), AVG(contractor_npv_usd_mm)
                   FROM dcf_results WHERE price_usd_bbl = 75 AND mechanic IS NOT NULL
                  GROUP BY country, mechanic""")
    for ctry, mech, n, take, npv in c.fetchall():
        mix.setdefault(ctry, []).append({
            'm': mech, 'n': n,
            't75': round(take, 1) if take is not None else None,
            'v75': round(npv, 1) if npv is not None else None,
            'g': GROUP.get(mech, 1),
        })

    # Group-1-only take at each price, for the countries that blend groups
    g1mechs = tuple(m for m, g in GROUP.items() if g == 1)
    ph = ','.join('?' * len(g1mechs))
    g1 = {}
    for p in PRICES:
        c.execute("""SELECT country, COUNT(*), AVG(govt_take_pct), AVG(contractor_npv_usd_mm)
                       FROM dcf_results WHERE price_usd_bbl = ? AND mechanic IN (%s)
                      GROUP BY country""" % ph, (p,) + g1mechs)
        for ctry, n, take, npv in c.fetchall():
            e = g1.setdefault(ctry, {})
            e['n'] = n
            if take is not None:
                e['t%d' % p] = round(take, 1)
            if p == 75 and npv is not None:
                e['v75'] = round(npv, 1)

    rows = json.load(open(CD))
    patched = mixed = 0
    for r in rows:
        m = mix.get(r['country'])
        if not m:
            continue
        m.sort(key=lambda x: -x['n'])
        r['mech_mix'] = m
        patched += 1
        has1 = any(x['g'] == 1 for x in m)
        has2 = any(x['g'] == 2 for x in m)
        if has1 and has2 and r['country'] in g1:
            r['g1'] = g1[r['country']]
            mixed += 1

    before = os.path.getsize(CD)
    with open(CD, 'w') as f:
        json.dump(rows, f, separators=(',', ':'))
    after = os.path.getsize(CD)
    print('mech_mix added to %d/%d countries; g1 block on %d mixed-basis countries'
          % (patched, len(rows), mixed))
    print('country_data.json %d -> %d bytes (%+.1f KB)' % (before, after, (after - before) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
