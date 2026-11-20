const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  // Desktop
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1000);
  const catSection = await desktop.$('section:has-text("CATEGORIES")');
  if (catSection) {
    const shot = path.join(ARTIFACT_DIR, 'categories_desktop_section_view.png');
    await catSection.screenshot({ path: shot });
    console.log(`Saved element shot: ${shot}`);
  }
  await desktop.close();

  // Mobile
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1000);
  const catSectionMobile = await mobile.$('section:has-text("CATEGORIES")');
  if (catSectionMobile) {
    const shotMobile = path.join(ARTIFACT_DIR, 'categories_mobile_section_view.png');
    await catSectionMobile.screenshot({ path: shotMobile });
    console.log(`Saved element shot: ${shotMobile}`);
  }
  await mobile.close();

  await browser.close();
})();
