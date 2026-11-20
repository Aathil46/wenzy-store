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
    // 1. Storefront Top Bar Check
    console.log('--- 1. Checking Storefront Top Bar ---');
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const topNavTabs = await page.$$eval('header nav a', links => links.map(l => l.innerText.trim()));
    console.log('Top Header Navigation Tabs:', topNavTabs);

    const topBarShot = path.join(ARTIFACT_DIR, 'storefront_top_bar_clean.png');
    await page.screenshot({ path: topBarShot, fullPage: false });
    console.log(`Saved screenshot: ${topBarShot}`);

    // 2. Open Hamburger Menu
    console.log('--- 2. Checking Drawer Categories ---');
    await page.click('button[aria-label="Open navigation menu"]');
    await page.waitForTimeout(1000);

    const drawerCats = await page.$$eval('div[class*="animate-slide-in-left"] a[href^="/category/"]', links =>
      links.map(a => a.innerText.trim())
    );
    console.log('Categories in drawer:', drawerCats);

    const drawerShot = path.join(ARTIFACT_DIR, 'storefront_drawer_real_categories.png');
    await page.screenshot({ path: drawerShot, fullPage: false });
    console.log(`Saved screenshot: ${drawerShot}`);
    await page.close();

    // 3. Admin Categories Page Check
    console.log('--- 3. Checking Admin Categories Page ---');
    const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await adminPage.goto(`${LOCAL_URL}login`, { waitUntil: 'networkidle' });
    await adminPage.fill('input[type="email"]', 'admin.wenzy@gmail.com');
    await adminPage.fill('input[type="password"]', 'Admin@Wenzy2026!');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForTimeout(2000);

    await adminPage.goto(`${LOCAL_URL}admin/categories`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1500);

    const bodyText = await adminPage.innerText('body');
    const hasQuickAdd = bodyText.includes('Quick Add Category');
    console.log('Has Quick Add Bar?:', hasQuickAdd);

    const adminCats = await adminPage.$$eval('table tbody tr', rows =>
      rows.map(r => {
        const nameEl = r.querySelector('div[class*="font-bold text-black uppercase"]');
        return nameEl ? nameEl.innerText.trim() : '';
      })
    );
    console.log('Admin Category Rows:', adminCats);

    const adminShot = path.join(ARTIFACT_DIR, 'admin_categories_clean_no_quickadd.png');
    await adminPage.screenshot({ path: adminShot, fullPage: false });
    console.log(`Saved screenshot: ${adminShot}`);
    await adminPage.close();

    console.log('ALL CHECKS PASSED!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
