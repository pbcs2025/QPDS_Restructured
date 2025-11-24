const crypto = require('crypto');
const mongoose = require('mongoose');
const sendEmail = require('../utils/mailer');
const User = require('../models/User');
const Verifier = require('../models/Verifier');

const Faculty = require('../models/Faculty');
const QuestionPaper = require('../models/QuestionPaper');
const ApprovedPaper = require('../models/ApprovedPaper');
const RejectedPaper = require('../models/RejectedPaper');
const VerifierCorrectedQuestions = require('../models/VerifierCorrectedQuestions');

const Department = require('../models/Department');
const { Document, Packer, Paragraph, TextRun } = (() => {
  try {
    return require('docx');
  } catch (e) {
    return {};
  }
})();

function generateRandomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars[idx];
  }
  return result;
}

exports.register = async (req, res) => {
  try {
    const { department, email, verifierName } = req.body;
    if (!department) return res.status(400).json({ error: 'department is required' });

    // Canonicalize department to match active Department names
    const active = await Department.find({ isActive: true }).select('name').lean();
    const byLower = new Map(active.map(d => [String(d.name).toLowerCase().trim(), d.name]));
    const canonicalDept = byLower.get(String(department).toLowerCase().trim());
    if (!canonicalDept) {
      return res.status(400).json({ error: 'Invalid department. Choose from active departments.' });
    }

    // Build department abbreviation from uppercase letters
    const abbrMatch = String(canonicalDept).match(/[A-Z]/g) || [];
    const deptAbbr = abbrMatch.join('') || canonicalDept.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

    // Count how many verifiers already exist for this department
    const countForDept = await Verifier.countDocuments({ department: canonicalDept });
    const nextId = countForDept + 1;
    const usernameBase = `${deptAbbr}Adminid${nextId}`;

    const randomSuffix = generateRandomAlphanumeric(3);
    const username = usernameBase;
    const password = generateRandomAlphanumeric(8);

    const user = await User.create({
      name: verifierName && String(verifierName).trim() ? String(verifierName).trim() : username,
      username,
      clgName: '-',
      deptName: canonicalDept,
      email: email || `${username}@example.com`,
      phoneNo: '',
      password,
      usertype: 'admin',
      role: 'Verifier',
    });

    await Verifier.create({
      verifierId: user._id,
      verifierName: verifierName && String(verifierName).trim() ? String(verifierName).trim() : undefined,
      username,
      passwordHash: password,
      department: canonicalDept,
      email: email || '',
      role: 'verifier',
    });

    return res.status(201).json({ message: 'Verifier created', credentials: { username, password } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Username already exists, please retry' });
    }
    console.error('Verifier register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Danger: delete all verifiers and associated verifier users
exports.deleteAll = async (_req, res) => {
  try {
    const verifiers = await Verifier.find({}).select('verifierId').lean();
    const userIds = verifiers.map(v => v.verifierId).filter(Boolean);

    const delVerifiers = await Verifier.deleteMany({});
    let delUsers = { deletedCount: 0 };
    if (userIds.length > 0) {
      delUsers = await User.deleteMany({ _id: { $in: userIds } });
    }

    return res.json({ success: true, verifiersDeleted: delVerifiers.deletedCount || 0, usersDeleted: delUsers.deletedCount || 0 });
  } catch (err) {
    console.error('Verifier deleteAll error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

    // Allow login by username or email for verifiers
    const user = await User.findOne({
      $or: [
        { username },
        { email: username }
      ],
      password,
      role: 'Verifier'
    }).lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const verifier = await Verifier.findOne({ verifierId: user._id }).lean();
    console.log('Login successful for user:', user.username, 'verifier found by verifierId:', !!verifier);
    if (!verifier) return res.status(401).json({ success: false, message: 'Verifier record not found' });

    // Check if this is a temporary verifier by looking up the Faculty record
    const faculty = await Faculty.findOne({ facultyId: user._id }).lean();

    let isTemporary = false;
    let assignedSubjects = [];

    if (faculty && faculty.verifierExpiresAt && faculty.verifierExpiresAt > new Date()) {
      // This is a temporary verifier
      isTemporary = true;
      assignedSubjects = faculty.assignedSubjects || [];
      console.log('✅ TEMPORARY VERIFIER LOGIN:', user.username, 'assigned subjects:', assignedSubjects);
    } else {
      console.log('❌ NOT A TEMPORARY VERIFIER OR EXPIRED:', user.username);
    }

    // Add temporary status and assigned subjects to the response
    const verifierResponse = {
      ...verifier,
      temporary: isTemporary,
      assignedSubjects: assignedSubjects
    };

    return res.json({ success: true, verifier: verifierResponse });
  } catch (err) {
    console.error('Verifier login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const verifier = await Verifier.findById(id).lean();
    if (!verifier) return res.status(404).json({ error: 'Verifier not found' });
    return res.json(verifier);
  } catch (err) {
    console.error('Verifier getById error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.listAll = async (_req, res) => {
  try {
    const rows = await Verifier.find({}).sort({ department: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Verifier listAll error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get rejected papers for verifier with optional filtering
exports.getRejectedPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;

    const filter = {};
    
    // Handle case-insensitive department filtering
    if (department) {
      // Find the canonical department name from the database
      const dept = await Department.findOne({
        name: { $regex: new RegExp(`^${department}$`, 'i') },
        isActive: true
      });
      
      if (dept) {
        filter.department = dept.name; // Use the canonical department name
      } else {
        // If no matching active department found, return empty array
        return res.json([]);
      }
    }
    
    if (semester) filter.semester = parseInt(semester, 10);

    const rejected = await RejectedPaper.find(filter).sort({ rejected_at: -1 }).lean();

    // Group by subject_code and semester to avoid duplicates
    const groupedPapers = {};
    rejected.forEach((r) => {
      const key = `${r.subject_code}_${r.semester}`;
      if (!groupedPapers[key]) {
        groupedPapers[key] = {
          _id: key,
          subject_code: r.subject_code,
          subject_name: r.subject_name || 'Unknown',
          semester: r.semester,
          department: r.department || 'Unknown',
          rejected_at: r.rejected_at,
          status: 'rejected',
          questions: []
        };
      }
      // Only add unique questions to avoid duplicates
      const existingQuestion = groupedPapers[key].questions.find(q => q.question_number === r.question_number);
      if (!existingQuestion) {
        groupedPapers[key].questions.push({
          question_number: r.question_number,
          question_text: r.question_text,
          marks: r.marks,
          co: r.co,
          level: r.level,
          remarks: r.remarks
        });
      }
    });

    const detailed = Object.values(groupedPapers);

    return res.json(detailed);
  } catch (err) {
    console.error('Get rejected papers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get approved papers for verifier with optional filtering
exports.getApprovedPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;

    const filter = {};
    
    // Handle case-insensitive department filtering
    if (department) {
      // Find the canonical department name from the database
      const dept = await Department.findOne({
        name: { $regex: new RegExp(`^${department}$`, 'i') },
        isActive: true
      });
      
      if (dept) {
        filter.department = dept.name; // Use the canonical department name
      } else {
        // If no matching active department found, return empty array
        return res.json([]);
      }
    }
    
    if (semester) filter.semester = parseInt(semester, 10);

    const approved = await ApprovedPaper.find(filter).sort({ approved_at: -1 }).lean();

    // Group by subject_code and semester to avoid duplicates
    const groupedPapers = {};
    approved.forEach((a) => {
      const key = `${a.subject_code}_${a.semester}`;
      if (!groupedPapers[key]) {
        groupedPapers[key] = {
          _id: key,
          subject_code: a.subject_code,
          subject_name: a.subject_name || 'Unknown',
          semester: a.semester,
          department: a.department || 'Unknown',
          approved_at: a.approved_at,
          status: 'approved',
          questions: []
        };
      }
      // Only add unique questions to avoid duplicates
      const existingQuestion = groupedPapers[key].questions.find(q => q.question_number === a.question_number);
      if (!existingQuestion) {
        groupedPapers[key].questions.push({
          question_number: a.question_number,
          question_text: a.question_text,
          marks: a.marks,
          co: a.co,
          level: a.level,
          remarks: a.remarks
        });
      }
    });

    const detailed = Object.values(groupedPapers);

    return res.json(detailed);
  } catch (err) {
    console.error('Get approved papers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get papers for verifier - FILTER BY VERIFIER TYPE
exports.getPapers = async (req, res) => {
  try {
    // Get verifier info from request (passed through middleware or stored in localStorage)
    // For temporary verifiers, we need to filter by assigned subjects
    const verifierData = req.headers['verifier-data'];
    let verifier = null;

    if (verifierData) {
      try {
        verifier = JSON.parse(verifierData);
      } catch (e) {
        console.error('Error parsing verifier data:', e);
      }
    }

    const { department, semester, assignedSubjects } = req.query;
    console.log('Verifier getPapers called with:', { department, semester, assignedSubjects });
    console.log('Verifier info:', verifier ? { temporary: verifier.temporary, assignedSubjects: verifier.assignedSubjects } : 'No verifier data');

    let filter = {};

    // Always filter by assigned subjects if verifier has them (both temporary and permanent)
    if (verifier && Array.isArray(verifier.assignedSubjects) && verifier.assignedSubjects.length > 0) {
      // Use case-insensitive regex matching for subject codes
      filter.$or = verifier.assignedSubjects.map(code => ({
        subject_code: { $regex: `^${code}$`, $options: 'i' }
      }));
      console.log('📋 VERIFIER: Filtering by assigned subjects (case-insensitive):', verifier.assignedSubjects, '(temporary:', !!verifier.temporary, ')');
    } else {
      // If no assigned subjects, fall back to department filtering for permanent verifiers
      if (department) filter.department = String(department).trim();
      console.log('📋 VERIFIER: No assigned subjects, using department filter:', department);
    }

    if (semester) filter.semester = parseInt(semester, 10);

    console.log('Applied filter:', filter);

    // Exclude papers already stored in rejected
    const rejectedPaperKeys = await RejectedPaper.find({}, { subject_code: 1, semester: 1 }).lean();
    const rejectedKeys = new Set(rejectedPaperKeys.map(rp => `${rp.subject_code}_${rp.semester}`));

    // GET PAPERS WITH FILTERING
    const allPapers = await QuestionPaper.find({
      ...filter,
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: 'pending' },
        { status: 'submitted' }
      ]
    }).sort({ subject_code: 1, semester: 1, question_number: 1 }).lean();

    console.log('📋 TOTAL PAPERS FOUND:', allPapers.length);

    console.log('📄 Sample papers:', allPapers.slice(0, 3).map(p => ({
      subject_code: p.subject_code,
      semester: p.semester,
      department: p.department,
      status: p.status
    })));
    
    // Debug: Log all papers with their department values
    if (allPapers.length > 0) {
      console.log('All papers department values:', allPapers.map(p => ({
        subject_code: p.subject_code,
        department: p.department,
        departmentType: typeof p.department,
        departmentLength: p.department ? p.department.length : 0
      })));
    }

    const papers = allPapers.filter(p => !rejectedKeys.has(`${p.subject_code}_${p.semester}`));
    console.log('Papers after filtering rejected:', papers.length);

    const groupedPapers = {};
    papers.forEach((paper) => {
      const key = `${paper.subject_code}_${paper.semester}`;
      if (!groupedPapers[key]) {
        groupedPapers[key] = {
          _id: key,
          subject_code: paper.subject_code,
          subject_name: paper.subject_name,
          semester: paper.semester,
          department: paper.department,
          questions: [],
          status: 'pending'
        };
      }
      groupedPapers[key].questions.push({
        _id: paper._id,
        question_number: paper.question_number,
        question_text: paper.question_text,
        marks: typeof paper.marks === 'number' ? paper.marks : 0,
        co: paper.co || '',
        l: paper.level || '',
        approved: paper.approved,
        remarks: paper.remarks,
        verified_at: paper.verified_at,
        file_url: paper.file_name ? `/api/question-bank/file/${paper._id}` : null,
        file_name: paper.file_name
      });

      if (paper.status === 'approved') groupedPapers[key].status = 'approved';
      else if (paper.status === 'rejected') groupedPapers[key].status = 'rejected';
    });

    // NO ADDITIONAL FILTERING - SHOW ALL PAPERS
    let result = Object.values(groupedPapers);
    
    console.log('🎯 FINAL RESULT - ALL PAPERS:', result.length, 'grouped papers');
    
    result = result.sort((a, b) => a.subject_code.localeCompare(b.subject_code));
    console.log('Final result for verifier (pending papers only):', result.length, 'grouped papers');
    
    // Debug: Log final result structure
    if (result.length > 0) {
      console.log('Final result sample:', result.slice(0, 2).map(r => ({
        subject_code: r.subject_code,
        department: r.department,
        questionsCount: r.questions ? r.questions.length : 0
      })));
    }
    
    return res.json(result);
  } catch (err) {
    console.error('Get papers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.removeOne = async (req, res) => {
  try {
    const { verifierId } = req.params;
    if (!verifierId) {
      return res.status(400).json({ error: 'verifierId is required' });
    }

    let verifier = null;
    if (mongoose.Types.ObjectId.isValid(verifierId)) {
      // Try by Verifier _id or by stored verifierId (linked User _id)
      verifier = await Verifier.findOne({
        $or: [
          { _id: new mongoose.Types.ObjectId(verifierId) },
          { verifierId: new mongoose.Types.ObjectId(verifierId) },
        ],
        }).lean();
    }
    if (!verifier) {
      // Fallback: try direct match on verifierId field (string form)
      verifier = await Verifier.findOne({ verifierId }).lean();
    }

    if (!verifier) {
      return res.status(404).json({ error: 'Verifier not found' });
    }

    // Delete the verifier document
    await Verifier.deleteOne({ _id: verifier._id });

    // Delete the linked user if present
    if (verifier.verifierId) {
      const linkedId = mongoose.Types.ObjectId.isValid(verifier.verifierId)
        ? new mongoose.Types.ObjectId(verifier.verifierId)
        : verifier.verifierId;
      await User.deleteOne({ _id: linkedId });
    }

    return res.json({ success: true, message: 'Verifier and linked user deleted successfully.' });
  } catch (err) {
    console.error('Verifier removeOne error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updatePaper = async (req, res) => {
  try {
    const { subject_code: pCode, semester: pSem } = req.params;
    const { subject_code: bCode, semester: bSem, questions, finalStatus } = req.body || {};
    
    const subject_code = String(pCode || bCode || '').trim();
    const semester = parseInt(pSem || bSem, 10);
    
    if (!subject_code || Number.isNaN(semester)) {
      return res.status(400).json({ error: 'subject_code and semester are required' });
    }
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    const normalizedCode = subject_code;
    
    // Update each question in the paper
    const updatePromises = questions.map(async (question) => {
      const updateData = {
        approved: !!question.approved,
        remarks: question.remarks || '',
        verified_at: new Date(),
        status: question.approved ? 'approved' : 'rejected',
      };
      if (typeof question.question_text === 'string' && question.question_text.trim() !== '') {
        updateData.question_text = question.question_text.trim();
      }
      if (typeof question.co === 'string') {
        updateData.co = question.co;
      }
      if (typeof question.l === 'string') {
        updateData.level = question.l;
      }
      if (typeof question.marks === 'number' && !Number.isNaN(question.marks)) {
        updateData.marks = question.marks;
      }
      
      return await QuestionPaper.findOneAndUpdate(
        {
          subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' },
          semester: semester,
          question_number: question.question_number,
        },
        { $set: updateData },
        { new: true }
      ).lean();
    });
    
    await Promise.all(updatePromises);

    // Enforce final status across all questions for this paper if provided
    if (finalStatus === 'approved') {
      await QuestionPaper.updateMany(
        { subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' }, semester },
        { $set: { status: 'approved', approved: true, verified_at: new Date() } }
      );
    } else if (finalStatus === 'rejected') {
      await QuestionPaper.updateMany(
        { subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' }, semester },
        { $set: { status: 'rejected', approved: false, verified_at: new Date() } }
      );
    }

    const anyApproved = finalStatus === 'approved' || questions.some((q) => !!q.approved);
    const anyRejected = finalStatus === 'rejected' || questions.some((q) => q.approved === false);

    if (anyApproved && !anyRejected) {
      await ApprovedPaper.updateOne(
        { subject_code: normalizedCode, semester },
        { $set: { subject_code: normalizedCode, semester } },
        { upsert: true }
      );
    }

    if (anyRejected && !anyApproved) {
      await RejectedPaper.updateOne(
        { subject_code: normalizedCode, semester },
        { $set: { subject_code: normalizedCode, semester } },
        { upsert: true }
      );
    }
    
    return res.json({ message: 'Paper updated successfully', finalStatus: finalStatus || null });
  } catch (err) {
    console.error('Verifier updatePaper error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};


// Get a single grouped paper by subject_code and semester
exports.getPaperByCodeSemester = async (req, res) => {
  try {
    const { subject_code, semester } = req.params;
    if (!subject_code || !semester) {
      return res.status(400).json({ error: 'subject_code and semester are required' });
    }

    const sem = parseInt(semester);
    const normalizedCode = String(subject_code).trim();

    let papers = await QuestionPaper.find({ subject_code: normalizedCode, semester: sem })
      .sort({ question_number: 1 })
      .lean();

    if (!papers || papers.length === 0) {
      // Fallback: case-insensitive match
      papers = await QuestionPaper.find({ subject_code: { $regex: `^${normalizedCode}$`, $options: 'i' }, semester: sem })
        .sort({ question_number: 1 })
        .lean();
    }

    if (!papers || papers.length === 0) {
      console.warn('getPaperByCodeSemester: no papers found for', { subject_code: normalizedCode, semester: sem });
      return res.status(404).json({ error: 'Paper not found for given subject code and semester' });
    }

    const grouped = {
      _id: `${subject_code}_${sem}`,
      subject_code,
      subject_name: papers[0].subject_name,
      semester: sem,
      questions: [],
      status: 'pending'
    };

    for (const paper of papers) {
      grouped.questions.push({
        _id: paper._id,
        question_number: paper.question_number,
        question_text: paper.question_text,
        marks: typeof paper.marks === 'number' ? paper.marks : 0,
        co: paper.co || '',
        l: paper.level || '',
        approved: paper.approved,
        remarks: paper.remarks,
        file_name: paper.file_name,
        file_type: paper.file_type,
        file_url: paper.file_name ? `/question-bank/file/${paper._id}` : null
      });

      if (paper.status === 'approved') grouped.status = 'approved';
      else if (paper.status === 'rejected') grouped.status = 'rejected';
    }

    return res.json(grouped);
  } catch (err) {
    console.error('Verifier getPaperByCodeSemester error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Generate a DOCX for a paper
exports.getPaperDocx = async (req, res) => {
  try {
    if (!Packer) return res.status(501).json({ error: 'DOCX generation not available on server' });
    const { subject_code, semester } = req.params;
    const sem = parseInt(semester);
    const papers = await QuestionPaper.find({ subject_code, semester: sem }).sort({ question_number: 1 }).lean();
    if (!papers || papers.length === 0) return res.status(404).json({ error: 'Paper not found' });

    const header = [
      new Paragraph({ children: [new TextRun({ text: `Subject: ${papers[0].subject_name} (${subject_code})`, bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: `Semester: ${sem}`, bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: ' ' })] }),
    ];

    const questionParas = papers.flatMap((q) => [
      new Paragraph({ children: [new TextRun({ text: `${q.question_number}) ${q.question_text}` })] }),
      new Paragraph({ children: [new TextRun({ text: `CO: ${q.co || ''}   L: ${q.level || ''}   Marks: ${typeof q.marks === 'number' ? q.marks : 0}` })] }),
      new Paragraph({ children: [new TextRun({ text: `Remarks: ${q.remarks || ''}` })] }),
      new Paragraph({ children: [new TextRun({ text: ' ' })] }),
    ]);

    const doc = new Document({ sections: [{ properties: {}, children: [...header, ...questionParas] }] });
    const buffer = await Packer.toBuffer(doc);
    const filename = `${subject_code}_${sem}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('getPaperDocx error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
// Diagnostics: list approved papers with optional department filtering
exports.listApprovedPapers = async (req, res) => {
  try {
    const { department } = req.query;
    let filter = {};

    if (department) {
      // Handle case-insensitive department filtering
      const dept = await Department.findOne({
        name: { $regex: new RegExp(`^${department}$`, 'i') },
        isActive: true
      });

      if (dept) {
        filter.department = dept.name;
      } else {
        // Return empty array if no matching department found
        return res.json([]);
      }
    }

    const rows = await ApprovedPaper.find(filter).sort({ approved_at: -1 }).limit(100).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Verifier listApprovedPapers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Diagnostics: list rejected papers
exports.listRejectedPapers = async (req, res) => {
  try {
    const { department } = req.query;
    let filter = {};

    if (department) {
      // Handle case-insensitive department filtering
      const dept = await Department.findOne({
        name: { $regex: new RegExp(`^${department}$`, 'i') },
        isActive: true
      });

      if (dept) {
        filter.department = dept.name;
      } else {
        // Return empty array if no matching department found
        return res.json([]);
      }
    }

    const rows = await RejectedPaper.find(filter).sort({ rejected_at: -1 }).limit(100).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Verifier listRejectedPapers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};





// Save corrected questions by verifier
exports.saveCorrectedQuestions = async (req, res) => {
  try {
    const { subject_code, semester } = req.params;
    const { corrected_questions, verifier_remarks, verified_by } = req.body;

    if (!subject_code || !semester || !corrected_questions || !verified_by) {
      return res.status(400).json({ error: 'subject_code, semester, corrected_questions, and verified_by are required' });
    }

    // Find original questions
    const originalQuestions = await QuestionPaper.find({ 
      subject_code, 
      semester: parseInt(semester) 
    }).sort({ question_number: 1 }).lean();

    if (!originalQuestions || originalQuestions.length === 0) {
      return res.status(404).json({ error: 'Original questions not found' });
    }

    // Create corrected questions record
    const correctedRecord = new VerifierCorrectedQuestions({
      subject_code,
      subject_name: originalQuestions[0].subject_name,
      semester: parseInt(semester),
      department: originalQuestions[0].department,
      corrected_questions: corrected_questions.map((corrected, index) => {
        const original = originalQuestions[index];
        return {
          question_number: corrected.question_number || original.question_number,
          original_question_text: original.question_text,
          corrected_question_text: corrected.question_text,
          original_co: original.co,
          corrected_co: corrected.co,
          original_l: original.level,
          corrected_l: corrected.l,
          original_marks: original.marks,
          corrected_marks: corrected.marks,
          remarks: corrected.remarks || '',
          corrected_at: new Date()
        };
      }),
      verifier_remarks: verifier_remarks || '',
      verified_by,
      status: 'corrected'
    });

    await correctedRecord.save();

    return res.json({ 
      message: 'Corrected questions saved successfully',
      correctedRecord 
    });
  } catch (err) {
    console.error('Save corrected questions error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Approve corrected questions and move to approved collection
exports.approveCorrectedQuestions = async (req, res) => {
  try {
    const { subject_code, semester } = req.params;
    const { corrected_questions, verifier_remarks, verified_by } = req.body;

    console.log('Approve corrected questions called with:', { subject_code, semester, verified_by });
    console.log('Corrected questions count:', corrected_questions?.length);

    if (!subject_code || !semester || !corrected_questions || !verified_by) {
      console.error('Missing required fields:', { subject_code, semester, corrected_questions: !!corrected_questions, verified_by });
      return res.status(400).json({ error: 'subject_code, semester, corrected_questions, and verified_by are required' });
    }

    // Validate corrected_questions structure
    if (!Array.isArray(corrected_questions) || corrected_questions.length === 0) {
      console.error('Invalid corrected_questions:', corrected_questions);
      return res.status(400).json({ error: 'corrected_questions must be a non-empty array' });
    }

    // Validate each question has required fields
    for (const question of corrected_questions) {
      if (!question.question_number || !question.question_text) {
        console.error('Invalid question structure:', question);
        return res.status(400).json({ error: 'Each question must have question_number and question_text' });
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Save corrected questions
      console.log('Creating VerifierCorrectedQuestions record...');
      const correctedRecord = new VerifierCorrectedQuestions({
        subject_code,
        semester: parseInt(semester),
        corrected_questions: corrected_questions.map(q => ({
          question_number: q.question_number,
          corrected_question_text: q.question_text,
          corrected_co: q.co,
          corrected_l: q.l,
          corrected_marks: q.marks,
          remarks: q.remarks || '',
          corrected_at: new Date()
        })),
        verifier_remarks: verifier_remarks || '',
        verified_by,
        status: 'approved'
      });

      console.log('Saving VerifierCorrectedQuestions record...');
      await correctedRecord.save({ session });
      console.log('Successfully saved VerifierCorrectedQuestions record');

      // Update original questions with corrections
      console.log('Updating original QuestionPaper records...');
      for (const corrected of corrected_questions) {
        console.log(`Updating question ${corrected.question_number}...`);
        const updateResult = await QuestionPaper.findOneAndUpdate(
          { 
            subject_code, 
            semester: parseInt(semester), 
            question_number: corrected.question_number 
          },
          {
            $set: {
              question_text: corrected.question_text,
              co: corrected.co,
              level: corrected.l,
              marks: corrected.marks,
              remarks: corrected.remarks || '',
              status: 'approved',
              verified_by,
              verified_at: new Date()
            }
          },
          { session }
        );
        console.log(`Updated question ${corrected.question_number}:`, !!updateResult);
      }
      console.log('Successfully updated all QuestionPaper records');

      // Get paper details from the first question to get subject_name and department
      const firstQuestion = await QuestionPaper.findOne({ 
        subject_code, 
        semester: parseInt(semester) 
      }).lean();
      
      const subject_name = firstQuestion?.subject_name || '';
      const department = firstQuestion?.department || '';

      console.log('Paper details found:', { subject_name, department });
      console.log('Corrected questions structure:', corrected_questions.map(q => ({
        question_number: q.question_number,
        has_question_text: !!q.question_text,
        has_marks: !!q.marks,
        has_co: !!q.co,
        has_l: !!q.l
      })));

      // Create approved paper records for each question
      const approvedPapers = corrected_questions.map(question => {
        console.log('Creating ApprovedPaper for question:', question.question_number);
        return new ApprovedPaper({
          subject_code,
          subject_name,
          semester: parseInt(semester),
          department,
          question_number: question.question_number,
          question_text: question.question_text,
          marks: question.marks,
          co: question.co,
          level: question.l,
          remarks: question.remarks || '',
          verified_by,
          verified_at: new Date(),
          approved_at: new Date()
        });
      });

      console.log('Attempting to insert approved papers:', approvedPapers.length);
      await ApprovedPaper.insertMany(approvedPapers, { session });
      console.log('Successfully inserted approved papers');

      await session.commitTransaction();
      session.endSession();

      console.log('Successfully approved and saved corrected questions');
      return res.json({ 
        message: 'Corrected questions approved and saved successfully',
        approvedPapers: approvedPapers.length
      });
    } catch (error) {
      console.error('Transaction error:', error);
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error('Approve corrected questions error:', err);
    console.error('Error details:', err.message);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({ 
      error: 'Server error',
      details: err.message 
    });
  }
};

// Get corrected questions for a paper
exports.getCorrectedQuestions = async (req, res) => {
  try {
    const { subject_code, semester } = req.params;

    const corrected = await VerifierCorrectedQuestions.findOne({
      subject_code,
      semester: parseInt(semester)
    }).lean();

    if (!corrected) {
      return res.status(404).json({ error: 'Corrected questions not found' });
    }

    return res.json(corrected);
  } catch (err) {
    console.error('Get corrected questions error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Reject a paper and store in RejectedPaper collection
exports.rejectPaper = async (req, res) => {
  try {
    const { subject_code, semester } = req.params;
    const { remarks, verified_by } = req.body;

    if (!subject_code || !semester) {
      return res.status(400).json({ error: 'subject_code and semester are required' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find all questions for this paper
      const questions = await QuestionPaper.find({ 
        subject_code, 
        semester: parseInt(semester) 
      }).lean();

      if (!questions || questions.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Paper not found' });
      }

      // Create rejected paper records for each question
      const rejectedPapers = questions.map(question => {
        return new RejectedPaper({
          question_ref: question._id,
          subject_code: question.subject_code,
          subject_name: question.subject_name,
          semester: question.semester,
          department: question.department,
          question_number: question.question_number,
          question_text: question.question_text,
          marks: question.marks,
          co: question.co,
          level: question.level,
          file_name: question.file_name,
          file_type: question.file_type,
          remarks: remarks || '',
          verified_by: verified_by || '',
          verified_at: new Date(),
          rejected_at: new Date()
        });
      });

      // Insert all rejected papers
      await RejectedPaper.insertMany(rejectedPapers, { session });

      // Update original questions status to rejected
      await QuestionPaper.updateMany(
        { subject_code, semester: parseInt(semester) },
        { 
          $set: { 
            status: 'rejected',
            remarks: remarks || '',
            verified_by: verified_by || '',
            verified_at: new Date()
          } 
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return res.json({ 
        message: 'Paper rejected and stored successfully',
        rejectedCount: rejectedPapers.length
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error('Reject paper error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Normalize all Verifier.department values to match active Department names exactly
// - Case-insensitive matching against active department names
// - Only updates when a canonical match is found and value differs by case/spacing
// - Returns a summary of updates
exports.normalizeDepartments = async (_req, res) => {
  try {
    const activeDepts = await Department.find({ isActive: true }).select('name').lean();
    const canonicalByLower = new Map(activeDepts.map(d => [String(d.name).toLowerCase().trim(), d.name]));

    const verifiers = await Verifier.find({}).select('_id department').lean();

    const bulkOps = [];
    let matched = 0;
    let alreadyCanonical = 0;
    let skipped = 0;

    for (const v of verifiers) {
      const current = (v.department || '').trim();
      const key = current.toLowerCase();
      const canonical = canonicalByLower.get(key);
      if (!canonical) {
        skipped++;
        continue;
      }
      if (current === canonical) {
        alreadyCanonical++;
        continue;
      }
      matched++;
      bulkOps.push({
        updateOne: {
          filter: { _id: v._id },
          update: { $set: { department: canonical } },
        }
      });
    }

    let modifiedCount = 0;
    if (bulkOps.length > 0) {
      const result = await Verifier.bulkWrite(bulkOps);
      modifiedCount = result.modifiedCount || 0;
    }

    return res.json({
      totalVerifiers: verifiers.length,
      activeDepartments: activeDepts.length,
      updatesPlanned: matched,
      updated: modifiedCount,
      alreadyCanonical,
      skippedNoMatch: skipped,
    });
  } catch (err) {
    console.error('Verifier normalizeDepartments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
// Get faculties by department with verifier status for verifier management
exports.getFacultiesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    if (!department) {
      return res.status(400).json({ error: 'Department is required' });
    }

    const faculties = await Faculty.find({
      department,
      isActive: true
    })
    .select('name email type verifierExpiresAt assignedSubjects')
    .sort({ name: 1 })
    .lean();

    res.json(faculties);
  } catch (err) {
    console.error('Error fetching faculties by department:', err);
    res.status(500).json({ error: 'Failed to fetch faculties' });
  }
};

// Assign temporary verifier role to a faculty
exports.assignTemporaryVerifier = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { expiresIn } = req.body; // duration in milliseconds

    if (!facultyId) {
      return res.status(400).json({ error: 'Faculty ID is required' });
    }

    // Default to 8 hours if not specified
    const duration = expiresIn || (8 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + duration);

    const faculty = await Faculty.findByIdAndUpdate(
      facultyId,
      { verifierExpiresAt: expiresAt },
      { new: true }
    );

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    // Check if user account exists for this faculty
    let userAccount = await User.findOne({ email: faculty.email });
    let username;

    // Always generate a new password for temporary verifiers
    const password = generateRandomAlphanumeric(8);

    if (!userAccount) {
      // Create a new user account for the faculty
      const randomSuffix = generateRandomAlphanumeric(4);
      username = `${faculty.name.replace(/\s+/g, '').toLowerCase()}_${randomSuffix}`;

      // Get department info
      const department = await Department.findById(faculty.department);

      userAccount = await User.create({
        name: faculty.name,
        username,
        clgName: faculty.college || 'GAT',
        deptName: department?.name || faculty.department,
        department: faculty.department,
        email: faculty.email,
        phoneNo: faculty.phoneNo || '',
        password,
        usertype: faculty.type,
        role: 'Verifier',
      });
      console.log('Created new user account for temporary verifier:', username, 'with password:', password);
    } else {
      // Update existing user to Verifier role and set new password
      await User.findByIdAndUpdate(userAccount._id, { role: 'Verifier', password });
      // Use existing username
      username = userAccount.username;
      console.log('Updated existing user account for temporary verifier:', username, 'with new password:', password);
    }

    // Check if Verifier document already exists for this user
    let existingVerifier = await Verifier.findOne({ username });
    if (!existingVerifier) {
      // Create the Verifier document if it doesn't exist
      console.log('Creating Verifier document for:', username, 'department:', faculty.department);
      await Verifier.create({
        verifierId: userAccount._id,
        verifierName: faculty.name,
        username,
        passwordHash: password,
        department: faculty.department,
        email: faculty.email,
        role: 'verifier',
      });
      console.log('Verifier document created successfully');
    } else {
      console.log('Verifier document already exists for:', username);
    }

    // Get verifier details from the request to include in email
    const verifierDepartment = req.user?.department || 'BOE Department';

    // Send formal email notification to the assigned faculty
    const emailSubject = 'Assignment Notification: Temporary Verifier Role for Question Paper Review';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin: 0 0 10px 0;">Board of Examiners (BOE)</h2>
          <h3 style="color: #34495e; margin: 0;">GAT - Question Paper Review System</h3>
        </div>

        <div style="margin: 20px 0;">
          <p>Dear <strong>${faculty.name}</strong>,</p>

          <p>This is a formal notification from the <strong>Board of Examiners (BOE)</strong> regarding your assignment to the temporary verifier role.</p>

          <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
            <h4 style="color: #2c3e50; margin: 0 0 10px 0;">Assignment Details:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Role:</strong> Temporary Verifier</li>
              <li><strong>Department:</strong> ${verifierDepartment}</li>
              <li><strong>Assignment Duration:</strong> ${Math.floor(duration / (1000 * 60 * 60))} hours</li>
              <li><strong>Expires On:</strong> ${expiresAt.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</li>
            </ul>
          </div>

          <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">Login Credentials:</h4>
            <p style="margin: 0; color: #155724;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 5px 0 0 0; color: #155724;"><strong>Password:</strong> ${password}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #155724;">Please keep these credentials secure and do not share them with others.</p>
          </div>

          <p>As a temporary verifier, you are authorized to review and verify question papers submitted for your department. This role provides you with temporary access to the verification system for the specified duration.</p>

          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Important Notes:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li>Your verifier privileges will automatically expire after the specified duration</li>
              <li>Your login access will be disabled after the expiry time</li>
              <li>Please ensure all assigned papers are reviewed within the given timeframe</li>
              <li>Contact your department coordinator if you encounter any issues</li>
            </ul>
          </div>

          <p>Thank you for your cooperation and commitment to maintaining the quality of our academic assessments.</p>

          <p>Best regards,<br>
          <strong>Board of Examiners (BOE)</strong><br>
          GAT - Question Paper Review System<br>
          Academic Administration</p>
        </div>

        <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #6c757d;">
          <p>This is an automated notification from the Question Paper Review System. Please do not reply to this email.</p>
          <p>For any inquiries, please contact your department administrator.</p>
        </div>
      </div>
    `;

    // Send email asynchronously (don't block the response)
    sendEmail(faculty.email, emailSubject, '', emailHtml).catch(err => {
      console.error('Failed to send assignment email:', err);
      // Don't fail the assignment if email fails
    });

    res.json({
      message: 'Verifier role assigned successfully',
      faculty: {
        _id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        verifierExpiresAt: faculty.verifierExpiresAt
      }
    });
  } catch (err) {
    console.error('Error assigning temporary verifier:', err);
    res.status(500).json({ error: 'Failed to assign verifier role' });
  }
};

// Remove temporary verifier role from a faculty
exports.removeTemporaryVerifier = async (req, res) => {
  try {
    const { facultyId } = req.params;

    if (!facultyId) {
      return res.status(400).json({ error: 'Faculty ID is required' });
    }

    const faculty = await Faculty.findByIdAndUpdate(
      facultyId,
      { $unset: { verifierExpiresAt: 1 } },
      { new: true }
    );

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    res.json({
      message: 'Verifier role removed successfully',
      faculty: {
        _id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        verifierExpiresAt: null
      }
    });
  } catch (err) {
    console.error('Error removing temporary verifier:', err);
    res.status(500).json({ error: 'Failed to remove verifier role' });
  }
};

// Clean up expired verifier roles (can be called periodically)
exports.cleanupExpiredVerifiers = async () => {
  try {
    const result = await Faculty.updateMany(
      {
        verifierExpiresAt: { $lt: new Date() },
        verifierExpiresAt: { $ne: null }
      },
      { $unset: { verifierExpiresAt: 1 } }
    );

    console.log(`Cleaned up ${result.modifiedCount} expired verifier roles`);
    return result;
  } catch (err) {
    console.error('Error cleaning up expired verifiers:', err);
  }
};

// Cleanup expired user accounts (disable login for expired verifiers)
// This function disables user accounts that have expired verifier roles
exports.cleanupExpiredUserAccounts = async () => {
  try {
    // Find all users with expired verifier roles
    const expiredFaculties = await Faculty.find({
      verifierExpiresAt: { $lt: new Date(), $ne: null }
    }).select('_id email');

    if (expiredFaculties.length > 0) {
      const emails = expiredFaculties.map(f => f.email);

      // Disable user accounts by setting a flag or changing password
      // Since we can't delete passwords easily, we'll set them to a disabled state
      const result = await User.updateMany(
        { email: { $in: emails }, role: 'Verifier' }, // Changed from 'Faculty' to 'Verifier' for temporary verifiers
        {
          $set: {
            password: 'EXPIRED_' + generateRandomAlphanumeric(16),
            role: 'Faculty' // Revert back to Faculty role after expiry
          }
        }
      );

      console.log(`Disabled ${result.modifiedCount} expired verifier user accounts`);
    }

    return expiredFaculties.length;
  } catch (err) {
    console.error('Error cleaning up expired user accounts:', err);
  }
};

// Assign subject to faculty
exports.assignSubjectToFaculty = async (req, res) => {
  try {
    let { subjectCode, facultyId, department } = req.body;

    subjectCode = String(subjectCode || '').trim();
    department = String(department || '').trim();

    if (!subjectCode || !facultyId || !department) {
      return res.status(400).json({ error: 'subjectCode, facultyId, and department are required' });
    }

    // Check if facultyId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      return res.status(400).json({ error: 'Invalid faculty ID format' });
    }

    // Verify the faculty belongs to this department (case insensitive)
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    if (String(faculty.department || '').toLowerCase().trim() !== department.toLowerCase()) {
      return res.status(403).json({ error: 'Faculty does not belong to this department' });
    }

    // Check if faculty already has this subject assigned (case sensitive, trimmed)
    if (Array.isArray(faculty.assignedSubjects) && faculty.assignedSubjects.some(s => String(s || '').trim() === subjectCode)) {
      return res.status(400).json({ error: 'Subject already assigned to this faculty' });
    }

    // Check if faculty has reached the maximum limit of 2 papers
    const currentAssignments = Array.isArray(faculty.assignedSubjects) ? faculty.assignedSubjects.length : 0;
    if (currentAssignments >= 2) {
      return res.status(400).json({
        error: 'Faculty has reached the maximum limit of 2 papers',
        details: 'A faculty cannot be assigned more than 2 papers'
      });
    }

    // Add subject to faculty's assigned subjects
    const updatedFaculty = await Faculty.findByIdAndUpdate(
      facultyId,
      { $addToSet: { assignedSubjects: subjectCode } },
      { new: true }
    );

    res.json({
      message: 'Subject assigned successfully',
      faculty: updatedFaculty
    });
  } catch (err) {
    console.error('Error assigning subject to faculty:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove subject assignment from faculty
exports.removeSubjectFromFaculty = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    let { subjectCode, facultyId, department } = req.body;
    console.log('removeSubjectFromFaculty called with:', { subjectCode, facultyId, department });

    // Trim and validate inputs
    subjectCode = String(subjectCode || '').trim();
    department = String(department || '').trim();

    if (!subjectCode || !facultyId || !department) {
      console.error('Missing required fields:', { subjectCode: !!subjectCode, facultyId: !!facultyId, department: !!department });
      return res.status(400).json({ error: 'subjectCode, facultyId, and department are required' });
    }

    // Check if facultyId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      console.error('Invalid facultyId format:', facultyId);
      return res.status(400).json({ error: 'Invalid faculty ID format' });
    }

    // Get the faculty document with all required fields
    const faculty = await Faculty.findById(facultyId).session(session);
    if (!faculty) {
      console.error('Faculty not found with ID:', facultyId);
      return res.status(404).json({ error: 'Faculty not found' });
    }

    // Verify department
    if (String(faculty.department || '').toLowerCase().trim() !== department.toLowerCase()) {
      console.error('Faculty department mismatch:', { facultyDept: faculty.department, requestedDept: department });
      return res.status(403).json({ error: 'Faculty does not belong to this department' });
    }

    // Check if subject is actually assigned
    if (!Array.isArray(faculty.assignedSubjects) || !faculty.assignedSubjects.some(s => String(s || '').trim() === subjectCode)) {
      console.error('Subject not assigned to faculty:', { subjectCode, facultyId, assignedSubjects: faculty.assignedSubjects });
      return res.status(400).json({ error: 'Subject is not assigned to this faculty' });
    }

    // Remove the subject from the array
    faculty.assignedSubjects = faculty.assignedSubjects
      .map(s => String(s || '').trim())
      .filter(s => s !== subjectCode);

    // Save the document with all required fields preserved
    const updatedFaculty = await faculty.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('Subject removed successfully:', { subjectCode, facultyId, remainingSubjects: updatedFaculty.assignedSubjects });

    res.json({
      message: 'Subject assignment removed successfully',
      faculty: updatedFaculty
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error('=== ERROR in removeSubjectFromFaculty ===');
    console.error('Error removing subject assignment:', err);
    
    if (err.name === 'ValidationError') {
      console.error('Validation Error Details:', err.errors);
      return res.status(400).json({
        error: 'Validation Error',
        details: Object.values(err.errors).map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Failed to remove subject assignment',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// Run cleanup every 30 minutes
setInterval(() => {
  exports.cleanupExpiredVerifiers();
  exports.cleanupExpiredUserAccounts();
}, 30 * 60 * 1000);
