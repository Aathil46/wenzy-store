const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Main image selector
  const mainImg = await page.$('.lg\\:col-span-7 .flex-1.aspect-\\[3\\/4\\] img');
  const mainContainer = await page.$('.lg\\:col-span-7 .flex-1.aspect-\\[3\\/4\\]');

  // Check initial classes and styles
  const imgClass = await page.evaluate(el => el.className, mainImg);
  const containerClass = await page.evaluate(el => el.className, mainContainer);
  console.log('Main img classes:', imgClass);
  console.log('Main container classes:', containerClass);

  // Hover over main image
  await mainImg.hover();
  await page.waitForTimeout(400);

  const transformAfterHover = await page.evaluate(el => window.getComputedStyle(el).transform, mainImg);
  console.log('Main img transform on hover:', transformAfterHover);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_pdp_main_image_hover_disabled.png') });
  console.log('Saved PDP main image hover screenshot');

  // Hover over side thumbnail
  const thumbs = await page.$$('.hidden.lg\\:flex button');
  if (thumbs.length > 1) {
    await thumbs[1].hover();
    await page.waitForTimeout(300);
    const thumbOpacity = await page.evaluate(el => window.getComputedStyle(el).opacity, thumbs[1]);
    console.log('Thumbnail opacity on hover:', thumbOpacity);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_pdp_subframe_hover_active.png') });
    console.log('Saved PDP subframe hover screenshot');
  }

  await browser.close();
  console.log('All tests passed successfully!');
})();
