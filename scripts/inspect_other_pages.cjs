const { chromium } = require('playwright')
const path = require('path')

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c'

async function inspectOtherPages() {
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

    // 1. Visit Nike Orbit
    console.log('Visiting /pages/nike-orbit...')
    await page.goto('https://nike-makknzjs.myshopify.com/pages/nike-orbit', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'nike_page_orbit.png'), fullPage: false })

    // Check for canvas or 3D on orbit
    const orbitInfo = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({ w: c.width, h: c.height, id: c.id, cls: c.className }))
      return { canvases, hasThree: !!window.THREE }
    })
    console.log('Orbit Page Info:', JSON.stringify(orbitInfo, null, 2))

    // 2. Visit Shoe Atelier
    console.log('Visiting /pages/shoe-atelier...')
    await page.goto('https://nike-makknzjs.myshopify.com/pages/shoe-atelier', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'nike_page_shoe_atelier.png'), fullPage: false })

    // 3. Visit Runway
    console.log('Visiting /pages/runway...')
    await page.goto('https://nike-makknzjs.myshopify.com/pages/runway', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'nike_page_runway.png'), fullPage: false })

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await browser.close()
  }
}

inspectOtherPages()
