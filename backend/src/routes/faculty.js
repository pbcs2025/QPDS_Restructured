const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');

// Faculty authentication routes
router.post('/register', facultyController.registerFaculty);
router.post('/login', facultyController.loginFaculty);
router.post('/verify', facultyController.verifyFaculty);
router.post('/forgot-password', facultyController.forgotFacultyPassword);
router.post('/reset-password', facultyController.resetFacultyPassword);

// Faculty profile routes
router.get('/profile/:email', facultyController.getFacultyProfile);
router.put('/profile/:email', facultyController.updateFacultyProfile);

// Faculty management routes
router.get('/all', facultyController.getAllFaculties);
router.get('/department/:department', facultyController.getFacultiesByDepartment);

module.exports = router;

