const supabase = require('../config/supabase');

const DateController = {
    getIndex: async (req, res) => {
        try {
            // Join with Places and DatePhotos
            const { data: dates, error } = await supabase
                .from('Dates')
                .select('*, Places(name), DatePhotos(photo_url)')
                .order('date_time', { ascending: true });

            if (error) throw error;

            // Format date_time for display
            const formattedDates = (dates || []).map(d => {
                const dt = new Date(d.date_time);
                return {
                    ...d,
                    formattedDateTime: dt.toLocaleString('es-ES', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    })
                };
            });

            res.render('planner/dates-list', {
                title: 'Mis Citas / Planes',
                dates: formattedDates,
                isPlanner: true
            });
        } catch (error) {
            console.error('Error fetching dates:', error);
            res.status(500).send('Error fetching dates');
        }
    },

    getView: async (req, res) => {
        try {
            const id = req.params.id;
            
            const { data: dateRec, error: dateError } = await supabase
                .from('Dates')
                .select('*, DatePhotos(id, photo_url), Places(name)')
                .eq('id', id)
                .single();

            if (dateError) throw dateError;

            // Format datetime
            const d = new Date(dateRec.date_time);
            dateRec.formattedDateTime = d.toLocaleDateString('es-ES', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            res.render('planner/date-view', {
                title: 'Recuerdo',
                date: dateRec,
                isPlanner: true
            });
        } catch (error) {
            console.error('Error al ver cita:', error);
            res.redirect('/dates');
        }
    },

    getCreate: async (req, res) => {
        try {
            // Fetch places to populate the dropdown
            const { data: places, error } = await supabase
                .from('Places')
                .select('id, name')
                .order('name', { ascending: true });

            if (error) throw error;

            res.render('planner/date-form', {
                title: 'Agendar Cita',
                editMode: false,
                places: places || [],
                isPlanner: true
            });
        } catch (error) {
            console.error('Error loading places for date creation:', error);
            res.status(500).send('Error loading form');
        }
    },

    postCreate: async (req, res) => {
        try {
            const { title, place_id, date_time, description } = req.body;
            const status = 'completed'; // Forced explicitly for retroactively added dates

            // Set default title if empty
            const finalTitle = title ? title : 'Cita Especial';

            const { data: insertData, error: insertError } = await supabase
                .from('Dates')
                .insert([{ title: finalTitle, place_id, date_time, description, status }])
                .select()
                .single();

            if (insertError) throw insertError;
            
            const newDateId = insertData.id;

            if (req.files && req.files.length > 0) {
                const photoInserts = [];
                for (let file of req.files) {
                    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const { error: uploadError } = await supabase.storage
                        .from('love-view-images')
                        .upload(`dates/${newDateId}/${fileName}`, file.buffer, {
                            contentType: file.mimetype
                        });
                    if (!uploadError) {
                        const { data } = supabase.storage
                            .from('love-view-images')
                            .getPublicUrl(`dates/${newDateId}/${fileName}`);
                        photoInserts.push({ date_id: newDateId, photo_url: data.publicUrl });
                    } else {
                        console.error('Error subiendo foto a Supabase:', uploadError);
                    }
                }
                if (photoInserts.length > 0) {
                    await supabase.from('DatePhotos').insert(photoInserts);
                }
            }

            res.redirect('/dates');
        } catch (error) {
            console.error('Error creating date:', error);
            res.status(500).send('Error creating date');
        }
    },

    getEdit: async (req, res) => {
        try {
            const id = req.params.id;
            
            // Get the date record including photos
            const { data: dateRec, error: dateError } = await supabase
                .from('Dates')
                .select('*, DatePhotos(id, photo_url)')
                .eq('id', id)
                .single();

            if (dateError) throw dateError;

            // Format datetime-local value (YYYY-MM-DDThh:mm)
            if (dateRec.date_time) {
                const dt = new Date(dateRec.date_time);
                // remove seconds and 'Z' to format as datetime-local string
                dateRec.date_time_formatted = dt.toISOString().slice(0, 16); 
            }

            // Get places for dropdown
            const { data: places, error: placesError } = await supabase
                .from('Places')
                .select('id, name')
                .order('name', { ascending: true });

            if (placesError) throw placesError;

            res.render('planner/date-form', {
                title: 'Editar Cita',
                editMode: true,
                date: dateRec,
                places: places || [],
                isPlanner: true
            });
        } catch (error) {
            console.error('Error fetching date for edit:', error);
            res.status(500).send('Error fetching date');
        }
    },

    postEdit: async (req, res) => {
        try {
            const id = req.params.id;
            const { title, place_id, date_time, description } = req.body;
            const status = 'completed';
            
            const finalTitle = title ? title : 'Cita Especial';

            const { error: updateError } = await supabase
                .from('Dates')
                .update({ title: finalTitle, place_id, date_time, description, status })
                .eq('id', id);

            if (updateError) throw updateError;

            // Handle new photos uploaded during edit
            if (req.files && req.files.length > 0) {
                const photoInserts = [];
                for (let file of req.files) {
                    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const { error: uploadError } = await supabase.storage
                        .from('love-view-images')
                        .upload(`dates/${id}/${fileName}`, file.buffer, {
                            contentType: file.mimetype
                        });
                    if (!uploadError) {
                        const { data } = supabase.storage
                            .from('love-view-images')
                            .getPublicUrl(`dates/${id}/${fileName}`);
                        photoInserts.push({ date_id: id, photo_url: data.publicUrl });
                    } else {
                        console.error('Error subiendo foto a Supabase en Editar:', uploadError);
                    }
                }
                if (photoInserts.length > 0) {
                    await supabase.from('DatePhotos').insert(photoInserts);
                }
            }

            res.redirect('/dates');
        } catch (error) {
            console.error('Error updating date:', error);
            res.status(500).send('Error updating date');
        }
    },

    getDelete: async (req, res) => {
        try {
            const id = req.params.id;
            const { error } = await supabase
                .from('Dates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.redirect('/dates');
        } catch (error) {
            console.error('Error deleting date:', error);
            res.status(500).send('Error deleting date');
        }
    }
};

module.exports = DateController;
