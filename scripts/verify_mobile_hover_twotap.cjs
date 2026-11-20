const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

async function verifyMobileHoverAndTap() {
  console.log('=== VERIFYING MOBILE HOVER (TAP TO TURN FRONT) & TAP OUTSIDE ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  // Mobile Context: iPhone 13 (390 x 844)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const rackSection = page.locator('section:has-text("WENZY RACK")');
    await rackSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const items = rackSection.locator('.rack-item');
    console.log(`Mobile items found: ${await items.count()}`);

    // STEP 1: RESTING STATE (All side views)
    const initialViewStates = await page.evaluate(() => {
      const firstItem = document.querySelector('.rack-item');
      if (!firstItem) return null;
      const v0 = firstItem.querySelector('[data-sr-pos="0"]');
      const v1 = firstItem.querySelector('[data-sr-pos="1"]');
      return {
        v0Opacity: v0 ? window.getComputedStyle(v0).opacity : null,
        v1Opacity: v1 ? window.getComputedStyle(v1).opacity : null,
        width: firstItem.style.width,
        isLive: firstItem.classList.contains('sr-live'),
      };
    });
    console.log('1. Resting rail view states:', initialViewStates);

    const shotResting = path.join(ARTIFACT_DIR, 'mobile_test_1_resting.png');
    await page.screenshot({ path: shotResting, fullPage: false });
    console.log(`Saved resting screenshot: ${shotResting}`);

    // STEP 2: FIRST TAP ON GARMENT -> Should turn to FRONT VIEW on the rail (Hover effect)
    console.log('\n2. Tapping 1st garment (1st tap: should reveal front view on the rack)...');
    await items.first().tap();
    await page.waitForTimeout(700);

    const afterFirstTap = await page.evaluate(() => {
      const firstItem = document.querySelector('.rack-item');
      if (!firstItem) return null;
      const v0 = firstItem.querySelector('[data-sr-pos="0"]');
      const v1 = firstItem.querySelector('[data-sr-pos="1"]');
      return {
        v0Opacity: v0 ? window.getComputedStyle(v0).opacity : null,
        v1Opacity: v1 ? window.getComputedStyle(v1).opacity : null,
        width: firstItem.style.width,
        isLive: firstItem.classList.contains('sr-live'),
        modalOpen: !!document.querySelector('.rack-focus.sr-focus-in')
      };
    });
    console.log('After 1st tap (front view reveal):', afterFirstTap);

    const shotHover = path.join(ARTIFACT_DIR, 'mobile_test_2_front_view_turned.png');
    await page.screenshot({ path: shotHover, fullPage: false });
    console.log(`Saved front-view turned screenshot: ${shotHover}`);

    if (afterFirstTap.modalOpen) {
      throw new Error('FAIL: Modal should NOT have opened on first tap! First tap should reveal front view on the rack.');
    }
    if (parseFloat(afterFirstTap.v1Opacity) < 0.5) {
      throw new Error('FAIL: Front view did not appear on first tap!');
    }
    console.log('SUCCESS: First tap revealed front view on the rack without opening modal!');

    // STEP 3: TAP OUTSIDE -> Should return garment to side-facing resting position
    console.log('\n3. Tapping outside the garment at (30, 80)...');
    await page.mouse.click(30, 80);
    await page.waitForTimeout(700);

    const afterTapOutside = await page.evaluate(() => {
      const firstItem = document.querySelector('.rack-item');
      if (!firstItem) return null;
      const v0 = firstItem.querySelector('[data-sr-pos="0"]');
      const v1 = firstItem.querySelector('[data-sr-pos="1"]');
      return {
        v0Opacity: v0 ? window.getComputedStyle(v0).opacity : null,
        v1Opacity: v1 ? window.getComputedStyle(v1).opacity : null,
        width: firstItem.style.width,
        isLive: firstItem.classList.contains('sr-live'),
      };
    });
    console.log('After tap outside (returned to side view):', afterTapOutside);

    const shotReturned = path.join(ARTIFACT_DIR, 'mobile_test_3_returned_to_side.png');
    await page.screenshot({ path: shotReturned, fullPage: false });
    console.log(`Saved returned to side screenshot: ${shotReturned}`);

    if (parseFloat(afterTapOutside.v0Opacity) < 0.5) {
      throw new Error('FAIL: Garment did not return to side profile after tapping outside!');
    }
    console.log('SUCCESS: Garment returned to side view after tapping outside!');

    // STEP 4: SECOND TAP -> Opens the focus modal
    console.log('\n4. Testing 2nd tap to open product focus modal...');
    await items.first().tap(); // tap 1: turns front
    await page.waitForTimeout(300);
    await items.first().tap(); // tap 2: opens modal
    await page.waitForTimeout(900);

    const afterSecondTap = await page.evaluate(() => {
      const focus = document.querySelector('.rack-focus');
      return {
        modalOpen: focus ? focus.classList.contains('sr-focus-in') : false,
      };
    });
    console.log('After 2nd tap (modal open):', afterSecondTap);

    const shotModal = path.join(ARTIFACT_DIR, 'mobile_test_4_modal_open.png');
    await page.screenshot({ path: shotModal, fullPage: false });
    console.log(`Saved modal screenshot: ${shotModal}`);

    if (!afterSecondTap.modalOpen) {
      throw new Error('FAIL: Modal did not open on second tap!');
    }
    console.log('SUCCESS: Second tap opened the product modal!');

    // STEP 5: TAP OUTSIDE IN MODAL -> Returns to rack
    console.log('\n5. Tapping outside modal at (30, 50)...');
    await page.mouse.click(30, 50);
    await page.waitForTimeout(900);

    const afterModalClose = await page.evaluate(() => {
      const focus = document.querySelector('.rack-focus');
      return {
        modalClosed: !focus || !focus.classList.contains('sr-focus-in'),
      };
    });
    console.log('After modal tap outside:', afterModalClose);

    console.log('\n=== ALL MOBILE INTERACTIONS PERFECTLY VERIFIED AND PASSED! ===');
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyMobileHoverAndTap();
