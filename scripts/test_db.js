const { createBrowserClient } = require('@supabase/ssr');
const fs = require('fs');

const envStr = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envStr.split('\n')
    .filter(Boolean)
    .map(l => l.split('='))
    .filter(a => a.length >= 2)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim().replace(/['"]/g, '')])
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createBrowserClient(supabaseUrl, supabaseKey); // no global schema set

async function run() {
  const { data: testD, error: testE } = await supabase.schema('shiftapp').from('tickets').select('*, subtasks(*)').limit(1);
  console.log('Test explicit .schema():', testE ? JSON.stringify(testE, null, 2) : 'Success. Subtasks count: ' + (testD && testD[0] ? (testD[0].subtasks || []).length : 0));
}

run();
