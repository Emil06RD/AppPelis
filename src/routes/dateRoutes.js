const express = require('express');
const router = express.Router();
const dateController = require('../controllers/DateController');
const { requireAuth, requireEditor } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get('/', dateController.getIndex);
router.get('/create', requireEditor, dateController.getCreate);
router.post('/create', requireEditor, upload.array('photos', 20), dateController.postCreate);
router.get('/view/:id', dateController.getView);
router.get('/edit/:id', requireEditor, dateController.getEdit);
router.post('/edit/:id', requireEditor, upload.array('photos', 20), dateController.postEdit);
router.get('/delete/:id', requireEditor, dateController.getDelete);
router.get('/photo/delete/:photoId/date/:dateId', requireEditor, dateController.deletePhoto);

module.exports = router;
