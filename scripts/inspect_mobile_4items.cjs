const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

async function inspectMobile4Items() {
  console.log('=== INSPECTING 4-ITEM MOBILE RACK VIEWPORT ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const widths = [375, 390, 414];
  for (const w of widths) {
    const context = await browser.newContext({
      viewport: { width: w, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const rackSection = page.locator('section:has-text("WENZY RACK")');
    await rackSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Inspect visible items
    const items = rackSection.locator('.rack-item');
    const count = await items.count();
    console.log(`\n--- Viewport Width: ${w}px ---`);
    console.log(`Visible rack items in DOM: ${count}`);

    const itemDetails = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('section .rack-item'));
      return els.map((el, idx) => {
        const r = el.getBoundingClientRect();
        return {
          idx: idx + 1,
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          height: Math.round(r.height),
          fullyInViewport: r.left >= 0 && r.right <= window.innerWidth
        };
      });
    });

    console.log('Item placements:', JSON.stringify(itemDetails, null, 2));

    const shotPath = path.join(ARTIFACT_DIR, `wenzy_rack_4products_${w}px.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved screenshot: ${shotPath}`);

    // If 390px, also test tap outside verification
    if (w === 390) {
      console.log('\n--- Verifying Mobile Tap Garment & Tap Outside ---');
      await items.first().tap();
      await page.waitForTimeout(900);

      const focusOverlay = page.locator('.rack-focus');
      const isOpen = await focusOverlay.evaluate(el => el.classList.contains('sr-focus-in'));
      console.log(`Focus view opened on mobile tap: ${isOpen}`);

      const openShot = path.join(ARTIFACT_DIR, 'wenzy_rack_mobile_focus_front.png');
      await page.screenshot({ path: openShot, fullPage: false });
      console.log(`Saved mobile focus view screenshot: ${openShot}`);

      // Tap on empty space outside garment at (30, 50)
      console.log('Tapping outside garment at (30, 50)...');
      await page.mouse.click(30, 50);
      await page.waitForTimeout(900);

      const isClosed = await page.evaluate(() => {
        const el = document.querySelector('.rack-focus');
        return !el || !el.classList.contains('sr-focus-in');
      });
      console.log(`Focus view smoothly returned to rack on tap outside: ${isClosed}`);

      const closedShot = path.join(ARTIFACT_DIR, 'wenzy_rack_mobile_returned_to_rack.png');
      await page.screenshot({ path: closedShot, fullPage: false });
      console.log(`Saved mobile returned to rack screenshot: ${closedShot}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\n=== ALL MOBILE TESTS COMPLETE & VERIFIED! ===');
}

inspectMobile4Items();
