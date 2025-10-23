
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.get('/list', ctrl.list);

// Question paper routes - these must come before /:id route
router.get('/papers', ctrl.getPapers);
router.put('/papers/:subject_code/:semester', ctrl.updatePaper);
router.get('/papers/:subject_code/:semester', ctrl.getPaperByCodeSemester);
router.get('/papers/:subject_code/:semester.docx', ctrl.getPaperDocx);

// Diagnostics
router.get('/approved', ctrl.listApprovedPapers);
router.get('/rejected', ctrl.listRejectedPapers);

router.delete('/:verifierId', ctrl.removeOne);

module.exports = router;


