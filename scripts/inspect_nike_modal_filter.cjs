const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('https://nike-makknzjs.myshopify.com/password', { waitUntil: 'networkidle' });
  const pw = page.locator('input[type="password"]');
  if (await pw.count() > 0) {
    await pw.fill('1');
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
  }

  await page.waitForTimeout(2000);

  // Trigger modal
  await page.evaluate(() => {
    const item = document.querySelector('.sr-item');
    if (item) item.click();
  });
  await page.waitForTimeout(1000);

  const modalDetails = await page.evaluate(() => {
    const focusEl = document.querySelector('.sr-focus');
    if (!focusEl) return 'no sr-focus';
    const imgs = Array.from(focusEl.querySelectorAll('img')).map(img => {
      const cs = window.getComputedStyle(img);
      return {
        src: img.src.slice(-30),
        className: img.className,
        filter: cs.filter,
        boxShadow: cs.boxShadow,
        parentFilter: window.getComputedStyle(img.parentElement).filter
      };
    });
    return {
      focusElClasses: focusEl.className,
      imgs
    };
  });

  console.log('Nike Modal Details:', JSON.stringify(modalDetails, null, 2));

  await browser.close();
})();
