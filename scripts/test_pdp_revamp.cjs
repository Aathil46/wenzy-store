const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 1. Visit PDP
  await page.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Capture Right Panel & Top
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_revamp_top_right_panel.png') });
  console.log('1. Saved PDP revamp top & right panel');

  // 2. Open Size Guide Accordion
  const sizeGuideBtn = page.locator('#accordion-size-guide button');
  if (await sizeGuideBtn.count() > 0) {
    await sizeGuideBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_size_guide_accordion_opened.png') });
    console.log('2. Saved Size Guide accordion opened');

    // Click on size guide container to test Lightbox
    const chartContainer = page.locator('#accordion-size-guide .cursor-zoom-in');
    if (await chartContainer.count() > 0) {
      await chartContainer.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_size_guide_lightbox_modal.png') });
      console.log('3. Saved Size Guide lightbox modal');
      
      // Close lightbox
      const closeBtn = page.locator('.fixed.inset-0 button').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click({ force: true });
      } else {
        await page.mouse.click(20, 20);
      }
      await page.waitForTimeout(300);
    }
  }

  // 3. Scroll to Customer Reviews section
  const reviewsSection = page.locator('#customer-reviews-section');
  await reviewsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_customer_reviews_section.png') });
  console.log('4. Saved Customer Reviews section (matches ref Image 4)');

  // 4. Open "Write a review" modal
  const writeReviewBtn = page.locator('button:has-text("Write a review")');
  if (await writeReviewBtn.count() > 0) {
    await writeReviewBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_write_review_modal.png') });
    console.log('5. Saved Write a Review modal');

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
  }

  // 5. Scroll down to "YOU MAY LIKE" section
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_you_may_like_section.png') });
  console.log('6. Saved YOU MAY LIKE section');

  // 6. Test Mobile view
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://localhost:5173/product/doom-black', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1500);
  await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_mobile_top_and_details.png') });
  console.log('7. Saved Mobile PDP view');

  await mobile.evaluate(() => window.scrollBy(0, 1100));
  await mobile.waitForTimeout(600);
  await mobile.screenshot({ path: path.join(ARTIFACT_DIR, 'pdp_mobile_reviews_and_accordion.png') });
  console.log('8. Saved Mobile Reviews & Accordion view');

  // 7. Test Admin Reviews page
  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await adminPage.goto('http://localhost:5173/admin/reviews', { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(1500);
  await adminPage.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_reviews_panel.png') });
  console.log('9. Saved Admin Reviews panel');

  await adminPage.close();
  await mobile.close();
  await page.close();
  await browser.close();
  console.log('All PDP verification screenshots captured successfully!');
})();
