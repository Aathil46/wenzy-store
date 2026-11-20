const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  
  // Mobile viewport: iPhone 13/14/15 size (390 x 844)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto('https://nike-makknzjs.myshopify.com/password', { waitUntil: 'networkidle' });
  const pw = page.locator('input[type="password"]');
  if (await pw.count() > 0) {
    await pw.fill('1');
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
  }

  await page.waitForTimeout(2000);

  // 1. Inspect Nike Rail on Mobile: how many items, widths, paddings, rail width
  const mobileRailData = await page.evaluate(() => {
    const section = document.querySelector('.sr-section') || document.querySelector('[class*="sr-"]');
    const track = document.querySelector('.sr-track');
    const items = Array.from(document.querySelectorAll('.sr-track .sr-item:not([aria-hidden="true"])'));
    
    const itemData = items.slice(0, 6).map((el, i) => {
      const rect = el.getBoundingClientRect();
      const garment = el.querySelector('.sr-garment');
      const gRect = garment ? garment.getBoundingClientRect() : null;
      const img = el.querySelector('img');
      const iRect = img ? img.getBoundingClientRect() : null;
      return {
        idx: i,
        name: el.getAttribute('data-name'),
        itemRect: { left: rect.left, width: rect.width, right: rect.right },
        garmentRect: gRect ? { width: gRect.width, height: gRect.height } : null,
        imgRect: iRect ? { width: iRect.width, height: iRect.height } : null,
      };
    });

    const trackCs = track ? window.getComputedStyle(track) : null;
    const rod = document.querySelector('.sr-rodsvg') || document.querySelector('svg');

    return {
      windowWidth: window.innerWidth,
      trackRect: track ? track.getBoundingClientRect() : null,
      trackStyles: trackCs ? {
        display: trackCs.display,
        gap: trackCs.gap,
        padding: trackCs.padding,
        transform: trackCs.transform,
        justifyContent: trackCs.justifyContent
      } : null,
      items: itemData
    };
  });

  console.log('Nike Mobile Rail Data:', JSON.stringify(mobileRailData, null, 2));

  // 2. Click/tap first garment to open focus
  const firstItem = page.locator('.sr-track .sr-item:not([aria-hidden="true"])').first();
  await firstItem.tap();
  await page.waitForTimeout(800);

  // Take screenshot of Nike Mobile Focus
  await page.screenshot({ path: 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c/nike_mobile_focus.png' });

  const focusData = await page.evaluate(() => {
    const focusEl = document.querySelector('.sr-focus');
    if (!focusEl) return 'no sr-focus';
    const cs = window.getComputedStyle(focusEl);
    const bg = document.querySelector('.sr-focus-bg');
    return {
      focusOpen: focusEl.classList.contains('sr-focus-open'),
      focusIn: focusEl.classList.contains('sr-focus-in'),
      hasBg: !!bg,
      focusClasses: focusEl.className
    };
  });
  console.log('Nike Focus State:', focusData);

  // 3. Tap outside: tap top left (e.g. x: 30, y: 100) or empty area
  console.log('Tapping outside at (30, 100)...');
  await page.mouse.click(30, 100);
  await page.waitForTimeout(800);

  const afterTapOutside = await page.evaluate(() => {
    const focusEl = document.querySelector('.sr-focus');
    return {
      focusOpen: focusEl ? focusEl.classList.contains('sr-focus-open') : false,
      focusIn: focusEl ? focusEl.classList.contains('sr-focus-in') : false,
      focusClasses: focusEl ? focusEl.className : null
    };
  });
  console.log('After tap outside:', afterTapOutside);

  await page.screenshot({ path: 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c/nike_mobile_after_close.png' });

  await browser.close();
})();
