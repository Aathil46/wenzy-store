const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const rackSection = page.locator('section:has-text("WENZY RACK")');
  await rackSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  const desktopShot = path.join(ARTIFACT_DIR, 'wenzy_rack_desktop_verified.png');
  await page.screenshot({ path: desktopShot, fullPage: false });
  console.log(`Saved screenshot: ${desktopShot}`);

  await browser.close();
})();
