const { chromium } = require('playwright')
const path = require('path')

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c'

async function captureFocusModal() {
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

    // Click the first .sr-garment to open .sr-focus
    const garment = page.locator('.sr-garment').first()
    await garment.click()
    await page.waitForTimeout(1500)

    // Capture screenshot of open .sr-focus modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nike_focus_modal_open.png'),
      fullPage: false,
    })
    console.log('Captured nike_focus_modal_open.png')

    // Inspect the .sr-focus content in full detail
    const focusDetails = await page.evaluate(() => {
      const focus = document.querySelector('.sr-focus')
      if (!focus) return null

      const images = Array.from(focus.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        className: img.className,
      }))

      const buttons = Array.from(focus.querySelectorAll('button')).map(b => ({
        text: b.innerText.trim(),
        className: b.className,
        ariaLabel: b.getAttribute('aria-label'),
      }))

      const angles = Array.from(focus.querySelectorAll('[class*="view"], [class*="thumb"], [class*="angle"], [class*="tab"]')).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText.trim(),
      }))

      return {
        focusClass: focus.className,
        focusTitle: focus.querySelector('.sr-focus-name')?.innerText,
        focusPrice: focus.querySelector('[class*="price"]')?.innerText,
        images,
        buttons,
        angles,
        innerHTML: focus.innerHTML.slice(0, 4000),
      }
    })
    console.log('--- FOCUS MODAL DETAILS ---')
    console.log(JSON.stringify(focusDetails, null, 2))

    // Test clicking other views or size buttons inside focus
    const sizeBtns = page.locator('.sr-focus button')
    const btnCount = await sizeBtns.count()
    console.log(`Found ${btnCount} buttons inside focus modal.`)

    // Click the 2nd button (e.g. Size M or L)
    if (btnCount > 1) {
      await sizeBtns.nth(1).click()
      await page.waitForTimeout(500)
    }

    // Capture screenshot after interaction
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nike_focus_modal_variant_selected.png'),
      fullPage: false,
    })
    console.log('Captured nike_focus_modal_variant_selected.png')

    // Also visit /pages/scene-rail (Hand Rail Pro)
    console.log('Navigating to /pages/scene-rail...')
    await page.goto('https://nike-makknzjs.myshopify.com/pages/scene-rail', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nike_scene_rail_page.png'),
      fullPage: true,
    })
    console.log('Captured nike_scene_rail_page.png')

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await browser.close()
  }
}

captureFocusModal()
