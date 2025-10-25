
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.get('/list', ctrl.list);

// Question paper routes - these must come before /:id route
router.get('/papers', ctrl.getPapers);
router.put('/papers/:subject_code/:semester', ctrl.updatePaper);
router.get('/papers/:subject_code/:semester', ctrl.getPaperByCodeSemester);

// Corrected questions routes
router.post('/papers/:subject_code/:semester/save-corrected', ctrl.saveCorrectedQuestions);
router.put('/papers/:subject_code/:semester/approve-corrected', ctrl.approveCorrectedQuestions);
router.put('/papers/:subject_code/:semester/reject', ctrl.rejectPaper);
router.get('/papers/:subject_code/:semester/corrected', ctrl.getCorrectedQuestions);

// Diagnostics
router.get('/approved-list', ctrl.listApprovedPapers);
router.get('/rejected-list', ctrl.listRejectedPapers);

router.delete('/:verifierId', ctrl.removeOne);

module.exports = router;
