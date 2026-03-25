const express = require('express');
const router = express.Router();
const dateController = require('../controllers/DateController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get('/', dateController.getIndex);
router.get('/create', dateController.getCreate);
router.post('/create', upload.array('photos', 5), dateController.postCreate);
router.get('/view/:id', dateController.getView);
router.get('/edit/:id', dateController.getEdit);
router.post('/edit/:id', upload.array('photos', 5), dateController.postEdit);
router.get('/delete/:id', dateController.getDelete);

module.exports = router;
