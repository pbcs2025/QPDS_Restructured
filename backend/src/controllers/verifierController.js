const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Verifier = require('../models/Verifier');

const QuestionPaper = require('../models/QuestionPaper');
const ApprovedPaper = require('../models/ApprovedPaper');
const RejectedPaper = require('../models/RejectedPaper');

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

    const user = await User.findOne({ username, password, role: 'Verifier' }).lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const verifier = await Verifier.findOne({ username }).lean();
    return res.json({ success: true, verifier });
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

/// ... existing imports above
exports.removeOne = async (req, res) => {
  try {
    const { verifierId } = req.params;
    if (!verifierId) {
      return res.status(400).json({ error: 'verifierId is required' });
    }

    
    // Get question papers with filters
    const papers = await QuestionPaper.find(filter).sort({ subject_code: 1, semester: 1, question_number: 1 }).lean();
    
    // Group papers by subject_code and semester
    const groupedPapers = {};
    papers.forEach(paper => {
      const key = `${paper.subject_code}_${paper.semester}`;
      if (!groupedPapers[key]) {
        groupedPapers[key] = {
          _id: `${paper.subject_code}_${paper.semester}`, // Use composite key as ID
          subject_code: paper.subject_code,
          subject_name: paper.subject_name,
          semester: paper.semester,
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
        file_name: paper.file_name,
        file_type: paper.file_type,
        file_url: paper.file_name ? `/question-bank/file/${paper._id}` : null
      });
      
      // Update overall status based on individual question status
      if (paper.status === 'approved') {
        groupedPapers[key].status = 'approved';
      } else if (paper.status === 'rejected') {
        groupedPapers[key].status = 'rejected';
      }
    });
    
    const result = Object.values(groupedPapers);
    return res.json(result);
  } catch (err) {
    console.error('Verifier getPapers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get rejected papers for verifier with optional filtering
exports.getRejectedPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;
    
    // Build filter object
    const filter = {};
    if (department) {
      filter.department = department;
    }
    if (semester) {
      filter.semester = parseInt(semester);
    }
    
    // Get rejected papers
    const rejectedPapers = await RejectedPaper.find(filter)
      .sort({ rejected_at: -1 })
      .lean();
    
    // Get detailed information for each rejected paper
    const detailedPapers = await Promise.all(
      rejectedPapers.map(async (rejectedPaper) => {
        // Get one question paper to get subject details
        const samplePaper = await QuestionPaper.findOne({
          subject_code: rejectedPaper.subject_code,
          semester: rejectedPaper.semester
        }).lean();
        
        return {
          _id: rejectedPaper._id,
          subject_code: rejectedPaper.subject_code,
          subject_name: samplePaper?.subject_name || 'Unknown',
          semester: rejectedPaper.semester,
          department: samplePaper?.department || 'Unknown',
          rejected_at: rejectedPaper.rejected_at,
          status: 'rejected'
        };
      })
    );
    
    return res.json(detailedPapers);
  } catch (err) {
    console.error('Get rejected papers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get papers for verifier with optional filtering
exports.getPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;
    
    // Build filter object
    const filter = {};
    if (department) {
      filter.department = department;
    }
    if (semester) {
      filter.semester = parseInt(semester);
    }
    
    // Get papers that need verification (not yet approved or rejected)
    // First, get all rejected paper subject_code and semester combinations
    const rejectedPaperKeys = await RejectedPaper.find({}, { subject_code: 1, semester: 1 }).lean();
    const rejectedKeys = rejectedPaperKeys.map(rp => `${rp.subject_code}_${rp.semester}`);
    
    // Get all question papers that are not in rejected papers
    const allPapers = await QuestionPaper.find({
      ...filter,
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: 'pending' }
      ]
    }).sort({ subject_code: 1, semester: 1, question_number: 1 });
    
    // Filter out papers that are in rejected collection
    const papers = allPapers.filter(paper => {
      const key = `${paper.subject_code}_${paper.semester}`;
      return !rejectedKeys.includes(key);
    });
    
    // Group papers by subject_code and semester
    const groupedPapers = {};
    papers.forEach(paper => {
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
        file_url: paper.file_url,
        file_name: paper.file_name
      });
    });
    
    // Convert to array and sort by subject_code
    const result = Object.values(groupedPapers).sort((a, b) => 
      a.subject_code.localeCompare(b.subject_code)
    );
    
    return res.json(result);
  } catch (err) {
    console.error('Get papers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updatePaper = async (req, res) => {
  try {
    const { subject_code, semester } = req.params;
    const { questions, finalStatus } = req.body;
    
    console.log('UpdatePaper called with:', { subject_code, semester, finalStatus, questionsCount: questions?.length });
    
    if (!questions || !Array.isArray(questions)) {
      console.log('Error: Questions array is required');
      return res.status(400).json({ error: 'Questions array is required' });
    }

    if (!subject_code || !semester) {
      console.log('Error: Subject code and semester are required');
      return res.status(400).json({ error: 'Subject code and semester are required' });
    }
    
    // Update each question in the paper with final status
    const updatePromises = questions.map(async (question) => {
      const updateData = {
        verified_at: new Date(),
        status: finalStatus || 'pending'
      };
      
      // Update question content if provided
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
      
      // Set approval status based on final status
      if (finalStatus === 'approved') {
        updateData.approved = true;
      } else if (finalStatus === 'rejected') {
        updateData.approved = false;
      }
      
      const updated = await QuestionPaper.findOneAndUpdate(
        { 
          subject_code: subject_code,
          semester: parseInt(semester),
          question_number: question.question_number 
        },
        updateData,
        { new: true }
      );

      return updated;
    });
    
    await Promise.all(updatePromises);

    // Handle final status - move to appropriate collection
    if (finalStatus === 'approved') {
      // Remove from rejected papers if it exists there
      await RejectedPaper.deleteOne({ subject_code, semester: parseInt(semester) });
      
      // Add to approved papers
      await ApprovedPaper.updateOne(
        { subject_code, semester: parseInt(semester) },
        { $set: { subject_code, semester: parseInt(semester), approved_at: new Date() } },
        { upsert: true }
      );
      console.log('[ApprovedPaper] upserted for', subject_code, semester);
    } else if (finalStatus === 'rejected') {
      // Remove from approved papers if it exists there
      await ApprovedPaper.deleteOne({ subject_code, semester: parseInt(semester) });
      
      // Add to rejected papers
      await RejectedPaper.updateOne(
        { subject_code, semester: parseInt(semester) },
        { $set: { subject_code, semester: parseInt(semester), rejected_at: new Date() } },
        { upsert: true }
      );
      console.log('[RejectedPaper] upserted for', subject_code, semester);
    }
    
    console.log('Paper updated successfully:', { subject_code, semester, finalStatus });
    return res.json({ message: 'Paper updated successfully', finalStatus: finalStatus || null });

  } catch (err) {
    console.error('Update paper error:', err);
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
// Diagnostics: list approved papers
exports.listApprovedPapers = async (_req, res) => {
  try {
    const rows = await ApprovedPaper.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Verifier listApprovedPapers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Diagnostics: list rejected papers
exports.listRejectedPapers = async (_req, res) => {
  try {
    const rows = await RejectedPaper.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Verifier listRejectedPapers error:', err);
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



