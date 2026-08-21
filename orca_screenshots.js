const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'https://yoburgqs.github.io/petroleum-fiscal-db/';
const OUT = 'C:/tmp/orca_screenshots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log('shot:', name);
}

async function tab(page, id) {
  await page.evaluate((id) => {
    const btn = document.getElementById('tab-btn-' + id);
    if (btn) btn.click();
  }, id);
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 1. Home
  await shot(page, '01_home');

  // 2. FC empty state
  await tab(page, 't0');
  await shot(page, '02_fc_empty');

  // 3. FC results
  await page.evaluate(() => { document.getElementById('fc-run-btn')?.click(); });
  await page.waitForTimeout(4000);
  await shot(page, '03_fc_results');

  // 4. FC row drilldown
  await page.evaluate(() => { document.querySelector('#fc-results tbody tr')?.click(); });
  await page.waitForTimeout(1000);
  await shot(page, '04_fc_drilldown');

  // 5. Country Profile
  await tab(page, 't7');
  await page.evaluate(() => loadCountryProfile && loadCountryProfile('Norway'));
  await page.waitForTimeout(3000);
  await shot(page, '05_country_profile_top');
  await page.evaluate(() => { document.getElementById('t7').scrollTop = 700; });
  await page.waitForTimeout(300);
  await shot(page, '06_country_profile_mid');

  // 6. Explorer
  await page.evaluate(() => { document.getElementById('tab-btn-texplorer')?.click() || document.getElementById('tab-btn-tscreener')?.click(); });
  await page.waitForTimeout(1500);
  await shot(page, '07_explorer');

  // 7. Screener with preset
  await page.evaluate(() => {
    switchExplorerMode && switchExplorerMode('screen');
    setTimeout(() => applyScreenerPreset && applyScreenerPreset('sweetspot'), 300);
  });
  await page.waitForTimeout(2000);
  await shot(page, '08_screener');

  // 8. Side by Side
  await tab(page, 't2');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const trio = btns.find(b => b.textContent.includes('North Sea'));
    if (trio) trio.click();
  });
  await page.waitForTimeout(3000);
  await shot(page, '09_side_by_side');

  // 9. IOC Portfolio
  await tab(page, 't5');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const shell = btns.find(b => b.textContent.trim() === 'Shell');
    if (shell) shell.click();
  });
  await page.waitForTimeout(2500);
  await shot(page, '10_ioc_shell');

  // 10. Reform Risk
  await tab(page, 'treformrisk');
  await page.waitForTimeout(3000);
  await shot(page, '11_reform_risk');

  // 11. Breakeven Map
  await tab(page, 'tbreakevenmap');
  await page.waitForTimeout(3000);
  await shot(page, '12_breakeven_map');

  await browser.close();
  console.log('Done. Screenshots in', OUT);
})();
