const crypto = require('crypto');
const User = require('../models/User');
const Verifier = require('../models/Verifier');
const QuestionPaper = require('../models/QuestionPaper');
const Department = require('../models/Department');

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
    const { department, email } = req.body;
    if (!department) return res.status(400).json({ error: 'department is required' });

    const existing = await Verifier.findOne({ department }).lean();
    if (existing) return res.status(409).json({ error: 'Verifier already exists for this department' });

    const randomSuffix = generateRandomAlphanumeric(3);
    const username = `${department}-Admin${randomSuffix}`;
    const password = generateRandomAlphanumeric(8);

    const user = await User.create({
      name: username,
      username,
      clgName: '-',
      deptName: department,
      email: email || `${username}@example.com`,
      phoneNo: '',
      password,
      usertype: 'admin',
      role: 'Verifier',
    });

    await Verifier.create({
      verifierId: user._id,
      username,
      passwordHash: password,
      department,
      email: email || '',
      role: 'verifier',
    });

    return res.status(201).json({ message: 'Verifier created', credentials: { username, password } });
  } catch (err) {
    console.error('Verifier register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
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

exports.getPapers = async (req, res) => {
  try {
    const { department, semester } = req.query;
    
    // Build filter object
    let filter = {};
    if (department) {
      // Map department names to common subject code prefixes (keys normalized to UPPERCASE)
      const departmentMappings = {
        'COMPUTER SCIENCE AND ENGINEERING': ['CSE', 'CS', 'COMPUTER'],
        'CSE': ['CSE', 'CS', 'COMPUTER'],
        'ELECTRONICS AND COMMUNICATION ENGINEERING': ['ECE', 'EC', 'ELECTRONICS'],
        'ECE': ['ECE', 'EC', 'ELECTRONICS'],
        'MECHANICAL ENGINEERING': ['ME', 'MECH', 'MECHANICAL'],
        'ME': ['ME', 'MECH', 'MECHANICAL'],
        'CIVIL ENGINEERING': ['CE', 'CIVIL'],
        'CE': ['CE', 'CIVIL'],
        'ELECTRICAL ENGINEERING': ['EE', 'ELECTRICAL'],
        'EE': ['EE', 'ELECTRICAL'],
        'INFORMATION TECHNOLOGY': ['IT', 'INFO'],
        'IT': ['IT', 'INFO'],
      };

      const departmentName = department.toUpperCase().trim();
      const prefixes = departmentMappings[departmentName] || [departmentName];

      // Create regex pattern to match any of the prefixes at the beginning of subject_code
      const regexPattern = `^(${prefixes.join('|')})`;
      filter.subject_code = { $regex: regexPattern, $options: 'i' };
    }
    if (semester) {
      filter.semester = parseInt(semester);
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
        question_number: paper.question_number,
        question_text: paper.question_text,
        marks: paper.marks || 'N/A', // Include marks if available
        approved: paper.approved,
        remarks: paper.remarks,
        file_name: paper.file_name,
        file_type: paper.file_type
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

exports.updatePaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array is required' });
    }
    
    // Parse the composite ID to get subject_code and semester
    const [subject_code, semester] = id.split('_');
    if (!subject_code || !semester) {
      return res.status(400).json({ error: 'Invalid paper ID format' });
    }
    
    // Update each question in the paper
    const updatePromises = questions.map(async (question) => {
      const updateData = {
        approved: question.approved || false,
        remarks: question.remarks || '',
        verified_at: new Date(),
        status: question.approved ? 'approved' : 'rejected'
      };
      
      return QuestionPaper.findOneAndUpdate(
        { 
          subject_code: subject_code,
          semester: parseInt(semester),
          question_number: question.question_number 
        },
        updateData,
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    return res.json({ message: 'Paper updated successfully' });
  } catch (err) {
    console.error('Verifier updatePaper error:', err);
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


