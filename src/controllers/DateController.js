const supabase = require('../config/supabase');

// ── Helper: parsear lista de IDs de collage de la tabla Dates ────────────────
function parseCollageIds(raw) {
    try {
        const arr = JSON.parse(raw || '[]');
        // IDs are UUIDs (strings) — keep them as strings, just filter empties
        return Array.isArray(arr) ? arr.map(String).filter(v => v && v !== 'NaN') : [];
    } catch {
        return [];
    }
}

// ── Helper: anotar fotos con is_collage basado en collage_photo_ids ──────────
function annotatePhotos(photos, collageIds) {
    const idSet = new Set(collageIds.map(String));
    return (photos || []).map(p => ({
        ...p,
        is_collage: idSet.has(String(p.id))
    }));
}

const DateController = {
    getIndex: async (req, res) => {
        try {
            const { data: dates, error } = await supabase
                .from('Dates')
                .select('*, Places(name), DatePhotos(photo_url)')
                .order('date_time', { ascending: true });

            if (error) throw error;

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
                weekday: 'long', year: 'numeric', month: 'long',
                day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // Collage IDs stored in Dates.collage_photo_ids
            const collageIds = parseCollageIds(dateRec.collage_photo_ids);
            const annotated  = annotatePhotos(dateRec.DatePhotos, collageIds);
            const collagePhotos = annotated.filter(p => p.is_collage);
            const galleryPhotos = annotated;

            res.render('planner/date-view', {
                title: 'Recuerdo',
                date: dateRec,
                collagePhotos,
                galleryPhotos,
                isPlanner: true
            });
        } catch (error) {
            console.error('Error al ver cita:', error);
            res.redirect('/dates');
        }
    },

    getCreate: async (req, res) => {
        try {
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
            const status = 'completed';
            const finalTitle = title ? title : 'Cita Especial';

            const { data: insertData, error: insertError } = await supabase
                .from('Dates')
                .insert([{ title: finalTitle, place_id, date_time, description, status }])
                .select()
                .single();

            if (insertError) throw insertError;

            const newDateId = insertData.id;

            // Parse which new-upload indices go to collage (max 5)
            const rawIndices = req.body.collage_indices;
            const collageIndices = rawIndices
                ? (Array.isArray(rawIndices) ? rawIndices : [rawIndices]).map(Number).filter(n => !isNaN(n)).slice(0, 5)
                : [];

            const collagePhotoIds = [];

            if (req.files && req.files.length > 0) {
                const maxPhotos = Math.min(req.files.length, 20);

                for (let i = 0; i < maxPhotos; i++) {
                    const file = req.files[i];
                    const fileName = `${Date.now()}-${i}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const { error: uploadError } = await supabase.storage
                        .from('love-view-images')
                        .upload(`dates/${newDateId}/${fileName}`, file.buffer, { contentType: file.mimetype });

                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('love-view-images')
                            .getPublicUrl(`dates/${newDateId}/${fileName}`);

                        // Insert ONE photo and get its ID back
                        const { data: photoRow, error: photoErr } = await supabase
                            .from('DatePhotos')
                            .insert({ date_id: newDateId, photo_url: urlData.publicUrl })
                            .select('id')
                            .single();

                        if (!photoErr && photoRow && collageIndices.includes(i)) {
                            collagePhotoIds.push(photoRow.id);
                        }
                    } else {
                        console.error('Error subiendo foto:', uploadError);
                    }
                }

                // Save collage selection in Dates table
                if (collagePhotoIds.length > 0) {
                    await supabase
                        .from('Dates')
                        .update({ collage_photo_ids: JSON.stringify(collagePhotoIds) })
                        .eq('id', newDateId);
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

            const { data: dateRec, error: dateError } = await supabase
                .from('Dates')
                .select('*, DatePhotos(id, photo_url)')
                .eq('id', id)
                .single();

            if (dateError) throw dateError;

            // Format datetime-local
            if (dateRec.date_time) {
                const dt = new Date(dateRec.date_time);
                dateRec.date_time_formatted = dt.toISOString().slice(0, 16);
            }

            // Annotate photos with is_collage from Dates.collage_photo_ids
            const collageIds = parseCollageIds(dateRec.collage_photo_ids);
            dateRec.DatePhotos = annotatePhotos(dateRec.DatePhotos, collageIds);

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

            // ── 1. Update basic Dates fields ──────────────────────────────────
            const { error: updateError } = await supabase
                .from('Dates')
                .update({ title: finalTitle, place_id, date_time, description, status })
                .eq('id', id);

            if (updateError) throw updateError;

            // ── 2. Parse collage selection for existing photos ────────────────
            // The form sends a JSON array of selected photo IDs via existing_collage_json
            let collageIds = parseCollageIds(req.body.existing_collage_json);
            console.log('[postEdit] existing_collage_json raw:', req.body.existing_collage_json);
            console.log('[postEdit] collageIds parseados:', collageIds);

            // ── 3. Handle new uploaded photos ─────────────────────────────────
            if (req.files && req.files.length > 0) {
                const maxPhotos = Math.min(req.files.length, 20);

                // Which new-upload indices the user wants in collage
                const rawNewIndices = req.body.collage_new_indices;
                const newCollageIndices = rawNewIndices
                    ? (Array.isArray(rawNewIndices) ? rawNewIndices : [rawNewIndices]).map(Number).filter(n => !isNaN(n))
                    : [];

                for (let i = 0; i < maxPhotos; i++) {
                    const file = req.files[i];
                    const fileName = `${Date.now()}-${i}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const { error: uploadError } = await supabase.storage
                        .from('love-view-images')
                        .upload(`dates/${id}/${fileName}`, file.buffer, { contentType: file.mimetype });

                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('love-view-images')
                            .getPublicUrl(`dates/${id}/${fileName}`);

                        const { data: photoRow, error: photoErr } = await supabase
                            .from('DatePhotos')
                            .insert({ date_id: id, photo_url: urlData.publicUrl })
                            .select('id')
                            .single();

                        if (!photoErr && photoRow && newCollageIndices.includes(i)) {
                            collageIds.push(photoRow.id);
                        }
                    } else {
                        console.error('Error subiendo foto en editar:', uploadError);
                    }
                }
            }

            // ── 4. Persist collage selection in Dates table (max 5) ───────────
            const finalCollageIds = collageIds.slice(0, 5);
            console.log('[postEdit] Guardando collage_photo_ids:', finalCollageIds);

            const { error: collageErr } = await supabase
                .from('Dates')
                .update({ collage_photo_ids: JSON.stringify(finalCollageIds) })
                .eq('id', id);

            if (collageErr) {
                // Column might not exist yet — log but don't crash
                console.error('[postEdit] Error guardando collage_photo_ids:', collageErr);
                console.error('>> Ejecuta en Supabase: ALTER TABLE "Dates" ADD COLUMN IF NOT EXISTS "collage_photo_ids" TEXT NOT NULL DEFAULT \'[]\';');
            }

            res.redirect(`/dates/view/${id}`);
        } catch (error) {
            console.error('Error updating date:', error);
            res.status(500).send('Error updating date');
        }
    },

    getDelete: async (req, res) => {
        try {
            const id = req.params.id;
            const { error } = await supabase.from('Dates').delete().eq('id', id);
            if (error) throw error;
            res.redirect('/dates');
        } catch (error) {
            console.error('Error deleting date:', error);
            res.status(500).send('Error deleting date');
        }
    },

    deletePhoto: async (req, res) => {
        try {
            const { photoId, dateId } = req.params;
            const { error } = await supabase.from('DatePhotos').delete().eq('id', photoId);
            if (error) throw error;
            res.redirect(`/dates/edit/${dateId}`);
        } catch (error) {
            console.error('Error deleting photo:', error);
            res.redirect('back');
        }
    }
};

module.exports = DateController;
