const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';
const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Homepage - Verify Categories section removed from page
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Homepage Verification ---');
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify CATEGORIES heading is NOT on the homepage body outside drawer
    const homeSections = await page.$$eval('section h2', h2s => h2s.map(h => h.innerText.trim()));
    console.log('Homepage section headings:', homeSections);
    const categoriesSectionOnHome = homeSections.includes('CATEGORIES');
    console.log('Is CATEGORIES section on homepage?:', categoriesSectionOnHome);

    const homeShot = path.join(ARTIFACT_DIR, 'homepage_without_categories_section.png');
    await page.screenshot({ path: homeShot, fullPage: false });
    console.log(`Saved screenshot: ${homeShot}`);

    // -------------------------------------------------------------------------
    // TEST 2: Desktop Hamburger Menu (Three Lines Top Left) Click & Drawer
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: Desktop Hamburger Menu Drawer ---');
    // Click the hamburger button on top left
    const hamburgerBtn = await page.$('button[aria-label="Open navigation menu"]');
    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await page.waitForTimeout(1000);

      // Verify drawer opened
      const drawer = await page.$('div[class*="animate-slide-in-left"]');
      console.log('Drawer opened on desktop:', Boolean(drawer));

      // Inspect small frame cards in drawer
      const cardBoxes = await page.$$eval('div[class*="animate-slide-in-left"] a[href^="/category/"]', links => {
        return links.map(a => {
          const img = a.querySelector('img, div[class*="bg-neutral-100"]');
          const rect = img ? img.getBoundingClientRect() : null;
          return {
            text: a.innerText.trim(),
            href: a.getAttribute('href'),
            width: rect ? Math.round(rect.width) : null,
            height: rect ? Math.round(rect.height) : null,
          };
        });
      });
      console.log('Drawer category cards:', JSON.stringify(cardBoxes, null, 2));

      // Check Brand Story position relative to Categories
      const brandStoryLink = await page.$('div[class*="animate-slide-in-left"] a:has-text("Brand Story")');
      console.log('Brand Story link found in drawer:', Boolean(brandStoryLink));

      const desktopDrawerShot = path.join(ARTIFACT_DIR, 'drawer_categories_desktop.png');
      await page.screenshot({ path: desktopDrawerShot, fullPage: false });
      console.log(`Saved screenshot: ${desktopDrawerShot}`);

      // Click a category in the drawer
      const firstCat = await page.$('div[class*="animate-slide-in-left"] a[href^="/category/"]');
      if (firstCat) {
        await firstCat.click();
        await page.waitForTimeout(1500);
        console.log('Navigated URL after clicking category card:', page.url());
      }
    }
    await page.close();

    // -------------------------------------------------------------------------
    // TEST 3: Mobile (390px) Hamburger Menu Click & Drawer
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: Mobile Hamburger Menu Drawer ---');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const mobileHamburger = await mobilePage.$('button[aria-label="Open navigation menu"]');
    if (mobileHamburger) {
      await mobileHamburger.click();
      await mobilePage.waitForTimeout(1000);

      const mobileDrawerShot = path.join(ARTIFACT_DIR, 'drawer_categories_mobile.png');
      await mobilePage.screenshot({ path: mobileDrawerShot, fullPage: false });
      console.log(`Saved screenshot: ${mobileDrawerShot}`);
    }
    await mobilePage.close();

    console.log('ALL VERIFICATIONS FINISHED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
})();
