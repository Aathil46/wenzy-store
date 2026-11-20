const { chromium } = require('playwright');

const LOCAL_URL = 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('dialog', async d => await d.accept());

  await page.goto(`${LOCAL_URL}login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin.wenzy@gmail.com');
  await page.fill('input[type="password"]', 'Admin@Wenzy2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${LOCAL_URL}admin/categories`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Find the row for OVERSIZED TEES
  const row = await page.$('tr:has-text("OVERSIZED TEES")');
  if (row) {
    const deleteBtn = await row.$('button[title="Delete Category"]');
    if (deleteBtn) {
      console.log('Clicking delete on OVERSIZED TEES...');
      await deleteBtn.click();
      await page.waitForTimeout(2000);
      console.log('Delete completed.');
    }
  }

  // Verify it is gone
  const remaining = await page.innerText('body');
  console.log('Contains OVERSIZED TEES still?:', remaining.includes('/category/oversized-tees'));

  await browser.close();
})();
