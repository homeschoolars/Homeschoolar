
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use Service Role Key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function seedAuth() {
    const timestamp = Date.now();
    const email = `homeschoolar.test.${timestamp}@gmail.com`;
    const password = 'test-password-123';
    const loginCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    console.log(`Creating test user: ${email}...`);

    // 1. Create User (Admin/Service Role context)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
            full_name: 'Test Parent',
            role: 'parent'
        }
    });

    if (authError) {
        console.error('Error creating user:', authError.message);
        return;
    }

    const userId = authData.user.id;
    console.log('User created with ID:', userId);

    // Wait a moment for trigger (though we could bypass if needed, triggers still run)
    console.log('Waiting for profile trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Create Child (Bypassing RLS because we are using Service Role)
    console.log('Creating child profile...');
    const { data: childData, error: childError } = await supabase
        .from('children')
        .insert({
            parent_id: userId,
            name: 'Test Kid',
            age_group: '6-7',
            login_code: loginCode,
            avatar_url: '🚀'
        })
        .select()
        .single();

    if (childError) {
        console.error('Error creating child:', childError.message);
    } else {
        console.log('\n--- SEEDING SUCCESSFUL ---');
        console.log('Parent Email:', email);
        console.log('Parent Password:', password);
        console.log('Child Name:', childData.name);
        console.log('Child Login Code:', childData.login_code);
        console.log('--------------------------\n');
    }
}

seedAuth();
