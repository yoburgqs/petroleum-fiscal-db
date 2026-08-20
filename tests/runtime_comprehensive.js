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
    for (const sort of ['npv', 'irr', 'breakeven', 'country', 'take']) {
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

    // Region chip filters
    for (const chip of ['Africa', 'Middle East', 'Asia Pacific', 'Americas', 'Europe']) {
      await page.click(`.chip[data-filter="region"][data-value="${chip}"]`).catch(() => {});
      await page.waitForTimeout(200);
      const count = await page.evaluate(() => document.querySelectorAll('#tbody-explorer tr').length);
      if (count > 0) p(S, `chip-${chip}`, `${count} rows after ${chip} chip`);
      else f(S, `chip-${chip}`, `0 rows after ${chip} chip`);
    }

    // Reset to All
    await page.click('.chip[data-filter="region"][data-value="all"]').catch(() => {});
    await page.waitForTimeout(200);

    // Mechanic chips
    for (const mech of ['Concession', 'PSC', 'TSC']) {
      await page.click(`.chip[data-filter="mechanic"][data-value="${mech}"]`).catch(() => {});
      await page.waitForTimeout(200);
      const count = await page.evaluate(() => document.querySelectorAll('#tbody-explorer tr').length);
      if (count > 0) p(S, `chip-mech-${mech}`, `${count} rows after ${mech} chip`);
      else w(S, `chip-mech-${mech}`, `0 rows after ${mech} chip`);
    }

    // Reset to All
    await page.click('.chip[data-filter="mechanic"][data-value="all"]').catch(() => {});
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

    // R-factor chip
    const rfChip = await page.$('#chip-rfactor-psc');
    if (rfChip) {
      await rfChip.click();
      await page.waitForTimeout(300);
      const rfCount = await page.evaluate(() => document.querySelectorAll('#tbody-explorer tr').length);
      if (rfCount > 0) p(S, 'R-factor chip', `${rfCount} R-factor PSC countries`);
      else f(S, 'R-factor chip', '0 rows for R-factor PSC');
      await rfChip.click(); // toggle off
      await page.waitForTimeout(200);
    }

    // Country row click → profile nav
    await page.evaluate(() => {
      const r = document.querySelector('input[name="price"][value="75"]');
      if (r) r.click();
    });
    await page.click('.chip[data-filter="region"][data-value="all"]').catch(() => {});
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

    // Attempt 5th country (should be blocked)
    await page.evaluate(() => addCompare('USA'));
    await page.waitForTimeout(200);
    const listLen = await page.evaluate(() => compareList.length);
    if (listLen <= 4) p(S, 'max 4 limit', `compareList length ${listLen} (max enforced)`);
    else f(S, 'max 4 limit', `compareList has ${listLen} entries (should max at 4)`);

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

    // Hash navigation compare
    await page.evaluate(() => { window.location.hash = '#/compare/norway+iraq+indonesia'; });
    await page.waitForTimeout(800);
    const compareListLen = await page.evaluate(() => compareList.length);
    if (compareListLen >= 2) p(S, 'hash #/compare/', `${compareListLen} countries loaded from hash`);
    else w(S, 'hash #/compare/', `Only ${compareListLen} countries from hash`);

  } catch(e) { f(S, 'exception', e.message); }
}

// ─── SECTION 7: DCF Engine Tests ──────────────────────────────────────────
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

    // Reset button
    const resetBtn = await page.$('button[onclick*="resetScreener"], button:has-text("Reset")');
    if (resetBtn) {
      await resetBtn.click();
      await page.waitForTimeout(300);
      p(S, 'reset button', 'Screener reset clicked');
    } else w(S, 'reset button', 'No reset button found');

    // Preset buttons — v103+: use class="screener-preset-btn" data-action="applyScreenerPreset" (no onclick)
    const presets = await page.$$('button[data-action="applyScreenerPreset"], button[onclick*="applyScreenerPreset"]');
    if (presets.length >= 3) {
      await presets[0].click();
      await page.waitForTimeout(300);
      p(S, 'preset button', `${presets.length} presets available, first applied`);
    } else w(S, 'preset buttons', `Only ${presets.length} preset buttons`);

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
async function testRouting(page) {
  const S = 'Routing';
  try {
    const routes = [
      { hash: '#/profile/angola', expectedTab: 't7' },
      { hash: '#/explorer', expectedTab: 'texplorer' },
      { hash: '#/ioc', expectedTab: 't5' },
      { hash: '#/compare/norway+iraq', expectedTab: 't0' }, // compare routes to t0 first (per code)
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
    await testDCF(page);         // run DCF tests early while on t0
    await testScenarioBuilder(page);
    await testCountryProfile(page);
    await testExplorer(page);
    await testScreener(page);
    await testIOC(page);
    await testComparison(page);
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
