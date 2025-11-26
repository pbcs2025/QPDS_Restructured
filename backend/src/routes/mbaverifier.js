// backend/src/routes/mbaverifierRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mbaverifierController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, isSuperAdmin, isVerifier } = require('../middleware/authorize');

// ============================================
// PUBLIC AUTHENTICATION ROUTES (No token required)
// ============================================
router.post('/login', ctrl.login);                    // Direct login with JWT token (no email verification)
router.post('/verify', ctrl.verify);                  // Deprecated - use /login directly
router.post('/forgot-password', ctrl.forgotPassword); // Send password to email

// ============================================
// PROTECTED AUTHENTICATION ROUTES (Token required)
// ============================================
router.post('/logout', verifyToken, ctrl.logout);              // Logout with activity logging
router.post('/reset-password', verifyToken, ctrl.resetPassword); // Change password

// ============================================
// ADMIN ROUTES (SuperAdmin only)
// ============================================
router.post('/register', verifyToken, isSuperAdmin, ctrl.register);           // Create new verifier
router.get('/all/list', verifyToken, isSuperAdmin, ctrl.listAll);            // List all verifiers
router.delete('/:verifierId', verifyToken, isSuperAdmin, ctrl.removeOne);     // Delete verifier
router.delete('/all/danger', verifyToken, isSuperAdmin, ctrl.deleteAll);      // Delete all verifiers (danger!)
router.post('/normalize-departments', verifyToken, isSuperAdmin, ctrl.normalizeDepartments); // Normalize department names

// ============================================
// VERIFIER ROUTES - Question Papers (Verifier only)
// ============================================
router.get('/papers', verifyToken, ctrl.getPapers);                                    // Get all papers
router.get('/rejected', verifyToken, ctrl.getRejectedPapers);                          // Get rejected papers
router.get('/approved', verifyToken, ctrl.getApprovedPapers);                          // Get approved papers
router.put('/papers/:id', verifyToken, ctrl.updatePaper);                              // Update paper by ID
router.put('/papers/:subject_code/:semester', verifyToken, ctrl.updatePaper);          // Update paper by code/sem
router.get('/papers/:subject_code/:semester/docx', verifyToken, ctrl.getPaperDocx);    // Download DOCX
router.get('/papers/:subject_code/:semester', verifyToken, ctrl.getPaperByCodeSemester); // Get specific paper

// ============================================
// CORRECTED QUESTIONS ROUTES (Verifier only)
// ============================================
router.post('/papers/:subject_code/:semester/save-corrected', verifyToken, ctrl.saveCorrectedQuestions);      // Save corrections
router.put('/papers/:subject_code/:semester/approve-corrected', verifyToken, ctrl.approveCorrectedQuestions); // Approve corrections
router.put('/papers/:subject_code/:semester/reject', verifyToken, ctrl.rejectPaper);                          // Reject paper
router.get('/papers/:subject_code/:semester/corrected', verifyToken, ctrl.getCorrectedQuestions);             // Get corrections

// ============================================
// DIAGNOSTICS ROUTES (Verifier only)
// ============================================
router.get('/approved-list', verifyToken, ctrl.listApprovedPapers);  // List approved papers
router.get('/rejected-list', verifyToken, ctrl.listRejectedPapers);  // List rejected papers

module.exports = router;

