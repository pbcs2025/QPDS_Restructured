const QuestionPaper = require('../models/QuestionPaper');
const Department = require('../models/Department');
const Subject = require('../models/Subject');

// Get all departments for analytics
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).select('name _id').lean();
    res.json(departments);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get department-wise analytics
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const { deptName } = req.params;
    if (!deptName) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const decodedDeptName = decodeURIComponent(deptName);
    let department = await Department.findOne({ name: { $regex: `^${decodedDeptName}$`, $options: 'i' } });
    if (!department) {
      department = await Department.findOne({ name: { $regex: decodedDeptName, $options: 'i' } });
    }
    if (!department) {
      const abbreviation = decodedDeptName.match(/\(([^)]+)\)$/);
      if (abbreviation) {
        department = await Department.findOne({ name: { $regex: abbreviation[1], $options: 'i' } });
      }
    }
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Build flexible patterns for department matching
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = new RegExp(escape(department.name), 'i');
    const clickedPattern = new RegExp(escape(decodedDeptName), 'i');
    const abbrMatch = department.name.match(/\(([^)]+)\)$/);
    const abbrPattern = abbrMatch ? new RegExp(escape(abbrMatch[1]), 'i') : null;

    // Try to fetch QuestionPapers by department string first (handles most cases)
    let allPapers = await QuestionPaper.find({
      $or: [
        { department: { $regex: namePattern } },
        { department: { $regex: clickedPattern } },
        ...(abbrPattern ? [{ department: { $regex: abbrPattern } }] : [])
      ]
    }).lean();

    // Fallback: derive subject codes from Subject.department when QP.department is missing/inconsistent
    if (!allPapers || allPapers.length === 0) {
      const subjects = await Subject.find({
        $or: [
          { department: { $regex: namePattern } },
          { department: { $regex: clickedPattern } },
          ...(abbrPattern ? [{ department: { $regex: abbrPattern } }] : [])
        ]
      }).select('subject_code').lean();
      const subjectCodes = subjects.map(s => s.subject_code);

      if (subjectCodes.length > 0) {
        allPapers = await QuestionPaper.find({ subject_code: { $in: subjectCodes } }).lean();
      }

      if (!allPapers || allPapers.length === 0) {
        return res.json({
          papers_sent: 0,
          papers_submitted: 0,
          papers_not_submitted: 0,
          cos: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          levels: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          last_updated: new Date().toISOString()
        });
      }
    }

    const sentPairs = new Set();
    const submittedPairs = new Set();
    const cos = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const levels = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

    allPapers.forEach((p) => {
      sentPairs.add(`${p.subject_code}_${p.semester}`);
      if (p.status === 'approved' || p.status === 'rejected') {
        submittedPairs.add(`${p.subject_code}_${p.semester}`);
      }
      // CO can be '1' or 'CO1'
      if (typeof p.co === 'string') {
        const m = p.co.trim().match(/^(?:CO\s*)?(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n >= 1 && n <= 5) cos[String(n)]++;
        }
      }
      // Level can be '1', 'L1', or 'Level 1'
      if (typeof p.level === 'string') {
        const ml = p.level.trim().match(/^(?:L(?:evel)?\s*)?(\d+)$/i);
        if (ml) {
          const n = parseInt(ml[1], 10);
          if (n >= 1 && n <= 5) levels[String(n)]++;
        }
      }
    });

    const papers_sent = sentPairs.size;
    const papers_submitted = submittedPairs.size;
    const papers_not_submitted = Math.max(0, papers_sent - papers_submitted);

    return res.json({
      papers_sent,
      papers_submitted,
      papers_not_submitted,
      cos,
      levels,
      last_updated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Department analytics error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
