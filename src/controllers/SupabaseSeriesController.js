const supabase = require('../config/supabase');

exports.getSeries = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Series')
            .select('*');

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching series:', error.message);
        res.status(500).json({ error: 'Error fetching series', details: error.message });
    }
};

exports.postSeries = async (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ error: 'title and description are required' });
        }

        const { data, error } = await supabase
            .from('Series')
            .insert([{ title, description }])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error creating series:', error.message);
        res.status(500).json({ error: 'Error creating series', details: error.message });
    }
};
