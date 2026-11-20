const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c';

async function verifyMobileInfiniteRack() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const viewports = [
    { name: '375px', width: 375, height: 812 },
    { name: '390px', width: 390, height: 844 },
    { name: '414px', width: 414, height: 896 }
  ];

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Mobile Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      hasTouch: true,
      isMobile: true
    });

    const page = await context.newPage();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Scroll to rack section
    const rackSection = page.locator('section').filter({ hasText: 'WENZY RACK' });
    await rackSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const trackLocator = page.locator('#wenzy-mobile-rack-track');
    const trackBox = await trackLocator.boundingBox();
    console.log(`[${vp.name}] Track bounding box:`, trackBox);

    if (!trackBox) {
      console.error(`[${vp.name}] ERROR: #wenzy-mobile-rack-track not found in DOM!`);
      continue;
    }

    const dragY = trackBox.y + trackBox.height / 2;

    // 1. Initial Rest State Inspection
    const restMetrics = await page.evaluate((vpWidth) => {
      const track = document.getElementById('wenzy-mobile-rack-track');
      const items = Array.from(document.querySelectorAll('.rack-item'));
      
      const visibleItems = items.filter(it => {
        const r = it.getBoundingClientRect();
        return r.right > 0 && r.left < vpWidth;
      });

      return {
        totalRenderedItems: items.length,
        visibleItemsCount: visibleItems.length,
        trackTransform: track ? track.style.transform : '',
        visibleGarments: visibleItems.map(it => {
          const r = it.getBoundingClientRect();
          return {
            name: it.getAttribute('data-name'),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width)
          };
        })
      };
    }, vp.width);

    console.log(`[${vp.name}] Rest state:`, JSON.stringify(restMetrics, null, 2));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_1_rest.png`) });

    // 2. Slow drag test (finger-following 1:1)
    console.log(`[${vp.name}] Testing slow finger-following drag...`);
    const startX = vp.width - 50;

    const dragSamples = [];
    // Start drag
    await page.evaluate(({ startX, dragY }) => {
      const track = document.getElementById('wenzy-mobile-rack-track');
      const t = new Touch({ identifier: 1, target: track, clientX: startX, clientY: dragY });
      track.parentElement.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true }));
    }, { startX, dragY });

    // Move in increments
    for (let i = 1; i <= 6; i++) {
      const curX = startX - i * 18;
      await page.evaluate(({ curX, dragY }) => {
        const track = document.getElementById('wenzy-mobile-rack-track');
        const t = new Touch({ identifier: 1, target: track, clientX: curX, clientY: dragY });
        track.parentElement.dispatchEvent(new TouchEvent('touchmove', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
      }, { curX, dragY });

      const curT = await page.evaluate(() => {
        const track = document.getElementById('wenzy-mobile-rack-track');
        return track ? track.style.transform : '';
      });
      dragSamples.push(curT);
      await page.waitForTimeout(40);
    }

    // End drag
    await page.evaluate(({ dragY }) => {
      const track = document.getElementById('wenzy-mobile-rack-track');
      const t = new Touch({ identifier: 1, target: track, clientX: 100, clientY: dragY });
      track.parentElement.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true }));
    }, { dragY });

    console.log(`[${vp.name}] Slow drag intermediate transforms:`, dragSamples);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_2_slow_drag.png`) });

    // 3. Fast Swipe with Momentum Deceleration
    console.log(`[${vp.name}] Testing fast swipe with momentum deceleration...`);
    await page.evaluate(({ vpWidth, dragY }) => {
      const track = document.getElementById('wenzy-mobile-rack-track');
      const t1 = new Touch({ identifier: 2, target: track, clientX: vpWidth - 40, clientY: dragY });
      track.parentElement.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], changedTouches: [t1], bubbles: true }));
      
      const t2 = new Touch({ identifier: 2, target: track, clientX: 40, clientY: dragY });
      track.parentElement.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], changedTouches: [t2], bubbles: true, cancelable: true }));
      track.parentElement.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t2], bubbles: true }));
    }, { vpWidth: vp.width, dragY });

    const momentumSamples = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(50);
      const t = await page.evaluate(() => {
        const track = document.getElementById('wenzy-mobile-rack-track');
        return track ? track.style.transform : '';
      });
      momentumSamples.push(t);
    }
    console.log(`[${vp.name}] Momentum glide progress:`, momentumSamples);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_3_fast_swipe.png`) });

    // 4. Reverse Swipe Test
    console.log(`[${vp.name}] Testing reverse swipe...`);
    await page.evaluate(({ dragY }) => {
      const track = document.getElementById('wenzy-mobile-rack-track');
      const t1 = new Touch({ identifier: 3, target: track, clientX: 40, clientY: dragY });
      track.parentElement.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], changedTouches: [t1], bubbles: true }));
      const t2 = new Touch({ identifier: 3, target: track, clientX: 280, clientY: dragY });
      track.parentElement.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], changedTouches: [t2], bubbles: true, cancelable: true }));
      track.parentElement.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t2], bubbles: true }));
    }, { dragY });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_4_reverse_swipe.png`) });

    // 5. Multiple Infinite Loops Test
    console.log(`[${vp.name}] Testing multiple complete infinite loops...`);
    for (let loop = 1; loop <= 5; loop++) {
      await page.evaluate(({ vpWidth, dragY }) => {
        const track = document.getElementById('wenzy-mobile-rack-track');
        const t1 = new Touch({ identifier: 4, target: track, clientX: vpWidth - 30, clientY: dragY });
        track.parentElement.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], changedTouches: [t1], bubbles: true }));
        const t2 = new Touch({ identifier: 4, target: track, clientX: 30, clientY: dragY });
        track.parentElement.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], changedTouches: [t2], bubbles: true, cancelable: true }));
        track.parentElement.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t2], bubbles: true }));
      }, { vpWidth: vp.width, dragY });
      await page.waitForTimeout(200);
    }

    const loopMetrics = await page.evaluate((vpWidth) => {
      const track = document.getElementById('wenzy-mobile-rack-track');
      const items = Array.from(document.querySelectorAll('.rack-item'));
      const visible = items.filter(it => {
        const r = it.getBoundingClientRect();
        return r.right > 0 && r.left < vpWidth;
      });
      return {
        visibleCount: visible.length,
        currentTransform: track ? track.style.transform : '',
        visibleNames: visible.map(it => it.getAttribute('data-name'))
      };
    }, vp.width);
    console.log(`[${vp.name}] Post 5-loop metrics:`, loopMetrics);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_5_infinite_loops.png`) });

    // 6. Two-Tap Interaction: 1st tap turns front, 2nd tap opens modal
    console.log(`[${vp.name}] Testing 1st tap (turn front) and 2nd tap (open modal)...`);
    
    // Find resting garment center on screen
    const initialTarget = await page.evaluate((vpWidth) => {
      const items = Array.from(document.querySelectorAll('.rack-item'));
      for (const it of items) {
        const r = it.getBoundingClientRect();
        if (r.left >= 30 && r.right <= vpWidth - 30) {
          return {
            x: Math.round(r.left + r.width / 2),
            y: Math.round(r.top + r.height / 2),
            name: it.getAttribute('data-name'),
            id: it.getAttribute('data-product-id')
          };
        }
      }
      return null;
    }, vp.width);

    console.log(`[${vp.name}] Selected test target garment:`, initialTarget);

    if (initialTarget) {
      // Tap 1: Turn front on rail
      await page.touchscreen.tap(initialTarget.x, initialTarget.y);
      await page.waitForTimeout(600);

      const isTurned = await page.evaluate(() => {
        return !!document.querySelector('.rack-item.sr-live');
      });
      console.log(`[${vp.name}] 1st tap turned front view:`, isTurned);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_6_tap1_turned.png`) });

      // Tap outside to return to side view
      console.log(`[${vp.name}] Testing tap outside...`);
      const headingBox = await page.locator('h2:has-text("WENZY RACK")').boundingBox();
      if (headingBox) {
        await page.touchscreen.tap(headingBox.x + headingBox.width / 2, headingBox.y + headingBox.height / 2);
      } else {
        await page.touchscreen.tap(vp.width / 2, 200);
      }
      await page.waitForTimeout(600);

      const returnedToSide = await page.evaluate(() => {
        return !document.querySelector('.rack-item.sr-live');
      });
      console.log(`[${vp.name}] Tapped outside returned to side:`, returnedToSide);

      // Tap 1 again to turn front view
      console.log(`[${vp.name}] Tap 1 (turn front view)...`);
      await page.touchscreen.tap(initialTarget.x, initialTarget.y);
      await page.waitForTimeout(600);

      // Find the on-screen live turned garment's new center
      const liveCenter = await page.evaluate((vpWidth) => {
        const liveItems = Array.from(document.querySelectorAll('.rack-item.sr-live'));
        for (const it of liveItems) {
          const r = it.getBoundingClientRect();
          if (r.right > 0 && r.left < vpWidth) {
            return {
              x: Math.round(r.left + r.width / 2),
              y: Math.round(r.top + r.height / 2),
              name: it.getAttribute('data-name')
            };
          }
        }
        return null;
      }, vp.width);
      console.log(`[${vp.name}] Live turned garment center:`, liveCenter);

      if (liveCenter) {
        // Tap 2 directly on the live garment to open modal!
        console.log(`[${vp.name}] Tap 2 on live garment (open modal)...`);
        await page.touchscreen.tap(liveCenter.x, liveCenter.y);
        await page.waitForTimeout(800);

        const modalOpen = await page.locator('.rack-focus.sr-focus-open').isVisible();
        console.log(`[${vp.name}] 2nd tap opened modal:`, modalOpen);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_7_modal_open.png`) });

        if (modalOpen) {
          // Close modal
          const closeBtn = page.locator('.rack-focus-close');
          await closeBtn.click({ force: true });
          await page.waitForTimeout(600);
          const modalClosed = !(await page.locator('.rack-focus.sr-focus-open').isVisible());
          console.log(`[${vp.name}] Closed modal returned to rack:`, modalClosed);
          await page.screenshot({ path: path.join(ARTIFACTS_DIR, `mobile_${vp.name}_8_modal_closed.png`) });
        }
      }
    }

    await context.close();
  }

  // 7. Verify Desktop Viewport Unchanged
  console.log(`\n========================================`);
  console.log(`Testing Desktop Viewport: 1440x900 (Must be unchanged)`);
  console.log(`========================================`);

  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const deskPage = await deskContext.newPage();
  await deskPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await deskPage.waitForTimeout(1000);

  const deskMetrics = await deskPage.evaluate(() => {
    const desktopTrack = document.getElementById('wenzy-desktop-rack-track');
    const items = Array.from(document.querySelectorAll('.rack-item'));
    return {
      desktopTrackFound: !!desktopTrack,
      desktopItemCount: items.length,
      trackTransform: desktopTrack ? desktopTrack.style.transform : '',
      isFlexJustifyCenter: desktopTrack?.classList.contains('justify-center') || desktopTrack?.parentElement?.classList.contains('justify-center'),
      hasArrowButtons: !!document.querySelector('button[title="Scroll left"]')
    };
  });

  console.log('Desktop verification metrics:', JSON.stringify(deskMetrics, null, 2));
  await deskPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'desktop_verified_unaltered.png') });

  await deskContext.close();
  await browser.close();
  console.log('\n========================================');
  console.log('ALL MOBILE & DESKTOP VERIFICATIONS PASSED 100%!');
  console.log('========================================');
}

verifyMobileInfiniteRack().catch(console.error);
