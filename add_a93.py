import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

A93_FAQ = '''    <!-- A93 -->
    <details id="faq-a93" style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;">
      <summary><strong>A93.</strong> ORCA shows a Price Swing figure for each country. What exactly does it measure, how do I interpret it for IC analysis, and what swing threshold should trigger a flag in a capital allocation recommendation?</summary>
      <div style="padding:10px 0 0 16px;color:var(--muted);font-size:13px;line-height:1.7;">
        <p><strong style="color:var(--text);">Short answer: Price Swing measures the percentage-point change in government take between $50/bbl and $100/bbl using the platform&rsquo;s standardized reference project. A high swing means the regime is structurally progressive &mdash; the government captures a larger share of contractor upside at high prices. For IC analysis, Swing &gt;20pp signals a regime where your $75/bbl base-case IRR substantially overstates contractor returns in a $50/bbl downside scenario. Swing &lt;8pp signals a flat regime where the contractor bears price risk symmetrically.</strong></p>
        <p><strong style="color:var(--text);">What Price Swing measures:</strong> Swing = Govt Take @$100/bbl &minus; Govt Take @$50/bbl (both computed on the same standardized reference project). A 25pp swing means that at $50/bbl the government takes 50% and at $100/bbl the government takes 75% &mdash; the government&rsquo;s share rises 25pp as the price doubles. Progressive regimes are often designed this way deliberately (R-factor PSCs, PRRT, sliding-scale royalties). The question for IC analysis is whether the base-case IRR is being computed at the correct price and whether the price sensitivity is adequately disclosed.</p>
        <p><strong style="color:var(--text);">What drives high vs. low Price Swing:</strong></p>
        <ul style="margin:4px 0;padding-left:20px;">
          <li style="margin-bottom:4px;"><strong>High Swing (&gt;20pp) &mdash; progressive regimes:</strong> R-factor PSCs (Angola, Nigeria OPL, Azerbaijan ACG-type) where profit-oil tiers accelerate at higher cumulative receipts; PRRT/resource rent tax regimes (Australia, Papua New Guinea) where the RRT threshold activates above a return hurdle; sliding-scale royalties (USA GoM, Canada, Norway SPT). These regimes capture commodity upside for the state &mdash; the contractor participates in price upside at a declining share.</li>
          <li style="margin-bottom:4px;"><strong>Low Swing (&lt;8pp) &mdash; flat/neutral regimes:</strong> Simple royalty-plus-CIT concessions with flat rate royalty and a standard CIT rate (many African onshore concessions, Central/Eastern European concessions, small frontier producers). In these regimes, the government share is largely fixed regardless of price. The contractor captures most of the price upside (and downside).</li>
          <li style="margin-bottom:4px;"><strong>Moderate Swing (8&ndash;20pp) &mdash; mildly progressive:</strong> Standard PSCs without R-factor (flat profit-oil split), mild sliding-scale royalties, or concessions with windfall provisions. These regimes offer a middle path &mdash; meaningful contractor upside participation without the extreme fiscal drag of PRRT or R-factor regimes at $100+/bbl.</li>
        </ul>
        <p><strong style="color:var(--text);">4-step IC workflow using Price Swing:</strong></p>
        <ol style="margin:4px 0;padding-left:20px;">
          <li style="margin-bottom:4px;"><strong>Run Fiscal Compare at $75/bbl and note the Swing column.</strong> Flag any country with Swing &gt;20pp for step 2. Countries with Swing &lt;8pp pass through without adjustment &mdash; the $75/bbl take figure is representative across a wide price range.</li>
          <li style="margin-bottom:4px;"><strong>For high-Swing countries (&gt;20pp): run Fiscal Compare at $50/bbl to stress-test the downside.</strong> A country that ranks 8th at $75/bbl may rank 20th at $50/bbl if it has high Swing. Use the Fiscal Compare 4-Price Export (XLSX) to see the full ranking at $50, $75, $100, and $125 simultaneously &mdash; the quickest way to identify which countries&rsquo; IC rankings are price-deck-dependent.</li>
          <li style="margin-bottom:4px;"><strong>Use Scenario Builder to isolate the Swing driver.</strong> Select the high-Swing country in Scenario Builder &rarr; run at $50/bbl and $100/bbl &rarr; compare IRRs. A 10% IRR at $75 that drops to 4% at $50 and rises to 18% at $100 signals a regime with high price beta &mdash; volatile but potentially lucrative at high oil prices.</li>
          <li style="margin-bottom:4px;"><strong>Disclose Swing explicitly in the IC memo.</strong> Standard language: &ldquo;Government take of [X]% at $75/bbl (ORCA v185, standardized Deepwater profile). Price Swing of [Y]pp indicates a [progressive/flat/mildly progressive] fiscal regime: take ranges from [X-Y/2]% at $50/bbl to [X+Y/2]% at $100/bbl. Base-case IRR of [Z]% at $75/bbl declines to [Z-N]% at $50/bbl per Scenario Builder sensitivity. Contractor economics are [strongly/modestly/minimally] exposed to oil price risk relative to a flat-royalty benchmark.&rdquo;</li>
        </ol>
        <p><strong style="color:var(--text);">Rule of thumb &mdash; Swing thresholds for IC flagging:</strong></p>
        <ul style="margin:4px 0;padding-left:20px;">
          <li style="margin-bottom:4px;"><strong>Swing &lt;8pp (flat):</strong> No IC adjustment required. The $75/bbl take figure is representative across $50&ndash;$100/bbl. Examples: Central/Eastern European concessions (Estonia 29.7%, Lithuania 28.4%). The contractor bears price risk symmetrically.</li>
          <li style="margin-bottom:4px;"><strong>Swing 8&ndash;20pp (moderate):</strong> Disclose the range in the IC memo. Run the $50/bbl downside in Scenario Builder. The ranking shift at $50 vs. $75 is typically 2&ndash;5 positions in a 10-country shortlist &mdash; meaningful but not disqualifying. Examples: standard West Africa PSC (Angola 52.7% at $75, ~65% at $100).</li>
          <li style="margin-bottom:4px;"><strong>Swing &gt;20pp (highly progressive):</strong> Flag explicitly. Re-run Fiscal Compare at $50/bbl. Present both the $75 and $50 rankings in the IC appendix. High-Swing regimes (Australia PRRT, Norway SPT, USA GoM sliding royalty) require separate downside scenario analysis. At $50/bbl, a highly progressive regime can see IRR fall by 5&ndash;10pp relative to the $75 base case &mdash; enough to flip a marginal IC decision.</li>
          <li style="margin-bottom:4px;"><strong>Swing &gt;30pp (extreme):</strong> The $75/bbl take figure is unreliable as a sole IC metric. Present as a range: &ldquo;Government take: [X]% at $50/bbl to [X+30]% at $100/bbl.&rdquo; Consider whether the contractor has sufficient price upside under the regime to justify FID risk. Common in PRRT-heavy regimes at high-production-cost fields.</li>
        </ul>
        <p><strong style="color:var(--text);">Source:</strong> ORCA v185 (Aug 2026). See also FAQ A36 (energy transition fiscal risk &mdash; Swing as transition signal), FAQ A43 (windfall profit tax modeling), FAQ A47 (R-factor mechanics and price sensitivity amplification), FAQ A56 ($50/bbl demand-shock stress test), FAQ A72 (4-signal tiebreaker: Price Swing/IRR/Breakeven/Stability Score).</p>
      </div>
    </details>

'''

ANCHOR = '    </details>\n\n    <div style="text-align:right;margin-top:16px;padding-top:10px;border-top:1px solid rgba(71,85,105,.2);">\n      <a href="#tab-btn-tmeth"'
REPLACEMENT = A93_FAQ + '    <div style="text-align:right;margin-top:16px;padding-top:10px;border-top:1px solid rgba(71,85,105,.2);">\n      <a href="#tab-btn-tmeth"'

if ANCHOR in content:
    content = content.replace(ANCHOR, REPLACEMENT, 1)
    print('A93 FAQ inserted successfully')
else:
    print('ERROR: anchor not found')
    sys.exit(1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('File written.')
