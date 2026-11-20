const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage();
  page.on('dialog', async (d) => await d.accept());

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin.wenzy@gmail.com');
  await page.fill('input[type="password"]', 'Admin@Wenzy2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/admin/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const rows = page.locator('tbody tr');
  console.log('Admin rows before:', await rows.count());
  await rows.first().locator('button[title*="Duplicate"]').click();
  await page.waitForTimeout(3000);
  console.log('Admin rows after:', await page.locator('tbody tr').count());

  await browser.close();
})();
