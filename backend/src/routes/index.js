const express = require('express');
const router = express.Router();

router.use('/api', require('./auth'));
router.use('/api/question-bank', require('./questionBank'));
router.use('/api/subjects', require('./subjects'));
router.use('/api/departments', require('./departments'));
router.use('/api/colleges', require('./colleges'));
router.post('/api/assignQPSetter', require('../controllers/assignmentController').assignQPSetter);
router.get('/api/assignedSubjects', require('../controllers/assignmentController').assignedSubjects);
router.get('/api/assignments/:subjectCode', require('../controllers/assignmentController').assignmentsBySubject);
// Compatibility alias for legacy frontend route
router.get('/api/subject-codes', require('../controllers/subjectController').subjectCodes);
// Test DB endpoint
router.get('/test-db', require('../controllers/testDbController').testDb);

module.exports = router;


