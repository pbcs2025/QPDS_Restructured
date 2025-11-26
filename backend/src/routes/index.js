const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, isSuperAdmin } = require('../middleware/authorize');

router.use('/api', require('./auth'));
router.use('/api/faculty', require('./faculty'));
router.use('/api/question-bank', require('./questionBank'));
router.use('/api/subjects', require('./subjects'));
router.use('/api/departments', require('./departments'));
router.use('/api/mbasubjects', require('./mbasubjects'));
router.use('/api/mbadepartments', require('./mbadepartments'));
router.use('/api/colleges', require('./colleges'));
router.use('/api/verifier', require('./verifier'));
router.use('/api/mbafaculty', require('./mbafaculty'));
router.use('/api/mbaverifier', require('./mbaverifier'));
router.use('/api', require('./papers')); // Question Paper Approval System routes

router.post('/api/assignQPSetter', verifyToken, isSuperAdmin, require('../controllers/assignmentController').assignQPSetter);
router.get('/api/assignedSubjects', verifyToken, isSuperAdmin, require('../controllers/assignmentController').assignedSubjects);
router.get('/api/assignments/:subjectCode', verifyToken, isSuperAdmin, require('../controllers/assignmentController').assignmentsBySubject);
router.get('/api/faculty/assignments/:email', verifyToken, authorize('SuperAdmin', 'Faculty'), require('../controllers/assignmentController').getFacultyAssignments);
router.get('/api/faculty/subject-codes/:email', verifyToken, authorize('SuperAdmin', 'Faculty'), require('../controllers/assignmentController').getFacultySubjectCodes);
router.post('/api/assignment/update-status', verifyToken, authorize('SuperAdmin', 'Faculty'), require('../controllers/assignmentController').updateAssignmentStatus);
router.get('/api/recent-assignments', verifyToken, isSuperAdmin, require('../controllers/assignmentController').getRecentAssignments);
// MBA Assignment routes
router.post('/api/mbaassignQPSetter', verifyToken, isSuperAdmin, require('../controllers/mbaAssignmentController').assignQPSetter);
router.get('/api/mbaassignedSubjects', verifyToken, isSuperAdmin, require('../controllers/mbaAssignmentController').assignedSubjects);
router.get('/api/mbaassignments/:subjectCode', verifyToken, isSuperAdmin, require('../controllers/mbaAssignmentController').assignmentsBySubject);
router.get('/api/mbafaculty/assignments/:email', verifyToken, authorize('SuperAdmin', 'Faculty', 'MBAFaculty'), require('../controllers/mbaAssignmentController').getFacultyAssignments);
router.get('/api/mbafaculty/subject-codes/:email', verifyToken, authorize('SuperAdmin', 'Faculty', 'MBAFaculty'), require('../controllers/mbaAssignmentController').getFacultySubjectCodes);
router.post('/api/mbaassignment/update-status', verifyToken, authorize('SuperAdmin', 'Faculty', 'MBAFaculty'), require('../controllers/mbaAssignmentController').updateAssignmentStatus);
router.get('/api/mbarecent-assignments', verifyToken, isSuperAdmin, require('../controllers/mbaAssignmentController').getRecentAssignments);

// Compatibility alias for legacy frontend route
router.get('/api/subject-codes', verifyToken, authorize('SuperAdmin', 'Faculty', 'Verifier'), require('../controllers/subjectController').subjectCodes);
// Test DB endpoint
router.get('/test-db', require('../controllers/testDbController').testDb);

module.exports = router;


