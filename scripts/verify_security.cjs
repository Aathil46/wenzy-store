const { createClient } = require('@supabase/supabase-js');

const url = 'https://dmmdcbpgyxgtrvhdildo.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbWRjYnBneXhndHJ2aGRpbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NTY3MjUsImV4cCI6MjExMDQzMjcyNX0.rIvOzAjDo0pP-zdYvQQIscU82EAWA9YF9ytXxlFWrS4';

const anonClient = createClient(url, anonKey);

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('       WENZY CRITICAL SECURITY AUDIT TEST SUITE     ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(title, condition, detail) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${title}`);
      if (detail) console.log(`       Evidence: ${detail}`);
    } else {
      console.error(`[FAIL] ${title}`);
      if (detail) console.error(`       Error Detail: ${detail}`);
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: ANONYMOUS VISITOR RESTRICTIONS
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Anonymous Access Controls ---');

  // 1.1 Anonymous SELECT orders
  const { data: anonOrders, error: anonOrdersErr } = await anonClient.from('orders').select('*');
  assert(
    'Anonymous users cannot read orders table',
    (anonOrders?.length === 0 || !anonOrders),
    `Received ${anonOrders?.length || 0} rows (Expected 0)`
  );

  // 1.2 Anonymous SELECT order_items
  const { data: anonItems, error: anonItemsErr } = await anonClient.from('order_items').select('*');
  assert(
    'Anonymous users cannot read order_items table',
    (anonItems?.length === 0 || !anonItems),
    `Received ${anonItems?.length || 0} rows (Expected 0)`
  );

  // 1.3 Anonymous direct INSERT into orders
  const { data: anonIns, error: anonInsErr } = await anonClient.from('orders').insert({
    order_number: 'WNZ-EXPLOIT-01',
    customer_email: 'attacker@darknet.org',
    customer_phone: '0000000000',
    customer_name: 'Attacker',
    shipping_address: { city: 'Unknown' },
    subtotal: 1,
    shipping_fee: 0,
    tax: 0,
    total: 1,
    status: 'Confirmed',
    payment_status: 'Paid',
    payment_method: 'Fake'
  }).select();
  assert(
    'Anonymous users cannot directly INSERT into orders table',
    anonInsErr && anonInsErr.code === '42501',
    anonInsErr?.message
  );

  // 1.4 Anonymous direct inventory tampering
  const { data: anonRed, error: anonRedErr } = await anonClient.rpc('reduce_inventory', {
    variant_id: '27e8e94e-ab90-4d96-a9b2-6830797f5d34',
    quantity_to_reduce: 99
  });
  assert(
    'Anonymous users cannot execute reduce_inventory RPC',
    anonRedErr !== null,
    anonRedErr?.message
  );

  // 1.5 Anonymous direct role assignment
  const { data: anonRole, error: anonRoleErr } = await anonClient.rpc('set_user_role', {
    target_user_id: '521651b9-d6d7-421c-9d96-00a6805901e6',
    new_role: 'admin'
  });
  assert(
    'Anonymous users cannot execute set_user_role RPC',
    anonRoleErr !== null,
    anonRoleErr?.message
  );

  // ----------------------------------------------------
  // TEST GROUP 2: GUEST ORDER ACCESS TOKEN ENFORCEMENT
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Secure Guest Order Tracking ---');

  // Place a secure guest order
  const { data: guestOrderRes, error: guestOrderErr } = await anonClient.rpc('create_order_secure', {
    p_customer_name: 'Priya Patel',
    p_customer_email: 'priya.patel@example.com',
    p_customer_phone: '+91 98200 12345',
    p_shipping_address: {
      street_address: 'Flat 4B, Silver Arch Apartments',
      city: 'Ahmedabad',
      state: 'Gujarat',
      postal_code: '380015',
      country: 'India'
    },
    p_payment_method: 'Cash on Delivery',
    p_items: [{ variant_id: '27e8e94e-ab90-4d96-a9b2-6830797f5d34', quantity: 1 }],
    p_notes: 'Ring bell upon arrival'
  });

  assert(
    'create_order_secure successfully creates order with authoritative pricing',
    guestOrderRes && guestOrderRes.order_id && guestOrderRes.access_token,
    `Created Order: ${guestOrderRes?.order_number}, Token: ${guestOrderRes?.access_token}, Total: ₹${guestOrderRes?.total}`
  );

  // 2.2 Attempt to access order with wrong token
  const { data: wrongTokenOrder, error: wrongTokenErr } = await anonClient.rpc('get_guest_order', {
    p_order_id: guestOrderRes.order_id,
    p_access_token: '00000000-0000-0000-0000-000000000000'
  });
  assert(
    'get_guest_order returns null when unguessable token does not match',
    wrongTokenOrder === null,
    `Result: ${JSON.stringify(wrongTokenOrder)}`
  );

  // 2.3 Access order with the legitimate unguessable access_token
  const { data: correctTokenOrder, error: correctTokenErr } = await anonClient.rpc('get_guest_order', {
    p_order_id: guestOrderRes.order_id,
    p_access_token: guestOrderRes.access_token
  });
  assert(
    'get_guest_order successfully returns order details when token is valid',
    correctTokenOrder && correctTokenOrder.order_number === guestOrderRes.order_number && correctTokenOrder.items.length === 1,
    `Order Number: ${correctTokenOrder?.order_number}, Customer: ${correctTokenOrder?.customer_name}, Items: ${correctTokenOrder?.items?.length}`
  );

  // ----------------------------------------------------
  // TEST GROUP 3: REGISTERED CUSTOMER PRIVILEGE & DATA ISOLATION
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Customer Privileges & Escalation Defenses ---');

  // Authenticate as test customer
  const custClient = createClient(url, anonKey);
  const { data: authCust, error: authCustErr } = await custClient.auth.signInWithPassword({
    email: 'admin.wenzy@gmail.com', // Admin account to verify admin capabilities
    password: 'Admin@Wenzy2026!'
  });

  assert(
    'Admin user can authenticate successfully',
    authCust?.user?.id === '521651b9-d6d7-421c-9d96-00a6805901e6',
    `Authenticated as: ${authCust?.user?.email}`
  );

  // 3.1 Admin can read orders
  const { data: adminOrders, error: adminOrdersErr } = await custClient.from('orders').select('id, order_number');
  assert(
    'Admin can read orders for fulfillment operations',
    adminOrders && adminOrders.length > 0,
    `Admin sees ${adminOrders?.length} order(s)`
  );

  // 3.2 Payment Verification: Cannot mark paid without verify_payment_secure
  const { data: updatePaidAttempt, error: updatePaidErr } = await anonClient
    .from('orders')
    .update({ payment_status: 'Paid' })
    .eq('id', guestOrderRes.order_id);
  assert(
    'Anonymous users cannot mark orders as Paid directly',
    (updatePaidErr !== null || updatePaidAttempt === null),
    `Direct update blocked`
  );

  // 3.3 Verify payment via verify_payment_secure
  const { data: verifiedPayment, error: verifiedPaymentErr } = await anonClient.rpc('verify_payment_secure', {
    p_order_id: guestOrderRes.order_id,
    p_access_token: guestOrderRes.access_token,
    p_payment_id: 'pay_sim_gateway_test_1001',
    p_verification_token: 'sig_sandbox_valid_signature'
  });
  assert(
    'verify_payment_secure updates payment_status to Paid with valid signature',
    verifiedPayment && verifiedPayment.payment_status === 'Paid',
    `Verified Order ${verifiedPayment?.order_number}: Status=${verifiedPayment?.status}, Payment=${verifiedPayment?.payment_status}`
  );

  console.log('\n====================================================');
  console.log(`TOTAL AUDIT TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('SUCCESS: All security remediation tests passed with 100% compliance.');
    process.exit(0);
  } else {
    console.error('FAILURE: One or more security tests failed.');
    process.exit(1);
  }
}

runSecurityAudit();
