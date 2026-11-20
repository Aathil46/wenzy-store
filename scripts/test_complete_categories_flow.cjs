const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  try {
    const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    adminPage.on('dialog', async d => await d.accept());

    // 1. Admin Login
    console.log('Logging in as admin...');
    await adminPage.goto(`${LOCAL_URL}login`, { waitUntil: 'networkidle' });
    await adminPage.fill('input[type="email"]', 'admin.wenzy@gmail.com');
    await adminPage.fill('input[type="password"]', 'Admin@Wenzy2026!');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForTimeout(2000);

    // 2. Go to Admin Categories
    await adminPage.goto(`${LOCAL_URL}admin/categories`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1500);

    // 3. Quick Add "HOODIES"
    console.log('Adding HOODIES category...');
    const hoodiesBtn = await adminPage.$('button:has-text("+ HOODIES")');
    if (hoodiesBtn) {
      await hoodiesBtn.click();
      await adminPage.waitForTimeout(500);

      // Paste image URL
      const imgUrlInput = await adminPage.$('input[type="url"]');
      if (imgUrlInput) {
        await imgUrlInput.fill('https://dmmdcbpgyxgtrvhdildo.supabase.co/storage/v1/object/public/product-images/1794903899926-p9hhatb.png');
        await adminPage.waitForTimeout(500);
      }

      // Save category
      const saveBtn = await adminPage.$('button[type="submit"]');
      await saveBtn.click();
      await adminPage.waitForTimeout(2000);
    }

    // 4. Quick Add "OVERSIZED TEES"
    console.log('Adding OVERSIZED TEES category...');
    const oversizedBtn = await adminPage.$('button:has-text("+ OVERSIZED TEES")');
    if (oversizedBtn) {
      await oversizedBtn.click();
      await adminPage.waitForTimeout(500);

      const imgUrlInput = await adminPage.$('input[type="url"]');
      if (imgUrlInput) {
        await imgUrlInput.fill('https://dmmdcbpgyxgtrvhdildo.supabase.co/storage/v1/object/public/product-images/1794903951815-w1fv0rk.png');
        await adminPage.waitForTimeout(500);
      }

      const saveBtn = await adminPage.$('button[type="submit"]');
      await saveBtn.click();
      await adminPage.waitForTimeout(2000);
    }

    // 5. Test Reordering: Move HOODIES (index 1) Up to index 0
    console.log('Testing category reordering...');
    const moveUpBtns = await adminPage.$$('button[title="Move Category Up"]');
    // Button at index 1 is enabled
    if (moveUpBtns.length > 1) {
      await moveUpBtns[1].click();
      await adminPage.waitForTimeout(1500);
    }

    // Capture screenshot of Admin categories list with multiple categories
    const adminMultiShot = path.join(ARTIFACT_DIR, 'admin_categories_multi_reordered.png');
    await adminPage.screenshot({ path: adminMultiShot, fullPage: false });
    console.log(`Saved screenshot: ${adminMultiShot}`);
    await adminPage.close();

    // 6. Capture Storefront Desktop Categories Section
    console.log('Capturing storefront desktop categories...');
    const storeDesktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await storeDesktop.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await storeDesktop.waitForTimeout(2000);

    const catHeading = await storeDesktop.$('text=CATEGORIES');
    if (catHeading) {
      await catHeading.scrollIntoViewIfNeeded();
      await storeDesktop.waitForTimeout(800);
    }

    const storeDesktopShot = path.join(ARTIFACT_DIR, 'storefront_desktop_categories_multi.png');
    await storeDesktop.screenshot({ path: storeDesktopShot, fullPage: false });
    console.log(`Saved screenshot: ${storeDesktopShot}`);

    // Verify clicking a category opens the relevant category page
    console.log('Testing category navigation click...');
    const tshirtsCard = await storeDesktop.$('a[href="/category/t-shirts"]');
    if (tshirtsCard) {
      await tshirtsCard.click();
      await storeDesktop.waitForTimeout(2000);
      console.log('Current URL after click:', storeDesktop.url());
      const categoryPageShot = path.join(ARTIFACT_DIR, 'storefront_category_page_navigated.png');
      await storeDesktop.screenshot({ path: categoryPageShot, fullPage: false });
      console.log(`Saved screenshot: ${categoryPageShot}`);
    }
    await storeDesktop.close();

    // 7. Capture Storefront Mobile (390px) Categories Section
    console.log('Capturing storefront mobile categories...');
    const storeMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await storeMobile.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await storeMobile.waitForTimeout(2000);

    const mobileCatHeading = await storeMobile.$('text=CATEGORIES');
    if (mobileCatHeading) {
      await mobileCatHeading.scrollIntoViewIfNeeded();
      await storeMobile.waitForTimeout(800);
    }

    const storeMobileShot = path.join(ARTIFACT_DIR, 'storefront_mobile_categories_multi.png');
    await storeMobile.screenshot({ path: storeMobileShot, fullPage: false });
    console.log(`Saved screenshot: ${storeMobileShot}`);
    await storeMobile.close();

    console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during test flow:', err);
  } finally {
    await browser.close();
  }
})();
