const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  // Mobile viewport: 390 x 844
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1500);

  const mobileSec = await mobile.$('section:has-text("Collections")');
  if (mobileSec) {
    await mobileSec.scrollIntoViewIfNeeded();
    await mobile.waitForTimeout(500);
    await mobileSec.screenshot({ path: path.join(ARTIFACT_DIR, 'storefront_mobile_collections_tabs.png') });
    console.log('Saved mobile collections with tabs');

    // Click Marvel tab
    const marvelTab = await mobileSec.$('button:has-text("Marvel")');
    if (marvelTab) {
      await marvelTab.click();
      await mobile.waitForTimeout(500);
      await mobileSec.screenshot({ path: path.join(ARTIFACT_DIR, 'storefront_mobile_marvel_tab_active.png') });
      console.log('Saved mobile Marvel tab active');
    }
  } else {
    console.log('Mobile collections section NOT found');
  }

  // Desktop viewport
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1500);

  const desktopSec = await desktop.$('section:has-text("Collections")');
  if (desktopSec) {
    await desktopSec.scrollIntoViewIfNeeded();
    await desktop.waitForTimeout(500);
    await desktopSec.screenshot({ path: path.join(ARTIFACT_DIR, 'storefront_desktop_collections_tabs.png') });
    console.log('Saved desktop collections with tabs');
  } else {
    console.log('Desktop collections section NOT found');
  }

  await browser.close();
})();
