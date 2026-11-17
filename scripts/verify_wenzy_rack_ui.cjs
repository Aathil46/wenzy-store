const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  // 1. Desktop Storefront
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await desktopContext.newPage();
  
  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_rack_storefront_desktop.png'),
    fullPage: false
  });
  console.log('Saved wenzy_rack_storefront_desktop.png');

  // 2. Mobile Storefront (iPhone 14)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);

  await mobilePage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_rack_storefront_mobile.png'),
    fullPage: false
  });
  console.log('Saved wenzy_rack_storefront_mobile.png');

  // 3. Admin Products Page
  const adminPage = await desktopContext.newPage();
  console.log('Navigating to Admin Products...');
  await adminPage.goto('http://localhost:5173/admin/products', { waitUntil: 'networkidle', timeout: 30000 });
  await adminPage.waitForTimeout(1500);

  await adminPage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wenzy_admin_products_rack_badges.png'),
    fullPage: false
  });
  console.log('Saved wenzy_admin_products_rack_badges.png');

  // Click "Add New Product" to open the modal
  const addBtn = await adminPage.$('button:has-text("Add New Product")');
  if (addBtn) {
    await addBtn.click();
    await adminPage.waitForTimeout(1000);

    // Click "Feature on WENZY RACK" checkbox
    const rackCheckbox = await adminPage.$('input#in_clothing_rail');
    if (rackCheckbox) {
      await rackCheckbox.click();
      await adminPage.waitForTimeout(600);
    }

    await adminPage.screenshot({
      path: path.join(ARTIFACTS_DIR, 'wenzy_admin_product_rack_modal.png'),
      fullPage: false
    });
    console.log('Saved wenzy_admin_product_rack_modal.png');
  }

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
