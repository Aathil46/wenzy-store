const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

(async () => {
  // Sign in as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin.wenzy@gmail.com',
    password: 'Admin@Wenzy2026!',
  });
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  console.log('Logged in as admin:', authData.user.email);

  // Delete dummy categories
  const { error: delErr } = await supabase
    .from('categories')
    .delete()
    .in('slug', ['sneakers', 'accessories', 'oversized-tees']);

  if (delErr) {
    console.error('Delete error:', delErr);
  } else {
    console.log('Successfully deleted dummy categories.');
  }

  const { data: remaining } = await supabase
    .from('categories')
    .select('id, name, slug, display_order, show_in_header')
    .order('display_order');

  console.log('Remaining categories:', remaining);
})();
