const Series = require('../models/Series');
const Genre = require('../models/Genre');

exports.getIndex = async (req, res) => {
    try {
        const allSeries = await Series.findAll({ include: Genre });
        const plainSeries = allSeries.map(s => s.get({ plain: true }));
        
        const watching = plainSeries.filter(s => s.status === 'Watching');
        const watched = plainSeries.filter(s => s.status === 'Watched');
        const planToWatch = plainSeries.filter(s => s.status === 'Plan to Watch');

        res.render('index', { 
            title: 'My Collection',
            watching,
            watched,
            planToWatch
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getManagement = async (req, res) => {
    try {
        const series = await Series.findAll({ include: Genre });
        res.render('management', { 
            title: 'Manage Series',
            series: series.map(s => s.get({ plain: true }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getCreate = async (req, res) => {
    const genres = await Genre.findAll();
    res.render('form', { 
        title: 'Add New Series',
        genres: genres.map(g => g.get({ plain: true }))
    });
};

exports.postCreate = async (req, res) => {
    try {
        const { title, description, posterUrl, status, GenreId } = req.body;
        await Series.create({ title, description, posterUrl, status, GenreId });
        res.redirect('/management');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating series');
    }
};

exports.getEdit = async (req, res) => {
    try {
        const series = await Series.findByPk(req.params.id);
        const genres = await Genre.findAll();
        if (!series) return res.status(404).send('Series not found');
        res.render('form', { 
            title: 'Edit Series', 
            series: series.get({ plain: true }),
            genres: genres.map(g => g.get({ plain: true })),
            isEdit: true 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postEdit = async (req, res) => {
    try {
        const { title, description, posterUrl, status, GenreId } = req.body;
        const series = await Series.findByPk(req.params.id);
        if (!series) return res.status(404).send('Series not found');
        
        await series.update({ title, description, posterUrl, status, GenreId });
        res.redirect('/management');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating series');
    }
};

exports.getDelete = async (req, res) => {
    try {
        const series = await Series.findByPk(req.params.id);
        if (!series) return res.status(404).send('Series not found');
        await series.destroy();
        res.redirect('/management');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting series');
    }
};
