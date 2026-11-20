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
  page.on('dialog', async d => await d.accept());

  await page.goto(`${LOCAL_URL}login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin.wenzy@gmail.com');
  await page.fill('input[type="password"]', 'Admin@Wenzy2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${LOCAL_URL}admin/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const adminShot = path.join(ARTIFACT_DIR, 'admin_products_with_duplicate.png');
  await page.screenshot({ path: adminShot, fullPage: false });
  console.log(`Saved screenshot: ${adminShot}`);

  await browser.close();
})();
