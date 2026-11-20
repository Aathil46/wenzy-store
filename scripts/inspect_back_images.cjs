const { chromium } = require('playwright');
const fs = require('fs');

const PASSWORD = '1';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('https://nike-makknzjs.myshopify.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  if (page.url().includes('/password')) {
    const pwInput = page.locator('input[type="password"]');
    await pwInput.fill(PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.keyboard.press('Enter')
    ]);
  }

  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const items = document.querySelectorAll('.sr-item');
    const summary = {};

    items.forEach(item => {
      const name = item.getAttribute('data-name') || item.querySelector('.sr-name')?.innerText;
      if (!summary[name]) {
        summary[name] = { name };
        ['0', '1', '-1'].forEach(pos => {
          const img = item.querySelector(`[data-sr-pos="${pos}"] img`);
          if (img) {
            summary[name][pos] = {
              outerHTML: img.outerHTML,
              src: img.getAttribute('src'),
              srcset: img.getAttribute('srcset'),
              dataSrc: img.getAttribute('data-src'),
              currentSrc: img.currentSrc,
              width: img.getAttribute('width'),
              height: img.getAttribute('height')
            };
          }
        });
      }
    });

    return summary;
  });

  console.log(JSON.stringify(data, null, 2));
  fs.writeFileSync('scripts/nike_img_elements_inspect.json', JSON.stringify(data, null, 2));
  await browser.close();
}

run().catch(console.error);
