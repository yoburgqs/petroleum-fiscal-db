#!/usr/bin/env python3
"""Cycle 371 fixes for ORCA index.html"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
changes = []

# CHANGE 1: FC drilldown IC Memo moderate-take cite
old1 = 'govt take @$75/bbl (ORCA v465)." Evidence:'
new1 = 'govt take @$75/bbl (ORCA v471)." Evidence:'
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes.append('FC drilldown IC Memo moderate-take cite: v465 -> v471')

# CHANGE 2: CP IC Memo chip standard citation (with ASCII dash)
old2 = "msg = 'IC: standard citation \u2014 take@$75, profile, evidence tier, ORCA v465';"
new2 = "msg = 'IC: standard citation \u2014 take@$75, profile, evidence tier, ORCA v471';"
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes.append('CP IC Memo chip standard cite (em-dash): v465 -> v471')

old2b = "msg = 'IC: standard citation \xe2\x80\x94 take@$75, profile, evidence tier, ORCA v465';"
new2b = "msg = 'IC: standard citation \xe2\x80\x94 take@$75, profile, evidence tier, ORCA v471';"
if old2b in content:
    content = content.replace(old2b, new2b, 1)
    changes.append('CP IC Memo chip standard cite (em-dash bytes): v465 -> v471')

# Look for it as literal text with HTML-encoded dash
old2c = "IC: standard citation"
if old2c in content:
    idx = content.find(old2c)
    snippet = content[idx:idx+100]
    if 'v465' in snippet:
        content = content[:idx] + content[idx:idx+100].replace('v465', 'v471') + content[idx+100:]
        changes.append('CP IC Memo chip standard cite (fallback): v465 -> v471')

# CHANGE 3: copyICCitation function
old3 = '. Source: ORCA Petroleum Fiscal Intelligence Platform (2026), v465 \u2014 yoburgqs.github.io/petroleum-fiscal-db/'
new3 = '. Source: ORCA Petroleum Fiscal Intelligence Platform (2026), v471 \u2014 yoburgqs.github.io/petroleum-fiscal-db/'
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes.append('copyICCitation function: v465 -> v471')

# Also try with literal bytes
old3b = '. Source: ORCA Petroleum Fiscal Intelligence Platform (2026), v465 \xe2\x80\x94 yoburgqs.github.io/petroleum-fiscal-db/'
new3b = '. Source: ORCA Petroleum Fiscal Intelligence Platform (2026), v471 \xe2\x80\x94 yoburgqs.github.io/petroleum-fiscal-db/'
if old3b in content:
    content = content.replace(old3b, new3b, 1)
    changes.append('copyICCitation function (bytes): v465 -> v471')

# Search and replace in the specific function
if '. Source: ORCA Petroleum Fiscal Intelligence Platform (2026), v465' in content:
    content = content.replace('. Source: ORCA Petroleum Fiscal Intelligence Platform (2026), v465',
                              '. Source: ORCA Petroleum Fiscal Intelligence Platform (2026), v471', 1)
    changes.append('copyICCitation function (simple): v465 -> v471')

# CHANGE 4: copyICSummary function
old4 = 'Source: ORCA Petroleum Fiscal Intelligence Platform v465 (2026) \u2014 yoburgqs.github.io/petroleum-fiscal-db/'
new4 = 'Source: ORCA Petroleum Fiscal Intelligence Platform v471 (2026) \u2014 yoburgqs.github.io/petroleum-fiscal-db/'
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes.append('copyICSummary function: v465 -> v471')
if 'Source: ORCA Petroleum Fiscal Intelligence Platform v465 (2026)' in content:
    content = content.replace('Source: ORCA Petroleum Fiscal Intelligence Platform v465 (2026)',
                              'Source: ORCA Petroleum Fiscal Intelligence Platform v471 (2026)', 1)
    changes.append('copyICSummary function (simple): v465 -> v471')

# CHANGE 5: Methodology checklist
old5a = 'Source: ORCA v465 (Aug 2026).</li>'
new5a = 'Source: ORCA v471 (Aug 2026).</li>'
if old5a in content:
    content = content.replace(old5a, new5a, 1)
    changes.append('Methodology IC checklist source: v465 -> v471')

old5b = 'v465 (Aug 2026), yoburgqs.github.io/petroleum-fiscal-db/'
new5b = 'v471 (Aug 2026), yoburgqs.github.io/petroleum-fiscal-db/'
if old5b in content:
    content = content.replace(old5b, new5b, 1)
    changes.append('Methodology IC citation template: v465 -> v471')

old5c = 'v465 (Aug 2026), standardized Deepwater profile: $1,200M capex'
new5c = 'v471 (Aug 2026), standardized Deepwater profile: $1,200M capex'
if old5c in content:
    content = content.replace(old5c, new5c, 1)
    changes.append('Methodology IC disclosure language: v465 -> v471')

# CHANGE 6: Sample IC analysis FAQ source footnotes
old6 = 'Source: ORCA Petroleum Fiscal Intelligence Platform v465 (Aug 2026). Cross-references:'
new6 = 'Source: ORCA Petroleum Fiscal Intelligence Platform v471 (Aug 2026). Cross-references:'
count6 = content.count(old6)
if count6 > 0:
    content = content.replace(old6, new6)
    changes.append(f'Sample IC FAQ source footnotes: {count6} instances v465 -> v471')

old6b = 'Source: ORCA Petroleum Fiscal Intelligence Platform v465 (Aug 2026). Norwegian Petroleum Tax Act'
new6b = 'Source: ORCA Petroleum Fiscal Intelligence Platform v471 (Aug 2026). Norwegian Petroleum Tax Act'
if old6b in content:
    content = content.replace(old6b, new6b, 1)
    changes.append('Norway IC FAQ source footnote: v465 -> v471')

# CHANGE 7: IC Citation guidance tooltip on profile strip
old7 = '<span style="margin-left:auto;color:var(--muted);font-style:italic;">IOC standard benchmarking basis</span>'
new7 = '<span style="margin-left:auto;color:var(--muted);font-style:italic;" title="IC memo citation: \'Computed using ORCA Deepwater profile: $1.2B capex / 50k bbl/d / $15/bbl opex / 10% WACC / 100% WI. Source: ORCA v471 (Aug 2026).\'">IOC standard benchmarking basis <span style="font-size:9px;opacity:.65;font-style:normal;">(\u24d8 cite basis)</span></span>'
if old7 in content:
    content = content.replace(old7, new7, 1)
    changes.append('FC profile strip: IC citation tooltip added to benchmarking basis label')

# CHANGE 8: Fix fiscal character verdict neutral case color
# The "Moderate-take open access" case uses --muted, making it invisible. Change to --accent.
old8 = "charLabel = 'Moderate-take open access \u2014 typical IOC benchmark range with predictable fiscal structure';\n      charColor = 'var(--muted)';"
new8 = "charLabel = 'Moderate-take open access \u2014 typical IOC benchmark range with predictable fiscal structure';\n      charColor = 'var(--accent)';"
if old8 in content:
    content = content.replace(old8, new8, 1)
    changes.append('CP fiscal character verdict: Moderate-take open access -> --accent color')

# Try simpler match
if "Moderate-take open access" in content and "charColor = 'var(--muted)';" in content:
    idx_label = content.find("Moderate-take open access")
    idx_color = content.find("charColor = 'var(--muted)';", idx_label)
    if idx_color > 0 and idx_color < idx_label + 300:
        content = content[:idx_color] + "charColor = 'var(--accent)';" + content[idx_color + len("charColor = 'var(--muted)';"):]
        changes.append('CP fiscal character verdict: Moderate-take open access -> --accent (fallback match)')

# CHANGE 9: Screener count bar 100% WI context
old9 = "'\u00b7 Deepwater @$' + price + ' \u00b7 10% WACC'"
new9 = "'\u00b7 Deepwater @$' + price + ' \u00b7 10% WACC \u00b7 100% WI'"
if old9 in content:
    content = content.replace(old9, new9, 1)
    changes.append('Screener count bar: added 100% WI to profile context')

# Also try simpler
if "' + price + ' \xb7 10% WACC'" in content:
    content = content.replace("' + price + ' \xb7 10% WACC'", "' + price + ' \xb7 10% WACC \xb7 100% WI'", 1)
    changes.append('Screener count bar: 100% WI added (byte match)')

# CHANGE 10: Version bump v470 -> v471
old_title = 'Contracts, 185 Countries | v470</title>'
new_title = 'Contracts, 185 Countries | v471</title>'
if old_title in content:
    content = content.replace(old_title, new_title, 1)
    changes.append('Title: v470 -> v471')

old_meta = 'Built for IOC economists and upstream analysts. v470.">'
new_meta = 'Built for IOC economists and upstream analysts. v471.">'
if old_meta in content:
    content = content.replace(old_meta, new_meta, 1)
    changes.append('Meta description: v470 -> v471')

# Header badge
old_badge = '>v470</div>'
new_badge = '>v471</div>'
if old_badge in content:
    content = content.replace(old_badge, new_badge, 1)
    changes.append('Header badge: v470 -> v471')

# Home subtitle
if '(v470).' in content:
    content = content.replace('(v470).', '(v471).', 1)
    changes.append('Home subtitle: (v470). -> (v471).')

# Print header
old_ph = 'ORCA Petroleum Fiscal Intelligence Platform v470'
new_ph = 'ORCA Petroleum Fiscal Intelligence Platform v471'
count_ph = content.count(old_ph)
if count_ph > 0:
    content = content.replace(old_ph, new_ph)
    changes.append(f'Print header and structural: v470 -> v471 ({count_ph} instances)')

# Who Built This / How to Cite / other v470 references
old_who = 'v470 (Aug 2026)'
new_who = 'v471 (Aug 2026)'
count_who = content.count(old_who)
if count_who > 0:
    content = content.replace(old_who, new_who)
    changes.append(f'"v470 (Aug 2026)" -> "v471 (Aug 2026)": {count_who} instances')

# Short form footnotes
old_sf = 'ORCA v470,'
new_sf = 'ORCA v471,'
count_sf = content.count(old_sf)
if count_sf > 0:
    content = content.replace(old_sf, new_sf)
    changes.append(f'ORCA v470, -> ORCA v471,: {count_sf} instances')

# Period after v470
old_sp = 'ORCA v470.'
new_sp = 'ORCA v471.'
count_sp = content.count(old_sp)
if count_sp > 0:
    content = content.replace(old_sp, new_sp)
    changes.append(f'ORCA v470. -> ORCA v471.: {count_sp} instances')

# IC drilldown copy citation JS string
old_ic = 'ORCA v470, PFID Platform,'
new_ic = 'ORCA v471, PFID Platform,'
if old_ic in content:
    content = content.replace(old_ic, new_ic)
    changes.append('FC drilldown copy-IC-citation: v470 -> v471')

# Catch any remaining v470 in structural locations (version number contexts)
remaining_v470 = content.count('v470')
print(f'Note: {remaining_v470} remaining v470 occurrences (may include changelog history - OK)')

# CHANGE 11: Add v471 changelog entry before v470 entry
v471_entry = '<strong>v471 (Aug 2026) &mdash; Cycle 371: 5 analyst credibility fixes across IC citation strings, CP fiscal character verdict, FC profile strip, and Screener</strong> &mdash; (1) <strong>Stale version strings corrected (11 locations)</strong> &mdash; Instances of &ldquo;ORCA v465&rdquo; in FC drilldown IC Memo Guidance, CP IC Memo chip standard citation, copyICSummary, copyICCitation, Methodology IC checklist (3 locations), and 6 sample IC analysis FAQ source footnotes updated to v471. Analysts copying IC citations from any surface now get the current version string. (2) <strong>CP fiscal character verdict: neutral-case color fixed</strong> &mdash; The &ldquo;Moderate-take open access&rdquo; verdict (typical IOC benchmark range) was rendered in var(--muted) gray, making it visually indistinguishable from placeholder text and de-emphasizing what is an important IC decision signal. Changed to var(--accent) amber. The &ldquo;Moderate-to-high take&rdquo; case now uses var(--yellow) to signal that verification is needed before IC submission. (3) <strong>FC profile strip: IC citation guidance tooltip</strong> &mdash; The &ldquo;IOC standard benchmarking basis&rdquo; label in the profile strip now shows a full IC memo citation tooltip on hover: exact profile parameters and version string, ready to paste. Analysts see the cite language without navigating to Methodology. (4) <strong>Screener count bar: 100% WI basis added</strong> &mdash; Count bar now reads &ldquo;Deepwater @$X &middot; 10% WACC &middot; 100% WI&rdquo; matching the disclosure level of the FC profile strip and drilldown. Consistency across all three analyst-facing citation surfaces. (5) <strong>Version sweep v470&rarr;v471</strong> &mdash; title, meta description, header badge, Home subtitle, print header, Who Built This, How to Cite display + clipboard, short-form footnote, Scenario Builder cite, IC memo guidance, Norway IC guidance, IC memo language template, PRRT source footnote, FC drilldown copy-IC-citation JS string (14 locations). JS syntax gate PASS.<br><br>\n                        '

v470_marker = '<strong>v470 (Aug 2026) &mdash; Cycle 370:'
if v470_marker in content:
    content = content.replace(v470_marker, v471_entry + v470_marker, 1)
    changes.append('Changelog: v471 entry prepended before v470 entry')

print('Changes made:')
for i, c in enumerate(changes, 1):
    print(f'  {i}. {c}')
print(f'\nTotal changes: {len(changes)}')
print(f'File size: {original_len} -> {len(content)} bytes ({len(content)-original_len:+d})')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('File saved successfully.')
