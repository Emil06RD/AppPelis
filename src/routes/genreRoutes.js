const express = require('express');
const router = express.Router();
const genreController = require('../controllers/GenreController');

router.get('/', genreController.getIndex);
router.get('/create', genreController.getCreate);
router.post('/create', genreController.postCreate);
router.get('/edit/:id', genreController.getEdit);
router.post('/edit/:id', genreController.postEdit);
router.get('/delete/:id', genreController.getDelete);

module.exports = router;
