const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  // 1. Desktop: Hover on collection product to test transition of image
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1500);

  const colSection = await desktop.$('section:has-text("Collections")');
  if (colSection) {
    await colSection.scrollIntoViewIfNeeded();
    await desktop.waitForTimeout(500);

    // Initial state before hover
    await colSection.screenshot({ path: path.join(ARTIFACT_DIR, 'test_collection_before_hover.png') });
    console.log('Saved before hover screenshot');

    // Hover over the first card
    const firstCard = await colSection.$('a[href*="/product/"]');
    if (firstCard) {
      await firstCard.hover();
      await desktop.waitForTimeout(600); // Wait for transition
      await colSection.screenshot({ path: path.join(ARTIFACT_DIR, 'test_collection_after_hover.png') });
      console.log('Saved after hover screenshot');
    }
  }

  // 2. Desktop: Product Page Scrolling behavior (Left images scroll, right details sticky)
  await desktop.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1500);

  // Top of PDP
  await desktop.screenshot({ path: path.join(ARTIFACT_DIR, 'test_desktop_pdp_top.png') });
  console.log('Saved desktop PDP top screenshot');

  // Scroll down by 500px to see sticky details
  await desktop.evaluate(() => window.scrollBy(0, 500));
  await desktop.waitForTimeout(600);
  await desktop.screenshot({ path: path.join(ARTIFACT_DIR, 'test_desktop_pdp_scrolled.png') });
  console.log('Saved desktop PDP scrolled screenshot');

  await desktop.close();

  // 3. Mobile: Product Page Swipe carousel with dots indicator
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1500);

  // Initial mobile PDP view (Slide 1)
  await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'test_mobile_pdp_slide1.png') });
  console.log('Saved mobile PDP slide 1');

  // Swipe or scroll carousel horizontally to Slide 2
  const carousel = await mobile.$('div[style*="scroll-snap-type"]');
  if (carousel) {
    await carousel.evaluate((el) => {
      el.scrollTo({ left: el.offsetWidth, behavior: 'instant' });
    });
    await mobile.waitForTimeout(600);
    await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'test_mobile_pdp_slide2.png') });
    console.log('Saved mobile PDP slide 2');
  }

  await mobile.close();
  await browser.close();
})();
