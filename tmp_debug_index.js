const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testGetIndex() {
    try {
        const { data: genres } = await supabase.from('Genres').select('*');
        console.log('Genres fetched:', genres.length);

        console.log('Fetching series...');
        const query = supabase
            .from('Series')
            .select('*, Genre:Genres!GenreId(*), Genre2:Genres!Genre2Id(*), Genre3:Genres!Genre3Id(*), Genre4:Genres!Genre4Id(*)');
        
        const { data: allSeries, error: sError } = await query;
        if (sError) throw sError;

        console.log('Series fetched:', allSeries.length);
        
        const plainSeries = allSeries.map(s => ({
            ...s,
            Genre: s.Genre || null,
            Genre2: s.Genre2 || null,
            Genre3: s.Genre3 || null,
            Genre4: s.Genre4 || null,
        }));

        console.log('Mapping successful. Sample Genre:', plainSeries[0]?.Genre?.name);
        console.log('Mapping successful. Sample Genre2:', plainSeries[0]?.Genre2?.name);
        
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
        process.exit(1);
    }
}

testGetIndex();
