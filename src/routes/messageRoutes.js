const express = require('express');
const router = express.Router();
const messageController = require('../controllers/MessageController');
const { requireAuth, requireEditor } = require('../middleware/auth');

router.get('/', requireEditor, messageController.getIndex);
router.get('/api/mine', requireEditor, messageController.getMyMessages);
router.post('/create/:target', requireEditor, messageController.postCreate);
router.get('/delete/:target/:id', requireEditor, messageController.getDelete);

module.exports = router;
