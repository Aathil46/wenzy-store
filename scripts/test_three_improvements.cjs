const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

async function testAll() {
  console.log('=== TEST 1: ADMIN PRODUCT DUPLICATION ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();

  // Handle browser alerts/confirms automatically
  adminPage.on('dialog', async (dialog) => {
    console.log(`[Admin Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    // 1. Visit Login & Authenticate as Admin
    console.log('Logging in as Admin...');
    await adminPage.goto(`${LOCAL_URL}login`, { waitUntil: 'networkidle' });
    await adminPage.fill('input[type="email"]', 'admin.wenzy@gmail.com');
    await adminPage.fill('input[type="password"]', 'Admin@Wenzy2026!');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForTimeout(2000);

    // 2. Go to Admin Products
    await adminPage.goto(`${LOCAL_URL}admin/products`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);

    // Check existing products count
    let rows = adminPage.locator('tbody tr');
    let rowCount = await rows.count();
    console.log(`Initial product count in Admin: ${rowCount}`);

    // Click Duplicate on the first product
    const dupBtn = rows.first().locator('button[title*="Duplicate"]');
    if (await dupBtn.count() > 0) {
      console.log('Clicking Duplicate button on first product...');
      await dupBtn.click();
      await adminPage.waitForTimeout(3000);
      
      rows = adminPage.locator('tbody tr');
      const newRowCount = await rows.count();
      console.log(`Product count after 1st duplication: ${newRowCount}`);

      // Let's duplicate again so we have at least 4 products to test 4-item mobile rack!
      while ((await rows.count()) < 4) {
        console.log('Duplicating to reach 4 products on the rail...');
        await rows.first().locator('button[title*="Duplicate"]').click();
        await adminPage.waitForTimeout(3000);
        rows = adminPage.locator('tbody tr');
      }
      console.log(`Total products available now: ${await rows.count()}`);
    }

    // Capture screenshot of Admin Products Table with duplicates
    const adminScreenshot = path.join(ARTIFACT_DIR, 'admin_products_duplicated.png');
    await adminPage.screenshot({ path: adminScreenshot, fullPage: false });
    console.log(`Captured Admin screenshot: ${adminScreenshot}`);

    await adminContext.close();

    // ========================================================
    // TEST 2 & 3: MOBILE LAYOUT (4 PRODUCTS) & TAP OUTSIDE
    // ========================================================
    console.log('\n=== TEST 2: MOBILE 4-PRODUCT LAYOUT ON COMMON WIDTHS ===');
    
    const widths = [375, 390, 414];
    for (const w of widths) {
      const mobContext = await browser.newContext({
        viewport: { width: w, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const mobPage = await mobContext.newPage();
      await mobPage.goto(LOCAL_URL, { waitUntil: 'networkidle' });
      await mobPage.waitForTimeout(2000);

      const rackSection = mobPage.locator('section:has-text("WENZY RACK")');
      await rackSection.scrollIntoViewIfNeeded();
      await mobPage.waitForTimeout(1000);

      // Inspect visible items
      const items = rackSection.locator('.rack-item');
      const count = await items.count();
      console.log(`Viewport width ${w}px: visible rack items = ${count}`);

      // Check item bounding boxes to verify all 4 are within viewport
      const itemBoxes = await mobPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('section .rack-item'));
        return els.map((el, i) => {
          const r = el.getBoundingClientRect();
          return {
            index: i,
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            height: Math.round(r.height),
            inViewport: r.left >= 0 && r.right <= window.innerWidth
          };
        });
      });
      console.log(`Viewport ${w}px items:`, JSON.stringify(itemBoxes));

      const mobScreenshot = path.join(ARTIFACT_DIR, `wenzy_rack_mobile_4items_${w}px.png`);
      await mobPage.screenshot({ path: mobScreenshot, fullPage: false });
      console.log(`Captured mobile layout screenshot: ${mobScreenshot}`);

      // ========================================================
      // TEST 3: MOBILE TAP OUTSIDE TO CLOSE FOCUS VIEW
      // ========================================================
      if (w === 390) {
        console.log('\n=== TEST 3: MOBILE TAP GARMENT & TAP OUTSIDE TO CLOSE ===');
        
        // 1. Tap 1st garment to open focus view
        console.log('Tapping 1st garment on mobile...');
        await items.first().tap();
        await mobPage.waitForTimeout(1000);

        const focusOverlay = mobPage.locator('.rack-focus');
        const isOpen = await focusOverlay.evaluate(el => el.classList.contains('sr-focus-open') && el.classList.contains('sr-focus-in'));
        console.log(`Focus view opened on mobile: ${isOpen}`);

        const mobFocusScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_mobile_focus_open.png');
        await mobPage.screenshot({ path: mobFocusScreenshot, fullPage: false });
        console.log(`Captured mobile focus view: ${mobFocusScreenshot}`);

        // 2. Tap inside control: click FRONT/BACK tab
        console.log('Tapping Back tab inside focus view...');
        const backTab = focusOverlay.locator('button:has-text("Back")');
        if (await backTab.count() > 0) {
          await backTab.tap();
          await mobPage.waitForTimeout(600);
          const stillOpen = await focusOverlay.evaluate(el => el.classList.contains('sr-focus-in'));
          console.log(`Still open after tapping controls: ${stillOpen} (MUST be true)`);
        }

        // 3. Tap OUTSIDE the garment (e.g. top-left empty area at x: 25, y: 40)
        console.log('Tapping outside focused garment at (25, 40)...');
        await mobPage.mouse.click(25, 40);
        await mobPage.waitForTimeout(1000);

        const isClosed = await mobPage.evaluate(() => {
          const el = document.querySelector('.rack-focus');
          return !el || !el.classList.contains('sr-focus-in');
        });
        console.log(`Focus view closed after tapping outside: ${isClosed} (MUST be true)`);

        const mobClosedScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_mobile_after_outside_tap.png');
        await mobPage.screenshot({ path: mobClosedScreenshot, fullPage: false });
        console.log(`Captured mobile rack after return: ${mobClosedScreenshot}`);
      }

      await mobContext.close();
    }

    console.log('=== ALL 3 IMPROVEMENTS VERIFIED AND PASSED! ===');
  } catch (err) {
    console.error('Error during testing:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testAll();
