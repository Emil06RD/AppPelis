const Genre = require('../models/Genre');

exports.getIndex = async (req, res) => {
    try {
        const genres = await Genre.findAll();
        res.render('genres/index', { 
            title: 'Manage Genres',
            genres: genres.map(g => g.get({ plain: true }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getCreate = (req, res) => {
    res.render('genres/form', { title: 'Add New Genre' });
};

exports.postCreate = async (req, res) => {
    try {
        await Genre.create({ name: req.body.name });
        res.redirect('/genres');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating genre');
    }
};

exports.getEdit = async (req, res) => {
    try {
        const genre = await Genre.findByPk(req.params.id);
        if (!genre) return res.status(404).send('Genre not found');
        res.render('genres/form', { 
            title: 'Edit Genre', 
            genre: genre.get({ plain: true }),
            isEdit: true 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postEdit = async (req, res) => {
    try {
        const genre = await Genre.findByPk(req.params.id);
        if (!genre) return res.status(404).send('Genre not found');
        await genre.update({ name: req.body.name });
        res.redirect('/genres');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating genre');
    }
};

exports.getDelete = async (req, res) => {
    try {
        const genre = await Genre.findByPk(req.params.id);
        if (!genre) return res.status(404).send('Genre not found');
        await genre.destroy();
        res.redirect('/genres');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting genre');
    }
};
