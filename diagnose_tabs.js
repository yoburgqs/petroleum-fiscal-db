const { chromium } = require('playwright');

const URL = 'https://yoburgqs.github.io/petroleum-fiscal-db/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  // Capture console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Check REFORM_HISTORY and COUNTRY_DATA
  const dataStatus = await page.evaluate(() => ({
    rhKeys: typeof REFORM_HISTORY !== 'undefined' ? Object.keys(REFORM_HISTORY).length : 'UNDEFINED',
    cdLen: typeof COUNTRY_DATA !== 'undefined' ? COUNTRY_DATA.length : 'UNDEFINED',
    platformLoaded: window._platformDataLoaded
  }));
  console.log('Data status:', JSON.stringify(dataStatus));

  // Switch to Reform Risk
  await page.evaluate(() => {
    const btn = document.getElementById('tab-btn-treformrisk');
    if (btn) btn.click();
  });
  await page.waitForTimeout(3000);

  const rrStatus = await page.evaluate(() => {
    const container = document.getElementById('reform-risk-content');
    return {
      exists: !!container,
      innerHTML_length: container ? container.innerHTML.length : 0,
      innerHTML_preview: container ? container.innerHTML.substring(0, 200) : 'MISSING',
      panelActive: document.getElementById('treformrisk')?.classList.contains('active')
    };
  });
  console.log('Reform Risk status:', JSON.stringify(rrStatus));

  // Switch to Breakeven Map
  await page.evaluate(() => {
    const btn = document.getElementById('tab-btn-tbreakevenmap');
    if (btn) btn.click();
  });
  await page.waitForTimeout(3000);

  const beStatus = await page.evaluate(() => {
    const svg = document.getElementById('breakeven-map-svg');
    const container = document.getElementById('breakeven-map-container');
    return {
      svgPaths: svg ? svg.querySelectorAll('path').length : 0,
      containerHTML_len: container ? container.innerHTML.length : 0,
      containerHTML_preview: container ? container.innerHTML.substring(0, 200) : 'MISSING',
      d3Available: typeof d3 !== 'undefined'
    };
  });
  console.log('Breakeven Map status:', JSON.stringify(beStatus));

  console.log('Console errors:', errors.length ? errors : 'none');
  await browser.close();
})();
