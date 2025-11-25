const express = require('express');
const router = express.Router();
const mbafacultyController = require('../controllers/mbafacultyController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, isSuperAdmin } = require('../middleware/authorize');

// MBA Faculty authentication routes (public)
router.post('/register', mbafacultyController.registerMBAFaculty);
router.post('/login', mbafacultyController.loginMBAFaculty);
router.post('/verify', mbafacultyController.verifyMBAFaculty);
router.post('/forgot-password', mbafacultyController.forgotMBAFacultyPassword);
router.post('/reset-password', verifyToken, mbafacultyController.resetMBAFacultyPassword);
router.post('/logout', verifyToken, mbafacultyController.logoutMBAFaculty); 

// MBA Faculty profile routes (authenticated)
router.get('/profile/:email', verifyToken, mbafacultyController.getMBAFacultyProfile);
router.put('/profile/:email', verifyToken, mbafacultyController.updateMBAFacultyProfile);

// MBA Faculty management routes (SuperAdmin only)
router.get('/all', verifyToken, isSuperAdmin, mbafacultyController.getAllMBAFaculties);
router.get('/department/:department', verifyToken, authorize('SuperAdmin', 'Faculty', 'Verifier', 'MBAFaculty', 'MBAVerifier'), mbafacultyController.getMBAFacultiesByDepartment);

// Bulk upload (SuperAdmin only)
router.post('/bulk-upload', verifyToken, isSuperAdmin, upload.single('file'), mbafacultyController.bulkUploadMBAFaculties);

module.exports = router;

