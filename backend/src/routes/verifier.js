
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.get('/list', ctrl.list);

// Question paper routes - these must come before /:id route
router.get('/papers', ctrl.getPapers);
router.put('/papers/:subject_code/:semester', ctrl.updatePaper);
router.get('/papers/:subject_code/:semester', ctrl.getPaperByCodeSemester);

router.delete('/:verifierId', ctrl.removeOne);

module.exports = router;


