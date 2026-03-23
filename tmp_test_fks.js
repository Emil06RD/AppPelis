const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkFKs() {
    try {
        const { data, error } = await supabase.rpc('get_fks'); 
        // Wait, I might not have 'get_fks' RPC. I'll try a raw query via a temporary table or similar?
        // No, I'll try to use the 'PostgREST' self-introspection if available.
        // Actually, I'll just try to join by the FK name if I can guess it.
        
        // Let's try to use the most common naming convention: Table_Column_fkey
        const testJoin = async (selectStr) => {
            const { error } = await supabase.from('Series').select(selectStr).limit(1);
            console.log(`Test [${selectStr}]:`, error ? error.message : 'OK');
        };

        await testJoin('*, Genres!GenreId(*)');
        await testJoin('*, Genres!Genre2Id(*)');
        await testJoin('*, Genres!GenreId(name)');
        await testJoin('*, "Genres"!GenreId(*)');
        await testJoin('*, Genres!"GenreId"(*)');
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkFKs();
