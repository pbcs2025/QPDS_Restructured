const express = require('express');
const router = express.Router();
const controller = require('../controllers/mtechSemesterController');

router.get('/active', controller.getActiveMtechSemesters);
router.post('/', controller.createMtechSemester);

module.exports = router;
