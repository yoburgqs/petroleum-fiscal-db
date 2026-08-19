#!/usr/bin/env python3
"""Update What's New panel: add v356 card, demote v355, remove v351."""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File length: {len(content)}")

# The old v356 card (was v355 LATEST, renamed by global replace)
old_v356_card = (
    '          <div style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:10px 12px;">\n'
    '            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">\n'
    '              <div style="font-size:11px;font-weight:700;color:var(--accent);"><strong>v356 (Aug 2026)</strong> &mdash; '
    '<span style="background:var(--accent);color:#fff;font-size:10px;font-weight:700;border-radius:3px;padding:1px 6px;'
    'vertical-align:middle;">LATEST</span></div>\n'
    '            </div>\n'
    '            <div style="font-size:11px;color:var(--muted);line-height:1.55;">'
    '10 new IC analyst FAQs (A461&ndash;A470):'
)

print(f"Searching for old v356 card start...")
idx = content.find(old_v356_card)
print(f"Found at index: {idx}")

if idx == -1:
    # Try just the LATEST badge in v356 context
    search = '<strong>v356 (Aug 2026)</strong> &mdash; <span style="background:var(--accent);color:#fff;font-size:10px;font-weight:700;border-radius:3px;padding:1px 6px;vertical-align:middle;">LATEST</span>'
    idx2 = content.find(search)
    print(f"LATEST badge found at: {idx2}")
    if idx2 > 0:
        # Find the enclosing card div
        start = content.rfind('          <div style="background:var(--surface)', 0, idx2)
        end = content.find('          </div>\n          <div style="background:var(--surface)', idx2)
        if end == -1:
            end = content.find('          </div>\n        </div>\n      <div style="margin-top:8px', idx2)
        print(f"Card from {start} to {end}")
        card_content = content[start:end + len('          </div>')]
        print(f"Card content (first 200): {card_content[:200]}")
else:
    print("Found old v356 card")

PYEOF