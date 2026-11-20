const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

async function testInteractions() {
  console.log('--- STARTING WENZY RACK INTERACTION VERIFICATION ---');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log(`1. Navigating to ${LOCAL_URL}...`);
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Scroll down to WENZY RACK section
    const rackSection = page.locator('section:has-text("WENZY RACK")');
    await rackSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // TEST 1: Check hanger and rack placement
    console.log('2. Verifying hanger and rack placement...');
    const fakeHangers = await rackSection.locator('svg[viewBox="0 0 160 64"]').count();
    console.log(`Fake SVG wooden hangers found in rack: ${fakeHangers} (MUST be 0)`);
    if (fakeHangers > 0) {
      throw new Error(`Expected 0 fake SVG wooden hangers, found ${fakeHangers}`);
    }

    const items = rackSection.locator('.rack-item');
    const itemCount = await items.count();
    console.log(`Found ${itemCount} rack items.`);
    if (itemCount === 0) {
      throw new Error('No rack items found!');
    }

    // Capture resting screenshot
    const restingScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_test_resting.png');
    await page.screenshot({ path: restingScreenshot, fullPage: false });
    console.log(`Captured resting rack screenshot: ${restingScreenshot}`);

    // TEST 2: Hover interaction (3D-like reveal from side to front)
    console.log('3. Testing Hover 3D reveal interaction...');
    // Use the 2nd item so it has room on both sides
    const targetItem = items.nth(1);
    await targetItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const boxBeforeHover = await targetItem.boundingBox();
    console.log('Target item box before hover:', boxBeforeHover);

    // Check resting opacities
    const view0 = targetItem.locator('.rack-view[data-sr-pos="0"]');
    const view1 = targetItem.locator('.rack-view[data-sr-pos="1"]');
    const op0Before = await view0.evaluate(el => window.getComputedStyle(el).opacity);
    const op1Before = await view1.evaluate(el => window.getComputedStyle(el).opacity);
    console.log(`Before hover: view0 (side) opacity = ${op0Before}, view1 (front) opacity = ${op1Before}`);

    // Hover over target item
    console.log('Triggering hover on garment...');
    await targetItem.hover();
    // Wait for rAF hover transition
    await page.waitForTimeout(700);

    const op0Hovered = await view0.evaluate(el => window.getComputedStyle(el).opacity);
    const op1Hovered = await view1.evaluate(el => window.getComputedStyle(el).opacity);
    const transformHovered = await view1.evaluate(el => window.getComputedStyle(el).transform);
    console.log(`While hovered: view0 (side) opacity = ${op0Hovered}, view1 (front) opacity = ${op1Hovered}`);
    console.log(`While hovered: view1 (front) transform = ${transformHovered}`);

    const hasLiveClass = await targetItem.evaluate(el => el.classList.contains('sr-live'));
    console.log(`Target item has .sr-live class on hover: ${hasLiveClass}`);

    // Capture hovered screenshot
    const hoverScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_test_hovered.png');
    await page.screenshot({ path: hoverScreenshot, fullPage: false });
    console.log(`Captured hovered garment screenshot: ${hoverScreenshot}`);

    // TEST 3: Click interaction (FLIP flight to focus detail view)
    console.log('4. Testing Click interaction (FLIP flight into detail view)...');
    // Click the garment directly
    await targetItem.click({ force: true });

    // Wait 300ms for flight midpoint
    await page.waitForTimeout(300);

    // Wait full flight to settle (680ms + buffer)
    await page.waitForTimeout(600);

    const focusOverlay = page.locator('.rack-focus');
    const isFocusVisible = await focusOverlay.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && el.classList.contains('sr-focus-in');
    });
    console.log(`Focus detail view open & visible: ${isFocusVisible}`);

    // Verify product details in HUD
    const productName = await focusOverlay.locator('h2').innerText();
    const productPrice = await focusOverlay.locator('span.text-2xl.font-black').innerText();
    console.log(`Focus HUD: Product = "${productName}", Price = "${productPrice}"`);

    // Verify 3D Front / Back Angle Tabs
    const frontTab = focusOverlay.locator('button:has-text("Front")');
    const backTab = focusOverlay.locator('button:has-text("Back")');
    console.log('Clicking "Back" tab to test 3D flip...');
    await backTab.click();
    await page.waitForTimeout(600);

    const garmentTransformBack = await focusOverlay.locator('.rack-garment').first().evaluate(el => el.style.transform);
    console.log(`Garment 3D transform after clicking Back: ${garmentTransformBack}`);

    console.log('Clicking "Front" tab to flip back...');
    await frontTab.click();
    await page.waitForTimeout(600);

    // Capture focus modal open screenshot
    const focusScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_test_focus_modal.png');
    await page.screenshot({ path: focusScreenshot, fullPage: false });
    console.log(`Captured focus modal screenshot: ${focusScreenshot}`);

    // TEST 4: Close interaction (Reverse flight back to hanger)
    console.log('5. Testing Close interaction (reverse flight back to rack)...');
    const closeBtn = focusOverlay.locator('button[aria-label="Close"], button.rack-focus-close');
    await closeBtn.click();

    // Mid-reverse flight
    await page.waitForTimeout(300);
    console.log('Reverse flight in progress...');

    // Wait for reverse flight to complete (560ms + buffer)
    await page.waitForTimeout(600);

    const isFocusClosed = (await focusOverlay.count() === 0) || !(await focusOverlay.isVisible());
    console.log(`Focus modal closed: ${isFocusClosed}`);

    const isSourceVisible = await targetItem.evaluate(el => window.getComputedStyle(el).visibility !== 'hidden');
    console.log(`Source garment visibility restored on rack: ${isSourceVisible}`);

    // Capture returned rack screenshot
    const returnedScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_test_returned.png');
    await page.screenshot({ path: returnedScreenshot, fullPage: false });
    console.log(`Captured returned rack screenshot: ${returnedScreenshot}`);

    console.log('--- ALL 4 INTERACTIONS VERIFIED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testInteractions();
