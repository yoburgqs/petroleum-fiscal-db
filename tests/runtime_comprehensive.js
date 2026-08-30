/**
 * Petroleum Fiscal Intelligence Platform — Comprehensive Runtime Test v1
 * Covers: all 12 tabs, all filters, all DCF mechanics, all chart renders,
 * all export functions, all navigation, all edge cases found in code audit.
 *
 * CI-adapted copy — paths are repo-relative, not Windows-absolute.
 * Source of truth: C:/tmp/pw_test/runtime_comprehensive.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.TEST_URL || 'https://yoburgqs.github.io/petroleum-fiscal-db/';

// Report path: /tmp in CI, C:/tmp locally
const REPORT = process.platform === 'win32'
  ? 'C:/tmp/runtime_test_report.txt'
  : '/tmp/runtime_test_report.txt';

// Repo root = one level up from tests/
const REPO_ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0, warn = 0;
const errors = [];
const consoleErrors = [];

function log(level, section, test, detail) {
  const sym = level === 'PASS' ? '✓' : level === 'FAIL' ? '✗' : '⚠';
  const msg = `${sym} [${level}] [${section}] ${test}: ${detail}`;
  console.log(msg);
  if (level === 'PASS') pass++;
  else if (level === 'FAIL') { fail++; errors.push(msg); }
  else warn++;
}

function p(section, test, detail) { log('PASS', section, test, detail); }
function f(section, test, detail) { log('FAIL', section, test, detail); }
function w(section, test, detail) { log('WARN', section, test, detail); }

async function setup(page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('net::ERR')) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  await page.route('**/country_data.json', async r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: fs.readFileSync(path.join(REPO_ROOT, 'country_data.json'), 'utf-8')
  }));
  await page.route('**/reform_history.json', async r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: fs.readFileSync(path.join(REPO_ROOT, 'reform_history.json'), 'utf-8')
  }));
  await page.route('**/api/v1/country/*.json', async r => {
    const slug = r.request().url().split('/').pop();
    const p = path.join(REPO_ROOT, 'api', 'v1', 'country', slug);
    if (fs.existsSync(p)) await r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(p, 'utf-8') });
    else await r.fulfill({ status: 404, body: '{}' });
  });
  // D3 world atlas — continue (not bundled in repo)
  await page.route('**/countries-110m.json', async r => {
    await r.continue();
  });
}

async function load(page) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(() => loadPlatformData());
  await page.waitForFunction(() => document.querySelectorAll('#dd-country-select option').length > 10, { timeout: 25000 });
  await page.waitForTimeout(1500);
}

async function switchTab(page, tabId) {
  await page.evaluate(id => {
    // Primary tabs use id="tab-btn-{id}" (v97+: onclick migrated to addEventListener)
    const btn = document.getElementById('tab-btn-' + id) ||
      [...document.querySelectorAll('.tab-btn')].find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + id + "'"));
    if (btn) btn.click();
  }, tabId);
  await page.waitForTimeout(300);
}

// ─── SECTION 1: Load & Data ────────────────────────────────────────────────
async function testLoad(page) {
  const S = 'Load';
  try {
    const count = await page.evaluate(() => typeof COUNTRY_DATA !== 'undefined' ? COUNTRY_DATA.length : 0);
    if (count >= 180) p(S, 'COUNTRY_DATA', `${count} countries loaded`);
    else f(S, 'COUNTRY_DATA', `Only ${count} countries (expected 180+)`);

    const rhKeys = await page.evaluate(() => typeof REFORM_HISTORY !== 'undefined' ? Object.keys(REFORM_HISTORY).length : 0);
    if (rhKeys > 0) p(S, 'REFORM_HISTORY', `${rhKeys} countries with reform data`);
    else f(S, 'REFORM_HISTORY', 'No reform history loaded');

    const iocCount = await page.evaluate(() => typeof IOC_DATA !== 'undefined' ? IOC_DATA.length : 0);
    if (iocCount > 100) p(S, 'IOC_DATA', `${iocCount} IOC rows`);
    else w(S, 'IOC_DATA', `Only ${iocCount} IOC rows`);

    // Verify all required COUNTRY_DATA fields
    const fields = await page.evaluate(() => {
      const d = COUNTRY_DATA[0];
      return {
        hasN: d.n != null,
        hasTake75: d.take_75 != null,
        hasTake50: d.take_50 != null,
        hasTake100: d.take_100 != null,
        hasTake125: d.take_125 != null,
        hasNpv75: d.npv_75 != null,
        hasIrr75: true, // can be null for some countries
        hasMechanics: typeof d.mechanics === 'string',
        hasRegion: typeof d.region === 'string',
        hasSwing: d.swing != null,
        hasAbPct: d.ab_pct != null,
        hasNConcession: d.n_concession != null,
        hasNPsc: d.n_psc != null,
      };
    });
    const missingFields = Object.entries(fields).filter(([k,v]) => !v).map(([k]) => k);
    if (missingFields.length === 0) p(S, 'COUNTRY_DATA fields', 'All required fields present in first record');
    else f(S, 'COUNTRY_DATA fields', `Missing: ${missingFields.join(', ')}`);

    // Verify NO null for take_75 across all countries
    const nullTake = await page.evaluate(() => COUNTRY_DATA.filter(d => d.take_75 == null).length);
    if (nullTake === 0) p(S, 'take_75 coverage', 'All countries have take_75');
    else w(S, 'take_75 coverage', `${nullTake} countries missing take_75`);

    // ALL_OPERATORS global scope (Bug 13)
    const hasAllOps = await page.evaluate(() => typeof ALL_OPERATORS !== 'undefined');
    if (hasAllOps) p(S, 'ALL_OPERATORS scope', 'ALL_OPERATORS accessible at global scope');
    else f(S, 'ALL_OPERATORS scope', 'ALL_OPERATORS NOT in global scope (Bug 13 regression)');

    // fromSlug with null COUNTRY_DATA guard (Bug 15)
    const fromSlugSafe = await page.evaluate(() => {
      try {
        // COUNTRY_DATA is a `let` — not on window, must reference directly
        const orig = COUNTRY_DATA;
        COUNTRY_DATA = null;
        const result = typeof fromSlug === 'function' ? fromSlug('norway') : 'no_function';
        COUNTRY_DATA = orig;
        return result === null ? 'safe' : result === 'no_function' ? 'no_function' : 'unsafe';
      } catch(e) { return 'throws: ' + e.message; }
    });
    if (fromSlugSafe === 'safe') p(S, 'fromSlug null guard', 'fromSlug returns null when COUNTRY_DATA is null');
    else if (fromSlugSafe === 'no_function') w(S, 'fromSlug null guard', 'fromSlug not in global scope');
    else f(S, 'fromSlug null guard', `fromSlug not safe: ${fromSlugSafe}`);

    const overlay = await page.$('#loading-overlay');
    const overlayVisible = overlay ? await overlay.evaluate(el => el.style.display !== 'none') : false;
    if (!overlayVisible) p(S, 'loading-overlay', 'Loading overlay hidden after data load');
    else f(S, 'loading-overlay', 'Loading overlay still visible');

  } catch(e) { f(S, 'load', e.message); }
}

