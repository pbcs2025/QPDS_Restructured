const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, isSuperAdmin } = require('../middleware/authorize');

// Faculty authentication routes (public)
router.post('/register', facultyController.registerFaculty);
router.post('/login', facultyController.loginFaculty);
router.post('/verify', facultyController.verifyFaculty);
router.post('/forgot-password', facultyController.forgotFacultyPassword);
router.post('/reset-password', verifyToken, facultyController.resetFacultyPassword);
router.post('/logout', verifyToken, facultyController.logoutFaculty); 

// Faculty profile routes (authenticated)
router.get('/profile/:email', verifyToken, facultyController.getFacultyProfile);
router.put('/profile/:email', verifyToken, facultyController.updateFacultyProfile);

// Faculty management routes (SuperAdmin only)
router.get('/all', verifyToken, isSuperAdmin, facultyController.getAllFaculties);
router.get('/department/:department', verifyToken, authorize('SuperAdmin', 'Faculty', 'Verifier'), facultyController.getFacultiesByDepartment);

// Bulk upload (SuperAdmin only)
router.post('/bulk-upload', verifyToken, isSuperAdmin, upload.single('file'), facultyController.bulkUploadFaculties);

module.exports = router;