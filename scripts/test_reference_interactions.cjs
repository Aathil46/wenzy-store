const { chromium } = require('playwright');
const fs = require('fs');

const PASSWORD = '1';

async function inspect() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('Navigating to reference site...');
  await page.goto('https://nike-makknzjs.myshopify.com/', { waitUntil: 'domcontentloaded' });

  if (page.url().includes('/password')) {
    console.log('Entering password...');
    const pw = page.locator('input[type="password"]');
    await pw.fill(PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.keyboard.press('Enter'),
    ]);
  }

  await page.waitForTimeout(3000);

  // 1. Inspect the rail section inline script or external script for hover & click
  const scriptContent = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const relevant = scripts.filter(s => s.innerText && (s.innerText.includes('openFocus') || s.innerText.includes('sr-item') || s.innerText.includes('fstage') || s.innerText.includes('hover') || s.innerText.includes('sr-view')));
    return relevant.map(s => s.innerText);
  });

  console.log(`Found ${scriptContent.length} relevant script blocks.`);
  if (scriptContent.length > 0) {
    fs.writeFileSync('scripts/reference_rail_script.js', scriptContent.join('\n\n/* --- NEXT SCRIPT --- */\n\n'));
    console.log('Wrote scripts/reference_rail_script.js');
  }

  // 2. Inspect first .sr-item computed style & DOM
  const itemDetails = await page.evaluate(() => {
    const item = document.querySelector('.sr-item');
    if (!item) return null;
    const views = Array.from(item.querySelectorAll('.sr-view'));
    return {
      itemHTML: item.outerHTML,
      itemStyle: {
        width: item.style.width,
        transform: item.style.transform,
        computedTransform: window.getComputedStyle(item).transform,
        transition: window.getComputedStyle(item).transition,
      },
      views: views.map(v => ({
        pos: v.getAttribute('data-sr-pos'),
        outerHTML: v.outerHTML,
        style: v.getAttribute('style'),
        computed: {
          opacity: window.getComputedStyle(v).opacity,
          transform: window.getComputedStyle(v).transform,
          display: window.getComputedStyle(v).display,
        }
      }))
    };
  });
  console.log('Resting item details:', JSON.stringify(itemDetails, null, 2));

  // 3. Test Hover
  const firstItem = page.locator('.sr-item').first();
  const box = await firstItem.boundingBox();
  if (box) {
    console.log('Hovering first item...');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);

    const hoveredDetails = await page.evaluate(() => {
      const item = document.querySelector('.sr-item');
      if (!item) return null;
      const views = Array.from(item.querySelectorAll('.sr-view'));
      return {
        className: item.className,
        styleWidth: item.style.width,
        styleMargin: item.style.margin,
        computedWidth: window.getComputedStyle(item).width,
        views: views.map(v => ({
          pos: v.getAttribute('data-sr-pos'),
          style: v.getAttribute('style'),
          opacity: window.getComputedStyle(v).opacity,
          transform: window.getComputedStyle(v).transform,
        }))
      };
    });
    console.log('Hovered item details (mid-hover):', JSON.stringify(hoveredDetails, null, 2));

    await page.waitForTimeout(500);
    const fullyHovered = await page.evaluate(() => {
      const item = document.querySelector('.sr-item');
      if (!item) return null;
      const views = Array.from(item.querySelectorAll('.sr-view'));
      return {
        className: item.className,
        styleWidth: item.style.width,
        computedWidth: window.getComputedStyle(item).width,
        views: views.map(v => ({
          pos: v.getAttribute('data-sr-pos'),
          style: v.getAttribute('style'),
          opacity: window.getComputedStyle(v).opacity,
          transform: window.getComputedStyle(v).transform,
        }))
      };
    });
    console.log('Fully hovered item details:', JSON.stringify(fullyHovered, null, 2));

    // 4. Test Click
    console.log('Clicking item to trigger focus modal...');
    await firstItem.click();
    await page.waitForTimeout(500);

    const focusDetails = await page.evaluate(() => {
      const focus = document.querySelector('.sr-focus');
      const stage = document.querySelector('.sr-focus-stage, [data-sr-fstage]');
      return {
        focusClass: focus?.className,
        focusStyle: focus?.getAttribute('style'),
        stageHTML: stage?.outerHTML.slice(0, 500),
        stageStyle: stage?.getAttribute('style'),
      };
    });
    console.log('Focus modal details after click:', JSON.stringify(focusDetails, null, 2));
  }

  await browser.close();
}

inspect().catch(console.error);
