const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Check Homepage
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Check if ZERO BLEED or 240+ GSM text exists anywhere on the page
  const content = await page.content();
  const hasZeroBleed = content.includes('ZERO BLEED');
  const hasBoxyCut = content.includes('BOXY CUT');
  console.log('Homepage contains ZERO BLEED:', hasZeroBleed);
  console.log('Homepage contains BOXY CUT:', hasBoxyCut);

  // Scroll to where the section used to be (below collections)
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'home_after_section_removal.png') });
  console.log('1. Saved homepage screenshot after section removal');

  // 2. Check PDP Description
  await page.goto('http://localhost:5173/product/doom-black', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const el = document.getElementById('accordion-description');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_after_section_removal.png') });
  console.log('2. Saved PDP description screenshot');

  await page.close();
  await browser.close();
  console.log('Verification completed successfully!');
})();
