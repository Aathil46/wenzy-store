const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  // Desktop view
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Scroll to find collections section
  const section = await page.$('section:has-text("Shop the Edit")');
  console.log('Collections section found:', !!section);
  if (section) {
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await section.screenshot({ path: path.join(ARTIFACT_DIR, 'collections_desktop_section.png') });
    console.log('Saved desktop section screenshot');
  }

  // Mobile view
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(2000);

  const mobileSection = await mobile.$('section:has-text("Shop the Edit")');
  if (mobileSection) {
    await mobileSection.scrollIntoViewIfNeeded();
    await mobile.waitForTimeout(500);
    await mobileSection.screenshot({ path: path.join(ARTIFACT_DIR, 'collections_mobile_section.png') });
    console.log('Saved mobile section screenshot');
  }

  await browser.close();
})();
