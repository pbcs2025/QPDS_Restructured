
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

// Corrected questions routes
router.post('/papers/:subject_code/:semester/save-corrected', ctrl.saveCorrectedQuestions);
router.put('/papers/:subject_code/:semester/approve-corrected', ctrl.approveCorrectedQuestions);
router.put('/papers/:subject_code/:semester/reject', ctrl.rejectPaper);
router.get('/papers/:subject_code/:semester/corrected', ctrl.getCorrectedQuestions);

// Diagnostics
router.get('/approved-list', ctrl.listApprovedPapers);
router.get('/rejected-list', ctrl.listRejectedPapers);

router.delete('/remove/:verifierId', ctrl.removeOne);

// Faculty management routes for verifiers
router.get('/faculties/department/:department', ctrl.getFacultiesByDepartment);
router.post('/assign-temporary/:facultyId', ctrl.assignTemporaryVerifier);
router.delete('/remove-temporary/:facultyId', ctrl.removeTemporaryVerifier);

// Subject assignment routes for verifiers
router.post('/assign-subject', ctrl.assignSubjectToFaculty);
router.delete('/remove-subject-assignment', ctrl.removeSubjectFromFaculty);


// Admin-only: normalize Verifier.department to active Departments canonical names
router.post('/normalize-departments', ctrl.normalizeDepartments);

module.exports = router;


