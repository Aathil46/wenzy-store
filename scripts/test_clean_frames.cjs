const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  // 1. Homepage Collections section: Check clean frames (no fit badge, no fabric badge)
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1500);

  const colSection = await desktop.$('section:has-text("Collections")');
  if (colSection) {
    await colSection.scrollIntoViewIfNeeded();
    await desktop.waitForTimeout(500);
    await colSection.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_collection_frames.png') });
    console.log('Saved clean collection frames');
  }

  // 2. Desktop PDP: Thumbnails on left, single primary image on right, no badges
  await desktop.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1500);

  // Top view
  await desktop.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_desktop_pdp_top.png') });
  console.log('Saved clean desktop PDP top');

  // Click on second visible desktop thumbnail
  const desktopThumbs = await desktop.$$('.hidden.lg\\:flex button');
  console.log('Desktop thumbs found:', desktopThumbs.length);
  if (desktopThumbs.length > 1) {
    await desktopThumbs[1].click();
    await desktop.waitForTimeout(500);
    await desktop.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_desktop_pdp_thumb2_selected.png') });
    console.log('Saved clean desktop PDP thumb 2 selected');
  }

  // Scroll down by 400px to verify sticky details on right
  await desktop.evaluate(() => window.scrollBy(0, 400));
  await desktop.waitForTimeout(500);
  await desktop.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_desktop_pdp_scrolled.png') });
  console.log('Saved clean desktop PDP scrolled');

  await desktop.close();

  // 3. Mobile PDP: Swipe carousel with dots, no badge overlays
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1500);

  await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'clean_mobile_pdp.png') });
  console.log('Saved clean mobile PDP');

  await mobile.close();
  await browser.close();
})();
