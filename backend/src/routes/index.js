const express = require('express');
const router = express.Router();

router.use('/api', require('./auth'));
router.use('/api/faculty', require('./faculty'));
router.use('/api/question-bank', require('./questionBank'));
router.use('/api/subjects', require('./subjects'));
router.use('/api/departments', require('./departments'));
router.use('/api/colleges', require('./colleges'));
router.use('/api/verifier', require('./verifier'));
router.post('/api/assignQPSetter', require('../controllers/assignmentController').assignQPSetter);
router.get('/api/assignedSubjects', require('../controllers/assignmentController').assignedSubjects);
router.get('/api/assignments/:subjectCode', require('../controllers/assignmentController').assignmentsBySubject);
router.get('/api/faculty/assignments/:email', require('../controllers/assignmentController').getFacultyAssignments);
// Compatibility alias for legacy frontend route
router.get('/api/subject-codes', require('../controllers/subjectController').subjectCodes);
// Test DB endpoint
router.get('/test-db', require('../controllers/testDbController').testDb);
// Debug endpoint
router.get('/debug-latest', async (req, res) => {
  try {
    const QuestionPaper = require('../models/QuestionPaper');
    const papers = await QuestionPaper.find({ subject_code: 'TEST002' }).lean();
    res.json({
      count: papers.length,
      papers: papers.map(p => ({
        id: p._id,
        question_number: p.question_number,
        department: p.department,
        co: p.co,
        level: p.level,
        marks: p.marks,
        allFields: Object.keys(p)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


