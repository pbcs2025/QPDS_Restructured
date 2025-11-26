const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/mbaSemesterController');

router.get('/active', semesterController.getActiveMbaSemesters);
router.post('/', semesterController.createMbaSemester);
router.put('/:id', semesterController.updateMbaSemester);
router.delete('/:id', semesterController.deleteMbaSemester);

module.exports = router;
