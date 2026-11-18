const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 }
  });
  const page = await context.newPage();

  // 1. Visit Storefront Home
  console.log('Visiting Storefront Home: http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Scroll to WENZY RACK
  const rackTitle = page.locator('h2:has-text("WENZY RACK")');
  await rackTitle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_rack_live_storefront_rail.png'),
    fullPage: false
  });
  console.log('Saved wenzy_rack_live_storefront_rail.png');

  // Click on the visible garment cutout directly
  console.log('Opening focus modal...');
  const visibleHanger = page.locator('text=OVERSIZED ACID WASH HOODIE').nth(1);
  await visibleHanger.click({ force: true });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_rack_live_focus_modal.png'),
    fullPage: false
  });
  console.log('Saved wenzy_rack_live_focus_modal.png');

  // Click the "Back" angle button in the modal to test 3D flip
  console.log('Testing 3D Back flip...');
  const backBtn = page.locator('button:has-text("Back")');
  await backBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_rack_live_focus_modal_back.png'),
    fullPage: false
  });
  console.log('Saved wenzy_rack_live_focus_modal_back.png');

  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // 2. Sign in as Admin and visit /admin/products
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

  console.log('Navigating to http://localhost:5173/admin/products ...');
  await page.goto('http://localhost:5173/admin/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_admin_products_rack_header.png'),
    fullPage: false
  });
  console.log('Saved wenzy_admin_products_rack_header.png');

  // Click "+ Add to WENZY RACK" button
  console.log('Opening Add to WENZY RACK modal...');
  const addRackBtn = page.locator('button:has-text("+ Add to WENZY RACK")');
  await addRackBtn.click();
  await page.waitForTimeout(1000);

  // Scroll to the WENZY RACK section inside the modal
  await page.evaluate(() => {
    const el = document.querySelector('input#in_clothing_rail');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_admin_rack_modal_open.png'),
    fullPage: false
  });
  console.log('Saved wenzy_admin_rack_modal_open.png');

  await browser.close();
  console.log('Verification completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
