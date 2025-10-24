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

    // Generate a unique username
    let username = usernameBase;
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${usernameBase}${counter}`;
      counter++;
    }

    // Generate a random password
    const password = generateRandomAlphanumeric(8);

    // Create the user first
    const user = await User.create({
      username,
      password,
      role: 'verifier',
      email: email || null,
      name: verifierName || null
    });

    // Create the verifier record
    const verifier = await Verifier.create({
      verifierId: user._id,
      department: canonicalDept,
      username,
      email: email || null,
      name: verifierName || null
    });

    res.json({
      success: true,
      message: 'Verifier registered successfully',
      verifier: {
        id: verifier._id,
        username,
        password,
        department: canonicalDept
      }
    });
  } catch (err) {
    console.error('Verifier registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const verifiers = await Verifier.find({})
      .populate('verifierId', 'username email name')
      .lean();

    res.json(verifiers);
  } catch (err) {
    console.error('Verifier list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getPapers = async (req, res) => {
  try {
    const { subject_code, semester } = req.query;

    const filter = {};
    if (subject_code) filter.subject_code = { $regex: `^${String(subject_code).trim()}$`, $options: 'i' };
    if (semester) filter.semester = parseInt(semester, 10);

    const papers = await QuestionPaper.find(filter)
      .sort({ subject_code: 1, semester: 1, question_number: 1 })
      .lean();

    const groupedPapers = {};
    papers.forEach((paper) => {
      const key = `${paper.subject_code}_${paper.semester}`;
      if (!groupedPapers[key]) {
        groupedPapers[key] = {
          _id: key,
          subject_code: paper.subject_code,
          subject_name: paper.subject_name,
          semester: paper.semester,
          questions: [],
          status: 'pending',
          createdAt: paper.createdAt,
        };
      }

      groupedPapers[key].questions.push({
        _id: paper._id,
        question_number: paper.question_number,
        question_text: paper.question_text,
        marks: paper.marks,
        co: paper.co,
        level: paper.level,
        approved: paper.approved,
        remarks: paper.remarks,
        verified_by: paper.verified_by,
        verified_at: paper.verified_at,
        status: paper.status,
        file_name: paper.file_name,
        file_type: paper.file_type,
        file_url: paper.file_name ? `/question-bank/file/${paper._id}` : null,
      });

      if (paper.status === 'approved') groupedPapers[key].status = 'approved';
      else if (paper.status === 'rejected') groupedPapers[key].status = 'rejected';
    });

    return res.json(Object.values(groupedPapers));
  } catch (err) {
    console.error('Verifier getPapers error:', err);
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

    const papers = await QuestionPaper.find({
      subject_code: { $regex: `^${subject_code}$`, $options: 'i' },
      semester: parseInt(semester, 10)
    }).sort({ question_number: 1 }).lean();

    if (papers.length === 0) {
      return res.status(404).json({ error: 'No papers found for this subject and semester' });
    }

    const groupedPaper = {
      _id: `${subject_code}_${semester}`,
      subject_code: papers[0].subject_code,
      subject_name: papers[0].subject_name,
      semester: parseInt(semester, 10),
      questions: papers.map(paper => ({
        _id: paper._id,
        question_number: paper.question_number,
        question_text: paper.question_text,
        marks: paper.marks,
        co: paper.co,
        level: paper.level,
        approved: paper.approved,
        remarks: paper.remarks,
        verified_by: paper.verified_by,
        verified_at: paper.verified_at,
        status: paper.status,
        file_name: paper.file_name,
        file_type: paper.file_type,
        file_url: paper.file_name ? `/question-bank/file/${paper._id}` : null,
      })),
      status: 'pending'
    };

    // Determine overall status
    const hasApproved = papers.some(p => p.status === 'approved');
    const hasRejected = papers.some(p => p.status === 'rejected');
    
    if (hasApproved && !hasRejected) {
      groupedPaper.status = 'approved';
    } else if (hasRejected && !hasApproved) {
      groupedPaper.status = 'rejected';
    }

    res.json(groupedPaper);
  } catch (err) {
    console.error('Get paper by code semester error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};