const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 }
  });
  const page = await context.newPage();

  // 1. Log in as admin
  console.log('Logging in as admin at http://localhost:5173/account ...');
  await page.goto('http://localhost:5173/account', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[placeholder="name@example.com"]');
  if (await emailInput.count() > 0) {
    await emailInput.fill('admin.wenzy@gmail.com');
    const passInput = page.locator('input[placeholder="••••••••"]');
    await passInput.fill('Admin@Wenzy2026!');
    await page.click('button:has-text("SIGN IN")');
    await page.waitForTimeout(2000);
  }

  // 2. Navigate to Admin Products
  console.log('Navigating to http://localhost:5173/admin/products ...');
  await page.goto('http://localhost:5173/admin/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_admin_products_rack_badges.png'),
    fullPage: false
  });
  console.log('Saved wenzy_admin_products_rack_badges.png');

  // 3. Open Add New Product modal
  console.log('Opening Add New Product modal...');
  const addBtn = page.locator('button:has-text("Add New Product")');
  await addBtn.click();
  await page.waitForTimeout(1000);

  // Toggle "Feature on WENZY RACK"
  const rackCheckbox = page.locator('input#in_clothing_rail');
  await rackCheckbox.scrollIntoViewIfNeeded();
  await rackCheckbox.check();
  await page.waitForTimeout(800);

  // Scroll to show the WENZY RACK 3 cutout upload slots
  await page.evaluate(() => {
    const el = document.querySelector('input#in_clothing_rail');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_admin_product_rack_modal.png'),
    fullPage: false
  });
  console.log('Saved wenzy_admin_product_rack_modal.png');

  await browser.close();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
