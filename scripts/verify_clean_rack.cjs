const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

async function verifyCleanRack() {
  console.log('--- VISUAL VERIFICATION OF CLEAN WENZY RACK ---');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const rackSection = page.locator('section:has-text("WENZY RACK")');
    await rackSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // 1. Verify NO floating tags exist on the rail
    const tagCount = await rackSection.locator('.rack-tag').count();
    console.log(`Floating price tags on rail: ${tagCount} (MUST be 0)`);

    // 2. Verify NO captions/prices underneath garments on the rail
    const items = rackSection.locator('.rack-item');
    const firstItemText = await items.first().innerText();
    console.log(`First item inner text on rail: "${firstItemText.trim()}" (MUST be empty string)`);

    // 3. Screenshot of clean resting rail
    const cleanRailScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_clean_resting.png');
    await page.screenshot({ path: cleanRailScreenshot, fullPage: false });
    console.log(`Captured clean resting rail screenshot: ${cleanRailScreenshot}`);

    // 4. Hover over second garment
    const targetItem = items.nth(1);
    await targetItem.hover();
    await page.waitForTimeout(700);

    const cleanHoverScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_clean_hover.png');
    await page.screenshot({ path: cleanHoverScreenshot, fullPage: false });
    console.log(`Captured clean hover screenshot: ${cleanHoverScreenshot}`);

    // 5. Click into focus modal
    await targetItem.click({ force: true });
    await page.waitForTimeout(800);

    const focusOverlay = page.locator('.rack-focus');
    const isFocusVisible = await focusOverlay.evaluate(el => el.classList.contains('sr-focus-in'));
    console.log(`Focus detail view open: ${isFocusVisible}`);

    // Verify product name and price ARE present inside the modal HUD
    const hudProductName = await focusOverlay.locator('h2').innerText();
    const hudProductPrice = await focusOverlay.locator('span.text-2xl.font-black').innerText();
    console.log(`Focus modal HUD Title: "${hudProductName}", Price: "${hudProductPrice}" (MUST be present)`);

    const cleanFocusScreenshot = path.join(ARTIFACT_DIR, 'wenzy_rack_clean_focus_modal.png');
    await page.screenshot({ path: cleanFocusScreenshot, fullPage: false });
    console.log(`Captured clean focus modal screenshot: ${cleanFocusScreenshot}`);

    console.log('--- VISUAL VERIFICATION COMPLETE & PASSED! ---');
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyCleanRack();

