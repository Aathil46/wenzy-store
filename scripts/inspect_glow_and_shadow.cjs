const { chromium } = require('playwright');

async function inspectStyles() {
  console.log('=== INSPECTING NIKE REFERENCE STYLES ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Nike Reference
    await page.goto('https://nike-makknzjs.myshopify.com/password', { waitUntil: 'networkidle' });
    const pwInput = page.locator('input[type="password"]');
    if (await pwInput.count() > 0) {
      await pwInput.fill('1');
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);

    const nikeRailStyles = await page.evaluate(() => {
      const results = {};
      const garment = document.querySelector('.sr-garment');
      const view = document.querySelector('.sr-view');
      const img = document.querySelector('.sr-view img');
      const item = document.querySelector('.sr-item');
      
      const getStyles = (el) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          filter: cs.filter,
          boxShadow: cs.boxShadow,
          opacity: cs.opacity,
          background: cs.background,
          mixBlendMode: cs.mixBlendMode,
          outline: cs.outline,
        };
      };

      results.item = getStyles(item);
      results.garment = getStyles(garment);
      results.view = getStyles(view);
      results.img = getStyles(img);

      // Check all style sheets for any rule targeting sr-view or img
      const rules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && (rule.selectorText.includes('.sr-') || rule.selectorText.includes('filter'))) {
              if (rule.cssText.includes('filter') || rule.cssText.includes('shadow')) {
                rules.push(rule.cssText);
              }
            }
          }
        } catch (e) {}
      }
      results.matchingRules = rules;

      return results;
    });

    console.log('Nike Rail Styles:', JSON.stringify(nikeRailStyles, null, 2));

    // Check Nike modal if clickable
    try {
      const visibleNikeItem = page.locator('.sr-track .sr-item:not([aria-hidden="true"])').first();
      if (await visibleNikeItem.count() > 0) {
        await visibleNikeItem.scrollIntoViewIfNeeded();
        await visibleNikeItem.click({ force: true });
        await page.waitForTimeout(1000);
        const nikeModalStyles = await page.evaluate(() => {
          const modalImg = document.querySelector('.sr-focus img');
          if (!modalImg) return 'no modal img';
          const cs = window.getComputedStyle(modalImg);
          return {
            filter: cs.filter,
            boxShadow: cs.boxShadow,
            className: modalImg.className
          };
        });
        console.log('Nike Modal Img Styles:', JSON.stringify(nikeModalStyles, null, 2));
      }
    } catch (e) {
      console.log('Could not click Nike modal:', e.message);
    }

    // 2. WENZY Local
    console.log('\n=== INSPECTING WENZY LOCAL STYLES ===');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const wenzyStyles = await page.evaluate(() => {
      const results = {};
      const garment = document.querySelector('.rack-garment');
      const view = document.querySelector('.rack-view');
      const img = document.querySelector('.rack-view img');
      const item = document.querySelector('.rack-item');

      const getStyles = (el) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          filter: cs.filter,
          boxShadow: cs.boxShadow,
          opacity: cs.opacity,
          background: cs.background,
          mixBlendMode: cs.mixBlendMode,
        };
      };

      results.item = getStyles(item);
      results.garment = getStyles(garment);
      results.view = getStyles(view);
      results.img = getStyles(img);

      return results;
    });

    console.log('WENZY Rail Styles:', JSON.stringify(wenzyStyles, null, 2));

    // WENZY Modal
    const firstWenzyItem = page.locator('.rack-item').first();
    if (await firstWenzyItem.count() > 0) {
      await firstWenzyItem.click({ force: true });
      await page.waitForTimeout(1000);
      const wenzyModalStyles = await page.evaluate(() => {
        const modalImg = document.querySelector('.rack-focus img');
        if (!modalImg) return 'no modal img';
        const cs = window.getComputedStyle(modalImg);
        return {
          filter: cs.filter,
          boxShadow: cs.boxShadow,
          className: modalImg.className
        };
      });
      console.log('WENZY Modal Img Styles:', JSON.stringify(wenzyModalStyles, null, 2));
    }

  } catch (err) {
    console.error('Error during style inspection:', err);
  } finally {
    await browser.close();
  }
}

inspectStyles();
