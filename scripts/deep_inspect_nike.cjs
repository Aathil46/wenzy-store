const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c'
const TARGET_URL = 'https://nike-makknzjs.myshopify.com/'

async function deepInspect() {
  console.log('--- DEEP REA INSPECTION OF NIKE REFERENCE SITE ---')
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' })
    if (page.url().includes('/password')) {
      const pwInput = page.locator('input[name="password"]')
      const submitBtn = page.locator('button[type="submit"]')
      await pwInput.fill(process.env.REF_PW || '')
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
        submitBtn.click(),
      ])
      await page.waitForTimeout(2000)
    }

    console.log(`Connected to: ${page.url()}`)

    // 1. Detailed Inspection of the Clothing Rail DOM and JS Architecture
    const railDetailedAnalysis = await page.evaluate(() => {
      const railSection = document.querySelector('.sr-sec') || document.querySelector('[class*="scene_rail"]') || document.querySelector('.sr-rack')
      if (!railSection) return { error: 'Rail section not found' }

      // Get all child elements inside rail
      const items = Array.from(railSection.querySelectorAll('[class*="item"], [class*="card"], [class*="product"], [class*="hanger"], [class*="piece"], a'))

      // Inspect scripts and window objects
      const customElements = window.customElements ? 'CustomElements supported' : 'None'
      const gsapPresent = !!window.gsap
      const threePresent = !!window.THREE
      
      // Look for inline styles, CSS transforms, event listeners
      const firstItem = railSection.querySelector('.sr-rack > *') || items[0]
      const computedStyle = firstItem ? window.getComputedStyle(firstItem) : null

      return {
        railClass: railSection.className,
        railHTML: railSection.outerHTML.slice(0, 3000), // First 3000 chars of HTML
        itemCount: items.length,
        firstItemTag: firstItem?.tagName,
        firstItemClass: firstItem?.className,
        firstItemTransform: computedStyle?.transform,
        firstItemTransition: computedStyle?.transition,
        firstItemPosition: computedStyle?.position,
        gsapPresent,
        threePresent,
        allClasses: Array.from(railSection.querySelectorAll('*')).map(el => el.className).filter(Boolean).slice(0, 30),
      }
    })
    console.log('Rail Detailed Analysis:', JSON.stringify(railDetailedAnalysis, null, 2))

    // 2. Extract the actual scripts driving the rail
    const scriptSources = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => {
        if (s.src) return { type: 'external', src: s.src }
        if (s.innerText && (s.innerText.includes('rail') || s.innerText.includes('rack') || s.innerText.includes('sr-'))) {
          return { type: 'inline', content: s.innerText.slice(0, 1500) }
        }
        return null
      }).filter(Boolean)
      return scripts
    })
    console.log('Rail Scripts Identified:', JSON.stringify(scriptSources.slice(0, 10), null, 2))

    // 3. Test Hover on Garment #1, #2, #3
    console.log('Testing Hover Behavior...')
    const rackItems = page.locator('.sr-rack > *')
    const totalRackItems = await rackItems.count()
    console.log(`Found ${totalRackItems} items in .sr-rack`)

    if (totalRackItems > 0) {
      const item3 = rackItems.nth(2) // 3rd garment (Heather Grey Hoodie)
      const box = await item3.boundingBox()
      if (box) {
        console.log(`Item 3 box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`)
        
        // Before hover styles
        const beforeHoverTransform = await item3.evaluate(el => window.getComputedStyle(el).transform)
        console.log(`Item 3 transform BEFORE hover: ${beforeHoverTransform}`)

        // Move mouse to hover item
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(1000)

        // After hover styles
        const afterHoverTransform = await item3.evaluate(el => ({
          transform: window.getComputedStyle(el).transform,
          className: el.className,
          innerHTML: el.innerHTML.slice(0, 500)
        }))
        console.log('Item 3 AFTER hover:', JSON.stringify(afterHoverTransform, null, 2))

        // Capture focused hover screenshot
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'nike_rail_hover_detail.png'),
          clip: {
            x: Math.max(0, box.x - 100),
            y: Math.max(0, box.y - 100),
            width: Math.min(800, 1440),
            height: 600,
          }
        })
        console.log('Captured nike_rail_hover_detail.png')

        // 4. Test Click on Item
        console.log('Clicking Garment #3 to observe product inspection behavior...')
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(2000)

        console.log(`URL after click: ${page.url()}`)

        // Check if an overlay/modal opened or if it navigated
        const overlayInfo = await page.evaluate(() => {
          const modals = Array.from(document.querySelectorAll('[class*="modal"], [class*="drawer"], [class*="overlay"], [class*="popup"], [class*="inspect"], dialog[open], [aria-modal="true"]'))
          return modals.map(m => ({
            tag: m.tagName,
            className: m.className,
            id: m.id,
            visible: m.getBoundingClientRect().width > 0,
            rect: m.getBoundingClientRect(),
          }))
        })
        console.log('Overlay/Modal Elements after click:', JSON.stringify(overlayInfo, null, 2))

        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'nike_after_click_garment.png'),
          fullPage: false,
        })
        console.log('Captured nike_after_click_garment.png')
      }
    }

    // 5. Test Horizontal Dragging of the Rail
    console.log('Testing Horizontal Drag / Momentum on .sr-rack...')
    const rack = page.locator('.sr-rack').first()
    const rackBox = await rack.boundingBox()
    if (rackBox) {
      const startX = rackBox.x + rackBox.width * 0.7
      const startY = rackBox.y + rackBox.height * 0.5
      await page.mouse.move(startX, startY)
      await page.mouse.down()
      await page.mouse.move(startX - 400, startY, { steps: 15 })
      await page.waitForTimeout(300)
      await page.mouse.up()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'nike_rail_dragged_result.png'),
        clip: {
          x: 0,
          y: Math.max(0, rackBox.y - 50),
          width: 1440,
          height: 500,
        }
      })
      console.log('Captured nike_rail_dragged_result.png')
    }

    // 6. Inspect the second rail: Straight Rail (.rk-section-wrapper)
    console.log('Inspecting Second Rail (.rk-section-wrapper)...')
    const secondRail = page.locator('.rk-section-wrapper').first()
    if (await secondRail.count() > 0) {
      const sBox = await secondRail.boundingBox()
      if (sBox) {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'nike_second_rail_straight.png'),
          clip: {
            x: 0,
            y: Math.max(0, sBox.y - 20),
            width: 1440,
            height: Math.min(sBox.height + 40, 900),
          }
        })
        console.log('Captured nike_second_rail_straight.png')
      }
    }

    // 7. Inspect Product Detail Page
    console.log('Navigating to an individual product page to inspect multi-angle/3D behavior...')
    await page.goto('https://nike-makknzjs.myshopify.com/products/hoodie-black', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const pdpAnalysis = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img[src*="products/"]')).map(img => img.src)
      const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({ id: c.id, className: c.className }))
      const modelViewers = Array.from(document.querySelectorAll('model-viewer')).map(m => m.outerHTML)
      const variants = Array.from(document.querySelectorAll('input[name*="size"], input[name*="Color"], [class*="variant"]')).map(v => v.outerHTML.slice(0, 100))

      return {
        title: document.title,
        imagesCount: images.length,
        images: images.slice(0, 10),
        canvases,
        modelViewers,
        variantsCount: variants.length,
      }
    })
    console.log('PDP Analysis:', JSON.stringify(pdpAnalysis, null, 2))

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nike_pdp_full.png'),
      fullPage: true,
    })
    console.log('Captured nike_pdp_full.png')

    console.log('--- DEEP REA INSPECTION COMPLETED ---')
  } catch (err) {
    console.error('Deep inspection failed:', err)
  } finally {
    await browser.close()
  }
}

deepInspect()
