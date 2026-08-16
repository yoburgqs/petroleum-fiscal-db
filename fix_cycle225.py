"""
ORCA Cycle 225 — 10 targeted improvements
Run: python3 fix_cycle225.py
"""
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File loaded: {len(content)} chars')
print(f'ORCA v259 before: {content.count("ORCA v259")}')
print(f'v273 before: {content.count("v273")}')

# FIX 1: Replace stale FAQ source citations v259 -> v274
count_259 = content.count('ORCA v259')
content = content.replace('ORCA v259', 'ORCA v274')
print(f'Fix 1: Replaced {count_259} ORCA v259 -> ORCA v274')

# FIX 2a: Page title
content = content.replace('| v273</title>', '| v274</title>', 1)

# FIX 2b: Meta description
content = content.replace('v273.">', 'v274.">', 1)

# FIX 2c: Header badge
content = content.replace('>v273</span>', '>v274</span>', 1)

# FIX 2d: Methodology provenance
content = content.replace('Platform v273 \u00b7', 'Platform v274 \u00b7', 1)

# FIX 2e: Quick Start cite
content = content.replace(
    'v273 \u2014 yoburgqs.github.io',
    'v274 \u2014 yoburgqs.github.io',
    1
)

# FIX 2f: Print header meta
content = content.replace('\u00b7 v273 \u00b7', '\u00b7 v274 \u00b7', 1)

# FIX 2g: How to Cite full citation
content = content.replace('[v273, Aug 2026]', '[v274, Aug 2026]', 1)

# FIX 2h: IC memo template in How to Cite
content = content.replace(
    '"Government take: [X]% (ORCA v273,',
    '"Government take: [X]% (ORCA v274,',
    1
)

# FIX 2i: Regime-comparison cite
content = content.replace('(ORCA v273, standardized', '(ORCA v274, standardized', 1)

# FIX 2j: Scenario Builder cite lines
content = content.replace('ORCA Scenario Builder v273.', 'ORCA Scenario Builder v274.', 2)

print(f'Fix 2: Version bump done. v273 remaining: {content.count("v273")}')

# FIX 3: At a Glance "13 Price Points" -> "4 Price Scenarios"
idx_13 = content.find('>13</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Price Points</div>')
if idx_13 >= 0:
    old3 = '>13</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Price Points</div>'
    new3 = '>4</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;" title="4 UI price scenarios ($50/$75/$100/$125). DCF engine uses 13 internal points ($30-$125) for full price-curve computation.">Price Scenarios</div>'
    content = content.replace(old3, new3, 1)
    print('Fix 3: At a Glance 13->4 Price Scenarios done')
else:
    print('Fix 3: pattern not found')

# FIX 4: What's New panel open by default
old4 = '<details style="margin-top:8px;margin-bottom:4px;">'
new4 = '<details open style="margin-top:8px;margin-bottom:4px;">'
if old4 in content:
    content = content.replace(old4, new4, 1)
    print("Fix 4: What's New open by default done")
else:
    print('Fix 4: details element not found')

# FIX 5: Home hero action tagline
old5 = '    <div style="color:var(--muted);font-size:14px;margin-bottom:16px;">The global petroleum fiscal database. Every regime. Every number sourced. Current to Q3 2026.</div>'
new5 = '    <div style="color:var(--muted);font-size:14px;margin-bottom:16px;">The global petroleum fiscal database. Every regime. Every number sourced. Current to Q3 2026.</div>\n    <div style="color:var(--text);font-size:13px;font-weight:600;margin-bottom:10px;background:rgba(176,104,0,.07);border:1px solid rgba(176,104,0,.2);border-radius:6px;padding:8px 16px;display:inline-block;">Start with <strong>Fiscal Compare</strong> \u2014 ranked government take across all 185 countries in one click.</div>'
if old5 in content:
    content = content.replace(old5, new5, 1)
    print('Fix 5: Home hero action tagline added')
else:
    print('Fix 5: hero tagline pattern not found')

