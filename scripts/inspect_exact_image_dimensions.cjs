const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Pass in memory
const PASSWORD = '1';

async function inspectAssets() {
  console.log('Launching browser to inspect https://nike-makknzjs.myshopify.com/ ...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Navigate to site
  await page.goto('https://nike-makknzjs.myshopify.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Handle password gate if present
  if (page.url().includes('/password')) {
    console.log('Resolving password challenge...');
    const pwInput = page.locator('input[type="password"]');
    await pwInput.fill(PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.keyboard.press('Enter')
    ]);
    console.log('Unlocked site, current URL:', page.url());
  }

  await page.waitForTimeout(3000);

  // Extract all clothing rail products and image information
  const railData = await page.evaluate(() => {
    const results = [];
    // Search for clothing rail section
    const sec = document.querySelector('.sr-sec, section[data-sr-rail]');
    const items = document.querySelectorAll('.sr-item');

    items.forEach((item, idx) => {
      const name = item.getAttribute('data-name') || item.querySelector('.sr-name')?.innerText || `Item ${idx+1}`;
      const price = item.getAttribute('data-price') || item.querySelector('.sr-tag')?.innerText || '';

      const sideImg = item.querySelector('[data-sr-pos="0"] img, .sr-view[data-sr-pos="0"] img');
      const frontImg = item.querySelector('[data-sr-pos="1"] img, .sr-view[data-sr-pos="1"] img');
      const backImg = item.querySelector('[data-sr-pos="-1"] img, .sr-view[data-sr-pos="-1"] img');

      results.push({
        name,
        price,
        side: sideImg ? {
          src: sideImg.currentSrc || sideImg.src,
          attrWidth: sideImg.getAttribute('width'),
          attrHeight: sideImg.getAttribute('height'),
          naturalWidth: sideImg.naturalWidth,
          naturalHeight: sideImg.naturalHeight,
          clientWidth: sideImg.clientWidth,
          clientHeight: sideImg.clientHeight,
        } : null,
        front: frontImg ? {
          src: frontImg.currentSrc || frontImg.src,
          attrWidth: frontImg.getAttribute('width'),
          attrHeight: frontImg.getAttribute('height'),
          naturalWidth: frontImg.naturalWidth,
          naturalHeight: frontImg.naturalHeight,
          clientWidth: frontImg.clientWidth,
          clientHeight: frontImg.clientHeight,
        } : null,
        back: backImg ? {
          src: backImg.currentSrc || backImg.src,
          attrWidth: backImg.getAttribute('width'),
          attrHeight: backImg.getAttribute('height'),
          naturalWidth: backImg.naturalWidth,
          naturalHeight: backImg.naturalHeight,
          clientWidth: backImg.clientWidth,
          clientHeight: backImg.clientHeight,
        } : null,
      });
    });

    return results;
  });

  console.log(`Found ${railData.length} rail items.`);
  console.log(JSON.stringify(railData, null, 2));

  // Save the raw json data for inspection
  fs.writeFileSync('scripts/nike_rail_images_raw.json', JSON.stringify(railData, null, 2));

  await browser.close();
}

inspectAssets().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
