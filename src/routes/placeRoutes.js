const express = require('express');
const router = express.Router();
const placeController = require('../controllers/PlaceController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', placeController.getIndex);
router.get('/create', placeController.getCreate);
router.post('/create', placeController.postCreate);
router.get('/edit/:id', placeController.getEdit);
router.post('/edit/:id', placeController.postEdit);
router.get('/delete/:id', placeController.getDelete);

module.exports = router;
