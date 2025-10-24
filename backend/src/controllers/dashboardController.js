const QuestionPaper = require('../models/QuestionPaper');
const ApprovedPaper = require('../models/ApprovedPaper');
const RejectedPaper = require('../models/RejectedPaper');
const Subject = require('../models/Subject');
const Department = require('../models/Department');

// Get department-wise analytics
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const { deptName } = req.params;
    
    if (!deptName) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    // Find the department - try exact match first, then partial match
    let department = await Department.findOne({ 
      name: { $regex: `^${deptName}$`, $options: 'i' } 
    });
    
    // If not found, try partial match (for cases like "CSE" matching "Computer Science and Engineering (CSE)")
    if (!department) {
      department = await Department.findOne({ 
        name: { $regex: deptName, $options: 'i' } 
      });
    }

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Get all subjects for this department
    const subjects = await Subject.find({ department: department._id }).select('subject_code');
    const subjectCodes = subjects.map(sub => sub.subject_code);

    if (subjectCodes.length === 0) {
      return res.json({
        papers_sent: 0,
        papers_submitted: 0,
        papers_not_submitted: 0,
        cos: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        levels: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        last_updated: new Date().toISOString()
      });
    }

    // Get all question papers for this department
    const allPapers = await QuestionPaper.find({ 
      subject_code: { $in: subjectCodes } 
    });

    // Get approved and rejected papers
    const approvedPapers = await ApprovedPaper.find({ 
      subject_code: { $in: subjectCodes } 
    });

    const rejectedPapers = await RejectedPaper.find({ 
      subject_code: { $in: subjectCodes } 
    });

    // Calculate papers sent (total unique papers by subject_code and semester)
    const uniquePapers = new Set();
    allPapers.forEach(paper => {
      uniquePapers.add(`${paper.subject_code}_${paper.semester}`);
    });
    const papers_sent = uniquePapers.size;

    // Calculate papers submitted (approved + rejected)
    const papers_submitted = approvedPapers.length + rejectedPapers.length;
    const papers_not_submitted = papers_sent - papers_submitted;

    // Calculate COs distribution
    const cos = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    allPapers.forEach(paper => {
      if (paper.co && paper.co.match(/^\d+$/)) {
        const coNum = parseInt(paper.co);
        if (coNum >= 1 && coNum <= 5) {
          cos[coNum.toString()]++;
        }
      }
    });

    // Calculate Levels distribution
    const levels = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    allPapers.forEach(paper => {
      if (paper.level && paper.level.match(/^\d+$/)) {
        const levelNum = parseInt(paper.level);
        if (levelNum >= 1 && levelNum <= 5) {
          levels[levelNum.toString()]++;
        }
      }
    });

    res.json({
      papers_sent,
      papers_submitted,
      papers_not_submitted,
      cos,
      levels,
      last_updated: new Date().toISOString()
    });

  } catch (err) {
    console.error('Department analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
