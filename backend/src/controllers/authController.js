const crypto = require('crypto');
const User = require('../models/User');
const Verification = require('../models/Verification');
const sendEmail = require('../utils/mailer');

async function generateUniqueUsername(baseName) {
  while (true) {
    const rand = Math.floor(100 + Math.random() * 900);
    const username = `${baseName}${rand}`;
    const exists = await User.findOne({ username }).lean();
    if (!exists) return username;
  }
}

function escapeRegex(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Register a new user (Faculty or External)
 * POST /register
 */
exports.register = async (req, res) => {
  try {
    const { username: baseName, clgName, deptName, email, phoneNo, role } = req.body;
    const username = await generateUniqueUsername(baseName.toLowerCase());
    const name = baseName;
    const password = crypto.randomBytes(4).toString('hex');

    const user = await User.create({
      name,
      username,
      clgName,
      deptName,
      email,
      phoneNo,
      password,
      usertype: role === 'Faculty' ? 'internal' : 'external',
      role: role || 'Faculty',
    });

    // If registering a faculty member, also create faculty record
    if (role === 'Faculty' || !role) {
      const Faculty = require('../models/Faculty');
      await Faculty.create({
        facultyId: user._id,
        name,
        email,
        passwordHash: password,
        department: deptName,
        clgName,
        contactNumber: phoneNo,
        type: user.usertype, // internal or external
        role: 'faculty'
      });
    }

    try {
      await sendEmail(
        email,
        'Welcome to GAT Portal',
        '',
        `<p>Hi ${baseName},<br><br>Your username: ${username}<br>Password: ${password}<br>Please change your password after logging in.</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.status(201).json({ message: 'Registration successful', credentials: { username, password } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    // If the username belongs to a Verifier, authenticate there first to avoid routing as Faculty
    try {
      const Verifier = require('../models/Verifier');
      const MbaVerifier = require('../models/MbaVerifier');
      const MtechVerifier = require('../models/MtechVerifier');

      // Prefer dedicated Verifier collection; passwords are stored in passwordHash (plain text in this app)
      let v = await Verifier.findOne({ username }).lean();
      if (!v) v = await MbaVerifier.findOne({ username }).lean();
      if (!v) v = await MtechVerifier.findOne({ username }).lean();

      if (v) {
        const stored = v.passwordHash || v.password;
        if (String(stored) !== String(password)) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        return res.json({
          success: true,
          message: 'Login successful',
          username: v.username,
          role: 'Verifier',
          department: v.department || '',
        });
      }
    } catch (e) {
      // Non-fatal: if verifier models not found, continue with faculty login
    }

    const user = await User.findOne({ username, password }).lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Verification.findOneAndUpdate(
      { email: username },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendEmail(
        username,
        'Faculty Login - Verification Code',
        '',
        `<p>Verification code:</p><h2>${code}</h2><p>Valid for 10 minutes.</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.json({ success: true, message: 'Verification code sent to email' });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const rec = await Verification.findOne({ email, code }).lean();
    if (!rec || rec.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    await Verification.deleteOne({ email });
    res.json({ success: true, message: 'Verification successful' });
  } catch (err) {
    console.error('Error during verification:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Resolve identifier (username/email) to stored role so frontend can pick correct auth flow.
 * POST /resolve-role
 */
exports.resolveRole = async (req, res) => {
  try {
    const identifier = req.body?.identifier;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Identifier (username or email) is required',
      });
    }

    const trimmed = identifier.trim();
    const looksLikeEmail = trimmed.includes('@');

    let user =
      (await User.findOne({ username: trimmed }).lean()) ||
      (await User.findOne({
        username: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
      }).lean());

    if (!user && looksLikeEmail) {
      user = await User.findOne({ email: trimmed.toLowerCase() }).lean();
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found with the provided identifier.',
      });
    }

    const role = user.role || 'Faculty';
    const requiresOtp = role === 'Faculty' || role === 'MBAFaculty';

    return res.json({
      success: true,
      role,
      username: user.username,
      email: user.email,
      usertype: user.usertype,
      name: user.name,
      department: user.deptName,
      clgName: user.clgName,
      requiresOtp,
      isMBA: /^MBA/.test(role),
    });
  } catch (err) {
    console.error('resolveRole error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve role. Please try again later.',
    });
  }
};

/**
 * Forgot password - send current password via email
 * POST /forgot-password
 */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ username: email }).lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    try {
      await sendEmail(
        email,
        'GAT Portal - Password Recovery',
        '',
        `<p>Dear User,</p>
        
        <p>Your temporary password is:</p>
        
        <h2 style="font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">${user.password}</h2>
        
        <p>Please login and change your password immediately.</p>
        
        <p>If you have any questions or face difficulties accessing the system, kindly contact the examination cell at support@gat.ac.in.</p>
        
        <p>Best regards,<br>
        Examination Cell<br>
        Global Academy of Technology</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }
    res.json({ success: true, message: 'Verification code sent to email' });
  } catch (err) {
    console.error('Error during forgot-password:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  try {
    const user = await User.findOne({ username, password: oldPassword });
    if (!user) return res.status(401).json({ error: 'Old password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.getInternalUsers = async (_req, res) => {
  try {
    const rows = await User.find({ usertype: 'internal' }).lean();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.getExternalUsers = async (_req, res) => {
  try {
    const rows = await User.find({ usertype: 'external' }).sort({ _id: -1 }).lean();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.getColleges = async (_req, res) => {
  // If colleges are static, consider a collection; placeholder response for compatibility
  res.json([]);
};

exports.getDepartments = async (_req, res) => {
  // If departments are a separate collection, expose via Subject distinct
  try {
    const rows = await User.aggregate([
      { $match: { deptName: { $exists: true, $ne: '' } } },
      { $group: { _id: '$deptName' } },
      { $project: { id: '$_id', department: '$_id', _id: 0 } },
      { $sort: { department: 1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

exports.registerFaculty = async (req, res) => {
  const { name, clgName, departmentId, email, phone, usertype } = req.body;
  const password = crypto.randomBytes(4).toString('hex');
  if (!name || !clgName || !departmentId || !email || !phone || !usertype) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    await User.create({
      name,
      username: email,
      clgName,
      department: departmentId,
      email,
      phoneNo: phone,
      usertype,
      role: 'Faculty',
      password,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error registering faculty:', err);
    res.status(500).json({ error: 'Failed to register faculty' });
  }
};


