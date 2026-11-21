const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  // 1. Visit Homepage
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Scroll to Collections section
  await page.evaluate(() => {
    const el = document.getElementById('collections-section-header');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(800);

  // Capture Main Collections view (Trending selected)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'collections_main_trending_selected.png') });
  console.log('1. Saved main Collections view (Trending tab selected)');

  // Scroll down to OTHER COLLECTIONS
  await page.evaluate(() => window.scrollBy(0, 750));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'other_collections_section_desktop.png') });
  console.log('2. Saved OTHER COLLECTIONS desktop section');

  // Verify that "Marvel" is present in Other Collections, but "Trending" is not
  const otherSectionText = await page.evaluate(() => {
    const otherHeader = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Other Collections'));
    if (!otherHeader) return '';
    return otherHeader.parentElement.parentElement.textContent;
  });

  const hasMarvel = otherSectionText.includes('Marvel');
  console.log('Other Collections contains Marvel when Trending is active:', hasMarvel);

  // 3. Switch tab to "Marvel"
  const marvelBtn = page.locator('button:has-text("Marvel")').first();
  await marvelBtn.click();
  await page.waitForTimeout(800);

  // Scroll to OTHER COLLECTIONS after switching to Marvel
  await page.evaluate(() => {
    const otherHeader = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Other Collections'));
    if (otherHeader) otherHeader.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'other_collections_after_selecting_marvel.png') });
  console.log('3. Saved OTHER COLLECTIONS after selecting Marvel tab (Trending now in Other Collections)');

  // 4. Test Mobile View (390px width)
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await mobile.waitForTimeout(2000);

  // Scroll to OTHER COLLECTIONS on mobile
  await mobile.evaluate(() => {
    const otherHeader = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Other Collections'));
    if (otherHeader) otherHeader.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await mobile.waitForTimeout(800);
  await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'other_collections_mobile_view.png') });
  console.log('4. Saved OTHER COLLECTIONS mobile view');

  await mobile.close();
  await page.close();
  await browser.close();
  console.log('All tests completed successfully!');
})();
