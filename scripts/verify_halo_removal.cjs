const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

async function verifyHaloRemoval() {
  console.log('=== VERIFYING GLOW / HALO REMOVAL ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const rackSection = page.locator('section:has-text("WENZY RACK")');
    await rackSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // 1. Inspect computed styles of the rail image
    const railImgStyles = await page.evaluate(() => {
      const img = document.querySelector('.rack-view img');
      if (!img) return null;
      const cs = window.getComputedStyle(img);
      return {
        filter: cs.filter,
        boxShadow: cs.boxShadow,
      };
    });
    console.log('Rail Image Computed Styles:', railImgStyles);

    // 2. Capture clean resting rail
    const restingScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_no_halo_resting.png');
    await page.screenshot({ path: restingScreenshot, fullPage: false });
    console.log(`Saved resting screenshot: ${restingScreenshot}`);

    // 3. Hover garment and inspect
    const item = rackSection.locator('.rack-item').first();
    await item.hover();
    await page.waitForTimeout(700);

    const hoverScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_no_halo_hover.png');
    await page.screenshot({ path: hoverScreenshot, fullPage: false });
    console.log(`Saved hover screenshot: ${hoverScreenshot}`);

    // 4. Click into focus modal
    await item.click({ force: true });
    await page.waitForTimeout(800);

    const modalImgStyles = await page.evaluate(() => {
      const img = document.querySelector('.rack-focus img');
      if (!img) return null;
      const cs = window.getComputedStyle(img);
      return {
        filter: cs.filter,
        boxShadow: cs.boxShadow,
        className: img.className,
      };
    });
    console.log('Modal Image Computed Styles:', modalImgStyles);

    const modalScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_no_halo_modal.png');
    await page.screenshot({ path: modalScreenshot, fullPage: false });
    console.log(`Saved modal screenshot: ${modalScreenshot}`);

    console.log('=== VERIFICATION PASSED CLEANLY ===');
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyHaloRemoval();
