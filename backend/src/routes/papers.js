const express = require('express');
const router = express.Router();
const questionPaperController = require('../controllers/questionPaperController');
const approvalController = require('../controllers/approvalController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, isSuperAdmin } = require('../middleware/authorize');

// POST /api/papers - Create a new question paper (Faculty only)
router.post('/papers', verifyToken, authorize('Faculty'), questionPaperController.createPaper);

// GET /api/papers - Get all submitted papers (SuperAdmin only)
router.get('/papers', verifyToken, isSuperAdmin, questionPaperController.getSubmittedPapers);

// PUT /api/papers/:id/approve - Approve a paper (SuperAdmin only)
router.put('/papers/:id/approve', verifyToken, isSuperAdmin, approvalController.approvePaper);

// PUT /api/papers/:id/reject - Reject a paper (SuperAdmin only)
router.put('/papers/:id/reject', verifyToken, isSuperAdmin, approvalController.rejectPaper);

// GET /api/papers/approved - Get all approved papers (SuperAdmin only)
router.get('/papers/approved', verifyToken, isSuperAdmin, approvalController.getApprovedPapers);

// GET /api/approvedpapers - Get all approved papers (alias for frontend compatibility) (SuperAdmin only)
router.get('/approvedpapers', verifyToken, isSuperAdmin, approvalController.getApprovedPapers);

// GET /api/papers/rejected - Get all rejected papers (SuperAdmin only)
router.get('/papers/rejected', verifyToken, isSuperAdmin, approvalController.getRejectedPapers);

// GET /api/rejectedpapers - Get all rejected papers (alias for frontend compatibility) (SuperAdmin only)
router.get('/rejectedpapers', verifyToken, isSuperAdmin, approvalController.getRejectedPapers);

// Archive and restore routes (SuperAdmin only)
router.post('/papers/archive', verifyToken, isSuperAdmin, questionPaperController.archivePaper);
router.post('/papers/restore', verifyToken, isSuperAdmin, questionPaperController.restorePaper);
router.get('/papers/archived', verifyToken, isSuperAdmin, questionPaperController.getArchivedPapers);

module.exports = router;