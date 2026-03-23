const express = require('express');
const router = express.Router();
const genreController = require('../controllers/GenreController');
const { requireEditor } = require('../middleware/auth');

router.get('/', genreController.getIndex);
router.get('/create', requireEditor, genreController.getCreate);
router.post('/create', requireEditor, genreController.postCreate);
router.get('/edit/:id', requireEditor, genreController.getEdit);
router.post('/edit/:id', requireEditor, genreController.postEdit);
router.get('/delete/:id', requireEditor, genreController.getDelete);

module.exports = router;
