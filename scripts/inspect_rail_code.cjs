const { chromium } = require('playwright')

async function inspectRailCode() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://nike-makknzjs.myshopify.com/password', { waitUntil: 'domcontentloaded' })
    await page.fill('input[name="password"]', process.env.REF_PW || '')
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('button[type="submit"]'),
    ])
    await page.waitForTimeout(2000)

    // 1. Inspect all script tags on page
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).map((s, idx) => ({
        idx,
        src: s.src,
        textPreview: s.innerText ? s.innerText.slice(0, 300) : '',
        hasSr: s.innerText && s.innerText.includes('sr-'),
        hasRail: s.innerText && s.innerText.includes('rail'),
      })).filter(s => s.src || s.hasSr || s.hasRail)
    })
    console.log('--- MATCHING SCRIPTS ---')
    console.log(JSON.stringify(scripts, null, 2))

    // 2. Inspect first .sr-item inner structure
    const itemStructure = await page.evaluate(() => {
      const item = document.querySelector('.sr-item')
      if (!item) return null
      return {
        tag: item.tagName,
        className: item.className,
        outerHTML: item.outerHTML,
      }
    })
    console.log('--- FIRST SR-ITEM HTML ---')
    console.log(itemStructure ? itemStructure.outerHTML : 'Not found')

    // 3. Inspect what happens when clicking .sr-item or .sr-garment
    console.log('--- ATTEMPTING TRIGGER ON .sr-item ---')
    const itemEl = page.locator('.sr-item').first()
    await itemEl.hover()
    await page.waitForTimeout(1000)

    // Click specifically on the garment or tag
    const garment = itemEl.locator('.sr-garment')
    if (await garment.count() > 0) {
      console.log('Clicking .sr-garment...')
      await garment.click()
    } else {
      await itemEl.click()
    }
    await page.waitForTimeout(2000)

    // Check if .sr-focus or any other overlay became active
    const activeOverlay = await page.evaluate(() => {
      const focus = document.querySelector('.sr-focus')
      const allActive = Array.from(document.querySelectorAll('.active, [class*="open"], [class*="active"], [class*="focus"], .sr-focus'))
      return {
        focusHTML: focus ? focus.outerHTML.slice(0, 1500) : null,
        focusVisible: focus ? window.getComputedStyle(focus).display !== 'none' && window.getComputedStyle(focus).opacity !== '0' : false,
        allActiveClasses: allActive.map(el => ({ tag: el.tagName, className: el.className })).slice(0, 15),
      }
    })
    console.log('--- ACTIVE OVERLAY STATE AFTER CLICK ---')
    console.log(JSON.stringify(activeOverlay, null, 2))

    // Also check the page navigation links in header:
    const headerLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('header a, nav a')).map(a => ({
        text: a.innerText.trim(),
        href: a.href,
      }))
    })
    console.log('--- HEADER NAV LINKS ---')
    console.log(JSON.stringify(headerLinks, null, 2))

  } catch (err) {
    console.error('Error in inspectRailCode:', err)
  } finally {
    await browser.close()
  }
}

inspectRailCode()
