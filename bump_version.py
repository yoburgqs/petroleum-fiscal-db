with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
changes = []

def replace_count(text, old, new):
    count = text.count(old)
    if count > 0:
        changes.append(f'  {count}x: {old[:60]} -> {new[:60]}')
        return text.replace(old, new)
    else:
        changes.append(f'  NOT FOUND: {old[:60]}')
        return text

# === Version bump v185 -> v186 ===
# Only bump in non-changelog areas (current version badge, title, meta, print header, footer, methodology provenance, How to Cite)
# We must NOT change historical changelog entries: <strong>v185 (Aug 2026)</strong>
# Strategy: change v185 everywhere EXCEPT in "<strong>v185 (Aug 2026)</strong>"
# The changelog line for v185 starts with <strong>v185 (Aug 2026)</strong>

# Targeted replacements (not bulk replace)
# 1. title tag
content = replace_count(content, '<title>ORCA — Petroleum Fiscal Intelligence Platform | 71,576 Contracts, 185 Countries | v185</title>',
                        '<title>ORCA — Petroleum Fiscal Intelligence Platform | 71,576 Contracts, 185 Countries | v186</title>')

# 2. meta description
content = replace_count(content, 'Built for IOC economists and upstream analysts. v185.',
                        'Built for IOC economists and upstream analysts. v186.')

# 3. header badge
content = replace_count(content, '>v185</span>', '>v186</span>')

# 4. print header meta
content = replace_count(content, 'petroleum-fiscal-db · v185 · Exported',
                        'petroleum-fiscal-db · v186 · Exported')

# 5. Methodology provenance (first non-changelog occurrence)
content = replace_count(content, 'Platform v185 · 185 countries · 71,576 contracts · 330,329 fiscal facts.',
                        'Platform v186 · 185 countries · 71,576 contracts · 330,329 fiscal facts.')

# 6. How to Cite short-form
content = replace_count(content, 'ORCA v185 (Aug 2026), yoburgqs.github.io/petroleum-fiscal-db/',
                        'ORCA v186 (Aug 2026), yoburgqs.github.io/petroleum-fiscal-db/')

# 7. How to Cite full
content = replace_count(content, '[v185, Aug 2026]. Retrieved from',
                        '[v186, Aug 2026]. Retrieved from')

# 8. DCF Engine footer badge (already updated from v184->v185 earlier)
content = replace_count(content, 'DCF Engine v185</span>', 'DCF Engine v186</span>')

# 9. DB date in footer
# Already updated to 2026-08-13 earlier

# 10. Source: ORCA v185 in A92 and A93 FAQ body (current FAQs should cite current version)
content = replace_count(content, 'Source:</strong> ORCA v185 (Aug 2026). See also FAQ A37 (IC capital allocation',
                        'Source:</strong> ORCA v186 (Aug 2026). See also FAQ A37 (IC capital allocation')
content = replace_count(content, 'Source:</strong> ORCA v185 (Aug 2026). See also FAQ A36',
                        'Source:</strong> ORCA v186 (Aug 2026). See also FAQ A36')

# Also update the IC memo language in A92 that cites v185 (we just updated from v184->v185, now bump to v186)
# A92 IC memo: "ORCA v185, standardized Deepwater profile, new-entry basis"
content = replace_count(content, '(ORCA v185, standardized Deepwater profile, new-entry basis)',
                        '(ORCA v186, standardized Deepwater profile, new-entry basis)')

# === Update changelog ===
# The current v185 changelog needs to be updated to reflect what we did THIS cycle (Cycle 137)
# v186 changelog = new entry; v185 = what Cycle 136 shipped

OLD_V185_CHANGELOG = '<strong>v185 (Aug 2026)</strong> &mdash; 2 targeted improvements across 2 categories (Cycle 136):'
NEW_V186_CHANGELOG = '''<strong>v186 (Aug 2026)</strong> &mdash; 5 targeted improvements across 3 categories (Cycle 137): (1) <strong>Naming Consistency</strong> &mdash; 21 stale v184 IC memo template citations corrected to v185 across FAQ bodies A59&ndash;A92, How to Cite section, Fiscal Compare Excel export note, XLSX citation metadata, and DCF Engine footer badge (missed in v184&rarr;v185 sweep); (2) <strong>Data Reliability / SDLC</strong> &mdash; footer dates and Methodology DB date corrected to 2026-08-13 (stale 2026-08-10/2026-08-12); (3) <strong>Professional Credibility</strong> &mdash; A93 FAQ added: &ldquo;ORCA shows a Price Swing figure for each country. What exactly does it measure, how do I interpret it for IC analysis, and what swing threshold should trigger a flag in a capital allocation recommendation?&rdquo; &mdash; what Swing measures (Govt Take @$100 &minus; @$50 on standardized reference project); 3 Swing tiers (flat &lt;8pp / moderate 8&ndash;20pp / progressive &gt;20pp); regime drivers (R-factor PSC, PRRT, sliding-scale royalty vs. flat concession); 4-step IC workflow (FC at $75, FC at $50 for high-Swing, Scenario Builder IRR spread, IC memo disclosure language); 4-tier rule of thumb by Swing threshold (&lt;8pp no adjustment / 8&ndash;20pp disclose range / &gt;20pp flag + re-run $50 / &gt;30pp present as range); cross-references to A36/A43/A47/A56/A72. FAQ count 92&rarr;93. Version v185&rarr;v186 across all locations.<br><br>
      <strong>v185 (Aug 2026)</strong> &mdash; 2 targeted improvements across 2 categories (Cycle 136):'''

content = replace_count(content, OLD_V185_CHANGELOG, NEW_V186_CHANGELOG)

print(f'Changes made:')
for c in changes:
    print(c)
print(f'Len change: {len(content) - original_len}')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('File written.')
