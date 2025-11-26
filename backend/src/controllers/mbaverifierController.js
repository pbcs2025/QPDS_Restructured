// backend/src/controllers/mbaverifierController.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const MBAVerifier = require('../models/MBAVerifier');
const QuestionPaper = require('../models/QuestionPaper');
const ApprovedPaper = require('../models/ApprovedPaper');
const RejectedPaper = require('../models/RejectedPaper');
const VerifierCorrectedQuestions = require('../models/VerifierCorrectedQuestions');
const MBADepartment = require('../models/mbaDepartment');
const sendEmail = require('../utils/mailer');
const jwt = require('jsonwebtoken');

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

/**
 * MBA Verifier Login - Direct login with JWT token (No email verification)
 * POST /api/mbaverifier/login
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    // Check user collection for authentication
    const user = await User.findOne({ username, password, role: 'MBAVerifier' }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Get verifier details
    const verifier = await MBAVerifier.findOne({ username }).lean();
    if (!verifier) {
      return res.status(401).json({ success: false, message: 'MBA Verifier account not found' });
    }

    // 🔥 GENERATE JWT TOKEN DIRECTLY
    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email || verifier.email,
        role: user.role,
        usertype: user.usertype || 'admin',
        name: user.name || verifier.verifierName,
        department: verifier.department || user.deptName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 🔥 LOG LOGIN ACTIVITY
    const { logLogin } = require('../middleware/activityLogger');
    await logLogin({
      id: user._id.toString(),
      username: user.username,
      name: user.name || verifier.verifierName || username,
      role: user.role,
      usertype: user.usertype || 'admin'
    }, req);

    // Return verifier data with TOKEN
    return res.json({
      success: true,
      message: 'Login successful',
      token: token,
      verifierData: {
        id: verifier._id,
        verifierId: verifier.verifierId,
        name: verifier.verifierName || user.name,
        username: verifier.username,
        email: verifier.email || user.email,
        department: verifier.department || user.deptName,
        role: verifier.role
      }
    });
  } catch (err) {
    console.error('MBA Verifier login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Verify verifier login code - DEPRECATED (Not needed anymore)
 * POST /api/mbaverifier/verify
 */
exports.verify = async (req, res) => {
  return res.status(410).json({ 
    success: false, 
    message: 'This endpoint is deprecated. Use /api/mbaverifier/login directly to get token.' 
  });
};

/**
 * MBA Verifier Logout - log activity
 * POST /api/mbaverifier/logout
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const username = req.user?.username;
    const role = req.user?.role;
    const name = req.user?.name;

    console.log(`MBA Verifier logout: ${username} (${userId}) - Role: ${role}`);

    // Update MBA Verifier collection with last logout time
    if (userId) {
      await MBAVerifier.findOneAndUpdate(
        { verifierId: userId },
        { lastLogout: new Date() }
      );
    }

    // 🔥 LOG THE LOGOUT ACTIVITY (this will emit to Socket.io)
    const { logLogout } = require('../middleware/activityLogger');
    await logLogout(req);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('MBA Verifier logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

/**
 * Forgot MBA verifier password
 * POST /api/mbaverifier/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await User.findOne({ username, role: 'MBAVerifier' }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'MBA Verifier account not found' });
    }

    const verifier = await MBAVerifier.findOne({ username }).lean();
    if (!verifier) {
      return res.status(401).json({ success: false, message: 'MBA Verifier profile not found' });
    }

    // Get email address
    const emailAddress = verifier.email || user.email;
    
    if (!emailAddress || !emailAddress.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid email address found for this account' 
      });
    }

    try {
      await sendEmail(
        emailAddress,
        'GAT Portal - MBA Verifier Password Recovery',
        '',
        `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2c3e50;">Password Recovery</h2>
            <p>Hello ${verifier.verifierName || username},</p>
            <p>Your temporary password is:</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h2 style="color: #dc3545; margin: 0;">${user.password}</h2>
            </div>
            <p style="color: #dc3545;">⚠️ Important: Please login and change your password immediately for security reasons.</p>
            <p>If you have any questions, contact the examination cell at support@gat.ac.in.</p>
            <br>
            <p>Best regards,<br>Examination Cell<br>Global Academy of Technology</p>
          </body>
          </html>
        `
      );
    } catch (err) {
      console.error('Email error:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send email' 
      });
    }

    res.json({
      success: true,
      message: 'Password sent to your email'
    });
  } catch (err) {
    console.error('MBA Verifier forgot-password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Reset MBA verifier password
 * POST /api/mbaverifier/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify in users collection
    const user = await User.findOne({ username, password: oldPassword, role: 'MBAVerifier' });
    if (!user) {
      return res.status(401).json({ error: 'Old password is incorrect or not an MBA verifier' });
    }

    // Update password in both collections
    user.password = newPassword;
    await user.save();

    await MBAVerifier.findOneAndUpdate(
      { username },
      { passwordHash: newPassword }
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    console.error('MBA Verifier password update error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

/**
 * Register new MBA verifier
 * POST /api/mbaverifier/register
 */
