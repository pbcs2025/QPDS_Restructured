const express = require('express');
const router = express.Router();
const questionPaperController = require('../controllers/questionPaperController');
const approvalController = require('../controllers/approvalController');

// POST /api/papers - Create a new question paper
// Handled by questionPaperController.createPaper
router.post('/papers', questionPaperController.createPaper);

// GET /api/papers - Get all submitted papers
// Handled by questionPaperController.getAllPapers
router.get('/papers', questionPaperController.getSubmittedPapers);

// PUT /api/papers/:id/approve - Approve a paper
// Handled by approvalController.approvePaper
router.put('/papers/:id/approve', approvalController.approvePaper);

// PUT /api/papers/:id/reject - Reject a paper
// Handled by approvalController.rejectPaper
router.put('/papers/:id/reject', approvalController.rejectPaper);

// GET /api/papers/approved - Get all approved papers
// Handled by approvalController.getApprovedPapers
router.get('/papers/approved', approvalController.getApprovedPapers);

// GET /api/approvedpapers - Get all approved papers (alias for frontend compatibility)
// Handled by approvalController.getApprovedPapers
router.get('/approvedpapers', approvalController.getApprovedPapers);

// GET /api/papers/rejected - Get all rejected papers
// Handled by approvalController.getRejectedPapers
router.get('/papers/rejected', approvalController.getRejectedPapers);

// GET /api/rejectedpapers - Get all rejected papers (alias for frontend compatibility)
// Handled by approvalController.getRejectedPapers
router.get('/rejectedpapers', approvalController.getRejectedPapers);

// Archive and restore routes
router.post('/papers/archive', questionPaperController.archivePaper);
router.post('/papers/restore', questionPaperController.restorePaper);
router.get('/papers/archived', questionPaperController.getArchivedPapers);

module.exports = router;