const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/admin/collections';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Set localStorage auth session so admin is authenticated if needed
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Fill login
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.fill('admin.wenzy@gmail.com');
    await page.fill('input[type="password"]', 'Admin@Wenzy2026!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  // Navigate to admin collections
  await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_collections_page.png'), fullPage: true });
  console.log('Saved admin collections page screenshot');

  // Also navigate to admin products
  await page.goto('http://localhost:5173/admin/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Click first edit button to open modal
  const editBtn = await page.$('button[title="Edit Product"]');
  if (editBtn) {
    await editBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_product_edit_modal.png') });
    console.log('Saved admin product edit modal screenshot');
  }

  await browser.close();
})();