exports.register = async (req, res) => {
  try {
    const { department, email, verifierName } = req.body;
    if (!department) return res.status(400).json({ error: 'department is required' });

    // Canonicalize department to match active MBADepartment names
    const active = await MBADepartment.find({ isActive: true }).select('name').lean();
    const byLower = new Map(active.map(d => [String(d.name).toLowerCase().trim(), d.name]));
    const canonicalDept = byLower.get(String(department).toLowerCase().trim());
    if (!canonicalDept) {
      return res.status(400).json({ error: 'Invalid department. Choose from active MBA departments.' });
    }

    // Build department abbreviation from uppercase letters
    const abbrMatch = String(canonicalDept).match(/[A-Z]/g) || [];
    const deptAbbr = abbrMatch.join('') || canonicalDept.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

    // Count how many verifiers already exist for this department
    const countForDept = await MBAVerifier.countDocuments({ department: canonicalDept });
    const nextId = countForDept + 1;
    const usernameBase = `MBA${deptAbbr}Adminid${nextId}`;

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
      role: 'MBAVerifier',
    });

    await MBAVerifier.create({
      verifierId: user._id,
      verifierName: verifierName && String(verifierName).trim() ? String(verifierName).trim() : undefined,
      username,
      passwordHash: password,
      department: canonicalDept,
      email: email || '',
      role: 'mba-verifier',
    });

    return res.status(201).json({ message: 'MBA Verifier created', credentials: { username, password } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Username already exists, please retry' });
    }
    console.error('MBA Verifier register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get MBA verifier by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const verifier = await MBAVerifier.findById(id).lean();
    if (!verifier) return res.status(404).json({ error: 'MBA Verifier not found' });
    return res.json(verifier);
  } catch (err) {
    console.error('MBA Verifier getById error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// List all MBA verifiers
exports.listAll = async (_req, res) => {
  try {
    const rows = await MBAVerifier.find({}).sort({ department: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('MBA Verifier listAll error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get rejected papers for MBA verifier with optional filtering
exports.getRejectedPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;

    const filter = {};
    if (department) filter.department = department;
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

// Get approved papers for MBA verifier with optional filtering
exports.getApprovedPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;

    const filter = {};
    if (department) filter.department = department;
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

// Get papers for MBA verifier - DISPLAY ALL PAPERS WITHOUT FILTERING
exports.getPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;
    console.log('MBA Verifier getPapers called with:', { department, semester });
    console.log('⚠️  FILTERING DISABLED - SHOWING ALL PAPERS');

    // REMOVE ALL FILTERING - SHOW ALL PAPERS
    const filter = {};
    console.log('No filter applied - showing all papers');

    // Exclude papers already stored in rejected
    const rejectedPaperKeys = await RejectedPaper.find({}, { subject_code: 1, semester: 1 }).lean();
    const rejectedKeys = new Set(rejectedPaperKeys.map(rp => `${rp.subject_code}_${rp.semester}`));

    // GET ALL PAPERS - NO FILTERING
    const allPapers = await QuestionPaper.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: 'pending' },
        { status: 'submitted' }
      ]
    }).sort({ subject_code: 1, semester: 1, question_number: 1 }).lean();
    
    console.log('📋 TOTAL PAPERS FOUND:', allPapers.length);

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

    let result = Object.values(groupedPapers);
    result = result.sort((a, b) => a.subject_code.localeCompare(b.subject_code));
    
    console.log('🎯 FINAL RESULT - ALL PAPERS:', result.length, 'grouped papers');
    return res.json(result);
  } catch (err) {
    console.error('Get papers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Remove one MBA verifier
exports.removeOne = async (req, res) => {
  try {
    const { verifierId } = req.params;
    if (!verifierId) {
      return res.status(400).json({ error: 'verifierId is required' });
    }

    let verifier = null;
    if (mongoose.Types.ObjectId.isValid(verifierId)) {
      verifier = await MBAVerifier.findOne({
        $or: [
          { _id: new mongoose.Types.ObjectId(verifierId) },
          { verifierId: new mongoose.Types.ObjectId(verifierId) },
        ],
      }).lean();
    }
    if (!verifier) {
      verifier = await MBAVerifier.findOne({ verifierId }).lean();
    }

    if (!verifier) {
      return res.status(404).json({ error: 'MBA Verifier not found' });
    }

    await MBAVerifier.deleteOne({ _id: verifier._id });

    if (verifier.verifierId) {
      const linkedId = mongoose.Types.ObjectId.isValid(verifier.verifierId)
        ? new mongoose.Types.ObjectId(verifier.verifierId)
        : verifier.verifierId;
      await User.deleteOne({ _id: linkedId });
    }

    return res.json({ success: true, message: 'MBA Verifier and linked user deleted successfully.' });
  } catch (err) {
    console.error('MBA Verifier removeOne error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Update paper
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
    console.error('MBA Verifier updatePaper error:', err);
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
    console.error('MBA Verifier getPaperByCodeSemester error:', err);
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
    console.error('MBA Verifier listApprovedPapers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Diagnostics: list rejected papers
exports.listRejectedPapers = async (_req, res) => {
  try {
    const rows = await RejectedPaper.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return res.json(rows);
  } catch (err) {
    console.error('MBA Verifier listRejectedPapers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Save corrected questions by MBA verifier
exports.saveCorrectedQuestions = async (req, res) => {
  try {
    const { subject_code, semester } = req.params;
    const { corrected_questions, verifier_remarks, verified_by } = req.body;

    if (!subject_code || !semester || !corrected_questions || !verified_by) {
      return res.status(400).json({ error: 'subject_code, semester, corrected_questions, and verified_by are required' });
    }

    const originalQuestions = await QuestionPaper.find({ 
      subject_code, 
      semester: parseInt(semester) 
    }).sort({ question_number: 1 }).lean();

    if (!originalQuestions || originalQuestions.length === 0) {
      return res.status(404).json({ error: 'Original questions not found' });
    }

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

    if (!Array.isArray(corrected_questions) || corrected_questions.length === 0) {
      console.error('Invalid corrected_questions:', corrected_questions);
      return res.status(400).json({ error: 'corrected_questions must be a non-empty array' });
    }

    for (const question of corrected_questions) {
      if (!question.question_number || !question.question_text) {
        console.error('Invalid question structure:', question);
        return res.status(400).json({ error: 'Each question must have question_number and question_text' });
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
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

      const firstQuestion = await QuestionPaper.findOne({ 
        subject_code, 
        semester: parseInt(semester) 
      }).lean();
      
      const subject_name = firstQuestion?.subject_name || '';
      const department = firstQuestion?.department || '';

      console.log('Paper details found:', { subject_name, department });

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
      const questions = await QuestionPaper.find({ 
        subject_code, 
        semester: parseInt(semester) 
      }).lean();

      if (!questions || questions.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Paper not found' });
      }

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

      await RejectedPaper.insertMany(rejectedPapers, { session });

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

// Normalize all MBAVerifier.department values to match active MBADepartment names exactly
exports.normalizeDepartments = async (_req, res) => {
  try {
    const activeDepts = await MBADepartment.find({ isActive: true }).select('name').lean();
    const canonicalByLower = new Map(activeDepts.map(d => [String(d.name).toLowerCase().trim(), d.name]));

    const verifiers = await MBAVerifier.find({}).select('_id department').lean();

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
      const result = await MBAVerifier.bulkWrite(bulkOps);
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
    console.error('MBA Verifier normalizeDepartments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Danger: delete all MBA verifiers and associated verifier users
exports.deleteAll = async (_req, res) => {
  try {
    const verifiers = await MBAVerifier.find({}).select('verifierId').lean();
    const userIds = verifiers.map(v => v.verifierId).filter(Boolean);

    const delVerifiers = await MBAVerifier.deleteMany({});
    let delUsers = { deletedCount: 0 };
    if (userIds.length > 0) {
      delUsers = await User.deleteMany({ _id: { $in: userIds } });
    }

    return res.json({ 
      success: true, 
      verifiersDeleted: delVerifiers.deletedCount || 0, 
      usersDeleted: delUsers.deletedCount || 0 
    });
  } catch (err) {
    console.error('MBA Verifier deleteAll error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

