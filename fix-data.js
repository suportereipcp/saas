
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        }
    });
    return env;
}

const envLocal = loadEnv(path.resolve(process.cwd(), '.env.local'));
const env = loadEnv(path.resolve(process.cwd(), '.env'));
const mergedEnv = { ...env, ...envLocal };

const supabase = createClient(
    mergedEnv.NEXT_PUBLIC_SUPABASE_URL,
    mergedEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

async function fixData() {
    console.log("Fetching records...");
    const { data: records, error } = await supabase
        .schema('inventario')
        .from('inventario_rotativo')
        .select('*');

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`Found ${records.length} records. Checking consistency...`);
    let updatedCount = 0;

    for (const record of records) {
        console.log(`Checking ${record.it_codigo}: qtd=${JSON.stringify(record.qtd_fisica)}, contado=${record.contado}`);
        const hasCounts = record.qtd_fisica && record.qtd_fisica.length > 0;
        if (hasCounts && !record.contado) {
            console.log(`Fixing Record ID: ${record.id} (Item: ${record.it_codigo}) -> Setting contado=true`);
            const { error: updateError } = await supabase
                .schema('inventario')
                .from('inventario_rotativo')
                .update({ contado: true, updated_at: new Date().toISOString() })
                .eq('id', record.id);
            
            if (updateError) console.error(`Failed to update ${record.id}:`, updateError);
            else updatedCount++;
        }
    }

    console.log(`Finished. Fixed ${updatedCount} records.`);
}

fixData();
