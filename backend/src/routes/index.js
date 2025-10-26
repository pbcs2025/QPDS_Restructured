const express = require('express');
const router = express.Router();

router.use('/api', require('./auth'));
router.use('/api/faculty', require('./faculty'));
router.use('/api/question-bank', require('./questionBank'));
router.use('/api/subjects', require('./subjects'));
router.use('/api/departments', require('./departments'));
router.use('/api/colleges', require('./colleges'));
router.use('/api/verifier', require('./verifier'));
router.use('/api/dashboard', require('./dashboard'));
// Mount papers routes (submitted/approved/rejected/archived)
router.use('/api', require('./papers'));
router.post('/api/assignQPSetter', require('../controllers/assignmentController').assignQPSetter);
router.get('/api/assignedSubjects', require('../controllers/assignmentController').assignedSubjects);
router.get('/api/assignments/:subjectCode', require('../controllers/assignmentController').assignmentsBySubject);
router.get('/api/faculty/assignments/:email', require('../controllers/assignmentController').getFacultyAssignments);
router.get('/api/faculty/subject-codes/:email', require('../controllers/assignmentController').getFacultySubjectCodes);
router.post('/api/assignment/update-status', require('../controllers/assignmentController').updateAssignmentStatus);
// Compatibility alias for legacy frontend route
router.get('/api/subject-codes', require('../controllers/subjectController').subjectCodes);
// Test DB endpoint
router.get('/test-db', require('../controllers/testDbController').testDb);

// Root health endpoint
router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;


