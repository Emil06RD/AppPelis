const supabase = require('../config/supabase');

exports.getIndex = async (req, res) => {
    try {
        const genreId = req.query.genre || null;
        const type = req.query.type || null;
        const status = req.query.status || null;
        
        // Fetch all genres for the filter UI (matching GenreController logic)
        const { data: genresData, error: gError } = await supabase
            .from('Genres')
            .select('*')
            .order('name');
            
        if (gError) console.error('Home Page - Genre Fetch Error:', gError);
        const genres = genresData || [];

        // Fetch series, filtered by genre, type, status if needed
        let query = supabase
            .from('Series')
            .select('*, Genre:Genres!GenreId(*), Genre2:Genres!Genre2Id(*), Genre3:Genres!Genre3Id(*), Genre4:Genres!Genre4Id(*)');
            
        if (genreId) {
            query = query.eq('GenreId', genreId);
        }

        if (type) {
            query = query.eq('type', type);
        }

        if (status) {
            query = query.eq('status', status);
        }
        
        const { data: allSeries, error: sError } = await query;
        if (sError) throw sError;
        
        const plainSeries = allSeries.map(s => ({
            ...s,
            Genre: s.Genre || null,
            Genre2: s.Genre2 || null,
            Genre3: s.Genre3 || null,
            Genre4: s.Genre4 || null,
        }));
        
        const watching = plainSeries.filter(s => s.status === 'Watching');
        const watched = plainSeries.filter(s => s.status === 'Watched');
        const planToWatch = plainSeries.filter(s => s.status === 'Plan to Watch');

        res.render('index', { 
            title: 'My Collection',
            watching,
            watched,
            planToWatch,
            genres,
            currentGenreId: genreId ? parseInt(genreId) : null,
            currentType: type,
            currentStatus: status,
            showWatching: !status || status === 'Watching',
            showWatched: !status || status === 'Watched',
            showPlanToWatch: !status || status === 'Plan to Watch'
        });
    } catch (error) {
        console.error('Error in getIndex:', error.message);
        res.status(500).send('Server Error');
    }
};

exports.getManagement = async (req, res) => {
    try {
        const status = req.query.status || null;

        let query = supabase
            .from('Series')
            .select('*, Genre:Genres!GenreId(*), Genre2:Genres!Genre2Id(*), Genre3:Genres!Genre3Id(*), Genre4:Genres!Genre4Id(*)');

        if (status) {
            query = query.eq('status', status);
        }

        const { data: allSeries, error } = await query;

        if (error) throw error;
        
        res.render('management', { 
            title: 'Manage Series',
            series: allSeries.map(s => ({ 
                ...s, 
                Genre: s.Genre || null, 
                Genre2: s.Genre2 || null, 
                Genre3: s.Genre3 || null, 
                Genre4: s.Genre4 || null 
            })),
            currentStatus: status
        });
    } catch (error) {
        console.error('Error in getManagement:', error.message);
        res.status(500).send('Server Error');
    }
};

exports.getCreate = async (req, res) => {
    try {
        const { data: genres, error } = await supabase.from('Genres').select('*');
        if (error) throw error;
        
        res.render('form', { 
            title: 'Add New Series',
            genres: genres 
        });
    } catch (error) {
        console.error('Error in getCreate:', error.message);
        res.status(500).send('Server Error');
    }
};

exports.postCreate = async (req, res) => {
    try {
        const { title, posterUrl, status, GenreId, Genre2Id, Genre3Id, Genre4Id, type, season, ratingEmil, ratingDeli } = req.body;
        
        const rEmil = parseFloat(ratingEmil) || 0;
        const rDeli = parseFloat(ratingDeli) || 0;
        const rAvg = (rEmil + rDeli) / 2;

        const { error } = await supabase
            .from('Series')
            .insert([{ 
                title, 
                posterUrl: posterUrl || undefined, 
                status, 
                GenreId: GenreId ? parseInt(GenreId) : null,
                Genre2Id: Genre2Id ? parseInt(Genre2Id) : null,
                Genre3Id: Genre3Id ? parseInt(Genre3Id) : null,
                Genre4Id: Genre4Id ? parseInt(Genre4Id) : null,
                type: type || 'Serie',
                season: type === 'Serie' ? (season ? parseInt(season) : null) : null,
                ratingEmil: rEmil,
                ratingDeli: rDeli,
                ratingAverage: rAvg
            }]);
            
        if (error) throw error;
        res.redirect('/management');
    } catch (error) {
        console.error('Error in postCreate:', error.message);
        res.status(500).send('Error creating series');
    }
};

exports.getEdit = async (req, res) => {
    try {
        const { data: series, error: sError } = await supabase
            .from('Series')
            .select('*, Genre:Genres!GenreId(*), Genre2:Genres!Genre2Id(*), Genre3:Genres!Genre3Id(*), Genre4:Genres!Genre4Id(*)')
            .eq('id', req.params.id)
            .single();
            
        const { data: genres, error: gError } = await supabase.from('Genres').select('*');
        
        if (sError || gError) throw (sError || gError);
        if (!series) return res.status(404).send('Series not found');
        
        res.render('form', { 
            title: 'Edit Series', 
            series: {
                    ...series,
                    Genre: series.Genre || null,
                    Genre2: series.Genre2 || null,
                    Genre3: series.Genre3 || null,
                    Genre4: series.Genre4 || null
                },
            genres: genres,
            isEdit: true 
        });
    } catch (error) {
        console.error('Error in getEdit:', error.message);
        res.status(500).send('Server Error');
    }
};

exports.postEdit = async (req, res) => {
    try {
        const { title, posterUrl, status, GenreId, Genre2Id, Genre3Id, Genre4Id, type, season, ratingEmil, ratingDeli } = req.body;

        const rEmil = parseFloat(ratingEmil) || 0;
        const rDeli = parseFloat(ratingDeli) || 0;
        const rAvg = (rEmil + rDeli) / 2;

        const { error } = await supabase
            .from('Series')
            .update({ 
                title, 
                posterUrl, 
                status, 
                GenreId: GenreId ? parseInt(GenreId) : null,
                Genre2Id: Genre2Id ? parseInt(Genre2Id) : null,
                Genre3Id: Genre3Id ? parseInt(Genre3Id) : null,
                Genre4Id: Genre4Id ? parseInt(Genre4Id) : null,
                type: type || 'Serie',
                season: type === 'Serie' ? (season ? parseInt(season) : null) : null,
                ratingEmil: rEmil,
                ratingDeli: rDeli,
                ratingAverage: rAvg
            })
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.redirect('/management');
    } catch (error) {
        console.error('Error in postEdit:', error.message);
        res.status(500).send('Error updating series');
    }
};

exports.getDelete = async (req, res) => {
    try {
        const { error } = await supabase
            .from('Series')
            .delete()
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.redirect('/management');
    } catch (error) {
        console.error('Error in getDelete:', error.message);
        res.status(500).send('Error deleting series');
    }
};