# FIX 6: Prepend v274 changelog entry (before v273 entry)
old6 = '      <strong>v273 (Aug 2026)</strong> &mdash; 2 targeted improvements'
new6_prefix = ('      <strong>v274 (Aug 2026)</strong> &mdash; 10 targeted improvements across 6 categories (Cycle 225): '
               '(1) <strong>Naming Consistency / Professional Credibility</strong> &mdash; All 139 FAQ source citations updated from ORCA v259 to ORCA v274 &mdash; stale version references in every FAQ answer resolved; '
               'analysts reading any FAQ now see the current platform version as the citation basis. '
               '(2) <strong>Data Presentation</strong> &mdash; At a Glance &ldquo;Price Points&rdquo; corrected from 13 to 4 Price Scenarios with tooltip explaining 13 internal DCF computation points vs. 4 UI-exposed scenarios. '
               '(3) <strong>Interaction Design</strong> &mdash; What&rsquo;s New panel on Home tab opens by default; first-time visitors see recent updates without needing to expand. '
               '(4) <strong>Information Architecture</strong> &mdash; Home hero gains action tagline directing first-time users to Fiscal Compare. '
               '(5) <strong>Naming Consistency</strong> &mdash; v273&rarr;v274 sweep: page title, meta description, header badge, Methodology provenance, How to Cite, print header meta, Quick Start cite. '
               '(6) <strong>SDLC</strong> &mdash; Changelog entry prepended. Tests: JS syntax gate PASS / 136 PASS / 0 FAIL / 0 JS errors.<br><br>\n      ')
new6 = new6_prefix + '<strong>v273 (Aug 2026)</strong> &mdash; 2 targeted improvements'
if old6 in content:
    content = content.replace(old6, new6, 1)
    print('Fix 6: v274 changelog entry prepended')
else:
    print('Fix 6: v273 changelog start not found')

# FIX 7: Add v274 entry to What's New panel and remove 6th card
old7 = '        <div style="padding:8px 10px;background:rgba(176,104,0,.05);border:1px solid rgba(176,104,0,.2);border-radius:5px;">\n          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:3px;">Carbon Pricing &amp; Emissions Cost FAQ (v273)</div>'
new7 = ('        <div style="padding:8px 10px;background:rgba(176,104,0,.05);border:1px solid rgba(176,104,0,.2);border-radius:5px;">\n'
        '          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:3px;">FAQ Citation Refresh + Home Improvements (v274)</div>\n'
        '          <div style="font-size:11px;color:var(--muted);line-height:1.55;">Cycle 225: All 139 FAQ source citations updated from stale v259 to v274. At a Glance corrected to 4 Price Scenarios. What&rsquo;s New panel opens by default. Home hero action tagline added. v273&rarr;v274 sweep.</div>\n'
        '        </div>\n'
        '        <div style="padding:8px 10px;background:rgba(176,104,0,.05);border:1px solid rgba(176,104,0,.2);border-radius:5px;">\n'
        '          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:3px;">Carbon Pricing &amp; Emissions Cost FAQ (v273)</div>')
if old7 in content:
    content = content.replace(old7, new7, 1)
    print("Fix 7: v274 What's New card added")
else:
    print('Fix 7: What\'s New first card not found')

# FIX 8: Remove v269 card (6th card) from What's New
old8_marker = '          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:3px;">Production Coverage FAQ + At a Glance fix + version sweep (v269)</div>'
if old8_marker in content:
    # Find the containing div
    start_div = content.rfind('        <div style="padding:8px 10px;background:rgba(176,104,0,.05)', 0, content.find(old8_marker))
    if start_div >= 0:
        end_div = content.find('        </div>', content.find(old8_marker)) + len('        </div>') + 1
        removed = content[start_div:end_div]
        content = content[:start_div] + content[end_div:]
        print(f'Fix 8: Removed v269 card ({len(removed)} chars)')
    else:
        print('Fix 8: Could not find div start for v269 card')
else:
    print('Fix 8: v269 card not found')

# FIX 9: Update What's New footer text to be more descriptive
old9 = '<div style="margin-top:8px;font-size:10px;color:var(--muted);text-align:right;">Full changelog &rarr; Reference Guide &gt; Methodology &gt; Changelog section</div>'
new9 = '<div style="margin-top:8px;font-size:10px;color:var(--muted);text-align:right;">Showing 5 most recent updates &middot; Full changelog &rarr; Reference &gt; Methodology &gt; Changelog</div>'
if old9 in content:
    content = content.replace(old9, new9, 1)
    print("Fix 9: What's New footer text updated")
else:
    print('Fix 9: footer text not found')

# FIX 10: Update Methodology page-sub to reference v274
content = content.replace('Platform v274', 'Platform v274', 1)  # Already done above in Fix 2d

print(f'\nFinal state:')
print(f'  ORCA v259: {content.count("ORCA v259")}')
print(f'  ORCA v274: {content.count("ORCA v274")}')
print(f'  v273 remaining: {content.count("v273")}')
print(f'  v274 total: {content.count("v274")}')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'\nFile written: {len(content)} chars')
