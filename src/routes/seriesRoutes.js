const express = require('express');
const { requireEditor } = require('../middleware/auth');
const router = express.Router();
const seriesController = require('../controllers/SeriesController');
const supabaseSeriesController = require('../controllers/SupabaseSeriesController');

router.get('/series', supabaseSeriesController.getSeries);
router.post('/series', supabaseSeriesController.postSeries);

router.get('/', seriesController.getIndex);
router.get('/management', seriesController.getManagement);
router.get('/create', requireEditor, seriesController.getCreate);
router.post('/create', requireEditor, seriesController.postCreate);
router.get('/edit/:id', requireEditor, seriesController.getEdit);
router.post('/edit/:id', requireEditor, seriesController.postEdit);
router.get('/delete/:id', requireEditor, seriesController.getDelete);

module.exports = router;
