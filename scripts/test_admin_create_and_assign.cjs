const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 1. Sign in as admin
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.fill('admin.wenzy@gmail.com');
    await page.fill('input[type="password"]', 'Admin@Wenzy2026!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  // 2. Go to collections
  await page.goto('http://localhost:5173/admin/collections', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Helper to create collection
  async function createCollection(name) {
    console.log('Creating collection:', name);
    await page.click('button:has-text("New Collection"), button:has-text("Create Collection")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="Trending"]', name);
    await page.click('button[type="submit"]:has-text("Create Collection")');
    await page.waitForTimeout(1500);
  }

  // Create Trend, Marvel, Pants, Polos, Linen
  await createCollection('Trend');
  await createCollection('Marvel');
  await createCollection('Pants');
  await createCollection('Polos');
  await createCollection('Linen');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_collections_created.png') });
  console.log('Saved admin collections created screenshot');

  // 3. Assign products to collections
  await page.goto('http://localhost:5173/admin/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Assign first product to "Marvel"
  const editButtons = await page.$$('button[title="Edit Product"]');
  console.log('Found edit buttons:', editButtons.length);
  if (editButtons.length > 0) {
    await editButtons[0].click();
    await page.waitForTimeout(1000);
    // Select Marvel in collection dropdown
    const select = await page.$('select:has-text("No Collection")');
    if (select) {
      // Find Marvel option value
      const marvelOption = await page.$('select option:has-text("Marvel")');
      if (marvelOption) {
        const val = await marvelOption.getAttribute('value');
        console.log('Marvel value:', val);
        await select.selectOption(val);
      }
    }
    await page.click('button[type="submit"]:has-text("Update") , button:has-text("Save Product"), form button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('Updated product 1 with Marvel collection');
  }

  // Also assign second product to "Marvel"
  const editButtons2 = await page.$$('button[title="Edit Product"]');
  if (editButtons2.length > 1) {
    await editButtons2[1].click();
    await page.waitForTimeout(1000);
    const select = await page.$('select:has-text("No Collection")');
    if (select) {
      const marvelOption = await page.$('select option:has-text("Marvel")');
      if (marvelOption) {
        const val = await marvelOption.getAttribute('value');
        await select.selectOption(val);
      }
    }
    await page.click('button[type="submit"]:has-text("Update") , button:has-text("Save Product"), form button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('Updated product 2 with Marvel collection');
  }

  // Assign third product to "Trend"
  const editButtons3 = await page.$$('button[title="Edit Product"]');
  if (editButtons3.length > 2) {
    await editButtons3[2].click();
    await page.waitForTimeout(1000);
    const select = await page.$('select:has-text("No Collection")');
    if (select) {
      const trendOption = await page.$('select option:has-text("Trend")');
      if (trendOption) {
        const val = await trendOption.getAttribute('value');
        await select.selectOption(val);
      }
    }
    await page.click('button[type="submit"]:has-text("Update") , button:has-text("Save Product"), form button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('Updated product 3 with Trend collection');
  }

  await browser.close();
})();
