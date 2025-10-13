const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/verifierController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/all/list', ctrl.listAll);


// Question paper routes - these must come before /:id route
router.get('/papers', ctrl.getPapers);
router.get('/rejected', ctrl.getRejectedPapers);
router.get('/approved', ctrl.getApprovedPapers);
router.put('/papers/:id', ctrl.updatePaper);
router.put('/papers/:subject_code/:semester', ctrl.updatePaper);
router.get('/papers/:subject_code/:semester/docx', ctrl.getPaperDocx);
router.get('/papers/:subject_code/:semester', ctrl.getPaperByCodeSemester);

// Diagnostics
router.get('/approved-list', ctrl.listApprovedPapers);
router.get('/rejected-list', ctrl.listRejectedPapers);

router.delete('/:verifierId', ctrl.removeOne);


// Admin-only: normalize Verifier.department to active Departments canonical names
router.post('/normalize-departments', ctrl.normalizeDepartments);

module.exports = router;


