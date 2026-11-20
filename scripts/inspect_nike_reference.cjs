const { chromium } = require('playwright')
const path = require('path')

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c'
const TARGET_URL = 'https://nike-makknzjs.myshopify.com/'

async function inspectReference() {
  console.log('[1/7] Launching Chrome...')
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // Desktop Context (1440x900)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    console.log(`[2/7] Navigating to ${TARGET_URL}...`)
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    console.log(`Initial URL: ${page.url()}`)

    // Check if on password page
    if (page.url().includes('/password')) {
      console.log('Password challenge detected. Submitting password...')
      const pwInput = page.locator('input[name="password"]')
      const submitBtn = page.locator('button[type="submit"]')
      
      const pw = process.env.REF_PW || ''
      if (!pw) {
        console.error('REF_PW environment variable is missing!')
        process.exit(1)
      }
      await pwInput.fill(pw)
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch((e) => console.log('Navigation event notice:', e.message)),
        submitBtn.click(),
      ])

      await page.waitForTimeout(3000)
      console.log(`URL after submission attempt: ${page.url()}`)

      // If still on password page, check if we need to navigate to root /
      if (page.url().includes('/password')) {
        console.log('Still on /password, checking if session unlocked and navigating to /...')
        await page.goto('https://nike-makknzjs.myshopify.com/', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        console.log(`URL after goto root: ${page.url()}`)
      }
    }

    // Capture screenshot of wherever we are now
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nike_after_auth.png'),
      fullPage: false,
    })
    console.log('Captured nike_after_auth.png')

    // If successfully on store:
    console.log(`Current page title: "${await page.title()}"`)

    // Wait for network to settle
    await page.waitForTimeout(3000)

    // Capture full desktop page
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nike_desktop_full.png'),
      fullPage: true,
    })
    console.log('Captured nike_desktop_full.png')

    // Inspect DOM & Technology Stack
    const techStack = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
      const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
        width: c.width,
        height: c.height,
        className: c.className,
        id: c.id,
      }))
      const modelViewers = Array.from(document.querySelectorAll('model-viewer')).map(m => ({
        src: m.getAttribute('src'),
        poster: m.getAttribute('poster'),
      }))
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        className: img.className,
      }))
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href'))

      return {
        title: document.title,
        scripts,
        canvases,
        modelViewers,
        imagesCount: images.length,
        images: images.slice(0, 25),
        productLinks: links.filter(l => l && l.includes('/products/')),
        themeName: window.Shopify?.theme?.name || 'Unknown',
        themeId: window.Shopify?.theme?.id || 'Unknown',
        hasThree: !!window.THREE,
      }
    })
    console.log('Tech Stack Inspection:', JSON.stringify(techStack, null, 2))

    // Look specifically for the clothing rail section
    const railElements = await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('*'))
      const matches = allEls.filter(el => {
        const str = (el.className + ' ' + el.id + ' ' + (el.getAttribute('data-section-type') || '')).toLowerCase()
        return str.includes('rail') || str.includes('rack') || str.includes('hanger') || str.includes('cloth') || str.includes('product')
      })
      return matches.slice(0, 20).map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        rect: el.getBoundingClientRect(),
        text: el.innerText?.slice(0, 80),
      }))
    })
    console.log('Rail/Product Elements Found:', JSON.stringify(railElements.slice(0, 10), null, 2))

    // Mobile testing
    console.log('Testing Mobile Viewport (iPhone 14 / 390x844)...')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nike_mobile_full.png'),
      fullPage: true,
    })
    console.log('Captured nike_mobile_full.png')

  } catch (err) {
    console.error('Inspection failed:', err)
  } finally {
    await browser.close()
  }
}

inspectReference()
