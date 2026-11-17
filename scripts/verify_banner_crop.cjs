const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Read .env file directly
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
        process.env[key] = val
      }
    }
  })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runTests() {
  console.log('--- STARTING WENZY BANNER CROP & TITLE VERIFICATION ---')
  let testsPassed = 0
  let testsFailed = 0

  // 1. Sign in as Admin
  console.log('\n[AUTH] Signing in as admin...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin.wenzy@gmail.com',
    password: 'Admin@Wenzy2026!',
  })

  if (authErr || !authData.user) {
    console.error('FAILED to authenticate admin:', authErr)
    process.exit(1)
  }
  console.log(`PASS: Authenticated as ${authData.user.email}`)
  testsPassed++

  // 2. Fetch current banners and verify schema
  console.log('\n[TEST 1] Fetching existing storefront banners...')
  const { data: existingBanners, error: fetchErr } = await supabase
    .from('storefront_banners')
    .select('*')
    .order('display_order', { ascending: true })

  if (fetchErr) {
    console.error('FAILED to fetch banners:', fetchErr)
    testsFailed++
  } else {
    console.log(`PASS: Retrieved ${existingBanners.length} banners.`)
    testsPassed++

    existingBanners.forEach((b) => {
      console.log(` - ID: ${b.id} | Title: "${b.title || 'Untitled Banner'}" | Ratio: ${b.aspect_ratio} | Fit: ${b.object_fit} | Crop: ${JSON.stringify(b.crop_settings)}`)
    })
  }

  // 3. Test saving a banner WITHOUT title (Optional Title requirement)
  console.log('\n[TEST 2] Testing saving a banner with NO title (null/empty)...')
  const untitledBannerPayload = {
    title: null, // Title is optional
    media_type: 'image',
    media_path: 'test-untitled-crop-media.jpg',
    aspect_ratio: '3:1', // Default
    crop_settings: {
      desktop: { x: 12.5, y: -8.0, zoom: 1.4 },
      mobile: { x: 0, y: 0, zoom: 1 },
    },
    object_fit: 'cover',
    display_order: 99,
    is_active: false, // inactive so it doesn't affect storefront
    heading: 'UNTITLED TEST HEADING',
    duration_ms: 5000,
    video_advance_mode: 'duration',
    overlay_opacity: 0.2,
    text_alignment: 'left',
    text_color: '#FFFFFF',
  }

  const { data: createdBanner, error: insertErr } = await supabase
    .from('storefront_banners')
    .insert(untitledBannerPayload)
    .select()
    .single()

  if (insertErr) {
    console.error('FAILED to insert banner with title: null:', insertErr)
    testsFailed++
  } else {
    if (createdBanner.title === null) {
      console.log('PASS: Successfully created banner with title: null! DB allows nullable title.')
      testsPassed++
    } else {
      console.error('FAILED: Banner title is not null:', createdBanner.title)
      testsFailed++
    }

    // Verify crop_settings stored properly
    if (
      createdBanner.crop_settings &&
      createdBanner.crop_settings.desktop.x === 12.5 &&
      createdBanner.crop_settings.desktop.zoom === 1.4
    ) {
      console.log('PASS: Crop settings JSONB persisted and retrieved accurately:', createdBanner.crop_settings)
      testsPassed++
    } else {
      console.error('FAILED: Crop settings mismatch:', createdBanner.crop_settings)
      testsFailed++
    }

    // 4. Test updating crop settings and aspect ratio to 16:9
    console.log('\n[TEST 3] Testing update with 16:9 Landscape and revised crop coordinates...')
    const { data: updatedBanner, error: updateErr } = await supabase
      .from('storefront_banners')
      .update({
        aspect_ratio: '16:9',
        object_fit: 'contain',
        crop_settings: {
          desktop: { x: -25.0, y: 15.5, zoom: 2.1 },
          mobile: { x: 5.0, y: 5.0, zoom: 1.2 },
        },
      })
      .eq('id', createdBanner.id)
      .select()
      .single()

    if (updateErr) {
      console.error('FAILED to update banner:', updateErr)
      testsFailed++
    } else {
      if (
        updatedBanner.aspect_ratio === '16:9' &&
        updatedBanner.object_fit === 'contain' &&
        updatedBanner.crop_settings.desktop.zoom === 2.1
      ) {
        console.log('PASS: Successfully updated to 16:9 Landscape and zoom 2.1!')
        testsPassed++
      } else {
        console.error('FAILED: Updated banner did not match expected values:', updatedBanner)
        testsFailed++
      }
    }

    // Clean up test banner
    console.log('\n[TEST 4] Cleaning up test banner...')
    const { error: delErr } = await supabase
      .from('storefront_banners')
      .delete()
      .eq('id', createdBanner.id)

    if (delErr) {
      console.error('Warning: Failed to delete test banner:', delErr)
    } else {
      console.log('PASS: Test banner cleaned up.')
      testsPassed++
    }
  }

  console.log(`\n========================================`)
  console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log(`========================================`)

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
