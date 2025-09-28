const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const ctrl = require('../controllers/questionBankController');

router.post('/', upload.single('file'), ctrl.create);
router.get('/', ctrl.list);
router.get('/file/:id', ctrl.fileById);

module.exports = router;


