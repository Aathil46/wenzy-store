const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://www.thesouledstore.com/men', { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(2000);

  // Click the hamburger icon
  await page.click('img[src*="hamburger"]');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c/thesouledstore_drawer_open.png' });
  console.log('Saved open drawer screenshot');

  // Inspect the categories grid in the drawer
  const details = await page.evaluate(() => {
    // Look for all category cards in the opened drawer
    const categoryLinks = Array.from(document.querySelectorAll('a')).filter(a => {
      const img = a.querySelector('img');
      const rect = a.getBoundingClientRect();
      return img && rect.left >= 0 && rect.left < 500 && rect.width < 150 && rect.height > 40;
    });

    return categoryLinks.slice(0, 15).map(a => {
      const img = a.querySelector('img');
      const textEl = a.querySelector('span, p, div') || a;
      const rect = a.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      const style = window.getComputedStyle(a);
      const imgStyle = window.getComputedStyle(img);

      return {
        text: a.innerText.trim(),
        href: a.href,
        cardWidth: Math.round(rect.width),
        cardHeight: Math.round(rect.height),
        imgWidth: Math.round(imgRect.width),
        imgHeight: Math.round(imgRect.height),
        imgBorderRadius: imgStyle.borderRadius,
        cardClasses: a.className,
        fontSize: style.fontSize,
      };
    });
  });

  console.log('Category Cards:', JSON.stringify(details, null, 2));

  // Also inspect the parent container / grid
  const gridInfo = await page.evaluate(() => {
    const el = document.querySelector('a:has(img[src*="men"])') || document.querySelector('img[alt*="Shirt"], img[alt*="T-shirt"], img[alt*="Winterwear"]');
    if (!el) return null;
    const parent = el.closest('div[class*="grid"], div[style*="grid"], div[class*="flex"]');
    if (!parent) return null;
    const style = window.getComputedStyle(parent);
    return {
      display: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
      gap: style.gap,
      padding: style.padding,
    };
  });
  console.log('Grid Info:', JSON.stringify(gridInfo, null, 2));

  await browser.close();
})();
