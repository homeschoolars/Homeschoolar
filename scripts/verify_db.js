
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    console.log(`Connecting to ${supabaseUrl}...`);
    const { data, error } = await supabase.from('children').select('*').limit(1);

    if (error) {
        console.error('Error connecting to Supabase:', error);
    } else {
        console.log('Successfully connected!');
        console.log('Found children:', data);
    }
}

checkConnection();
