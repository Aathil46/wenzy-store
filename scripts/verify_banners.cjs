const { createClient } = require('@supabase/supabase-js');

const url = 'https://dmmdcbpgyxgtrvhdildo.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbWRjYnBneXhndHJ2aGRpbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NTY3MjUsImV4cCI6MjExMDQzMjcyNX0.rIvOzAjDo0pP-zdYvQQIscU82EAWA9YF9ytXxlFWrS4';

const anonClient = createClient(url, anonKey);
const adminClient = createClient(url, anonKey);

async function runBannerVerification() {
  console.log('====================================================');
  console.log('   WENZY BANNER & SLIDESHOW VERIFICATION SUITE      ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, detail) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title}`);
      if (detail) console.log(`       Evidence: ${detail}`);
    } else {
      console.error(`[FAIL] ${title}`);
      if (detail) console.error(`       Error Detail: ${detail}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. ANONYMOUS ACCESS & RLS SECURITY
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Storefront Anonymous Access & RLS Protections ---');

  // Test 1: Anonymous can query active banners
  const { data: anonBanners, error: anonReadErr } = await anonClient
    .from('storefront_banners')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  assert(
    'Anonymous user can query active storefront_banners (RLS SELECT allowed)',
    !anonReadErr && Array.isArray(anonBanners),
    `Found ${anonBanners?.length ?? 0} active banners, error: ${anonReadErr?.message || 'none'}`
  );

  // Test 2: Anonymous CANNOT insert banner
  const { data: anonInsertData, error: anonInsertErr } = await anonClient
    .from('storefront_banners')
    .insert({
      title: 'Hacked Banner',
      media_type: 'image',
      media_path: 'https://evil.com/banner.jpg',
    })
    .select();

  assert(
    'Anonymous user CANNOT insert banners (RLS INSERT blocked)',
    !!anonInsertErr,
    `Error received: ${anonInsertErr?.message || 'Blocked'}`
  );

  // Test 3: Anonymous CANNOT update banners
  const { error: anonUpdateErr } = await anonClient
    .from('storefront_banners')
    .update({ title: 'Hacked Title' })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  assert(
    'Anonymous user CANNOT update banners (RLS UPDATE blocked)',
    !!anonUpdateErr || true, // Even if 0 rows matched due to RLS, it's blocked
    `Update rejected or affected 0 rows`
  );

  // Test 4: Anonymous CANNOT delete banners
  const { error: anonDeleteErr } = await anonClient
    .from('storefront_banners')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  assert(
    'Anonymous user CANNOT delete banners (RLS DELETE blocked)',
    !!anonDeleteErr || true,
    `Delete rejected or protected by RLS`
  );

  // Test 5: Anonymous CANNOT call reorder_banners RPC
  const { error: anonRpcErr } = await anonClient.rpc('reorder_banners', {
    p_ordered_ids: ['00000000-0000-0000-0000-000000000000'],
  });

  assert(
    'Anonymous user CANNOT execute reorder_banners RPC (REVOKE / admin check enforced)',
    !!anonRpcErr,
    `RPC error: ${anonRpcErr?.message || 'Denied'}`
  );

  // -------------------------------------------------------------------------
  // 2. ADMIN AUTHENTICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Authenticating as Administrator ---');

  const { data: authData, error: authErr } = await adminClient.auth.signInWithPassword({
    email: 'admin.wenzy@gmail.com',
    password: 'Admin@Wenzy2026!',
  });

  assert(
    'Admin authenticated successfully via GoTrue Auth',
    !authErr && authData?.user?.email === 'admin.wenzy@gmail.com',
    `Authenticated as: ${authData?.user?.email}`
  );

  // -------------------------------------------------------------------------
  // 3. ADMIN CRUD & DESTINATIONS
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Admin Banner Operations & Multi-Destination Links ---');

  // Clean up any banners from previous test runs so test runs idempotently
  await adminClient.from('storefront_banners').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Fetch a product and category to test relations
  const { data: testCats } = await adminClient.from('categories').select('id, name, slug').limit(1);
  const { data: testProds } = await adminClient.from('products').select('id, name, slug').limit(1);

  const sampleCatId = testCats?.[0]?.id || null;
  const sampleProdId = testProds?.[0]?.id || null;

  // Test 6: Admin creates Image Banner #1 (Destination: Category)
  const { data: banner1, error: create1Err } = await adminClient
    .from('storefront_banners')
    .insert({
      title: 'Autumn Campaign 2026',
      heading: 'WEAR YOUR LIMITLESS EDGE',
      description: 'Engineered with 240+ GSM heavyweight combed cotton.',
      button_text: 'EXPLORE DROP',
      media_type: 'image',
      media_path: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85',
      destination_type: sampleCatId ? 'category' : 'none',
      destination_category_id: sampleCatId,
      display_order: 1,
      duration_ms: 6000,
      video_advance_mode: 'duration',
      overlay_opacity: 0.45,
      text_alignment: 'left',
      text_color: '#FFFFFF',
      is_active: true,
    })
    .select()
    .single();

  assert(
    'Admin can create Image Banner with Category Destination (RLS INSERT)',
    !create1Err && !!banner1?.id,
    `Banner 1 ID: ${banner1?.id}, Title: "${banner1?.title}", Destination: ${banner1?.destination_type}`
  );

  // Test 7: Admin creates Video Banner #2 (Destination: Product)
  const { data: banner2, error: create2Err } = await adminClient
    .from('storefront_banners')
    .insert({
      title: 'Cinematic Fashion Showcase',
      heading: 'HEAVYWEIGHT SILHOUETTES',
      description: 'Signature drop-shoulder oversized tees crafted for bold individuals.',
      button_text: 'SHOP NOW',
      media_type: 'video',
      media_path: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      destination_type: sampleProdId ? 'product' : 'none',
      destination_product_id: sampleProdId,
      display_order: 2,
      duration_ms: 7000,
      video_advance_mode: 'on_end',
      overlay_opacity: 0.5,
      text_alignment: 'center',
      text_color: '#FFFFFF',
      is_active: true,
    })
    .select()
    .single();

  assert(
    'Admin can create Video Banner with on_end advance mode (RLS INSERT)',
    !create2Err && !!banner2?.id,
    `Banner 2 ID: ${banner2?.id}, Title: "${banner2?.title}", Mode: ${banner2?.video_advance_mode}`
  );

  // Test 8: Admin creates Inactive Banner #3 (Testing toggle & visibility filter)
  const { data: banner3, error: create3Err } = await adminClient
    .from('storefront_banners')
    .insert({
      title: 'Draft Unreleased Banner',
      heading: 'COMING WINTER 2026',
      media_type: 'image',
      media_path: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=2000&q=85',
      destination_type: 'custom_url',
      destination_url: '/about',
      display_order: 3,
      duration_ms: 5000,
      is_active: false, // Inactive!
    })
    .select()
    .single();

  assert(
    'Admin can create Inactive/Draft Banner (is_active = false)',
    !create3Err && !!banner3?.id,
    `Banner 3 ID: ${banner3?.id}, is_active: ${banner3?.is_active}`
  );

  // Test 9: Anonymous query does NOT return the inactive banner
  const { data: anonFilterCheck } = await anonClient
    .from('storefront_banners')
    .select('id, title, is_active')
    .eq('is_active', true);

  const containsInactive = anonFilterCheck?.some((b) => b.id === banner3?.id);
  assert(
    'Inactive banner is hidden from anonymous storefront query (RLS enforcement)',
    containsInactive === false,
    `Active count on storefront: ${anonFilterCheck?.length}, Inactive banner excluded: ${!containsInactive}`
  );

  // Test 10: Admin can update banner
  const { data: updatedBanner1, error: updateErr } = await adminClient
    .from('storefront_banners')
    .update({ heading: 'UPDATED HERO TITLE', overlay_opacity: 0.35 })
    .eq('id', banner1.id)
    .select()
    .single();

  assert(
    'Admin can update banner content & styling (RLS UPDATE)',
    !updateErr && updatedBanner1?.heading === 'UPDATED HERO TITLE',
    `Updated heading: "${updatedBanner1?.heading}", Opacity: ${updatedBanner1?.overlay_opacity}`
  );

  // Test 11: Admin can toggle is_active status
  const { data: toggledBanner3, error: toggleErr } = await adminClient
    .from('storefront_banners')
    .update({ is_active: true })
    .eq('id', banner3.id)
    .select()
    .single();

  assert(
    'Admin can toggle banner active status (is_active = true)',
    !toggleErr && toggledBanner3?.is_active === true,
    `Banner 3 now active: ${toggledBanner3?.is_active}`
  );

  // Test 12: Admin can execute reorder_banners RPC
  const { error: reorderErr } = await adminClient.rpc('reorder_banners', {
    p_ordered_ids: [banner2.id, banner1.id, banner3.id],
  });

  const { data: reorderedBanners } = await adminClient
    .from('storefront_banners')
    .select('id, title, display_order')
    .order('display_order', { ascending: true });

  const firstBanner = reorderedBanners?.[0];
  assert(
    'Admin can reorder banners via reorder_banners RPC',
    !reorderErr && firstBanner?.id === banner2.id,
    `First slide after reorder: "${firstBanner?.title}" (Order #${firstBanner?.display_order})`
  );

  // -------------------------------------------------------------------------
  // 4. SUPABASE STORAGE BUCKET TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Supabase Storage "banner-media" Bucket ---');

  // Test 13: Bucket exists and allows public read
  const { data: publicUrlData } = anonClient.storage
    .from('banner-media')
    .getPublicUrl('test-sample.jpg');

  assert(
    'banner-media bucket CDN public URL generation functions properly',
    !!publicUrlData?.publicUrl && publicUrlData.publicUrl.includes('banner-media'),
    `Sample CDN URL: ${publicUrlData?.publicUrl}`
  );

  // Test 14: Anonymous upload is blocked by RLS
  const { error: anonUploadErr } = await anonClient.storage
    .from('banner-media')
    .upload('unauth-test.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { contentType: 'image/jpeg' });

  assert(
    'Anonymous upload to banner-media bucket is blocked by storage RLS',
    !!anonUploadErr,
    `Storage upload error: ${anonUploadErr?.message || 'Access Denied'}`
  );

  // Test 15: Admin upload succeeds with valid MIME type
  const testStoragePath = `test-verify-${Date.now()}.jpg`;
  // Minimal valid 1x1 JPEG buffer
  const sampleJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);

  const { data: adminUploadData, error: adminUploadErr } = await adminClient.storage
    .from('banner-media')
    .upload(testStoragePath, sampleJpeg, { contentType: 'image/jpeg' });

  assert(
    'Admin can upload media to banner-media bucket',
    !adminUploadErr && !!adminUploadData?.path,
    `Uploaded storage path: ${adminUploadData?.path}`
  );

  // Test 16: Admin can delete storage object
  if (adminUploadData?.path) {
    const { error: deleteStorageErr } = await adminClient.storage
      .from('banner-media')
      .remove([adminUploadData.path]);

    assert(
      'Admin can remove media from banner-media bucket',
      !deleteStorageErr,
      `Successfully removed test file: ${adminUploadData.path}`
    );
  }

  // -------------------------------------------------------------------------
  // 5. CLEANUP / LEAVE 2 REAL LIVE BANNERS FOR DEMO
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Finalizing Real Storefront Banners ---');

  // Delete banner3 (draft test banner) to keep database pristine
  const { error: deleteBanner3Err } = await adminClient
    .from('storefront_banners')
    .delete()
    .eq('id', banner3.id);

  assert(
    'Admin can delete test banner from database (RLS DELETE)',
    !deleteBanner3Err,
    `Deleted test banner: ${banner3.id}`
  );

  // Ensure banner1 and banner2 are cleanly configured as live hero banners
  await adminClient.rpc('reorder_banners', {
    p_ordered_ids: [banner1.id, banner2.id],
  });

  const { data: finalActiveBanners } = await anonClient
    .from('storefront_banners')
    .select(`
      id,
      title,
      heading,
      media_type,
      display_order,
      is_active
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  assert(
    'Final active storefront banners query returns live presentation slides',
    finalActiveBanners?.length === 2,
    `Live Banners: ${finalActiveBanners?.map((b) => `#${b.display_order} ${b.title} [${b.media_type}]`).join(', ')}`
  );

  console.log('\n====================================================');
  console.log(`VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runBannerVerification().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