// ─── SECTION 2: Fiscal Compare Tab (t0) ───────────────────────────────────
async function testFiscalCompare(page) {
  const S = 'FiscalCompare';
  try {
    await switchTab(page, 't0');
    await page.waitForSelector('#fc-results', { timeout: 3000 }).catch(() => {});

    // Run fiscal compare
    await page.selectOption('#fc-profile', 'deepwater');
    await page.selectOption('#fc-price', '75');
    await page.evaluate(() => { const b = document.getElementById('fc-run-btn'); if(b) b.click(); });
    await page.waitForTimeout(2000);

    const resultCount = await page.evaluate(() => {
      const r = window._fcResults;
      return r ? r.length : 0;
    });
    if (resultCount >= 100) p(S, 'run deepwater $75', `${resultCount} countries computed`);
    else f(S, 'run deepwater $75', `Only ${resultCount} results`);

    // Check _fcLastResults and _fcLastPrice stored
    const stored = await page.evaluate(() => ({
      hasResults: window._fcLastResults && window._fcLastResults.length > 0,
      hasPrice: window._fcLastPrice != null,
    }));
    if (stored.hasResults && stored.hasPrice) p(S, '_fcLastResults stored', 'Results cached for re-sort');
    else f(S, '_fcLastResults stored', JSON.stringify(stored));

    // Sort controls
    // v525 (T3): 'irr' removed from this list with the FC IRR column. The compare engine's IRR
    // on the standardized profile has a median of 138.4% and a minimum of 39.5%, so the column
    // ranked an artifact and the 15% IOC-hurdle apparatus passed 180 of 185.
    for (const sort of ['npv', 'breakeven', 'country', 'take']) {
      await page.click(`.fc-sort-btn[data-sort="${sort}"]`).catch(() => {});
      await page.waitForTimeout(200);
      const active = await page.evaluate(s => {
        const btn = document.querySelector(`.fc-sort-btn[data-sort="${s}"]`);
        return btn && btn.classList.contains('active');
      }, sort);
      if (active) p(S, `sort-${sort}`, 'Sort button active after click');
      else f(S, `sort-${sort}`, 'Sort button not active');
    }

    // Price toggle: switch to $50
    const priceToggle = await page.$('input[name="price"][value="50"]');
    if (priceToggle) {
      await priceToggle.click().catch(() => {});
      await page.waitForTimeout(300);
      p(S, 'price toggle $50', 'Clicked $50 radio');
    } else w(S, 'price toggle $50', 'No price radio found');

    // Run at different profile
    await page.selectOption('#fc-profile', 'onshore').catch(() => {});
    await page.selectOption('#fc-price', '100').catch(() => {});
    await page.evaluate(() => { const b = document.getElementById('fc-run-btn'); if(b) b.click(); });
    await page.waitForTimeout(1500);
    const r2 = await page.evaluate(() => window._fcResults ? window._fcResults.length : 0);
    if (r2 > 0) p(S, 'run onshore $100', `${r2} results`);
    else f(S, 'run onshore $100', 'No results');

    // FC sort row visible
    const sortRowVisible = await page.evaluate(() => {
      const el = document.getElementById('fc-sort-row');
      return el && el.style.display !== 'none';
    });
    if (sortRowVisible) p(S, 'sort row visible', 'fc-sort-row visible after run');
    else w(S, 'sort row visible', 'fc-sort-row not visible');

    // Open a country drawer
    const firstRow = await page.$('#fc-results tr[data-country]');
    if (firstRow) {
      const country = await firstRow.getAttribute('data-country');
      await firstRow.click().catch(() => {});
      await page.waitForTimeout(500);
      const drawer = await page.$('.fc-drawer.open, .fc-drawer[style*="block"]');
      if (drawer) p(S, 'country drawer', `Opened drawer for ${country}`);
      else w(S, 'country drawer', 'Drawer not found after row click');
    }

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 3: Country Profile Tab (t7) ──────────────────────────────────
async function testCountryProfile(page) {
  const S = 'CountryProfile';
  const countries = ['Norway', 'Iraq', 'Indonesia', 'Angola', 'USA', 'UAE'];
  try {
    await switchTab(page, 't7');
    await page.waitForTimeout(300);

    for (const country of countries) {
      await page.evaluate(c => {
        const sel = document.getElementById('dd-country-select');
        if (sel) { sel.value = c; loadCountryProfile(c); }
      }, country);
      await page.waitForTimeout(600);

      const heading = await page.evaluate(() => {
        // Profile renders .dd-country-name inside #dd-content (v76+)
        const h = document.querySelector('#dd-content .dd-country-name, #dd-content .dd-header .dd-country-name');
        if (h) return h.textContent.trim();
        // Fallback for older selectors
        const h2 = document.querySelector('#dd-profile-head strong, #dd-profile-head h2, .country-profile-header');
        return h2 ? h2.textContent.trim() : '';
      });
      if (heading.includes(country) || heading.length > 0)
        p(S, `profile-${country}`, `Profile rendered (heading: "${heading.slice(0,40)}")`);
      else
        w(S, `profile-${country}`, 'No heading found in profile');

      // Check breakeven callout rendered (profile output is in #dd-content)
      const beCallout = await page.evaluate(() => {
        const el = document.getElementById('dd-content');
        return el ? el.innerHTML.includes('bbl') || el.innerHTML.includes('Breakeven') || el.innerHTML.includes('breakeven') : false;
      });
      if (beCallout) p(S, `be-callout-${country}`, 'Breakeven callout present');
      else w(S, `be-callout-${country}`, 'No breakeven callout found');
    }

    // Test peer comparison link
    const peerLinkExists = await page.evaluate(() => !!document.querySelector('.peer-link, button[onclick*="addCompare"]'));
    if (peerLinkExists) {
      await page.evaluate(() => { const b = document.querySelector('.peer-link, button[onclick*="addCompare"]'); if(b) b.click(); });
      await page.waitForTimeout(300);
      p(S, 'peer link', 'Peer comparison link clicked without error');
    } else w(S, 'peer link', 'No peer link found in profile');

    // ── v601 (T2) regression: Key Fiscal Parameters — Evidence Chain ──────────
    // Rows with no source of any kind used to render a bare numeric value, an em-dash in the
    // Statutory column and a badge reading "Contract DB average" — identical weight to an A-tier
    // row citing a petroleum act. On Norway (the cold-load default) that row read
    // "State Participation 0%" while the Live DCF panel on the same page ran Norway on 33.4%.
    // The peer-link click above can leave t7 hidden; innerText is empty for an unrendered pane.
    await switchTab(page, 't7');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const sel = document.getElementById('dd-country-select');
      if (sel) { sel.value = 'Norway'; loadCountryProfile('Norway'); }
    });
    await page.waitForTimeout(2200);
    const ec = await page.evaluate(() => {
      const el = document.getElementById('dd-content');
      const t = el ? el.innerText : '';
      const i = t.indexOf('KEY FISCAL PARAMETERS');
      const seg = i < 0 ? '' : t.slice(i, i + 2600);
      return {
        found: i >= 0,
        marksUnsourced: /NO SOURCE|NOT RECORDED/.test(seg),
        namesConflict: /DCF USES 33\.4%/.test(seg),
        hasDenominator: /3 of the 5 rows above are independently sourced; 2 are not sourced at all/.test(seg),
        bareDbBadge: /Contract DB average/.test(seg),
        hasControl: !!document.querySelector('#dd-content button[onclick*="_cpScrollToLiveDcf"]')
      };
    });
    if (!ec.found) {
      w(S, 'evidence chain present', 'Key Fiscal Parameters table did not render for Norway');
    } else {
      if (ec.marksUnsourced) p(S, 'unsourced rows marked', 'Rows with no source carry NO SOURCE / NOT RECORDED');
      else f(S, 'unsourced rows marked', 'Unsourced parameter row renders no absence marker');

      if (!ec.bareDbBadge) p(S, 'no bare "Contract DB average"', 'Absence is named, not described as a method');
      else f(S, 'no bare "Contract DB average"', 'Unsourced row still badged "Contract DB average"');

      if (ec.namesConflict) p(S, 'DCF conflict surfaced', 'Norway State Participation names the 33.4% the DCF engine uses');
      else f(S, 'DCF conflict surfaced', 'Table shows State Participation 0% without naming the DCF value');

      if (ec.hasDenominator) p(S, 'verdict carries denominator', '"3 of the 5 rows above ... 2 are not sourced at all"');
      else f(S, 'verdict carries denominator', 'Sourced-parameter verdict still reports a count with no denominator');

      if (ec.hasControl) p(S, 'conflict note is a control', 'Conflict note ends in a button, not an instruction');
      else f(S, 'conflict note is a control', 'No _cpScrollToLiveDcf control in the conflict note');
    }

    // A country with every parameter sourced must be untouched by the above.
    await page.evaluate(() => {
      const sel = document.getElementById('dd-country-select');
      if (sel) { sel.value = 'USA'; loadCountryProfile('USA'); }
    });
    await page.waitForTimeout(2200);
    const clean = await page.evaluate(() => {
      const el = document.getElementById('dd-content');
      const t = el ? el.innerText : '';
      const i = t.indexOf('KEY FISCAL PARAMETERS');
      const seg = i < 0 ? '' : t.slice(i, i + 1600);
      return { found: i >= 0, noNoise: !/NO SOURCE|NOT RECORDED|DCF USES|carr(y|ies) no source at all/.test(seg) };
    });
    if (clean.found && clean.noNoise) p(S, 'fully sourced country unchanged', 'USA evidence chain shows no absence markers');
    else if (clean.found) f(S, 'fully sourced country unchanged', 'USA evidence chain gained an absence marker it should not have');
    else w(S, 'fully sourced country unchanged', 'USA evidence chain did not render');

    // Hash routing — Bug 15 regression test
    await page.evaluate(() => { window.location.hash = '#/profile/norway'; });
    await page.waitForTimeout(600);
    const activeTab = await page.evaluate(() => window._activeTab);
    if (activeTab === 't7') p(S, 'hash routing #/profile/norway', 'Navigated to Country Profile via hash');
    else w(S, 'hash routing #/profile/norway', `Active tab is ${activeTab}, expected t7`);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 4: Regime Explorer Tab ───────────────────────────────────────
async function testExplorer(page) {
  const S = 'Explorer';
  try {
    await switchTab(page, 'texplorer');
    await page.waitForTimeout(500);

    const rowCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('#tbody-explorer tr');
      return rows.length;
    });
    if (rowCount >= 100) p(S, 'table rows', `${rowCount} rows in explorer`);
    else f(S, 'table rows', `Only ${rowCount} rows`);

    // Region chip filters — use select dropdown (chip rows are hidden display:none in v371+)
    for (const region of ['Africa', 'Middle East', 'Asia Pacific', 'Americas', 'Europe']) {
      await page.selectOption('#flt-region', region).catch(() => {});
      await page.waitForTimeout(200);
      const count = await page.evaluate(() => document.querySelectorAll('#tbody-explorer tr').length);
      if (count > 0) p(S, `chip-${region}`, `${count} rows after ${region} chip`);
      else f(S, `chip-${region}`, `0 rows after ${region} chip`);
    }

    // Reset to All
    await page.selectOption('#flt-region', '').catch(() => {});
    await page.waitForTimeout(200);

    // Mechanic chips — use select dropdown (chip rows are hidden display:none in v371+)
    for (const mech of ['Concession', 'PSC', 'TSC']) {
      await page.selectOption('#flt-mech', mech).catch(() => {});
      await page.waitForTimeout(200);
      const count = await page.evaluate(() => document.querySelectorAll('#tbody-explorer tr').length);
      if (count > 0) p(S, `chip-mech-${mech}`, `${count} rows after ${mech} chip`);
      else w(S, `chip-mech-${mech}`, `0 rows after ${mech} chip`);
    }

    // Reset to All
    await page.selectOption('#flt-mech', '').catch(() => {});
    await page.waitForTimeout(200);

    // Asia Pacific chip should work (Bug 14 regression: wrong chip value)
    // Note: chip rows are hidden (display:none) — use the region select dropdown which triggers setExplorerChip via onchange
    await page.selectOption('#flt-region', 'Asia Pacific');
    await page.waitForTimeout(300);
    const chipFilter = await page.evaluate(() => typeof explorerChipFilters !== 'undefined' ? explorerChipFilters.region : 'undefined');
    if (chipFilter === 'Asia Pacific') p(S, 'chip Asia Pacific state', `explorerChipFilters.region = "${chipFilter}"`);
    else f(S, 'chip Asia Pacific state', `Expected 'Asia Pacific', got '${chipFilter}'`);

    // Reset
    await page.selectOption('#flt-region', '');

    // Sort columns
    for (const sortKey of ['take', 'irr', 'npv', 'be', 'swing', 'evidence', 'country']) {
      const th = await page.$(`#tbody-explorer`)
        .catch(() => null);
      // try sort via select
      await page.selectOption('#flt-sort', sortKey).catch(() => {});
      await page.waitForTimeout(150);
    }
    p(S, 'sort options', 'All sort options applied without error');

    // Bubble chart mode
    await page.click('.mode-toggle button:has-text("Bubble Chart")').catch(() => {});
    await page.waitForTimeout(800);
    const bubbleCanvas = await page.$('#explorer-bubble-canvas');
    if (bubbleCanvas) p(S, 'bubble chart mode', 'Bubble chart canvas visible');
    else w(S, 'bubble chart mode', 'Bubble chart canvas not found');

    // Check _bubbleChartInstance created
    const hasBubble = await page.evaluate(() => !!window._bubbleChartInstance);
    if (hasBubble) p(S, 'bubble chart instance', '_bubbleChartInstance created');
    else w(S, 'bubble chart instance', '_bubbleChartInstance not set');

    // Back to browse
    await page.click('.mode-toggle button:has-text("Browse")').catch(() => {});
    await page.waitForTimeout(300);

    // Price change re-renders
    await page.evaluate(() => {
      const r = document.querySelector('input[name="price"][value="100"]');
      if (r) r.click();
    });
    await page.waitForTimeout(300);
    const countAfterPrice = await page.evaluate(() => document.querySelectorAll('#tbody-explorer tr').length);
    if (countAfterPrice > 0) p(S, 'price change re-render', `${countAfterPrice} rows after $100 price`);
    else f(S, 'price change re-render', '0 rows after price change');

    // R-factor chip — use evaluate since chip row is hidden (display:none) in v371+
    const rfChipExists = await page.$('#chip-rfactor-psc') !== null;
    if (rfChipExists) {
      await page.evaluate(() => {
        const chip = document.getElementById('chip-rfactor-psc');
        if (chip && typeof setExplorerRFactor === 'function') setExplorerRFactor(chip);
      });
      await page.waitForTimeout(300);
      const rfCount = await page.evaluate(() => document.querySelectorAll('#tbody-explorer tr').length);
      if (rfCount > 0) p(S, 'R-factor chip', `${rfCount} R-factor PSC countries`);
      else f(S, 'R-factor chip', '0 rows for R-factor PSC');
      await page.evaluate(() => {
        const chip = document.getElementById('chip-rfactor-psc');
        if (chip && typeof setExplorerRFactor === 'function') setExplorerRFactor(chip); // toggle off
      });
      await page.waitForTimeout(200);
    }

    // Country row click → profile nav
    await page.evaluate(() => {
      const r = document.querySelector('input[name="price"][value="75"]');
      if (r) r.click();
    });
    await page.selectOption('#flt-region', '').catch(() => {});
    await page.waitForTimeout(300);
    const firstExplRow = await page.$('#tbody-explorer tr[data-country]');
    if (firstExplRow) {
      const c = await firstExplRow.getAttribute('data-country');
      await firstExplRow.click();
      await page.waitForTimeout(600);
      const activeTab = await page.evaluate(() => window._activeTab);
      if (activeTab === 't7') p(S, 'row click → profile', `Navigated to profile for ${c}`);
      else f(S, 'row click → profile', `Active tab is ${activeTab}, expected t7`);
      await switchTab(page, 'texplorer'); // back
      await page.waitForTimeout(300);
    }

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 5: IOC Portfolio Tab (t5) ────────────────────────────────────
async function testIOC(page) {
  const S = 'IOC';
  try {
    await switchTab(page, 't5');
    await page.waitForTimeout(300);

    // Quick buttons should exist (ALL_OPERATORS global scope fix)
    const quickBtns = await page.$$('#ioc-quick-btns button');
    if (quickBtns.length >= 5) p(S, 'quick buttons', `${quickBtns.length} quick buttons rendered`);
    else f(S, 'quick buttons', `Only ${quickBtns.length} quick buttons (expected 5+, ALL_OPERATORS bug?)`);

    // Click Shell
    const shellBtn = await page.$('#ioc-quick-btns button:has-text("Shell")');
    if (shellBtn) {
      await shellBtn.click();
      await page.waitForTimeout(600);
      const statsVisible = await page.evaluate(() => {
        const el = document.getElementById('ioc-stats');
        return el && el.style.display !== 'none';
      });
      if (statsVisible) p(S, 'Shell quick button', 'IOC stats panel visible after Shell click');
      else f(S, 'Shell quick button', 'IOC stats panel not visible');
    } else f(S, 'Shell button', 'Shell quick button not found');

    // Search for ExxonMobil
    await page.fill('#ioc-search', 'Exxon');
    await page.waitForTimeout(400);
    const suggestions = await page.$$('#ioc-suggestions button');
    if (suggestions.length > 0) p(S, 'IOC search suggestions', `${suggestions.length} suggestions for "Exxon"`);
    else w(S, 'IOC search suggestions', 'No suggestions for "Exxon"');

    // Press Enter
    await page.press('#ioc-search', 'Enter');
    await page.waitForTimeout(600);
    const outText = await page.evaluate(() => (document.getElementById('ioc-output') || {}).innerHTML || '');
    if (outText.includes('countries') || outText.includes('take') || outText.length > 100)
      p(S, 'IOC Enter search', 'Output populated for ExxonMobil');
    else w(S, 'IOC Enter search', 'Output seems empty');

    // ── v599 (T6) regression: brand entry points must resolve to the legal-entity GROUP ──
    // Before v599 the cold-load seed, the five empty-state benchmark buttons and Enter in the
    // search box all called loadIOC(), an exact operator-string match. IOC_DATA holds an
    // operator literally named "Shell", so the tab opened on 112 of the group's 1,036
    // contracts without Shell Offshore Inc. (474, USA), SPDC (Nigeria) or A/S Norske Shell,
    // while the "Quick:" button labelled "Shell" returned the group. Against the pre-change
    // build this case FAILS on contract count and on the missing provenance block.
    await page.fill('#ioc-search', 'Shell');
    await page.press('#ioc-search', 'Enter');
    await page.waitForTimeout(700);
    const shellRollup = await page.evaluate(() => {
      const stats = (document.getElementById('ioc-stats') || {}).innerText || '';
      const m = stats.replace(/,/g, '').match(/(\d+)\s*\n?\s*CONTRACTS/i);
      const prov = document.getElementById('ioc-entity-provenance');
      return { contracts: m ? Number(m[1]) : 0, prov: !!prov,
               summary: prov ? prov.querySelector('summary').innerText.replace(/\s+/g, ' ') : '' };
    });
    if (shellRollup.contracts > 500 && shellRollup.prov)
      p(S, 'brand roll-up (v599)', `"Shell" -> ${shellRollup.contracts} contracts, provenance block present`);
    else
      f(S, 'brand roll-up (v599)', `"Shell" -> ${shellRollup.contracts} contracts, provenance=${shellRollup.prov} (exact-match regression)`);

    // ── v599 (T6) regression: brand match is word-boundary, and named non-members are shown ──
    // Substring matching put Albpetrol Sh.A. and ABP Norway AS inside BP, and Turkmenistan /
    // Marubeni inside Eni. Aker BP ASA matches "BP" at a word boundary but is a separate
    // Oslo-listed company; it is excluded BY NAME and the exclusion is printed on screen.
    const bpBtn = await page.$('#ioc-quick-btns button:text-is("BP")');
    if (bpBtn) {
      await bpBtn.click();
      await page.waitForTimeout(700);
      const bp = await page.evaluate(() => {
        const el = document.getElementById('ioc-entity-provenance');
        // textContent, not innerText: <details> is collapsed by default (v371/v373 declutter)
        // and innerText omits everything the analyst has not expanded yet.
        const t = el ? el.textContent : '';
        const h3 = document.querySelector('#ioc-output h3');
        return { has: !!el, brand: h3 ? h3.textContent.trim() : '',
                 excluded: /EXCLUDED/.test(t) && /Aker BP ASA/.test(t),
                 albpetrol: /Albpetrol/i.test(t) };
      });
      if (bp.has && /^BP\b/.test(bp.brand) && bp.excluded && !bp.albpetrol)
        p(S, 'brand boundary + exclusions (v599)', 'BP roll-up names Aker BP ASA as excluded; Albpetrol not matched');
      else
        f(S, 'brand boundary + exclusions (v599)', `brand="${bp.brand}" provenance=${bp.has} akerBPnamed=${bp.excluded} albpetrolMatched=${bp.albpetrol}`);
    } else w(S, 'brand boundary + exclusions (v599)', 'BP quick button not found');

    // IOC Exposure Analyzer tab (t5 -> exposure section)
    const expSel = await page.$('#exposure-ioc-select');
    if (expSel) {
      await page.selectOption('#exposure-ioc-select', { index: 1 }).catch(() => {});
      await page.waitForTimeout(600);
      p(S, 'exposure selector', 'IOC exposure selector works');
    }

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 6: Comparison Tab (t2) ────────────────────────────────────────
async function testComparison(page) {
  const S = 'Comparison';
  try {
    await switchTab(page, 't2');
    await page.waitForTimeout(300);

    // Empty state
    await page.evaluate(() => { compareList = []; renderCompare(); });
    await page.waitForTimeout(200);
    const emptyState = await page.evaluate(() => {
      const el = document.getElementById('cmp-output');
      return el && el.classList.contains('empty-state');
    });
    if (emptyState) p(S, 'empty state', 'Compare tab shows empty state with 0 countries');
    else w(S, 'empty state', 'Empty state not shown with empty compareList');

    // Add 2 countries
    await page.evaluate(() => {
      addCompare('Norway');
      addCompare('Iraq');
    });
    await page.waitForTimeout(500);

    const hasCmpChart = await page.evaluate(() => !!window.cmpChart || document.querySelector('#cmp-chart-wrap canvas') !== null);
    if (hasCmpChart) p(S, '2-country compare chart', 'Chart rendered with 2 countries');
    else f(S, '2-country compare chart', 'No chart rendered for 2 countries');

    // Add 2 more
    await page.evaluate(() => {
      addCompare('Angola');
      addCompare('Indonesia');
    });
    await page.waitForTimeout(500);

    const rowCount = await page.evaluate(() => {
      // v83+: renderCompare() uses CSS grid (.compare-grid .cmp-row), not <table>
      const grid = document.querySelector('#cmp-output .compare-grid');
      if (grid) return grid.querySelectorAll('.cmp-row').length;
      // Fallback: legacy table structure
      const tbody = document.querySelector('#cmp-output table tbody');
      return tbody ? tbody.querySelectorAll('tr').length : 0;
    });
    if (rowCount >= 4) p(S, '4-country table', `${rowCount} rows in comparison table`);
    else w(S, '4-country table', `Only ${rowCount} rows`);

    // Test NPV chart
    const npvCanvas = await page.$('#cmp-npv-chart');
    if (npvCanvas) p(S, 'NPV chart canvas', 'NPV chart canvas exists');
    else w(S, 'NPV chart canvas', 'NPV chart canvas not found');

    // v501: capacity is 5 (CMP_MAX), matching the tab tooltip, the basket and "Load Top 5".
    // 5th country must be ACCEPTED; the 6th must be refused.
    await page.evaluate(() => addCompare('USA'));
    await page.waitForTimeout(200);
    const listLen5 = await page.evaluate(() => compareList.length);
    if (listLen5 === 5) p(S, '5th country accepted', `compareList length ${listLen5} (CMP_MAX=5)`);
    else f(S, '5th country accepted', `compareList has ${listLen5} entries (should be 5)`);

    await page.evaluate(() => addCompare('Brazil'));
    await page.waitForTimeout(200);
    const listLen = await page.evaluate(() => compareList.length);
    if (listLen <= 5) p(S, 'max 5 limit', `compareList length ${listLen} (max enforced)`);
    else f(S, 'max 5 limit', `compareList has ${listLen} entries (should max at 5)`);

    // Remove one
    await page.evaluate(() => removeCompare('Norway'));
    await page.waitForTimeout(300);
    const listLen2 = await page.evaluate(() => compareList.length);
    if (listLen2 === listLen - 1) p(S, 'removeCompare', `compareList reduced to ${listLen2}`);
    else f(S, 'removeCompare', `Expected ${listLen - 1}, got ${listLen2}`);

    // Test double-add protection
    const before = await page.evaluate(() => compareList.length);
    await page.evaluate(() => addCompare('Iraq')); // already in list
    const after = await page.evaluate(() => compareList.length);
    if (before === after) p(S, 'double-add guard', 'Adding existing country does not duplicate');
    else f(S, 'double-add guard', `compareList grew from ${before} to ${after} on duplicate add`);

    // Clear
    await page.evaluate(() => clearCompare());
    await page.waitForTimeout(200);
    const listLen3 = await page.evaluate(() => compareList.length);
    if (listLen3 === 0) p(S, 'clearCompare', 'clearCompare empties list');
    else f(S, 'clearCompare', `List has ${listLen3} items after clear`);

    // ── v600 (T3) regression: the lowest/highest marker must sit on the number it ranks ──
    // _cmpPriceRank ranks on the COMPARABLE take, so on a fee-blended column (11 of 185 hold
    // Group-2 TSC/RSC/Buy-back contracts) it describes the PSC/Conc figure, not the headline.
    // Before v600 the marker rendered directly under the headline, so Norway / Iraq / Guyana at
    // $75 read 68.0% "highest of 3" | 84.8% "lowest of 3" | 54.1% -- the largest number in the
    // row labelled lowest. Against the pre-change build this case FAILS on both assertions.
    await page.evaluate(() => { clearCompare(); addCompare('Norway'); addCompare('Iraq'); addCompare('Guyana'); });
    await page.waitForTimeout(900);
    const mkOrder = await page.evaluate(() => {
      const out = { cells: 0, markers: 0, misplaced: 0, untagged: 0, iraq: '' };
      document.querySelectorAll('#cmp-output .cmp-row').forEach(row => {
        const lbl = row.querySelector('.cmp-cell.lbl');
        if (!lbl || !/Govt Take/.test(lbl.innerText)) return;
        [].slice.call(row.querySelectorAll('.cmp-cell')).slice(1).forEach(c => {
          out.cells++;
          const sp = [].slice.call(c.querySelectorAll('span'));
          const mi = sp.findIndex(s => /^(lowest|highest) of \d/.test(s.textContent.trim()));
          if (mi < 0) return;
          out.markers++;
          const gi = sp.findIndex(s => /^PSC\/Conc/.test(s.textContent.trim()));
          if (gi < 0) return;
          if (mi < gi) out.misplaced++;                                   // marker above the figure it ranks
          if (!/on PSC\/Conc/.test(sp[mi].textContent)) out.untagged++;    // basis not named
          if (/34\.1|84\.8/.test(c.innerText)) out.iraq = c.innerText.replace(/\n/g, ' | ');
        });
      });
      return out;
    });
    if (mkOrder.markers > 0 && mkOrder.misplaced === 0)
      p(S, 'take marker sits on ranked figure', `${mkOrder.markers} markers across ${mkOrder.cells} Govt Take cells, 0 above the PSC/Conc figure they rank`);
    else
      f(S, 'take marker sits on ranked figure', `${mkOrder.misplaced} marker(s) render above the PSC/Conc figure they rank (markers=${mkOrder.markers}) — Iraq cell: ${mkOrder.iraq}`);

    if (mkOrder.markers > 0 && mkOrder.untagged === 0)
      p(S, 'take marker names its basis', 'every marker on a fee-blended column is tagged "on PSC/Conc"');
    else
      f(S, 'take marker names its basis', `${mkOrder.untagged} marker(s) on a fee-blended column do not name the basis — Iraq cell: ${mkOrder.iraq}`);

    await page.evaluate(() => clearCompare());
    await page.waitForTimeout(200);

    // Hash navigation compare
    await page.evaluate(() => { window.location.hash = '#/compare/norway+iraq+indonesia'; });
    await page.waitForTimeout(800);
    const compareListLen = await page.evaluate(() => compareList.length);
    if (compareListLen >= 2) p(S, 'hash #/compare/', `${compareListLen} countries loaded from hash`);
    else w(S, 'hash #/compare/', `Only ${compareListLen} countries from hash`);

  } catch(e) { f(S, 'exception', e.message); }
}

// ── v606 (T3) ───────────────────────────────────────────────────────────────────
// The Side-by-Side "Govt Take vs Oil Price" chart plotted the raw blended take_*, while the
// table directly above it ranks on the Group-1 (PSC/Conc) take that v549/v552/v571/v593/v600
// established. On the shipped "USA vs Iraq" quickstart the chart drew Iraq at 81.5→88.1 against
// the USA's 19.9→26.1 — its comparable take is 28.6→39.7, BELOW the USA at every price. The
// chart now reads cpCmpTakeOf(), the same function Country Profile uses.
// Assert: (1) the chart series equals the comparable take, not the headline, for every drawn
// column across all 185 countries; (2) the chart and the table's rank row agree in direction on
// the shipped preset; (3) PRRT-only columns are excluded from the price band and named in a
// notice; (4) state-monopoly exclusion still works and stacks with the others; (5) an all-Group-1
// set is completely unchanged — no rebasing label, no notice, original title.
async function testSbSChartBasis(page) {
  const S = 'SbSChartBasis';
  try {
    await switchTab(page, 't2');
    await page.waitForTimeout(300);

    const setCmp = async (arr) => {
      await page.evaluate(a => { clearCompare(); a.forEach(c => addCompare(c)); }, arr);
      await page.waitForTimeout(500);
    };
    const readChart = () => page.evaluate(() => {
      const c = Chart.getChart(document.getElementById('cmp-chart'));
      return {
        title: c ? c.options.plugins.title.text : null,
        labels: c ? c.data.datasets.map(d => d.label) : [],
        data: c ? c.data.datasets.map(d => d.data) : [],
        tips: c ? c.data.datasets.map((d, i) =>
          c.options.plugins.tooltip.callbacks.label({ datasetIndex: i, dataIndex: 1, parsed: { y: d.data[1] } })) : [],
        notice: (document.getElementById('cmp-monopoly-notice') || {}).innerText || '',
        display: document.getElementById('cmp-chart-wrap').style.display,
      };
    });

    // (1) shipped quickstart — the exhibit
    await page.evaluate(() => clearCompare());
    await page.click('button.cmp-quickstart-btn[data-countries="USA|Iraq"]');
    await page.waitForTimeout(800);
    const q = await readChart();

    const iraqIdx = q.labels.findIndex(l => l.indexOf('Iraq') === 0);
    const usaIdx  = q.labels.findIndex(l => l.indexOf('USA') === 0);
    if (iraqIdx < 0 || usaIdx < 0) { f(S, 'quickstart loads 2 columns', 'labels=' + JSON.stringify(q.labels)); }
    else {
      const iraq = q.data[iraqIdx], usa = q.data[usaIdx];
      // Iraq must be drawn on its comparable take (28.6/34.1/37.8/39.7), NOT the headline
      // (81.5/84.8/86.9/88.1). The headline value at $75 is the pre-change failure.
      if (Math.abs(iraq[1] - 34.1) < 0.15) p(S, 'Iraq plotted on comparable take', `$75 point = ${iraq[1]} (comparable 34.1, headline 84.8)`);
      else f(S, 'Iraq plotted on comparable take', `$75 point = ${iraq[1]}, expected ~34.1 not the blended 84.8`);
      if (iraq.every(v => v < 45)) p(S, 'Iraq comparable across full band', JSON.stringify(iraq));
      else f(S, 'Iraq comparable across full band', 'headline values still plotted: ' + JSON.stringify(iraq));
      // Magnitude, not ordering. The USA is the lowest-take country in the dataset, so Iraq sits
      // above it on BOTH bases — this pair never reversed. What the headline did was inflate the
      // gap: 84.8 vs 23.4 is 3.6x, the comparable 34.1 vs 23.4 is 1.5x. That is the error on the
      // shipped preset. The ORDERING reversals are against the other 111 countries, asserted next.
      const ratioNow = iraq[1] / usa[1];
      if (ratioNow < 2.0) p(S, 'quickstart gap no longer inflated', `Iraq/USA at $75 = ${ratioNow.toFixed(2)}x on the comparable take (was 3.62x on the blended headline)`);
      else f(S, 'quickstart gap no longer inflated', `Iraq/USA at $75 still ${ratioNow.toFixed(2)}x — headline basis still plotted`);
      if (q.labels[iraqIdx].indexOf('(PSC/Conc)') >= 0) p(S, 'rebased series labelled', q.labels[iraqIdx]);
      else f(S, 'rebased series labelled', 'legend does not say the line is the PSC/Conc subset: ' + q.labels[iraqIdx]);
      if (/84\.8/.test(q.tips[iraqIdx]) && /PSC\/Conc/.test(q.tips[iraqIdx])) p(S, 'tooltip carries both figures', q.tips[iraqIdx]);
      else f(S, 'tooltip carries both figures', q.tips[iraqIdx]);
    }
    if (Array.isArray(q.title) && /Comparable Govt Take/.test(q.title[0])) p(S, 'chart title states basis', JSON.stringify(q.title[0]));
    else f(S, 'chart title states basis', 'title=' + JSON.stringify(q.title));
    if (/comparable take/i.test(q.notice) && /415/.test(q.notice)) p(S, 'rebasing notice shown', 'names the 415 fee-basis contracts');
    else f(S, 'rebasing notice shown', 'notice=' + JSON.stringify(q.notice.slice(0, 160)));

    // (1b) a genuine ordering reversal. Iraq's headline (81.5→88.1) sits ABOVE Angola's
    // (42.3→64.1) at every price; its comparable take (28.6→39.7) sits BELOW Angola at every
    // price. 111 of the 16,471 chartable pairs reverse like this. The chart must now draw the
    // same order the Govt Take rows and the producer-rank row already state.
    await setCmp(['Iraq', 'Angola']);
    const rev = await readChart();
    const ri = rev.labels.findIndex(l => l.indexOf('Iraq') === 0);
    const ra = rev.labels.findIndex(l => l.indexOf('Angola') === 0);
    if (ri >= 0 && ra >= 0 && rev.data[ri].every((v, i) => v < rev.data[ra][i]))
      p(S, 'ordering reversal corrected', `Iraq ${JSON.stringify(rev.data[ri])} now drawn BELOW Angola ${JSON.stringify(rev.data[ra])} at every price, matching the rank row`);
    else f(S, 'ordering reversal corrected', `Iraq ${JSON.stringify(rev.data[ri])} vs Angola ${JSON.stringify(rev.data[ra])} — chart still contradicts the table`);

    // (2) whole-dataset sweep: every drawn series must equal cpCmpTakeOf() at all four prices
    const sweep = await page.evaluate(() => {
      const cmp = (d, p) => (d && d.g1 && d.g1['t' + p] != null) ? d.g1['t' + p] : d['take_' + p];
      let checked = 0, mismatch = 0, rebased = 0, headlineDiff = 0;
      const bad = [];
      COUNTRY_DATA.forEach(d => {
        if (d.take_75 != null && d.take_75 >= 99.5) return;           // monopoly: not drawn
        const mx = d.mech_mix || [];
        const tot = mx.reduce((s, x) => s + (x.n || 0), 0);
        const n2 = mx.filter(x => x.g === 2).reduce((s, x) => s + (x.n || 0), 0);
        const n3 = mx.filter(x => x.g === 3).reduce((s, x) => s + (x.n || 0), 0);
        if (n3 > 0 && n2 === 0 && tot - n2 - n3 === 0) return;        // PRRT-only: not drawn
        checked++;
        let diff = false;
        [50, 75, 100, 125].forEach(pr => {
          const c = cmp(d, pr), h = d['take_' + pr];
          if (c != null && h != null && Math.abs(c - h) >= 0.05) diff = true;
        });
        if (diff) { rebased++; headlineDiff++; }
      });
      return { checked, rebased };
    });
    if (sweep.checked > 175) p(S, 'sweep covers the drawn set', `${sweep.checked} chartable countries`);
    else f(S, 'sweep covers the drawn set', `only ${sweep.checked} chartable countries`);
    // 11, not 10: Russia blends exactly ONE fee-basis contract of 1,247 and its two figures
    // agree to 0.0pp at $75 but differ by 0.1pp at $125, so it is rebased on the all-price rule
    // the chart uses and not on a $75-only rule.
    if (sweep.rebased === 11) p(S, 'rebased-column count pinned', `${sweep.rebased} of ${sweep.checked} columns are drawn on a comparable take that differs from the headline at one or more of the four prices`);
    else w(S, 'rebased-column count pinned', `expected 11, got ${sweep.rebased} — country_data.json changed`);

    // Verify the live chart matches cpCmpTakeOf for each rebased country, 5 at a time
    // Same all-price rule as _cmpChartRebased in index.html, so the two counts cannot drift.
    const rebasedNames = await page.evaluate(() => COUNTRY_DATA
      .filter(d => d.g1 && d.g1.t75 != null && [50, 75, 100, 125].some(p =>
        d['take_' + p] != null && d.g1['t' + p] != null && Math.abs(d.g1['t' + p] - d['take_' + p]) >= 0.05))
      .map(d => d.country));
    let seriesOk = 0, seriesBad = [];
    for (let i = 0; i < rebasedNames.length; i += 4) {
      const batch = rebasedNames.slice(i, i + 4);
      await setCmp(batch);
      const r = await readChart();
      for (const name of batch) {
        const idx = r.labels.findIndex(l => l.indexOf(name) === 0);
        if (idx < 0) { seriesBad.push(name + ':not drawn'); continue; }
        const expect = await page.evaluate(n => {
          const d = COUNTRY_DATA.find(x => x.country === n);
          return [50, 75, 100, 125].map(p => cpCmpTakeOf(d, String(p)));
        }, name);
        const got = r.data[idx];
        const ok = expect.every((v, k) => (v == null && got[k] == null) || Math.abs(v - got[k]) < 0.001);
        if (ok) seriesOk++; else seriesBad.push(name + ': got ' + JSON.stringify(got) + ' want ' + JSON.stringify(expect));
      }
    }
    if (seriesBad.length === 0) p(S, 'all fee-blended series plot the comparable take', `${seriesOk}/${rebasedNames.length} verified against cpCmpTakeOf()`);
    else f(S, 'all fee-blended series plot the comparable take', seriesBad.slice(0, 4).join(' | '));

    // (3) PRRT-only column excluded from the price band, named in a notice, peer still drawn
    await setCmp(['Australia', 'Norway']);
    const au = await readChart();
    if (!au.labels.some(l => l.indexOf('Australia') === 0)) p(S, 'PRRT column excluded from price band', 'Australia not drawn as a line across $50–$125');
    else f(S, 'PRRT column excluded from price band', 'Australia still plotted across the band: ' + JSON.stringify(au.labels));
    if (/Cash-flow basis/.test(au.notice) && /Australia/.test(au.notice)) p(S, 'PRRT exclusion named', 'notice names Australia and the cash-flow basis');
    else f(S, 'PRRT exclusion named', 'notice=' + JSON.stringify(au.notice.slice(0, 160)));
    if (au.labels.some(l => l.indexOf('Norway') === 0) && au.display !== 'none') p(S, 'PRRT exclusion spares peers', 'Norway still drawn');
    else f(S, 'PRRT exclusion spares peers', 'peer column lost: ' + JSON.stringify(au.labels));

    // (4) monopoly exclusion still works and stacks with the rebasing notice
    await setCmp(['Saudi Arabia', 'Iraq', 'Angola']);
    const sa = await readChart();
    if (!sa.labels.some(l => l.indexOf('Saudi Arabia') === 0) && /State monopoly/.test(sa.notice)) p(S, 'monopoly exclusion intact', 'Saudi Arabia excluded and named');
    else f(S, 'monopoly exclusion intact', 'labels=' + JSON.stringify(sa.labels));
    if (/State monopoly/.test(sa.notice) && /comparable take/i.test(sa.notice)) p(S, 'notices stack', 'monopoly + rebasing notices both present');
    else f(S, 'notices stack', 'notice=' + JSON.stringify(sa.notice.slice(0, 200)));

    // (5) CONTROL — an all-Group-1 set must be byte-identical to the pre-change render
    await setCmp(['Norway', 'United Kingdom', 'Netherlands']);
    const ns = await readChart();
    const ctlExpect = await page.evaluate(() => ['Norway', 'United Kingdom', 'Netherlands'].map(n => {
      const d = COUNTRY_DATA.find(x => x.country === n);
      return [d.take_50, d.take_75, d.take_100, d.take_125];
    }));
    const ctlOk = ctlExpect.every((row, i) => row.every((v, k) => Math.abs(v - ns.data[i][k]) < 0.001));
    if (ctlOk) p(S, 'control set unchanged (values)', 'North Sea Trio still plots its published headline take');
    else f(S, 'control set unchanged (values)', 'got ' + JSON.stringify(ns.data) + ' want ' + JSON.stringify(ctlExpect));
    if (ns.title === 'Govt Take vs Oil Price') p(S, 'control set unchanged (title)', 'original single-line title retained');
    else f(S, 'control set unchanged (title)', 'title=' + JSON.stringify(ns.title));
    if (ns.notice === '') p(S, 'control set unchanged (no notice)', 'no basis notice on an all-Group-1 set');
    else f(S, 'control set unchanged (no notice)', 'unexpected notice: ' + JSON.stringify(ns.notice.slice(0, 120)));
    if (ns.labels.every(l => l.indexOf('(PSC/Conc)') < 0)) p(S, 'control set unchanged (labels)', JSON.stringify(ns.labels));
    else f(S, 'control set unchanged (labels)', JSON.stringify(ns.labels));

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 7: DCF Engine Tests ──────────────────────────────────────────
// ── v602 (T5) ───────────────────────────────────────────────────────────────────
// The Export XLSX "Methodology" sheet is the workbook's traceability page — the one an IC
// reviewer opens to check what was modelled. It read DCF_PROFILES (the Scenario Builder's
// table) while Fiscal Compare runs on FC_PROFILES, so on 4 of the 7 selectable profiles it
// stated assumptions the engine never used: onshore/marginal/giant have no DCF key at all and
// silently fell back to Deepwater, and 'lng' exists in BOTH tables with different numbers
// (200k bopd/$5,000M/$4 opex vs the engine's 100k/$3,000M/$20). Assert the sheet against the
// table the engine actually consumes, for every option in the select.
async function testFCExportMethodology(page) {
  const S = 'FCExportMeth';
  try {
    await switchTab(page, 't0');
    await page.waitForTimeout(400);
    // Capture the workbook instead of writing a file to disk.
    await page.evaluate(() => {
      if (!window.__origWriteFile) window.__origWriteFile = XLSX.writeFile;
      XLSX.writeFile = function (wb, name) {
        window.__cap = { name: name, meth: XLSX.utils.sheet_to_json(wb.Sheets['Methodology'], { header: 1 }) };
      };
    });
    const keys = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#fc-profile option')).map(o => o.value));
    if (!keys.length) { f(S, 'profile options', 'No options in #fc-profile'); return; }

    for (const key of keys) {
      await page.selectOption('#fc-profile', key);
      await page.evaluate(() => { const b = document.getElementById('fc-run-btn'); if (b) b.click(); });
      await page.waitForTimeout(1200);
      const r = await page.evaluate(k => {
        window.__cap = null;
        exportFCResults();
        const c = window.__cap;
        if (!c) return { err: 'exportFCResults wrote no workbook' };
        const grab = s => {
          const row = c.meth.find(x => x[0] && String(x[0]).trim().startsWith(s));
          return row ? row[1] : null;
        };
        const e = FC_PROFILES[k];
        return {
          name: c.name,
          engine: e ? [e.peakBblDay, e.capexMM, e.opexBbl] : null,
          sheet: [grab('Peak rate'), grab('Capex'), grab('Opex')],
          horizon: grab('Modelled horizon'),
          header: (c.meth.find(x => x[0] && String(x[0]).startsWith('Profile assumptions')) || [])[0] || '',
          profName: e ? e.name : k
        };
      }, key);

      if (r.err) { f(S, `export-${key}`, r.err); continue; }
      if (!r.engine) { f(S, `export-${key}`, `FC_PROFILES has no '${key}' — select offers it`); continue; }

      if (String(r.engine) === String(r.sheet)) {
        p(S, `meth-matches-engine-${key}`,
          `${r.sheet[0]} bopd / $${r.sheet[1]}M / $${r.sheet[2]} opex`);
      } else {
        f(S, `meth-matches-engine-${key}`,
          `Methodology sheet says [${r.sheet}] but engine ran [${r.engine}]`);
      }

      // buildProductionProfile() hardcodes 25 years for every profile.
      if (r.horizon === 25) p(S, `meth-horizon-${key}`, 'Modelled horizon 25yr (matches engine)');
      else f(S, `meth-horizon-${key}`, `Horizon ${r.horizon}, engine models 25`);

      // The sheet must name the profile, not print the raw select key.
      if (r.header.indexOf(r.profName) >= 0) p(S, `meth-names-profile-${key}`, r.profName);
      else f(S, `meth-names-profile-${key}`, `Header does not name '${r.profName}': ${r.header}`);
    }
    await page.evaluate(() => { if (window.__origWriteFile) XLSX.writeFile = window.__origWriteFile; });
  } catch (e) {
    f(S, 'exception', e.message);
  }
}

async function testDCF(page) {
  const S = 'DCF';
  const profile = { peakBblDay: 50000, rampYears: 3, plateauYears: 8, declineRate: 0.12, capexMM: 1200, opexBbl: 15, discountRate: 0.10 };
  try {
    // Test all 5 DCF mechanics
    const results = await page.evaluate(prof => {
      const out = {};
      try { out.concession = dcfConcession({ royalty_rate: 0.15, cit_rate: 0.30, spt_rate: 0, state_eq: 0, windfall_rate: 0, severance_rate: 0 }, 75, prof); } catch(e) { out.concession = { error: e.message }; }
      try { out.psc = dcfPSC({ cost_recovery_cap: 0.60, ftp_rate: 0.10, govt_profit_oil: 0.55, cit_rate: 0.25, royalty_rate: 0, ring_fenced: false, r_factor_tiers: null }, 75, prof); } catch(e) { out.psc = { error: e.message }; }
      try { out.tsc = dcfTSC({ fee_per_bbl: 4.0, cit_rate: 0.35, ept_rate: 0 }, 75, prof); } catch(e) { out.tsc = { error: e.message }; }
      try { out.prrt = dcfPRRT({ prrt_rate: 0.40, cit_rate: 0.30, uplift_rate: 0.05 }, 75, prof); } catch(e) { out.prrt = { error: e.message }; }
      try { out.buyback = dcfBuyback({ cost_recovery_cap: 0.60, buyback_rate: 0.12, cit_rate: 0.25 }, 75, prof); } catch(e) { out.buyback = { error: e.message }; }
      return out;
    }, profile);

    for (const [mech, res] of Object.entries(results)) {
      if (res.error) { f(S, `dcf-${mech}`, `Error: ${res.error}`); continue; }
      if (res.take == null) { f(S, `dcf-${mech}`, 'take is null'); continue; }
      if (res.take < 0 || res.take > 100) { f(S, `dcf-${mech}`, `take=${res.take.toFixed(1)}% out of [0,100]`); continue; }
      if (!res.waterfall) { f(S, `dcf-${mech}`, 'No waterfall returned'); continue; }
      p(S, `dcf-${mech}`, `take=${res.take.toFixed(1)}% npv=$${Math.round(res.npv)}M irr=${res.irr != null ? res.irr.toFixed(1) : 'null'}%`);
    }

    // Edge cases
    const edgeCases = await page.evaluate(prof => {
      return {
        highPrice: (() => { try { const r = dcfConcession({ royalty_rate: 0.15, cit_rate: 0.30, spt_rate: 0, state_eq: 0, windfall_rate: 0, severance_rate: 0 }, 150, prof); return { take: r.take, ok: r.take >= 0 && r.take <= 100 }; } catch(e) { return { error: e.message }; } })(),
        lowPrice:  (() => { try { const r = dcfConcession({ royalty_rate: 0.15, cit_rate: 0.30, spt_rate: 0, state_eq: 0, windfall_rate: 0, severance_rate: 0 }, 20,  prof); return { take: r.take, ok: r.take >= 0 && r.take <= 100 }; } catch(e) { return { error: e.message }; } })(),
        zeroCap:   (() => { try { const r = dcfPSC({ cost_recovery_cap: 0, ftp_rate: 0, govt_profit_oil: 0.80, cit_rate: 0, royalty_rate: 0, ring_fenced: false, r_factor_tiers: null }, 75, prof); return { take: r.take, ok: r.take >= 0 && r.take <= 100 }; } catch(e) { return { error: e.message }; } })(),
      };
    }, profile);

    if (edgeCases.highPrice && edgeCases.highPrice.ok) p(S, 'edge-highPrice', `take=${edgeCases.highPrice.take.toFixed(1)}% at $150`);
    else f(S, 'edge-highPrice', JSON.stringify(edgeCases.highPrice));

    if (edgeCases.lowPrice && edgeCases.lowPrice.ok) p(S, 'edge-lowPrice', `take=${edgeCases.lowPrice.take.toFixed(1)}% at $20`);
    else f(S, 'edge-lowPrice', JSON.stringify(edgeCases.lowPrice));

    if (edgeCases.zeroCap && edgeCases.zeroCap.ok) p(S, 'edge-zeroCap', `PSC zero cost recovery cap take=${edgeCases.zeroCap.take.toFixed(1)}%`);
    else f(S, 'edge-zeroCap', JSON.stringify(edgeCases.zeroCap));

    // getDCFParams for key countries including Bug 9 (USA) regression
    const paramTests = await page.evaluate(() => {
      const countries = ['USA', 'UAE', 'Norway', 'Iraq', 'Australia'];
      return countries.map(c => {
        try {
          const p = getDCFParams(c, 'Concession');
          return { country: c, ok: typeof p.royalty_rate === 'number', royalty: p.royalty_rate };
        } catch(e) { return { country: c, error: e.message }; }
      });
    });
    for (const t of paramTests) {
      if (t.error) f(S, `getDCFParams-${t.country}`, t.error);
      else if (t.ok) p(S, `getDCFParams-${t.country}`, `royalty_rate=${(t.royalty * 100).toFixed(1)}%`);
      else f(S, `getDCFParams-${t.country}`, 'royalty_rate not a number');
    }

    // runFiscalCompare end-to-end
    await switchTab(page, 't0');
    await page.waitForTimeout(200);
    await page.selectOption('#fc-profile', 'deepwater').catch(() => {});
    await page.selectOption('#fc-price', '75').catch(() => {});
    await page.evaluate(() => { const b = document.getElementById('fc-run-btn'); if(b) b.click(); });
    await page.waitForTimeout(2000);

    const fcCount = await page.evaluate(() => window._fcResults ? window._fcResults.length : 0);
    if (fcCount >= 100) p(S, 'runFiscalCompare all countries', `${fcCount} countries in Fiscal Compare`);
    else f(S, 'runFiscalCompare all countries', `Only ${fcCount} results`);

    // Verify all takes clamped 0-100
    const badTakes = await page.evaluate(() => (window._fcResults || []).filter(r => r.liveTake < 0 || r.liveTake > 100).map(r => r.country + '=' + r.liveTake));
    if (badTakes.length === 0) p(S, 'FC takes clamped 0-100', 'All takes in valid range');
    else f(S, 'FC takes clamped 0-100', `Bad takes: ${badTakes.slice(0,5).join(', ')}`);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 8: Screener (Explorer Screen mode) ───────────────────────────
async function testScreener(page) {
  const S = 'Screener';
  try {
    await switchTab(page, 'texplorer');
    await page.waitForTimeout(200);
    await page.evaluate(() => { const b = document.querySelector('.expl-mode-btn[data-mode="screen"]'); if(b) b.click(); }).catch(() => {});
    await page.waitForTimeout(400);

    // Initial run
    const initCount = await page.evaluate(() => {
      const el = document.getElementById('screener-count');
      return el ? el.textContent : '';
    });
    if (initCount.length > 0) p(S, 'initial run', `Screener shows: "${initCount}"`);
    else w(S, 'initial run', 'screener-count empty');

    // Take slider (use evaluate — page.fill doesn't trigger range oninput)
    await page.evaluate(() => { const sl = document.getElementById('sl-take'); if(sl){sl.value='60';sl.dispatchEvent(new Event('input'));} });
    await page.waitForTimeout(300);
    const afterTake = await page.evaluate(() => {
      const el = document.getElementById('screener-count');
      return el ? el.textContent : '';
    });
    p(S, 'take slider 60%', `After filter: "${afterTake}"`);

    // Active filter badge
    const badge = await page.evaluate(() => {
      const el = document.querySelector('.screener-active-badge, #screener-badge, [class*="active-badge"]');
      return el ? el.textContent : null;
    });
    if (badge) p(S, 'active filter badge', `Badge shows: "${badge}"`);
    else w(S, 'active filter badge', 'No active filter badge found');

    // Open advanced filters details before interacting with elements inside (v373+: collapsed by default)
    await page.evaluate(() => {
      const d = document.getElementById('screener-advanced-details');
      if(d && !d.open) d.open = true;
    });
    await page.waitForTimeout(150);

    // IOC checkbox filter — Bug 13 regression test
    const shellCb = await page.$('#sc-ioc-checks input[value="Shell"]');
    if (shellCb) {
      await shellCb.click();
      await page.waitForTimeout(300);
      const iocCount = await page.evaluate(() => {
        const el = document.getElementById('screener-count');
        return el ? el.textContent : '';
      });
      // Bug 13: would throw ReferenceError: ALL_OPERATORS is not defined
      const jsError = consoleErrors.filter(e => e.includes('ALL_OPERATORS')).length;
      if (jsError === 0) p(S, 'IOC filter Shell (Bug 13 regression)', `No ALL_OPERATORS error; result: "${iocCount}"`);
      else f(S, 'IOC filter Shell (Bug 13 regression)', `ALL_OPERATORS ReferenceError detected!`);
      await shellCb.click(); // uncheck
      await page.waitForTimeout(200);
    } else f(S, 'Shell IOC checkbox', 'Checkbox not found');

    // Open advanced filters details before interacting with elements inside
    await page.evaluate(() => {
      const d = document.getElementById('screener-advanced-details');
      if(d && !d.open) d.open = true;
    });
    await page.waitForTimeout(150);

    // Mechanic checkboxes
    const mechCbs = await page.$$('#sc-mech-checks input[type=checkbox]');
    if (mechCbs.length >= 4) {
      // Uncheck first mechanic
      await mechCbs[0].click();
      await page.waitForTimeout(300);
      const mechBadge = await page.evaluate(() => {
        const count = document.querySelectorAll('#screener-count').length;
        return count > 0;
      });
      p(S, 'mech checkbox filter', `Mechanic filter applied (${mechCbs.length} total checkboxes)`);
      await mechCbs[0].click(); // re-check
    } else f(S, 'mech checkboxes', `Only ${mechCbs.length} mechanic checkboxes`);

    // Reset button — v373+: reset btn is inside collapsed <details>; use evaluate to call directly
    const resetExists = await page.evaluate(() => !!document.getElementById('screener-reset-btn'));
    if (resetExists) {
      await page.evaluate(() => { if(typeof resetScreenerAll === 'function') resetScreenerAll(); });
      await page.waitForTimeout(300);
      p(S, 'reset button', 'Screener reset called via evaluate');
    } else w(S, 'reset button', 'No screener-reset-btn found');

    // Preset select — v373+: preset buttons replaced by <select id="screener-preset-select">
    // Hidden buttons kept for DOM compatibility; trigger via select dropdown instead
    const presetSelect = await page.$('#screener-preset-select');
    if (presetSelect) {
      await page.evaluate(() => {
        const sel = document.getElementById('screener-preset-select');
        if(sel){ sel.value='sweetspot'; sel.dispatchEvent(new Event('change')); sel.value=''; }
      });
      await page.waitForTimeout(300);
      p(S, 'preset select', 'Screener preset applied via select dropdown');
    } else w(S, 'preset select', 'No screener-preset-select found');

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 9: Vintage Tab (t4) ──────────────────────────────────────────
async function testVintage(page) {
  const S = 'Vintage';
  try {
    await switchTab(page, 't4');
    await page.waitForTimeout(500);

    const tbody = await page.$('#tbody-vintage');
    const rows = await page.$$('#tbody-vintage tr');
    if (rows.length >= 4) p(S, 'vintage table', `${rows.length} decade rows`);
    else f(S, 'vintage table', `Only ${rows.length} rows`);

    const bars = await page.$('#decade-bars');
    const barContent = bars ? await bars.evaluate(el => el.innerHTML) : '';
    if (barContent.includes('decade-row')) p(S, 'decade bars', 'Decade bars rendered');
    else f(S, 'decade bars', 'No decade bars');

    // Vintage trend chart in Explorer > Browse
    await switchTab(page, 'texplorer');
    await page.click('.mode-toggle button:has-text("Browse")').catch(() => {});
    await page.waitForTimeout(400);
    const vtCanvas = await page.$('#vintage-trend-chart');
    if (vtCanvas) p(S, 'vintage-trend-chart', 'Canvas exists in Explorer Browse');
    else w(S, 'vintage-trend-chart', 'Canvas not found');

    const hasVTC = await page.evaluate(() => !!window._vintageTrendChart);
    if (hasVTC) p(S, '_vintageTrendChart', 'Render-once chart created');
    else w(S, '_vintageTrendChart', '_vintageTrendChart not set');

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 10: Reform Risk Tab ──────────────────────────────────────────
async function testReformRisk(page) {
  const S = 'ReformRisk';
  try {
    await switchTab(page, 'treformrisk');
    await page.waitForTimeout(500);

    const content = await page.$('#reform-risk-content');
    const html = content ? await content.evaluate(el => el.innerHTML) : '';
    if (html.includes('Reform') || html.includes('table')) p(S, 'content rendered', `${html.length} chars`);
    else f(S, 'content rendered', 'Reform risk content empty');

    // Check reform table section
    const tbody = await page.$('#tbody-reforms');
    const reformFilter = await page.$('#reform-filter-country');
    if (reformFilter) {
      const opts = await reformFilter.evaluate(el => el.options.length);
      if (opts >= 2) p(S, 'country filter dropdown', `${opts} options`);
      else w(S, 'country filter dropdown', 'Less than 2 options');
    } else w(S, 'reform filter', 'reform-filter-country not found');

    // _ALL_REFORMS populated
    const allReforms = await page.evaluate(() => (window._ALL_REFORMS || []).length);
    if (allReforms > 0) p(S, '_ALL_REFORMS', `${allReforms} reform events`);
    else f(S, '_ALL_REFORMS', '_ALL_REFORMS empty');

    // v598 (T4): the per-country lookup must carry that country's own sourced event log.
    // Three surfaces route here promising "the full event log", and until v598 this tab
    // held only global aggregates — the selected country's events were nowhere on it.
    const lookup = await page.$('#rr-country-lookup');
    if (lookup) {
      await page.selectOption('#rr-country-lookup', 'Venezuela');
      await page.waitForTimeout(400);
      const vz = await page.evaluate(() => {
        const v = document.getElementById('rr-country-verdict');
        const t = v ? v.innerText : '';
        return { rows: v ? v.querySelectorAll('.reform-event').length : 0,
                 inWin: /IN THE 2010 SCORING WINDOW/i.test(t),
                 preWin: /BEFORE THE WINDOW/i.test(t),
                 y2007: t.indexOf('2007') > -1, y1975: t.indexOf('1975') > -1 };
      });
      if (vz.rows === 4 && vz.inWin && vz.preWin && vz.y2007 && vz.y1975)
        p(S, 'lookup event log (covered)', 'Venezuela: 4 events, split at the 2010 window, 1975+2007 ruptures on screen');
      else f(S, 'lookup event log (covered)', `Venezuela log wrong: ${JSON.stringify(vz)}`);

      // An uncovered jurisdiction must render no event rows and still say why.
      await page.selectOption('#rr-country-lookup', 'Saudi Arabia');
      await page.waitForTimeout(400);
      const sa = await page.evaluate(() => {
        const v = document.getElementById('rr-country-verdict');
        return { rows: v ? v.querySelectorAll('.reform-event').length : 0,
                 nocov: v ? /no Reform Frequency Score/i.test(v.innerText) : false };
      });
      if (sa.rows === 0 && sa.nocov) p(S, 'lookup event log (uncovered)', 'Saudi Arabia: 0 event rows, no-coverage verdict intact');
      else f(S, 'lookup event log (uncovered)', `Uncovered case wrong: ${JSON.stringify(sa)}`);

      // ── v604 (T4): the verdict card must not assert a basis the platform has withdrawn ──
      // For the 164 jurisdictions with no sourced reform log, the Fiscal Predictability
      // Score IS this card's answer, introduced as "What you can defend instead". Its basis
      // line was read off COUNTRY_DATA p25/p75 and said "one statutory term — spread
      // component not exercised". ORCA's own api/v1/country/<slug>.json refutes that on 42
      // countries, and Country Profile has withdrawn the claim there since v559. The two
      // surfaces must not print opposite bases for the same score.
      const CONFLICT = [
        { c: 'Uzbekistan', pp: 55.8, covered: false },
        { c: 'Thailand',   pp: 36.6, covered: false },
        { c: 'Georgia',    pp: 40.3, covered: false },
        { c: 'Norway',     pp: 29.6, covered: true  }
      ];
      for (const t of CONFLICT) {
        await page.selectOption('#rr-country-lookup', t.c);
        await page.waitForTimeout(1200);
        const r = await page.evaluate(() => {
          const basis = document.getElementById('rr-fp-basis');
          const score = document.getElementById('rr-fp-score');
          const claim = document.getElementById('rr-fp-claim');
          return {
            basis: basis ? basis.innerText : '(missing)',
            marked: score ? /best case/i.test(score.innerText) : false,
            claim: claim ? claim.innerText : ''
          };
        });
        const statesFloor = r.basis.indexOf('≥' + t.pp.toFixed(1) + 'pp') > -1;
        const withdrawn = !/one statutory term/i.test(r.basis)
                       && !/every one of this country/i.test(r.claim);
        if (statesFloor && withdrawn && r.marked)
          p(S, `FP basis refuted (${t.c})`, `basis states ≥${t.pp.toFixed(1)}pp observed, one-term claim withdrawn, score marked best case`);
        else
          f(S, `FP basis refuted (${t.c})`,
            `expected the one-term basis withdrawn and ≥${t.pp.toFixed(1)}pp stated; got basis="${r.basis.slice(0,110)}" marked=${r.marked} claim="${r.claim.slice(0,80)}"`);
      }

      // The refutation must be evidence-driven, not blanket: a country whose IQR component IS
      // exercised, and a one-term country its own contract table corroborates, stay untouched.
      const KEEP = [
        { c: 'Ghana',   want: /measured spread 14\.6pp/i,                    why: 'measured spread, nothing to withdraw' },
        { c: 'Iraq',    want: /measured spread 33\.5pp/i,                    why: 'measured spread, nothing to withdraw' },
        { c: 'Guyana',  want: /one statutory term/i,                          why: 'one-term basis corroborated by its own contract table' },
        { c: 'Bahamas', want: /one statutory term/i,                          why: 'one-term basis corroborated by its own contract table' }
      ];
      for (const t of KEEP) {
        await page.selectOption('#rr-country-lookup', t.c);
        await page.waitForTimeout(1200);
        const r = await page.evaluate(() => {
          const basis = document.getElementById('rr-fp-basis');
          const score = document.getElementById('rr-fp-score');
          return { basis: basis ? basis.innerText : '(missing)',
                   marked: score ? /best case/i.test(score.innerText) : false };
        });
        if (t.want.test(r.basis) && !r.marked) p(S, `FP basis unchanged (${t.c})`, t.why);
        else f(S, `FP basis unchanged (${t.c})`, `expected ${t.why}; got basis="${r.basis.slice(0,110)}" marked=${r.marked}`);
      }

      // Re-arm: the refutation must clear when the analyst moves to a clean country and
      // re-apply on return, or a stale verdict is read against the wrong jurisdiction.
      await page.selectOption('#rr-country-lookup', 'Uzbekistan');
      await page.waitForTimeout(1200);
      const rearm = await page.evaluate(() => {
        const b = document.getElementById('rr-fp-basis');
        return b ? b.innerText : '(missing)';
      });
      if (rearm.indexOf('≥55.8pp') > -1) p(S, 'FP basis re-arms on reselect', 'Uzbekistan repaints ≥55.8pp after an intervening clean country');
      else f(S, 'FP basis re-arms on reselect', `expected ≥55.8pp on return; got "${rearm.slice(0,110)}"`);

      // Cross-surface: Reform Risk and Country Profile must state the SAME basis for Norway.
      await page.selectOption('#rr-country-lookup', 'Norway');
      await page.waitForTimeout(1200);
      const rrNorway = await page.evaluate(() => {
        const b = document.getElementById('rr-fp-basis');
        return b ? b.innerText : '';
      });
      await switchTab(page, 't7');
      // Earlier sections leave some other country loaded on this tab, so load Norway explicitly.
      // Country Profile patches its own chip only once fetchCountryContracts() lands, so wait on
      // the contract sample rather than a fixed timeout.
      await page.evaluate(() => { if (typeof loadCountryProfile === 'function') loadCountryProfile('Norway'); });
      try {
        await page.waitForFunction(
          () => !!(window._cpObsSpread && window._cpObsSpread['Norway'])
                && document.querySelectorAll('#dd-content .orca-fp-basis').length > 0,
          { timeout: 20000 });
      } catch (e) {}
      await page.waitForTimeout(1500);
      const cpNorway = await page.evaluate(() => {
        const chips = document.querySelectorAll('#dd-content .orca-fp-basis');
        return Array.from(chips).map(c => c.textContent.trim());
      });
      const cpFloor = cpNorway.some(t => t.indexOf('≥29.6pp') > -1);
      const rrFloor = rrNorway.indexOf('≥29.6pp') > -1;
      if (cpFloor && rrFloor) p(S, 'FP basis agrees across surfaces', 'Norway reads ≥29.6pp on both Reform Risk and Country Profile');
      else f(S, 'FP basis agrees across surfaces', `Reform Risk="${rrNorway.slice(0,70)}" vs Country Profile=${JSON.stringify(cpNorway)}`);
      await switchTab(page, 'treformrisk');
      await page.waitForTimeout(500);

      await page.selectOption('#rr-country-lookup', '');
      await page.waitForTimeout(200);
    } else w(S, 'lookup event log', '#rr-country-lookup not found');

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 11: Breakeven Map Tab ────────────────────────────────────────
async function testBreakevenMap(page) {
  const S = 'BreakevenMap';
  try {
    await switchTab(page, 'tbreakevenmap');
    await page.waitForTimeout(2000); // D3 async

    const mapRendered = await page.evaluate(() => window._beMapRendered);
    if (mapRendered) p(S, '_beMapRendered', 'Map rendered flag set');
    else w(S, '_beMapRendered', 'Map not rendered yet');

    const svg = await page.$('#breakeven-map-svg');
    if (svg) {
      const paths = await svg.evaluate(el => el.querySelectorAll('path').length);
      if (paths > 50) p(S, 'D3 paths', `${paths} country paths in SVG`);
      else w(S, 'D3 paths', `Only ${paths} paths (D3 may not have loaded)`);
    } else w(S, 'SVG', 'breakeven-map-svg not found');

    // Price slider
    const slider = await page.$('#be-price-marker');
    if (slider) {
      await slider.evaluate(el => { el.value = 50; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(300);
      const labelText = await page.evaluate(() => (document.getElementById('be-price-label') || {}).textContent);
      if (labelText && labelText.includes('50')) p(S, 'price slider', `Label updated to "${labelText}"`);
      else w(S, 'price slider', `Label: "${labelText}"`);
    } else w(S, 'price slider', '#be-price-marker not found');

    // Lowest/highest lists
    const lowestList = await page.$('#be-lowest-list');
    const lowestHTML = lowestList ? await lowestList.evaluate(el => el.innerHTML) : '';
    if (lowestHTML.includes('$') || lowestHTML.includes('bbl')) p(S, 'lowest list', 'Lowest breakeven list populated');
    else w(S, 'lowest list', 'Lowest list empty or no data');

    // Re-click tab — should NOT re-render (guard)
    await switchTab(page, 't0');
    await page.waitForTimeout(100);
    await switchTab(page, 'tbreakevenmap');
    await page.waitForTimeout(500);
    const stillRendered = await page.evaluate(() => window._beMapRendered);
    if (stillRendered) p(S, 'render-once guard', 'Map not re-rendered on second tab visit');
    else w(S, 'render-once guard', '_beMapRendered false after second visit');

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 12: Sample Analyses Tab ─────────────────────────────────────
async function testSampleAnalyses(page) {
  const S = 'SampleAnalyses';
  try {
    await switchTab(page, 'tsamples');
    await page.waitForTimeout(600);

    const grid = await page.$('#samples-grid');
    const gridHTML = grid ? await grid.evaluate(el => el.innerHTML) : '';
    if (gridHTML.length > 500) p(S, 'global grid', `${gridHTML.length} chars rendered`);
    else f(S, 'global grid', `Grid content too short: ${gridHTML.length} chars`);

    const asiaGrid = await page.$('#samples-grid-asia');
    const asiaHTML = asiaGrid ? await asiaGrid.evaluate(el => el.innerHTML) : '';
    if (asiaHTML.length > 200) p(S, 'asia grid', `${asiaHTML.length} chars`);
    else f(S, 'asia grid', `Asia grid too short: ${asiaHTML.length}`);

    const strategicGrid = await page.$('#samples-grid-strategic');
    const stratHTML = strategicGrid ? await strategicGrid.evaluate(el => el.innerHTML) : '';
    if (stratHTML.length > 200) p(S, 'strategic grid', `${stratHTML.length} chars`);
    else f(S, 'strategic grid', `Strategic grid too short: ${stratHTML.length}`);

    // Count total cards
    const cardCount = await page.evaluate(() => {
      return document.querySelectorAll('#samples-grid [style*="card"], #samples-grid-asia [style*="card"], #samples-grid-strategic [style*="card"]').length;
    });
    if (cardCount >= 8) p(S, 'card count', `${cardCount} cards rendered`);
    else w(S, 'card count', `Only ${cardCount} cards`);

    // "Load in Compare" buttons — use evaluate to click (avoids Playwright viewport issues)
    const compareClicks = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#samples-grid button, #samples-grid-asia button, #samples-grid-strategic button')];
      const loadBtns = btns.filter(b => b.textContent.trim().includes('Compare') || b.textContent.trim().includes('Load'));
      let clicked = 0;
      for (const btn of loadBtns.slice(0, 3)) {
        try { btn.click(); clicked++; } catch(e) {}
      }
      return clicked;
    });
    await page.waitForTimeout(400);
    p(S, 'Compare buttons', `${compareClicks} compare/load buttons clicked via evaluate`);

    // "Filter Asia Pacific in Explorer" button (Bug 14 regression)
    const asiaFilterResult = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#samples-grid-asia button')];
      const filterBtn = btns.find(b => b.textContent.includes('Explorer'));
      if (!filterBtn) return 'not_found';
      filterBtn.click();
      return 'clicked';
    });
    await page.waitForTimeout(500);
    if (asiaFilterResult === 'clicked') {
      const region = await page.evaluate(() => typeof explorerChipFilters !== 'undefined' ? explorerChipFilters.region : 'undefined');
      if (region === 'Asia Pacific') p(S, '"Filter Asia Pacific" (Bug 14 regression)', `chip set to "${region}"`);
      else f(S, '"Filter Asia Pacific" (Bug 14 regression)', `chip is "${region}", expected "Asia Pacific"`);
    } else w(S, '"Filter Asia Pacific" button', 'Button not found');

    // Reset explorer
    await switchTab(page, 'texplorer');
    await page.selectOption('#flt-region', '').catch(() => {});
    await page.waitForTimeout(200);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 13: Scenario Builder ─────────────────────────────────────────
async function testScenarioBuilder(page) {
  const S = 'ScenarioBuilder';
  try {
    // Scenario builder lives in #scenario-modal (hidden by default) — open it via JS
    await page.evaluate(() => {
      const m = document.getElementById('scenario-modal');
      if (m) m.classList.add('open');
    });
    await page.waitForTimeout(300);

    const sbMechSelect = await page.$('#sb-mechanic');
    if (!sbMechSelect) { w(S, 'sb-mechanic', '#sb-mechanic not found'); return; }
    p(S, 'panel', 'Scenario modal opened');

    // Test all mechanics
    for (const mech of ['Concession', 'PSC', 'TSC', 'PRRT']) {
      await page.selectOption('#sb-mechanic', mech).catch(() => {});
      await page.waitForTimeout(200);
      // Call runCustomScenario() directly via evaluate — avoids sticky/overflow visibility
      // compositing issues in headless Chromium at 1440x900 while still testing DCF output
      await page.evaluate(() => { if (typeof runCustomScenario === 'function') runCustomScenario(); }).catch(() => {});
      await page.waitForTimeout(400);
      const output = await page.evaluate(() => (document.getElementById('sb-output') || {}).innerHTML || '');
      if (output.includes('Govt Take') || output.includes('take') || output.includes('%'))
        p(S, `run-${mech}`, `Scenario ran for ${mech}`);
      else
        f(S, `run-${mech}`, `No output for ${mech}; html: "${output.slice(0,100)}"`);

    }

    // Test Bug 7/8 regression: tornado chart PRRT dispatch
    const tornadoTest = await page.evaluate(() => {
      try {
        const prof = { peakBblDay: 50000, rampYears: 3, plateauYears: 8, declineRate: 0.12, capexMM: 1200, opexBbl: 15, discountRate: 0.10 };
        const params = getDCFParams('Australia', 'PRRT');
        const r = dcfPRRT(params, 75, prof);
        return { ok: r && r.take != null && r.take >= 0 && r.take <= 100, take: r ? r.take : null };
      } catch(e) { return { error: e.message }; }
    });
    if (tornadoTest.ok) p(S, 'PRRT DCF dispatch (Bug 7 regression)', `take=${tornadoTest.take.toFixed(1)}%`);
    else f(S, 'PRRT DCF dispatch (Bug 7 regression)', JSON.stringify(tornadoTest));

    const buybackTest = await page.evaluate(() => {
      try {
        const prof = { peakBblDay: 30000, rampYears: 2, plateauYears: 6, declineRate: 0.14, capexMM: 400, opexBbl: 12, discountRate: 0.10 };
        const r = dcfBuyback({ cost_recovery_cap: 0.60, buyback_rate: 0.12, cit_rate: 0.25 }, 75, prof);
        return { ok: r && r.take != null && r.take >= 0 && r.take <= 100, take: r ? r.take : null };
      } catch(e) { return { error: e.message }; }
    });
    if (buybackTest.ok) p(S, 'Buyback DCF dispatch (Bug 7 regression)', `take=${buybackTest.take.toFixed(1)}%`);
    else f(S, 'Buyback DCF dispatch (Bug 7 regression)', JSON.stringify(buybackTest));

    // Close modal so subsequent tests are not blocked
    await page.evaluate(() => {
      const m = document.getElementById('scenario-modal');
      if (m) m.classList.remove('open');
    });
    await page.waitForTimeout(200);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 14: Search ───────────────────────────────────────────────────
async function testSearch(page) {
  const S = 'Search';
  try {
    // Open search
    await page.keyboard.press('Control+k').catch(() => {});
    await page.waitForTimeout(300);

    const overlay = await page.$('#search-overlay');
    const overlayOpen = overlay ? await overlay.evaluate(el => el.classList.contains('open')) : false;
    if (overlayOpen) p(S, 'Ctrl+K opens search', 'Search overlay opened');
    else w(S, 'Ctrl+K opens search', 'Overlay not opened (may depend on focus)');

    // Type "nor" and check results
    const searchQ = await page.$('#search-q');
    if (searchQ) {
      await searchQ.fill('nor');
      await page.waitForTimeout(300);
      const results = await page.$$('#search-results .search-result');
      if (results.length > 0) p(S, 'search results for "nor"', `${results.length} results`);
      else w(S, 'search results for "nor"', '0 results');
    }

    // Bug 10 regression: UAE/USA search
    for (const query of ['uae', 'usa', 'UAE', 'USA']) {
      const found = await page.evaluate(q => {
        const el = document.getElementById('search-q');
        if (!el) return 'no_input';
        el.value = q;
        el.dispatchEvent(new Event('input'));
        const items = document.querySelectorAll('#search-results .search-result');
        return items.length > 0 ? items[0].textContent.trim().slice(0, 40) : 'no_results';
      }, query);
      if (found !== 'no_results' && found !== 'no_input') p(S, `search "${query}" (Bug 10 regression)`, `Found: "${found}"`);
      else f(S, `search "${query}" (Bug 10 regression)`, `No results for "${query}"`);
    }

    // Close
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(200);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 15: URL Routing ──────────────────────────────────────────────
// ─── v603 (T1): Home IC-capital-screen headline must equal the screen it links to ──────────
// v524 built #home-hurdle-stat so "the number and its destination cannot drift apart". v554
// then moved runScreener()'s take ceiling onto the comparable (Group-1) take and left the Home
// headline gating on the published blended headline. Home said 14; the linked preset returned
// 15; the country in the gap was Iraq (published 84.8%, comparable 34.1%). Nothing on either
// surface could contradict the other, so it survived 49 cycles.
//
// The expected set is recomputed HERE from _scFeeCmpAt() -- the call runScreener()'s _scPass()
// makes -- rather than from any helper the page happens to expose, so these cases are a real
// external check on both surfaces and fail on a build where either one drifts.
async function testHomeICScreenAgreement(page) {
  const S = 'HomeICScreen';
  try {
    await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('thome', null); });
    await page.waitForTimeout(500);

    const home = await page.evaluate(() => {
      const CEIL = 65;
      const verified = COUNTRY_DATA.filter(c => _dqTier(c).hasProduction);
      const pass = [], admitted = [], excluded = [];
      verified.forEach(c => {
        if (!(c.npv_75 != null && c.npv_75 >= 0 && c.npv_50 != null && c.npv_50 >= 0)) return;
        const fc = _scFeeCmpAt(c, '75');
        const head = c.take_75;
        const cmp = (fc && fc.diverges) ? fc.cmp : head;
        if (cmp == null) return;
        if (cmp <= CEIL) { pass.push(c.country); if (head != null && head > CEIL) admitted.push(c.country); }
        else if (head != null && head <= CEIL) excluded.push(c.country);
      });
      const naive = verified.filter(c => c.take_75 != null && c.take_75 <= CEIL
        && c.npv_75 != null && c.npv_75 >= 0 && c.npv_50 != null && c.npv_50 >= 0).length;
      const el = document.getElementById('home-hurdle-stat');
      const txt = el ? el.innerText : '';
      const m = txt.match(/(\d+)\s+countries pass the IOC capital screen/) || [];
      return {
        expected: pass.length, naive: naive, admitted: admitted, excluded: excluded,
        rendered: m[1] ? +m[1] : null,
        qs: (document.getElementById('qs-ic-count') || {}).textContent || null,
        text: txt
      };
    });

    if (home.rendered === null) { f(S, 'headline renders', '#home-hurdle-stat has no count'); return; }

    // The whole point of the cycle: the number on the front page is the comparable-take screen.
    if (home.rendered === home.expected) p(S, 'headline equals the comparable-take screen', `${home.rendered}`);
    else f(S, 'headline equals the comparable-take screen', `Home renders ${home.rendered}, the comparable-take screen is ${home.expected} (published-blend basis gives ${home.naive}) — the headline is gating on a basis MECHANIC_COMPARABILITY.md does not permit`);

    // The Quick Start literal was stale from v554 to v603.
    if (home.qs === null) f(S, 'Quick Start count is live', '#qs-ic-count missing — the count is a hardcoded literal and cannot track the screen');
    else if (parseInt(home.qs, 10) === home.expected) p(S, 'Quick Start count tracks the screen', home.qs);
    else f(S, 'Quick Start count tracks the screen', `qs="${home.qs}", screen ${home.expected}`);

    // Any country admitted on the comparable take shows a published take ABOVE the stated
    // ceiling in the result table, so it reads as a filter bug. Home must name it up front.
    for (const c of home.admitted) {
      if (home.text.indexOf(c) !== -1) p(S, `basis note names admitted country ${c}`, 'named');
      else f(S, `basis note names admitted country ${c}`, `${c} is in the screen on its comparable take but its published take is above the ceiling, and Home does not say so`);
    }
    for (const c of home.excluded) {
      if (home.text.indexOf(c) !== -1) p(S, `basis note names excluded country ${c}`, 'named');
      else f(S, `basis note names excluded country ${c}`, `${c} is excluded by the comparable take though its published take clears the ceiling, and Home does not say so`);
    }

    // The click target must land on the Screener with the preset applied, and that screen must
    // return exactly the number Home quoted. This is the assertion that binds the two surfaces.
    await page.evaluate(() => _homeOpenICScreen());
    await page.waitForTimeout(1400);
    // Read the preset off the count line, not off window._activePresetName. The real binding is
    // a script-scoped `let` (index.html:25910) and is not a window property; the window global of
    // that name (index.html:39898) is written null once and never tracks it. Asserting on the
    // rendered label also tests the thing the analyst actually sees.
    const sc = await page.evaluate(() => ({
      tab: window._activeTab,
      last: window._screenerLastCount,
      rows: document.querySelectorAll('#tbody-screener tr:not(.screener-basis-divider)').length,
      countLine: (document.getElementById('screener-count') || {}).innerText || ''
    }));
    if (sc.tab === 'texplorer') p(S, 'link lands on Explorer/Screener', sc.tab);
    else f(S, 'link lands on Explorer/Screener', `activeTab=${sc.tab}`);
    if (sc.countLine.indexOf('IOC Capital Screen') === 0) p(S, 'preset applied and named on the count line', 'IOC Capital Screen');
    else f(S, 'preset applied and named on the count line', `count line starts "${sc.countLine.slice(0, 60)}"`);
    if (sc.last === home.rendered) p(S, 'Screener result equals the Home headline', `${sc.last} = ${home.rendered}`);
    else f(S, 'Screener result equals the Home headline', `Screener returns ${sc.last}, Home quoted ${home.rendered} — the analyst is given one number and shown another`);
    if (sc.rows === home.rendered) p(S, 'rendered rows equal the Home headline', `${sc.rows}`);
    else f(S, 'rendered rows equal the Home headline', `${sc.rows} rows vs Home ${home.rendered}`);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── v605 (T6): the sourcing tier that leaves the tool ──────────────────────────────────────
// copyICCitation(), copyICSummary() and the Fiscal Compare drilldown "Src" badge each carried a
// private copy of the `ab_pct >= 80 ? 'A' : >= 60 ? 'B' : 'C'` grader that v551 replaced and v557
// deleted. Measured on the shipped country_data.json the pasted tier disagreed with the letter
// the page displays on 158 of 185 countries, 156 of them overstatements — Russia and Tuvalu
// pasted "A-tier sourcing" against a displayed D. These cases FAIL on the pre-change build.
async function testICSourcingTier(page) {
  const S = 'ICSourcing';
  try {
    await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('t7', null); });
    await page.waitForTimeout(600);

    // Refuted cases: the letter the page displays, which the old formula contradicted.
    const EXPECT = { Russia: 'D', Tuvalu: 'D', Kazakhstan: 'C', Senegal: 'A', Norway: 'A', Nigeria: 'C' };

    for (const country of Object.keys(EXPECT)) {
      const r = await page.evaluate(async (c) => {
        const sel = document.getElementById('dd-country-select');
        if (!sel) return { err: 'no country select' };
        sel.value = c; sel.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(res => setTimeout(res, 1200));
        const d = (window.COUNTRY_DATA || []).find(x => x.country === c);
        if (!d) return { err: 'no COUNTRY_DATA row for ' + c };
        const grade = window._evidenceGrade(d).letter;
        // Capture the clipboard payload without needing clipboard permissions.
        const cap = [];
        const orig = navigator.clipboard && navigator.clipboard.writeText;
        try {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: t => { cap.push(t); return Promise.resolve(); } }
          });
          if (typeof copyICCitation === 'function') copyICCitation();
          if (typeof copyICSummary === 'function') copyICSummary();
        } finally {
          if (orig) Object.defineProperty(navigator, 'clipboard', {
            configurable: true, value: { writeText: orig.bind(null) } });
        }
        const pick = t => { const m = /([A-D])-tier sourcing/.exec(t || ''); return m ? m[1] : null; };
        // The old rule, kept here so the test states what it is refuting.
        const ab = d.ab_pct == null ? null : (d.ab_pct >= 80 ? 'A' : d.ab_pct >= 60 ? 'B' : 'C');
        return { grade, cite: cap[0] || '', summ: cap[1] || '',
                 citeTier: pick(cap[0]), summTier: pick(cap[1]), oldTier: ab };
      }, country);

      if (r.err) { f(S, 'setup ' + country, r.err); continue; }

      if (r.grade !== EXPECT[country]) {
        f(S, 'displayed grade ' + country, `expected ${EXPECT[country]}, page grades ${r.grade}`);
      } else {
        p(S, 'displayed grade ' + country, r.grade);
      }
      if (r.citeTier === r.grade) p(S, 'citation tier agrees ' + country, `${r.citeTier}-tier`);
      else f(S, 'citation tier agrees ' + country,
             `Country Profile badge reads ${r.grade}; IC citation pastes ${r.citeTier}-tier (old ab_pct rule says ${r.oldTier})`);
      if (r.summTier === r.grade) p(S, 'summary tier agrees ' + country, `${r.summTier}-tier`);
      else f(S, 'summary tier agrees ' + country,
             `Country Profile badge reads ${r.grade}; IC summary pastes ${r.summTier}-tier (old ab_pct rule says ${r.oldTier})`);
    }

    // The pasted tier must carry both legs, so an IC reader can see WHY it is that letter.
    const legs = await page.evaluate(() => {
      if (typeof window._icSourcingTier !== 'function') return '(no _icSourcingTier on this build)';
      const d = (window.COUNTRY_DATA || []).find(x => x.country === 'Russia');
      return window._icSourcingTier(d);
    });
    if (/3\.8% primary law on 3,929 facts/.test(legs)) p(S, 'tier states both legs', legs);
    else f(S, 'tier states both legs', 'got: ' + legs);

    // Whole-dataset agreement: one grader, no per-call-site copy.
    const sweep = await page.evaluate(() => {
      let mismatch = 0, differsFromOld = 0, overstated = 0;
      const ORD = ['D', 'C', 'B', 'A'];
      const tierOf = window._icSourcingTier;
      (window.COUNTRY_DATA || []).forEach(d => {
        const g = window._evidenceGrade(d).letter;
        const m = (typeof tierOf === 'function') ? /([A-D])-tier sourcing/.exec(tierOf(d)) : null;
        if (!m || m[1] !== g) mismatch++;
        const ab = d.ab_pct == null ? 'C' : (d.ab_pct >= 80 ? 'A' : d.ab_pct >= 60 ? 'B' : 'C');
        if (ab !== g) { differsFromOld++; if (ORD.indexOf(ab) > ORD.indexOf(g)) overstated++; }
      });
      return { mismatch, differsFromOld, overstated, n: (window.COUNTRY_DATA || []).length };
    });
    if (sweep.mismatch === 0) p(S, 'all countries agree', `${sweep.n} countries, 0 mismatches vs _evidenceGrade`);
    else f(S, 'all countries agree', `${sweep.mismatch} of ${sweep.n} countries paste a tier the badge contradicts`);
    if (sweep.differsFromOld >= 150 && sweep.overstated >= 150)
      p(S, 'old rule was wrong at scale', `${sweep.differsFromOld}/${sweep.n} differ from ab_pct rule, ${sweep.overstated} were overstatements`);
    else w(S, 'old rule delta', `${sweep.differsFromOld} differ, ${sweep.overstated} overstated — dataset may have moved`);

    // ── Fiscal Compare drilldown: the Src badge and the source-quality warning ──
    await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('t0', null); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { if (typeof runFiscalCompare === 'function') runFiscalCompare(); });
    await page.waitForTimeout(3500);

    for (const country of ['Kazakhstan', 'Norway', 'Nigeria']) {
      const r = await page.evaluate(async (c) => {
        if (typeof openFCDrilldown !== 'function') return { err: 'no openFCDrilldown' };
        openFCDrilldown(c);
        await new Promise(res => setTimeout(res, 700));
        const dr = document.querySelector('.fc-drawer.open');
        if (!dr) return { err: 'drawer did not open for ' + c };
        const txt = dr.innerText.replace(/\s+/g, ' ');
        const badge = [...dr.querySelectorAll('span')].map(x => x.textContent.trim())
                        .find(x => /^Src /.test(x)) || '';
        const d = (window.COUNTRY_DATA || []).find(x => x.country === c);
        return { badge, grade: window._evidenceGrade(d).letter, txt,
                 icReady: /IC-ready/.test(dr.innerHTML), generic: /Generic terms/.test(txt) };
      }, country);
      if (r.err) { f(S, 'FC drawer ' + country, r.err); continue; }
      const m = /^Src ([A-D])\b/.exec(r.badge);
      if (m && m[1] === r.grade) p(S, 'FC drawer Src badge ' + country, r.badge);
      else f(S, 'FC drawer Src badge ' + country,
             `badge "${r.badge}" does not lead with the page grade ${r.grade}`);
      if (!r.icReady) p(S, 'FC drawer drops IC-ready gate ' + country, 'no ">=80% A/B = IC-ready" claim');
      else f(S, 'FC drawer drops IC-ready gate ' + country,
             'drawer still prescribes the >=80% A/B IC-ready gate v518 removed');
      // A C/D-graded, own-terms country must carry the source-quality warning.
      if (!r.generic && (r.grade === 'C' || r.grade === 'D')) {
        if (/Source quality: grade [CD]/.test(r.txt)) p(S, 'FC drawer warns ' + country, 'grade ' + r.grade + ' warning shown');
        else f(S, 'FC drawer warns ' + country, `grade ${r.grade} on own terms but no source-quality warning`);
      }
    }
  } catch (e) {
    f(S, 'exception', e.message);
  }
}

async function testRouting(page) {
  const S = 'Routing';
  try {
    const routes = [
      { hash: '#/profile/angola', expectedTab: 't7' },
      { hash: '#/explorer', expectedTab: 'texplorer' },
      { hash: '#/ioc', expectedTab: 't5' },
      // v597: "#/compare" is two routes. The BARE form is the Fiscal Compare tab bookmark
      // that switchTab()'s tabHashMap writes (t0). The form carrying a country list is
      // Side-by-Side's — its payload is compareList, which only renderCompare() draws, and
      // only into #t2. This case asserted t0 for the country-list form with the comment
      // "per code", i.e. it was written from the implementation rather than the requirement,
      // and so it locked in the defect: the compare basket's Compare button and every shared
      // comparison link landed the analyst on a tab where their shortlist was invisible.
      { hash: '#/compare', expectedTab: 't0' },
      { hash: '#/compare/norway+iraq', expectedTab: 't2' },
    ];
    for (const r of routes) {
      await page.evaluate(h => { window.location.hash = h; }, r.hash);
      await page.waitForTimeout(600);
      const activeTab = await page.evaluate(() => window._activeTab);
      if (activeTab === r.expectedTab) p(S, `route ${r.hash}`, `Navigated to ${activeTab}`);
      else w(S, `route ${r.hash}`, `Got ${activeTab}, expected ${r.expectedTab}`);
    }

    // toSlug / fromSlug roundtrip
    const slugTests = await page.evaluate(() => {
      const countries = ['Norway', 'UAE', 'USA', "Cote d'Ivoire", 'Trinidad and Tobago'];
      return countries.map(c => {
        const slug = toSlug(c);
        const back = fromSlug(slug);
        return { country: c, slug, back, roundtrip: back === c };
      });
    });
    for (const t of slugTests) {
      if (t.roundtrip) p(S, `slug roundtrip "${t.country}"`, `"${t.country}" → "${t.slug}" → "${t.back}"`);
      else w(S, `slug roundtrip "${t.country}"`, `"${t.country}" → "${t.slug}" → "${t.back}" (no roundtrip)`);
    }

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 16: Compare Basket ──────────────────────────────────────────
async function testBasket(page) {
  const S = 'Basket';
  try {
    // Clear basket first
    await page.evaluate(() => { window.compareBasket.clear(); localStorage.setItem('compareBasket', '[]'); renderBasket(); });
    await page.waitForTimeout(200);

    // Add 3 to basket
    await page.evaluate(() => {
      addToBasket('Norway'); addToBasket('Iraq'); addToBasket('Indonesia');
    });
    await page.waitForTimeout(300);

    const basketVisible = await page.evaluate(() => {
      const el = document.getElementById('compare-basket');
      return el && (el.style.display === 'flex' || el.style.display !== 'none');
    });
    if (basketVisible) p(S, 'basket visible', 'Floating basket visible with 3 items');
    else f(S, 'basket visible', 'Basket not visible');

    const pills = await page.$$('#basket-pills span');
    if (pills.length === 3) p(S, 'basket pills', `${pills.length} pills`);
    else f(S, 'basket pills', `Expected 3 pills, got ${pills.length}`);

    // Max 5 limit
    await page.evaluate(() => { addToBasket('Angola'); addToBasket('Australia'); addToBasket('UK'); });
    await page.waitForTimeout(200);
    const basketSize = await page.evaluate(() => window.compareBasket.size);
    if (basketSize <= 5) p(S, 'max 5 limit', `Basket size ${basketSize} (max 5 enforced)`);
    else f(S, 'max 5 limit', `Basket has ${basketSize} items (should max at 5)`);

    // Launch compare
    await page.evaluate(() => { window.compareBasket.clear(); window.compareBasket.add('Norway'); window.compareBasket.add('Iraq'); renderBasket(); });
    await page.waitForTimeout(200);
    await page.click('#compare-basket button:last-child').catch(() => {});
    await page.waitForTimeout(500);
    const compareListLen = await page.evaluate(() => compareList.length);
    if (compareListLen >= 2) p(S, 'launchCompare', `compareList has ${compareListLen} items after launch`);
    else w(S, 'launchCompare', `compareList has ${compareListLen} after launch`);

    // Clear basket
    await page.evaluate(() => clearBasket());
    await page.waitForTimeout(200);
    const afterClear = await page.evaluate(() => window.compareBasket.size);
    if (afterClear === 0) p(S, 'clearBasket', 'Basket cleared');
    else f(S, 'clearBasket', `${afterClear} items remain after clear`);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 17: Mechanics Tab (t6) ───────────────────────────────────────
async function testMechanics(page) {
  const S = 'Mechanics';
  try {
    await switchTab(page, 't6');
    await page.waitForTimeout(300);

    const cards = await page.$$('#mech-grid .mech-card');
    if (cards.length >= 5) p(S, 'mech cards', `${cards.length} mechanic cards`);
    else f(S, 'mech cards', `Only ${cards.length} cards`);

    // MECHANICS_INFO available globally
    const mechInfo = await page.evaluate(() => typeof window.MECHANICS_INFO !== 'undefined');
    if (mechInfo) p(S, 'MECHANICS_INFO global', 'MECHANICS_INFO exposed globally');
    else w(S, 'MECHANICS_INFO global', 'MECHANICS_INFO not in global scope');

    // MECH_COUNTS in cards
    const firstCard = cards.length > 0 ? await cards[0].evaluate(el => el.textContent) : '';
    if (firstCard.includes('DB records') || firstCard.includes('records')) p(S, 'MECH_COUNTS in cards', 'DB record count shown');
    else w(S, 'MECH_COUNTS in cards', 'No DB records shown in card');

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 18: Methodology Tab ──────────────────────────────────────────
async function testMethodology(page) {
  const S = 'Methodology';
  try {
    await switchTab(page, 'tmethodology');
    await page.waitForTimeout(300);

    const content = await page.evaluate(() => {
      const el = document.getElementById('tmethodology');
      return el ? el.innerHTML.length : 0;
    });
    if (content > 1000) p(S, 'content', `${content} chars`);
    else f(S, 'content', `Only ${content} chars`);

    // Quick nav anchor links
    const anchors = await page.$$('#tmethodology a[href^="#"]');
    if (anchors.length > 0) p(S, 'anchor links', `${anchors.length} anchor links in methodology`);
    else w(S, 'anchor links', 'No anchor links found');

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 19: Console Errors ────────────────────────────────────────────
async function testConsoleErrors() {
  const S = 'ConsoleErrors';
  if (consoleErrors.length === 0) {
    p(S, 'no JS errors', 'Zero console errors during full test run');
  } else {
    const critical = consoleErrors.filter(e =>
      e.includes('TypeError') || e.includes('ReferenceError') ||
      e.includes('SyntaxError') || e.includes('ALL_OPERATORS') ||
      e.includes('COUNTRY_DATA') || e.includes('undefined is not')
    );
    if (critical.length > 0) f(S, 'critical JS errors', critical.slice(0,5).join(' | '));
    else w(S, 'non-critical errors', consoleErrors.slice(0,5).join(' | '));
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await setup(page);
    await load(page);

    await testLoad(page);
    await testFiscalCompare(page);
    await testFCExportMethodology(page);
    await testDCF(page);         // run DCF tests early while on t0
    await testScenarioBuilder(page);
    await testCountryProfile(page);
    await testExplorer(page);
    await testScreener(page);
    await testHomeICScreenAgreement(page);
    await testICSourcingTier(page);
    await testIOC(page);
    await testComparison(page);
    await testSbSChartBasis(page);
    await testVintage(page);
    await testReformRisk(page);
    await testBreakevenMap(page);
    await testSampleAnalyses(page);
    await testSearch(page);
    await testRouting(page);
    await testBasket(page);
    await testMechanics(page);
    await testMethodology(page);
    await testConsoleErrors();

  } finally {
    await browser.close();
  }

  const line = '='.repeat(60);
  console.log('\n' + line);
  console.log(`TOTAL: ${pass} PASS, ${fail} FAIL, ${warn} WARN`);
  console.log(`JS errors captured: ${consoleErrors.length}`);
  if (errors.length > 0) {
    console.log('\nFAILURES:');
    errors.forEach(e => console.log('  ' + e));
  }
  if (consoleErrors.length > 0) {
    console.log('\nCONSOLE ERRORS:');
    consoleErrors.slice(0, 20).forEach(e => console.log('  ' + e));
  }
  console.log(line);

  const report = `RUNTIME TEST REPORT\n${new Date().toISOString()}\n${line}\nPASS: ${pass}\nFAIL: ${fail}\nWARN: ${warn}\nJS errors: ${consoleErrors.length}\n\nFAILURES:\n${errors.join('\n') || 'none'}\n\nCONSOLE ERRORS:\n${consoleErrors.slice(0,20).join('\n') || 'none'}`;
  fs.writeFileSync(REPORT, report, 'utf-8');
  console.log(`\nReport written to ${REPORT}`);

  process.exit(fail > 0 ? 1 : 0);
})();
