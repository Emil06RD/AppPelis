const express = require('express');
const router = express.Router();
const placeController = require('../controllers/PlaceController');
const { requireAuth, requireEditor } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', placeController.getIndex);
router.get('/create', requireEditor, placeController.getCreate);
router.post('/create', requireEditor, placeController.postCreate);
router.get('/edit/:id', requireEditor, placeController.getEdit);
router.post('/edit/:id', requireEditor, placeController.postEdit);
router.get('/delete/:id', requireEditor, placeController.getDelete);

module.exports = router;
