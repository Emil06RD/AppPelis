const supabase = require('../config/supabase');

exports.getIndex = async (req, res) => {
    try {
        const { data: genres, error } = await supabase.from('Genres').select('*');
        if (error) throw error;
        
        res.render('genres/index', { 
            title: 'Manage Genres',
            genres: genres
        });
    } catch (error) {
        console.error('Error in GenreController.getIndex:', error.message);
        res.status(500).send('Server Error');
    }
};

exports.getCreate = (req, res) => {
    res.render('genres/form', { title: 'Add New Genre' });
};

exports.postCreate = async (req, res) => {
    try {
        const { error } = await supabase
            .from('Genres')
            .insert([{ name: req.body.name }]);
            
        if (error) throw error;
        res.redirect('/genres');
    } catch (error) {
        console.error('Error in GenreController.postCreate:', error.message);
        res.status(500).send('Error creating genre');
    }
};

exports.getEdit = async (req, res) => {
    try {
        const { data: genre, error } = await supabase
            .from('Genres')
            .select('*')
            .eq('id', req.params.id)
            .single();
            
        if (error) throw error;
        if (!genre) return res.status(404).send('Genre not found');
        
        res.render('genres/form', { 
            title: 'Edit Genre', 
            genre: genre,
            isEdit: true 
        });
    } catch (error) {
        console.error('Error in GenreController.getEdit:', error.message);
        res.status(500).send('Server Error');
    }
};

exports.postEdit = async (req, res) => {
    try {
        const { error } = await supabase
            .from('Genres')
            .update({ name: req.body.name })
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.redirect('/genres');
    } catch (error) {
        console.error('Error in GenreController.postEdit:', error.message);
        res.status(500).send('Error updating genre');
    }
};

exports.getDelete = async (req, res) => {
    try {
        const { error } = await supabase
            .from('Genres')
            .delete()
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.redirect('/genres');
    } catch (error) {
        console.error('Error in GenreController.getDelete:', error.message);
        res.status(500).send('Error deleting genre');
    }
};
