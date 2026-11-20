const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  
  // 1. Visit PDP
  await page.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Scroll slightly down to focus right details panel & accordion
  await page.evaluate(() => {
    const el = document.getElementById('accordion-description');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(800);

  // Capture Description accordion showing formatted headline, paragraphs, bullet points
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_white_theme_description_accordion.png') });
  console.log('1. Saved White Theme Description Accordion');

  // 2. Click "Size Guide" quick link to test smooth scroll and opening
  const sizeGuideLink = page.locator('button:has-text("Size Guide")').first();
  await sizeGuideLink.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_smooth_scroll_size_guide.png') });
  console.log('2. Saved Smooth Scroll Size Guide');

  // 3. Click "Return Policy" quick link to test smooth scroll and opening
  const returnPolicyLink = page.locator('button:has-text("Return Policy")').first();
  await returnPolicyLink.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_smooth_scroll_return_policy.png') });
  console.log('3. Saved Smooth Scroll Return Policy');

  // 4. Click "Shipping Info" quick link to test smooth scroll and opening
  const shippingInfoLink = page.locator('button:has-text("Shipping Info")').first();
  await shippingInfoLink.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_smooth_scroll_shipping_info.png') });
  console.log('4. Saved Smooth Scroll Shipping Info');

  // 5. Mobile view
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1500);

  // Scroll to mobile accordions
  await mobile.evaluate(() => {
    const el = document.getElementById('accordion-description');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await mobile.waitForTimeout(800);
  await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_mobile_white_theme_accordions.png') });
  console.log('5. Saved Mobile White Theme Accordions');

  await mobile.close();
  await page.close();
  await browser.close();
  console.log('All tests completed successfully!');
})();
