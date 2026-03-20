const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/SeriesController');

router.get('/', seriesController.getIndex);
router.get('/management', seriesController.getManagement);
router.get('/create', seriesController.getCreate);
router.post('/create', seriesController.postCreate);
router.get('/edit/:id', seriesController.getEdit);
router.post('/edit/:id', seriesController.postEdit);
router.get('/delete/:id', seriesController.getDelete);

module.exports = router;
