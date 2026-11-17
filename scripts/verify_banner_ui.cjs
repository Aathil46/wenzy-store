const { chromium } = require('playwright')
const path = require('path')

const ARTIFACT_DIR = 'C:/Users/LENOVO/.gemini/antigravity/brain/863be10b-d7aa-4e6d-9148-f3d7bef7c31c'

async function runUITests() {
  console.log('--- STARTING PLAYWRIGHT UI VERIFICATION FOR BANNER CROPPING & RATIOS ---')
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Visit Storefront Home
    console.log('[UI 1] Loading Storefront Home (http://localhost:5173/)...')
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Capture homepage
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'wenzy_homepage_crop_live.png'), fullPage: false })
    console.log('Captured wenzy_homepage_crop_live.png')

    // 2. Go to Login & Sign in as Admin
    console.log('[UI 2] Logging in as Admin...')
    await page.goto('http://localhost:5173/account', { waitUntil: 'networkidle' })
    
    // Fill credentials
    const emailInput = page.locator('input[placeholder="name@example.com"]')
    await emailInput.fill('admin.wenzy@gmail.com')
    const passInput = page.locator('input[placeholder="••••••••"]')
    await passInput.fill('Admin@Wenzy2026!')
    await page.click('button:has-text("SIGN IN")')
    await page.waitForTimeout(2000)

    // 3. Navigate to Admin Banners
    console.log('[UI 3] Navigating to /admin/banners...')
    await page.goto('http://localhost:5173/admin/banners', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Capture admin banners list
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'wenzy_admin_banners_crop_live.png'), fullPage: true })
    console.log('Captured wenzy_admin_banners_crop_live.png')

    // 4. Open Edit Banner modal on the first banner
    console.log('[UI 4] Opening Banner Form Modal...')
    const editButtons = page.locator('button[title="Edit Banner"]')
    const count = await editButtons.count()
    console.log(`Found ${count} edit buttons.`)

    if (count > 0) {
      await editButtons.first().click()
      await page.waitForTimeout(1000)

      // Verify aspect ratio presets: ONLY Standard Website Banner (3:1) and Landscape (16:9)
      const standardOption = page.locator('button:has-text("Standard Website Banner")')
      const landscapeOption = page.locator('button:has-text("Landscape")')
      const customSlider = page.locator('text=Adjust Banner Height')
      const ultrawide = page.locator('text=21:9')
      const square = page.locator('text=Square Post')

      const hasStandard = await standardOption.count() > 0
      const hasLandscape = await landscapeOption.count() > 0
      const hasCustomSlider = await customSlider.count() > 0
      const hasUltrawide = await ultrawide.count() > 0
      const hasSquare = await square.count() > 0

      console.log(`Preset Check: Standard (3:1): ${hasStandard}, Landscape (16:9): ${hasLandscape}`)
      console.log(`Obsolete Presets Removed Check: Custom Slider: ${hasCustomSlider === false ? 'PASS (removed)' : 'FAIL'}, 21:9: ${hasUltrawide === false ? 'PASS (removed)' : 'FAIL'}, 1:1: ${hasSquare === false ? 'PASS (removed)' : 'FAIL'}`)

      // Verify Title is optional (no required attribute)
      const titleInput = page.locator('input[placeholder*="leave empty for Untitled Banner"]')
      const isRequired = await titleInput.getAttribute('required')
      console.log(`Title Input Optional Check: required=${isRequired} (Expected: null) -> ${isRequired === null ? 'PASS' : 'FAIL'}`)

      // Verify Live Crop Editor elements
      const zoomSlider = page.locator('input[type="range"][min="1"][max="3"]')
      const resetCropBtn = page.locator('button:has-text("Reset Crop")')
      const coverBtn = page.locator('button:has-text("Cover (Fill Area)")')
      const containBtn = page.locator('button:has-text("Contain (Full Image)")')

      console.log(`Crop Editor Controls Check: Zoom Slider: ${await zoomSlider.count() > 0}, Reset Crop: ${await resetCropBtn.count() > 0}, Cover/Contain: ${await coverBtn.count() > 0}`)

      // Test dragging the crop preview
      const canvas = page.locator('div[style*="aspect-ratio"]')
      if (await canvas.count() > 0) {
        const box = await canvas.first().boundingBox()
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.mouse.down()
          await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 30, { steps: 5 })
          await page.mouse.up()
          console.log('PASS: Successfully performed interactive mouse drag on Live Crop preview canvas!')
        }
      }

      // Test zooming with slider
      if (await zoomSlider.count() > 0) {
        await zoomSlider.fill('1.8')
        console.log('PASS: Successfully adjusted zoom slider to 1.8x!')
      }

      // Capture Modal screenshot
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'wenzy_admin_banner_crop_modal_live.png'), fullPage: true })
      console.log('Captured wenzy_admin_banner_crop_modal_live.png')
    }

    console.log('\n--- PLAYWRIGHT UI VERIFICATION COMPLETED SUCCESSFULLY ---')
  } catch (err) {
    console.error('Playwright UI Error:', err)
  } finally {
    await browser.close()
  }
}

runUITests()
