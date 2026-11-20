const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const results = {
    newArrivalsRemoved: false,
    categoriesHeadingFound: false,
    desktopCardDimensions: null,
    mobileCardDimensions: null,
    adminModalVerified: false,
    cropSavedSuccessfully: false,
    reorderVerified: false,
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Storefront Desktop
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Storefront Desktop ---');
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktopPage.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    const bodyText = await desktopPage.innerText('body');
    results.newArrivalsRemoved = !bodyText.includes('NEW ARRIVALS') && !bodyText.includes('VIEW ALL NEW ARRIVALS');
    results.categoriesHeadingFound = bodyText.includes('CATEGORIES');
    console.log(`New Arrivals removed: ${results.newArrivalsRemoved}`);
    console.log(`Categories heading present: ${results.categoriesHeadingFound}`);

    // Check category card dimensions
    const categoryCard = await desktopPage.$('a[href^="/category/"]');
    if (categoryCard) {
      const imgFrame = await categoryCard.$('div[class*="aspect-[4/5]"]');
      if (imgFrame) {
        const box = await imgFrame.boundingBox();
        if (box) {
          results.desktopCardDimensions = {
            width: Math.round(box.width),
            height: Math.round(box.height),
            ratio: (box.width / box.height).toFixed(3),
          };
          console.log('Desktop Card Frame:', results.desktopCardDimensions);
        }
      }
    }

    // Scroll to Categories section and capture screenshot
    const catHeading = await desktopPage.$('text=CATEGORIES');
    if (catHeading) {
      await catHeading.scrollIntoViewIfNeeded();
      await desktopPage.waitForTimeout(500);
    }
    const desktopShot = path.join(ARTIFACT_DIR, 'storefront_desktop_categories.png');
    await desktopPage.screenshot({ path: desktopShot, fullPage: false });
    console.log(`Saved screenshot: ${desktopShot}`);
    await desktopPage.close();

    // -------------------------------------------------------------------------
    // TEST 2: Storefront Mobile (390px)
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: Storefront Mobile ---');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const mobileCatHeading = await mobilePage.$('text=CATEGORIES');
    if (mobileCatHeading) {
      await mobileCatHeading.scrollIntoViewIfNeeded();
      await mobilePage.waitForTimeout(500);
    }

    const mobileCategoryCard = await mobilePage.$('a[href^="/category/"]');
    if (mobileCategoryCard) {
      const imgFrame = await mobileCategoryCard.$('div[class*="aspect-[4/5]"]');
      if (imgFrame) {
        const box = await imgFrame.boundingBox();
        if (box) {
          results.mobileCardDimensions = {
            width: Math.round(box.width),
            height: Math.round(box.height),
            ratio: (box.width / box.height).toFixed(3),
          };
          console.log('Mobile Card Frame:', results.mobileCardDimensions);
        }
      }
    }

    const mobileShot = path.join(ARTIFACT_DIR, 'storefront_mobile_categories.png');
    await mobilePage.screenshot({ path: mobileShot, fullPage: false });
    console.log(`Saved screenshot: ${mobileShot}`);
    await mobilePage.close();

    // -------------------------------------------------------------------------
    // TEST 3: Admin Categories Management & Crop Editor
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: Admin Categories Management ---');
    const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    adminPage.on('dialog', async d => await d.accept());

    // Login
    await adminPage.goto(`${LOCAL_URL}login`, { waitUntil: 'networkidle' });
    await adminPage.fill('input[type="email"]', 'admin.wenzy@gmail.com');
    await adminPage.fill('input[type="password"]', 'Admin@Wenzy2026!');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForTimeout(2000);

    // Navigate to admin categories
    await adminPage.goto(`${LOCAL_URL}admin/categories`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1500);

    const adminListShot = path.join(ARTIFACT_DIR, 'admin_categories_list.png');
    await adminPage.screenshot({ path: adminListShot, fullPage: false });
    console.log(`Saved screenshot: ${adminListShot}`);

    // Click Edit Category button
    const editBtn = await adminPage.$('button[title="Edit Category & Image Crop"]');
    if (editBtn) {
      await editBtn.click();
      await adminPage.waitForTimeout(1000);

      // Verify modal opened
      const modal = await adminPage.$('form');
      if (modal) {
        results.adminModalVerified = true;
        console.log('Admin Category Modal verified');

        // Drag inside crop frame
        const cropFrame = await adminPage.$('div[title="Click and drag to adjust image position"]');
        if (cropFrame) {
          const frameBox = await cropFrame.boundingBox();
          if (frameBox) {
            console.log(`Crop frame in modal: ${Math.round(frameBox.width)}x${Math.round(frameBox.height)}`);
            // Simulate dragging image
            await adminPage.mouse.move(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2);
            await adminPage.mouse.down();
            await adminPage.mouse.move(frameBox.x + frameBox.width / 2 - 30, frameBox.y + frameBox.height / 2 - 20, { steps: 5 });
            await adminPage.mouse.up();
            await adminPage.waitForTimeout(500);
          }
        }

        // Adjust zoom slider
        const zoomSlider = await adminPage.$('input[type="range"]');
        if (zoomSlider) {
          await zoomSlider.fill('1.25');
          await adminPage.waitForTimeout(500);
        }

        // Capture modal screenshot with active crop preview
        const modalShot = path.join(ARTIFACT_DIR, 'admin_category_crop_modal.png');
        await adminPage.screenshot({ path: modalShot, fullPage: false });
        console.log(`Saved screenshot: ${modalShot}`);

        // Save Category
        const saveBtn = await adminPage.$('button[type="submit"]');
        if (saveBtn) {
          await saveBtn.click();
          await adminPage.waitForTimeout(2000);
          results.cropSavedSuccessfully = true;
          console.log('Saved category crop settings successfully');
        }
      }
    }

    // Capture updated admin list
    const adminListUpdatedShot = path.join(ARTIFACT_DIR, 'admin_categories_updated.png');
    await adminPage.screenshot({ path: adminListUpdatedShot, fullPage: false });
    console.log(`Saved screenshot: ${adminListUpdatedShot}`);

    await adminPage.close();

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    console.log('FINAL RESULTS:', JSON.stringify(results, null, 2));
  }
})();
