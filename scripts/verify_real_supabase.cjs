const { createClient } = require('@supabase/supabase-js');

const url = 'https://dmmdcbpgyxgtrvhdildo.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbWRjYnBneXhndHJ2aGRpbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NTY3MjUsImV4cCI6MjExMDQzMjcyNX0.rIvOzAjDo0pP-zdYvQQIscU82EAWA9YF9ytXxlFWrS4';

const anonClient = createClient(url, anonKey);

async function runRealDatabaseVerification() {
  console.log('====================================================');
  console.log('     WENZY SUPABASE REAL-DATA VERIFICATION SUITE    ');
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

  // ----------------------------------------------------
  // TEST 1: STOREFRONT REAL DATABASE EMPTY STATES
  // ----------------------------------------------------
  console.log('--- 1. Testing Storefront Database State (Zero Mock Data) ---');

  const { data: initialCats, error: catErr } = await anonClient
    .from('categories')
    .select('*')
    .eq('is_active', true);
  
  assert(
    'Storefront categories query returns real database count (0 categories)',
    !catErr && initialCats.length === 0,
    `Retrieved ${initialCats?.length ?? 'error'} categories, Error: ${catErr?.message || 'none'}`
  );

  const { data: initialProds, error: prodErr } = await anonClient
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*)
    `)
    .eq('is_active', true);

  assert(
    'Storefront products query returns real database count (0 products)',
    !prodErr && initialProds.length === 0,
    `Retrieved ${initialProds?.length ?? 'error'} products, Error: ${prodErr?.message || 'none'}`
  );

  const { data: storeSettings, error: settingsErr } = await anonClient
    .from('store_settings')
    .select('value')
    .eq('key', 'general')
    .single();

  assert(
    'Storefront settings fetched accurately from Supabase store_settings',
    !settingsErr && storeSettings?.value?.store_name === 'WENZY',
    `Store: ${storeSettings?.value?.store_name}, Free Shipping: ₹${storeSettings?.value?.free_shipping_threshold}`
  );

  // ----------------------------------------------------
  // TEST 2: ADMIN AUTHENTICATION & LIVE DASHBOARD METRICS
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Admin Live Metrics & Telemetry ---');

  const adminClient = createClient(url, anonKey);
  const { data: authData, error: authErr } = await adminClient.auth.signInWithPassword({
    email: 'admin.wenzy@gmail.com',
    password: 'Admin@Wenzy2026!',
  });

  assert(
    'Admin user authenticates via Supabase GoTrue Auth',
    !authErr && authData?.user?.email === 'admin.wenzy@gmail.com',
    `Authenticated UID: ${authData?.user?.id}`
  );

  // Calculate live metrics via real queries
  const [ordersRes, productsRes, categoriesRes, customersRes] = await Promise.all([
    adminClient.from('orders').select('*', { count: 'exact' }),
    adminClient.from('products').select('*', { count: 'exact' }),
    adminClient.from('categories').select('*', { count: 'exact' }),
    adminClient.from('profiles').select('*', { count: 'exact' }),
  ]);

  const orders = ordersRes.data || [];
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'Paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  assert(
    'Admin dashboard metrics reflect real database counts without fake numbers',
    productsRes.count === 0 && categoriesRes.count === 0 && customersRes.count === 2,
    `Products: ${productsRes.count}, Categories: ${categoriesRes.count}, Customers: ${customersRes.count}, Orders: ${ordersRes.count}, Real Revenue: ₹${totalRevenue}`
  );

  // ----------------------------------------------------
  // TEST 3: ADMIN CREATES FIRST REAL CATEGORY & PRODUCT
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Admin Creation of Real Category & Product ---');

  // Create real category
  const { data: newCat, error: createCatErr } = await adminClient
    .from('categories')
    .insert({
      name: 'T-Shirts',
      slug: 't-shirts',
      description: 'Heavyweight 240+ GSM graphic and oversized streetwear tees engineered in India.',
      display_order: 1,
      is_active: true,
    })
    .select()
    .single();

  assert(
    'Admin successfully creates first real category (T-Shirts) via Supabase mutation',
    !createCatErr && newCat?.id,
    `Category ID: ${newCat?.id}, Name: ${newCat?.name}, Slug: /${newCat?.slug}`
  );

  // Create real product
  const { data: newProd, error: createProdErr } = await adminClient
    .from('products')
    .insert({
      name: 'WENZY Signature Boxy Tee',
      slug: 'wenzy-signature-boxy-tee',
      description: 'Engineered with 240 GSM heavyweight combed cotton, dropped shoulders, and reinforced ribbed collar.',
      price: 1299.00,
      compare_at_price: 1999.00,
      category_id: newCat?.id,
      is_active: true,
      is_featured: true,
      is_new: true,
      details: {
        gsm: 240,
        fabric: '100% Combed Cotton French Terry',
        fit: 'Boxy Drop-Shoulder Fit',
        care: 'Machine wash cold inside out. Do not iron on print.',
      },
    })
    .select()
    .single();

  assert(
    'Admin successfully creates first real product via Supabase mutation',
    !createProdErr && newProd?.id,
    `Product ID: ${newProd?.id}, Name: ${newProd?.name}, Price: ₹${newProd?.price}`
  );

  // Create real variants
  const variants = [
    { product_id: newProd.id, size: 'XS', color: 'Vintage Black', sku: 'WNZ-SIG-XS', stock_quantity: 15 },
    { product_id: newProd.id, size: 'S', color: 'Vintage Black', sku: 'WNZ-SIG-S', stock_quantity: 25 },
    { product_id: newProd.id, size: 'M', color: 'Vintage Black', sku: 'WNZ-SIG-M', stock_quantity: 40 },
    { product_id: newProd.id, size: 'L', color: 'Vintage Black', sku: 'WNZ-SIG-L', stock_quantity: 35 },
    { product_id: newProd.id, size: 'XL', color: 'Vintage Black', sku: 'WNZ-SIG-XL', stock_quantity: 20 },
    { product_id: newProd.id, size: '2XL', color: 'Vintage Black', sku: 'WNZ-SIG-2XL', stock_quantity: 10 },
  ];

  const { error: variantErr } = await adminClient.from('product_variants').insert(variants);
  assert(
    'Admin successfully creates 6 size variants (XS-2XL) with real inventory',
    !variantErr,
    `Total variants added: ${variants.length}, Stock allocated: 145 units`
  );

  // ----------------------------------------------------
  // TEST 4: STOREFRONT REFLECTS NEW REAL DATA INSTANTLY
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Storefront Live Updates from Real Supabase Data ---');

  const { data: updatedCats } = await anonClient
    .from('categories')
    .select('*')
    .eq('is_active', true);

  assert(
    'Storefront immediately discovers new category created by admin',
    updatedCats?.length === 1 && updatedCats[0]?.slug === 't-shirts',
    `Found category: ${updatedCats?.[0]?.name} (${updatedCats?.[0]?.slug})`
  );

  const { data: updatedProds } = await anonClient
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*)
    `)
    .eq('is_active', true);

  assert(
    'Storefront immediately displays new product created by admin',
    updatedProds?.length === 1 && updatedProds[0]?.slug === 'wenzy-signature-boxy-tee',
    `Found product: ${updatedProds?.[0]?.name}, Price: ₹${updatedProds?.[0]?.price}, Variants: ${updatedProds?.[0]?.variants?.length}`
  );

  const { data: singleProd } = await anonClient
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*)
    `)
    .eq('slug', 'wenzy-signature-boxy-tee')
    .single();

  assert(
    'Storefront PDP resolves complete real product details and inventory from Supabase',
    singleProd?.name === 'WENZY Signature Boxy Tee' && singleProd?.variants?.length === 6,
    `Product: ${singleProd?.name}, GSM: ${singleProd?.details?.gsm}, Variants: ${singleProd?.variants?.map(v => v.size).join(', ')}`
  );

  console.log('\n====================================================');
  console.log(`TOTAL REAL-DATA TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('SUCCESS: All Supabase real-data integration tests passed with 100% compliance.');
  } else {
    process.exit(1);
  }
}

runRealDatabaseVerification().catch((err) => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});
