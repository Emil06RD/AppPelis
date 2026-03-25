const supabase = require('../config/supabase');

const PlaceController = {
    getIndex: async (req, res) => {
        try {
            const { data: places, error } = await supabase
                .from('Places')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            res.render('planner/places-list', {
                title: 'Lugares por Visitar',
                places: places || [],
                isPlanner: true
            });
        } catch (error) {
            console.error('Error fetching places:', error);
            res.status(500).send('Error fetching places');
        }
    },

    getCreate: (req, res) => {
        res.render('planner/place-form', {
            title: 'Registrar Lugar',
            editMode: false,
            isPlanner: true
        });
    },

    postCreate: async (req, res) => {
        try {
            const { name, location_url, description, photo_url } = req.body;

            const { error } = await supabase
                .from('Places')
                .insert([{ name, location_url, description, photo_url }]);

            if (error) throw error;
            res.redirect('/places');
        } catch (error) {
            console.error('Error creating place:', error);
            res.status(500).send('Error creating place');
        }
    },

    getEdit: async (req, res) => {
        try {
            const id = req.params.id;
            const { data: place, error } = await supabase
                .from('Places')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            res.render('planner/place-form', {
                title: 'Editar Lugar',
                editMode: true,
                place: place,
                isPlanner: true
            });
        } catch (error) {
            console.error('Error fetching place for edit:', error);
            res.status(500).send('Error fetching place');
        }
    },

    postEdit: async (req, res) => {
        try {
            const id = req.params.id;
            const { name, location_url, description, photo_url } = req.body;

            const updateData = { name, location_url, description, photo_url };

            const { error } = await supabase
                .from('Places')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
            res.redirect('/places');
        } catch (error) {
            console.error('Error updating place:', error);
            res.status(500).send('Error updating place');
        }
    },

    getDelete: async (req, res) => {
        try {
            const id = req.params.id;
            const { error } = await supabase
                .from('Places')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.redirect('/places');
        } catch (error) {
            console.error('Error deleting place:', error);
            res.status(500).send('Error deleting place');
        }
    }
};

module.exports = PlaceController;
